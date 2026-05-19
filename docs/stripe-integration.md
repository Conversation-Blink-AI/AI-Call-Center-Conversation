# Stripe Integration — Technical Documentation

This document describes the full Stripe implementation in the Hustle Call Center
project: SDK setup, environment configuration, every Stripe API surface used,
the routes/components that call them, the webhook pipeline, the database
schema that backs payments and subscriptions, and the end‑to‑end flows for
wallet top‑ups and recurring phone‑number subscriptions.

---

## 1. Overview

Stripe is the primary payment processor for the platform. It powers two
distinct money‑moving flows:

| Flow | Mode | Result |
|---|---|---|
| Wallet top‑up | `checkout.sessions.create({ mode: 'payment' })` | One‑time charge → credits the user's prepaid wallet (`wallets.balance_cents`). |
| Phone‑number purchase | `checkout.sessions.create({ mode: 'subscription' })` | Recurring monthly subscription (price = `STRIPE_PRICE_ID`). On payment success a Twilio number is provisioned, registered with Bland.ai, and a default pathway is created. |

Beyond checkout, the app also uses Stripe to:

- Create / look up a single `Customer` per app user (`stripe_customer_id` on `users`).
- List and download paid `Invoice`s in the billing dashboard.
- List a customer's `PaymentMethod`s (cards only) and surface the default one.
- Receive and verify webhook events to drive wallet credits and post‑purchase provisioning.

Two payment providers are advertised in `config/plans.ts` (`stripe` + `paypal`),
but Stripe is the actively wired primary provider in code.

---

## 2. Dependencies

`package.json`:

- Server SDK: `stripe@^18.4.0`
- Browser SDK (fallback redirect): `@stripe/stripe-js@^7.9.0`

Server‑side calls pin the Stripe API version via the SDK config:

```10:14:lib/stripeClient.ts
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    })
  }
```

---

## 3. Environment variables

| Variable | Used in | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | `lib/stripeClient.ts`, all server routes | Server‑side Stripe SDK auth (test or live `sk_…`). |
| `STRIPE_PUBLISHABLE_KEY` (also `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in deploy) | `app/api/stripe/config/route.ts` → `components/TopUpStripeButton.jsx` | Publishable `pk_…` returned to the browser for `loadStripe()` fallback `redirectToCheckout`. |
| `STRIPE_WEBHOOK_SECRET` | `app/api/payments/webhook/route.ts`, `app/api/test-webhook/route.ts` | `whsec_…` used by `stripe.webhooks.constructEvent` to verify signatures. |
| `STRIPE_PRICE_ID` | `app/api/payments/stripe/create-phone-number-checkout/route.ts` | Recurring `price_…` used as the `line_items[0].price` for the phone‑number subscription. |

Where they appear in deploy config:

- `amplify.yml` writes `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` into `.env.production` during AWS Amplify builds.
- `DEPLOYMENT.md` lists the same three keys as required runtime envs.
- `.env` (dev) defines all four (`STRIPE_PRICE_ID`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

---

## 4. SDK initialization (lazy, build‑safe)

The Stripe SDK is wrapped in a `Proxy` so that Next.js production builds (which
run page generation without secrets) don't crash when `STRIPE_SECRET_KEY` is
absent. Real route handlers always run with `runtime = 'nodejs'` and have the
key set.

```1:38:lib/stripeClient.ts

import Stripe from 'stripe'

// Lazy initialization to prevent build-time errors
let stripeInstance: Stripe | null = null

function getStripe(): Stripe | null {
  // Only initialize if we have a secret key
  // This prevents build-time errors when STRIPE_SECRET_KEY is not set
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    })
  }
  return stripeInstance
}

// Export a proxy object that lazily initializes Stripe
// During build (when STRIPE_SECRET_KEY is not set), this returns a mock that won't break the build
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe()
    if (!instance) {
      // During build or when STRIPE_SECRET_KEY is missing
      // Return a function that throws a helpful error when called
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          throw new Error(`Stripe not initialized: STRIPE_SECRET_KEY environment variable is required`)
        }
      }
      // For non-function properties, return undefined (routes should check for env var first)
      return undefined
    }
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  }
})
```

The `stripe` import (`@/lib/stripeClient`) is the single, canonical access
point used by every backend route. Nothing else instantiates `new Stripe()`
directly.

---

## 5. Stripe Customer lifecycle

Every app user gets exactly one Stripe `Customer`, persisted as
`users.stripe_customer_id`. The helper `getOrCreateStripeCustomer(userId)` is
the single entry point and is idempotent.

Schema migration:

```1:8:scripts/add-stripe-customer-id.sql

-- Add stripeCustomerId column to users table
ALTER TABLE users 
ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
```

Resolution algorithm — `lib/getOrCreateStripeCustomer.ts`:

1. Look up `users.stripe_customer_id` in Postgres.
2. If present, call `stripe.customers.retrieve(id)` to verify it still exists; if Stripe returns "not found", null the column and fall through.
3. Fallback: `stripe.customers.search({ query: "metadata['userId']:'<userId>'" })` to recover orphaned mappings (e.g. DB lost but Stripe customer still exists). On hit, write the ID back to `users`.
4. Otherwise `stripe.customers.create({ email, name, metadata: { userId } })` with `idempotencyKey: create_customer_${userId}` so retries can never produce duplicates.
5. Persist the new customer ID and return it.

`syncUserProfileToStripe(userId)` is also exported in the same file and updates
`email`/`name` on Stripe via `stripe.customers.update(id, …)` whenever profile
information changes (called from profile flows; see grep results for hooks).

### Public endpoint — manual customer creation

```7:33:app/api/stripe/create-customer/route.ts
export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(user.id)

    return NextResponse.json({
      success: true,
      stripeCustomerId,
      message: 'Stripe customer created/retrieved successfully'
    })
```

`POST /api/stripe/create-customer` — authenticated, no body. Used to lazily
ensure a Stripe customer exists for the current session.

### Bulk migration script

`scripts/migrate-existing-users-to-stripe.ts` loops every user where
`stripe_customer_id IS NULL` and calls `getOrCreateStripeCustomer(user.id)`,
sleeping 100 ms between requests for rate‑limit safety. Run it once after
applying `add-stripe-customer-id.sql` on a populated database.

---

## 6. Public configuration endpoint

```1:23:app/api/stripe/config/route.ts

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      return NextResponse.json(
        { error: 'Stripe publishable key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({ publishableKey })
```

`GET /api/stripe/config` — returns `{ publishableKey }` so the client can call
`loadStripe(publishableKey)` for the fallback `redirectToCheckout` path (see
section 8).

---

## 7. Wallet top‑up flow (one‑time payment)

### 7.1 Backend: create checkout session

`POST /api/payments/stripe/create-checkout-session`
(`app/api/payments/stripe/create-checkout-session/route.ts`)

Body: `{ amount: number }` (USD dollars, e.g. `25`, `50`).

```51:66:app/api/payments/stripe/create-checkout-session/route.ts
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Wallet Top-up' },
          unit_amount: amountCents
        },
        quantity: 1
      }],
      success_url: `${origin}/dashboard/billing?success=1`,
      cancel_url:  `${origin}/dashboard/billing?canceled=1`,
      metadata: { user_id: userId }
    });
```

Notable details:

- Auth is enforced via `getCurrentUser()`; unauth requests return 401.
- `getOrCreateStripeCustomer(userId)` guarantees the session is attached to the user's existing Customer.
- `metadata.user_id` is the only thing the webhook needs to associate the payment with an app user.
- `success_url` / `cancel_url` use a proxy‑aware `getOrigin()` helper that respects `x-forwarded-proto` and `x-forwarded-host` (works behind Replit, Vercel, Amplify).
- Returns `{ url, id }` to the browser.

### 7.2 Frontend: trigger checkout

`components/TopUpStripeButton.jsx` is the React entry point used on the
billing dashboard (`app/dashboard/billing/page.tsx` renders four buttons for
$25 / $50 / $100 / $250).

The button's flow:

1. Show a confirmation `AlertDialog`.
2. `POST /api/payments/stripe/create-checkout-session` with `{ amount }`.
3. Preferred redirect — if the response carries a `url`, perform `window.location.href = url`.
4. Fallback — if only `id` was returned, call `GET /api/stripe/config` to get the publishable key, `loadStripe(publishableKey)`, and `stripe.redirectToCheckout({ sessionId: id })`.
5. On return to `/dashboard/billing?success=1` it shows a success toast and re‑fetches `/api/wallet/balance` after a 2 s delay (to give the webhook time to land).
6. On `?canceled=1` it shows a destructive toast.

### 7.3 Webhook → wallet credit

When Stripe POSTs `checkout.session.completed` with `mode === 'payment'`, the
webhook (section 9) runs the following inside a single Postgres transaction:

1. **Idempotency:** `SELECT id FROM payments WHERE gateway = 'stripe' AND gateway_payment_id = <session.id>`. If found, no‑op rollback.
2. `INSERT INTO payments (gateway='stripe', gateway_payment_id=session.id, gateway_payment_id_enc=encryptString(session.id), amount_cents, status='succeeded', user_id, …)`.
3. Upsert `wallets` row for `user_id`, adding `session.amount_total` cents to `balance_cents`.
4. `INSERT INTO wallet_transactions (wallet_id, amount_cents, type='top_up', gateway='stripe', provider_txn_id=session.payment_intent, …)`.
5. `COMMIT`.

A defensive customer check is also performed: if `session.customer !== users.stripe_customer_id`, the event is dropped to prevent cross‑account credit injection.

---

## 8. Phone‑number subscription flow (recurring)

This is the more complex flow. It chains Stripe Checkout (subscription mode)
→ webhook → Twilio purchase → Bland.ai registration / pathway creation → DB
persistence.

### 8.1 Backend: create subscription checkout session

`POST /api/payments/stripe/create-phone-number-checkout`
(`app/api/payments/stripe/create-phone-number-checkout/route.ts`)

Body: `{ phoneNumber, areaCode?, countryCode = 'US' }`.

Pre‑flight:

- Reads `STRIPE_PRICE_ID` from env.
- Calls `stripe.prices.retrieve(stripePriceId)` to verify the price exists (and to surface a helpful test/live‑mode mismatch error).
- Resolves the Stripe Customer with `getOrCreateStripeCustomer(userId)`.

Session creation:

```105:131:app/api/payments/stripe/create-phone-number-checkout/route.ts
      session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{
        price: stripePriceId,
        quantity: 1,
      }],
      success_url: `${origin}/dashboard/phone-numbers?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/phone-numbers/purchase?canceled=1`,
      metadata: {
        user_id: userId,
        phone_number: phoneNumber,
        area_code: areaCode || '',
        country_code: countryCode,
        purchase_type: 'phone_number'
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          phone_number: phoneNumber,
          area_code: areaCode || '',
          country_code: countryCode,
          purchase_type: 'phone_number'
        }
      }
    })
```

Key design choices:

- Metadata is duplicated on both `checkout.sessions.create` (for the `checkout.session.completed` event) and on `subscription_data.metadata` (so the underlying Subscription, future Invoices, and `invoice.paid` events all carry the same context).
- `purchase_type: 'phone_number'` is the discriminator the webhook uses to route this event to the phone‑number purchase handler instead of the wallet handler.
- A retry path handles `resource_missing` / `customer` errors by clearing `users.stripe_customer_id`, recreating the customer, and re‑calling `checkout.sessions.create` once.

### 8.2 Frontend: trigger subscription

`app/dashboard/phone-numbers/purchase/page.tsx` — for each available number
shown by `/api/bland-ai/available-numbers`, the "Purchase" button does:

```110:120:app/dashboard/phone-numbers/purchase/page.tsx
      const response = await fetch("/api/payments/stripe/create-phone-number-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: number.e164 || number.number,
          areaCode: areaCode,
          countryCode: countryCode,
        }),
```

…then `window.location.href = url` to the returned Stripe Checkout URL.

### 8.3 Webhook → number provisioning

When `checkout.session.completed` arrives with
`session.mode === 'subscription'` and `metadata.purchase_type === 'phone_number'`,
the webhook calls `handlePhoneNumberPurchase(userId, phoneNumber, areaCode,
countryCode, sessionId, subscriptionId)`. That helper:

1. Validates Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) and Bland.ai (`BLAND_AI_API_KEY`, `BLAND_TWILIO_ENCRYPTED_KEY`) env vars.
2. Normalizes the number to E.164 and computes `phone_number_enc`, `phone_number_hash`, `phone_number_last4`.
3. Calls `twilioClient.incomingPhoneNumbers.create({ phoneNumber })`. On Twilio error codes 21211 / 21215 or messages containing "restricted" / "provisioning", the number is saved with `status='restricted'` instead of failing the webhook (so Stripe doesn't retry).
4. Calls Bland.ai `POST /v1/inbound/insert` to register the number.
5. Calls Bland.ai `POST /v1/pathway/create` to create a default pathway and remembers the `pathway_id`.
6. Calls Bland.ai `POST /v1/inbound/{number}` to wire the inbound webhook to `https://dev.conversation.blinklab.in/api/webhooks/bland` and link the pathway.
7. Inside a single Postgres transaction, inserts/updates `phone_numbers` (status, `pathwayid`, `stripe_subscription_id`, `monthly_fee=15`) and inserts the `pathways` row linked to `phone_id`.

If `subscriptionId` is absent on `checkout.session.completed` (it occasionally is), the webhook also handles `invoice.paid` to backfill `phone_numbers.stripe_subscription_id` (see section 9.3).

### 8.4 Subscription management UI

`app/dashboard/billing/subscriptions/page.tsx` lists active phone‑number
subscriptions sourced from `/api/user/phone-numbers` (not Stripe directly).
The "Cancel subscription" button is currently a stubbed UX (`TODO: Implement
actual cancellation API call`). When implemented it will call
`stripe.subscriptions.update(id, { cancel_at_period_end: true })` (see also
the comment in `app/api/admin/numbers/route.ts` line 221: *"In production, you
would also cancel the Stripe subscription here"*).

---

## 9. Webhook endpoint

`POST /api/payments/webhook`
(`app/api/payments/webhook/route.ts`, `runtime = 'nodejs'`)

This is the only Stripe webhook handler in the codebase. It is configured in
the Stripe Dashboard against the production URL and signed with
`STRIPE_WEBHOOK_SECRET` (must start with `whsec_`).

A second route, `POST /api/test-webhook`
(`app/api/test-webhook/route.ts`), is a diagnostics endpoint that mirrors the
signature‑verification logic but doesn't process events — useful for
validating Stripe CLI forwarding and signature configuration.

### 9.1 Signature verification

```764:775:app/api/payments/webhook/route.ts
      console.log('🔔 [WEBHOOK] Calling stripe.webhooks.constructEvent...')
      console.log('🔔 [WEBHOOK] Parameters:')
      console.log('🔔 [WEBHOOK] - Body length:', rawBody.length)
      console.log('🔔 [WEBHOOK] - Signature length:', sig.length)
      console.log('🔔 [WEBHOOK] - Secret length:', webhookSecret.length)
      
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
      
      console.log('✅ [WEBHOOK] Webhook signature verified successfully!')
      console.log('🔔 [WEBHOOK] Event type:', event.type)
      console.log('🔔 [WEBHOOK] Event ID:', event.id)
      console.log('🔔 [WEBHOOK] Event created:', new Date(event.created * 1000).toISOString())
```

- The raw request body is read via `req.arrayBuffer()` (must be raw bytes — Next.js's automatic JSON parsing is bypassed by reading the buffer directly).
- The `stripe-signature` header is required; missing or non‑`whsec_` secrets short‑circuit with HTTP 400 / 500.
- All header presence, signature parts (`t=`, `v1=`), and timing data are logged, which makes troubleshooting clock skew and proxy body‑mutation issues straightforward.

### 9.2 Handled events

| Event | Branch | Action |
|---|---|---|
| `checkout.session.completed` (`mode='payment'`) | wallet top‑up | Inserts `payments` (idempotent on `gateway_payment_id`), upserts `wallets`, inserts `wallet_transactions` of `type='top_up'`. |
| `checkout.session.completed` (`mode='subscription'`, `metadata.purchase_type='phone_number'`) | phone‑number purchase | Calls `handlePhoneNumberPurchase(...)` → Twilio + Bland.ai + DB. |
| `invoice.paid` | recurring subscription billing | Looks up the `Subscription` via `stripe.subscriptions.retrieve(invoiceSubscriptionId)`, reads `metadata.phone_number` / `metadata.user_id`, and upserts `phone_numbers.stripe_subscription_id` if not already set. Also serves as the backfill path for the case where `checkout.session.completed` arrived without a `subscription` ID. |
| Anything else | `default` | Logged as "Unhandled Stripe event type" and acknowledged with HTTP 200. |

### 9.3 Behavior contracts

- **Idempotency** is enforced at the application layer for wallet top‑ups via the unique `(gateway, gateway_payment_id)` lookup before insertion. For phone purchases, the `phone_numbers` upsert checks `(user_id, phone_number_hash OR phone_number)` and updates rather than duplicates.
- **Retries**: any thrown error returns HTTP 500 to Stripe so that Stripe will retry the webhook with exponential back‑off. Restriction errors are explicitly *not* re‑thrown so Stripe stops retrying for permanently restricted Twilio accounts.
- **Customer‑mismatch protection**: top‑up handler refuses to credit a wallet if `session.customer` doesn't match `users.stripe_customer_id`.

### 9.4 Diagnostic endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/payments/webhook` | Returns `{ message, hasWebhookSecret, environment, … }` for liveness. |
| `GET` | `/api/test-webhook` | Same plus `webhookSecretFormat` validity. |
| `POST` | `/api/test-webhook` | Verifies the `stripe-signature` against `STRIPE_WEBHOOK_SECRET` and reports `signatureTest: 'valid' \| 'invalid: <message>' \| 'no-signature'`, but does *not* mutate any data. |

---

## 10. Billing dashboard read APIs

The billing UI (`app/dashboard/billing/page.tsx` and
`app/dashboard/billing/subscriptions/page.tsx`) reads live data from Stripe
through these authenticated routes.

### 10.1 Payment methods

`GET /api/payments/stripe/payment-methods`
(`app/api/payments/stripe/payment-methods/route.ts`)

```26:62:app/api/payments/stripe/payment-methods/route.ts
    // Fetch payment methods from Stripe (only cards, no PayPal)
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card', // Only fetch cards, exclude PayPal and other types
    })

    console.log(`✅ [PAYMENT-METHODS] Found ${paymentMethods.data.length} payment methods`)

    // Transform Stripe payment methods to our format
    const formattedPaymentMethods = paymentMethods.data.map((pm) => {
      const card = pm.card
      return {
        id: pm.id,
        type: pm.type,
        brand: card?.brand || 'unknown',
        last4: card?.last4 || '',
        expMonth: card?.exp_month || null,
        expYear: card?.exp_year || null,
        isDefault: false, // We'll determine this based on the customer's default payment method
      }
    })

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId)
    const defaultPaymentMethodId = 
      typeof customer === 'object' && !customer.deleted 
        ? (customer.invoice_settings?.default_payment_method as string) || null
        : null
```

- Uses `stripe.paymentMethods.list({ customer, type: 'card' })`.
- Resolves the default via `stripe.customers.retrieve(customer).invoice_settings.default_payment_method` and sets `isDefault: true` on the matching card.
- Returns `{ success, paymentMethods: [{ id, type, brand, last4, expMonth, expYear, isDefault }] }`.

### 10.2 Invoices list

`GET /api/payments/stripe/invoices?limit=10&status=paid`
(`app/api/payments/stripe/invoices/route.ts`)

- Calls `stripe.invoices.list({ customer, status, limit })`.
- Maps each `Invoice` to `{ id, number, date (YYYY-MM-DD), description, amount, amountFormatted, status, invoicePdf, hostedInvoiceUrl, currency }`.
- `description` falls back to `invoice.lines.data[0].description` then `'Invoice Payment'`.

### 10.3 Invoice download (PDF)

`GET /api/payments/stripe/invoices/[invoiceId]/download`
(`app/api/payments/stripe/invoices/[invoiceId]/download/route.ts`)

- Calls `stripe.invoices.retrieve(invoiceId)`.
- Authorization check: `invoice.customer === stripeCustomerId` for the current user; otherwise 403.
- Streams `invoice.invoice_pdf` (a hosted Stripe URL) back through `fetch()` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="invoice-<number|id>.pdf"`.
- Maps `StripeInvalidRequestError` to HTTP 404.

### 10.4 Admin payments view

`GET /api/admin/payments?page&limit&user_id&status&start_date&end_date&gateway`
(`app/api/admin/payments/route.ts`)

This route does not call Stripe. It reads the local `payments` table and joins
`users`, returning rows shaped for the admin payments page
(`app/admin/payments/page.tsx`). For Stripe rows, `gateway_payment_id` is
exposed as `stripeRef`. (The TODO in the file notes that `payment type` could
be enriched by querying Stripe later.)

---

## 11. Database schema touched by Stripe

Source files: `scripts/add-stripe-customer-id.sql`,
`scripts/create-payments-table.sql`, plus columns added through ad‑hoc
migrations referenced in `app/api/payments/webhook/route.ts`.

### `users`

| Column | Type | Notes |
|---|---|---|
| `stripe_customer_id` | `VARCHAR(255) UNIQUE` | Single Customer per user. Indexed by `idx_users_stripe_customer_id`. |

### `payments`

```4:20:scripts/create-payments-table.sql
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    gateway TEXT NOT NULL,
    gateway_payment_id TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    status TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
```

The webhook also writes `gateway_payment_id_enc` (encrypted via
`encryptString(session.id)` from `lib/encryption`), see also
`scripts/DB-schema/dbschema.html` for the `idx_payments_gateway_payment_id_enc`
index.

For Stripe rows: `gateway = 'stripe'`, `gateway_payment_id = checkout_session_id`,
`amount_cents = session.amount_total`, `status = 'succeeded'`.

### `wallets` (legacy table, still actively used by the webhook)

| Column | Type |
|---|---|
| `id` | `BIGINT PK` |
| `user_id` | `UUID NOT NULL` |
| `balance_cents` | `BIGINT DEFAULT 0` |
| `updated_at` | `TIMESTAMPTZ DEFAULT now()` |

### `wallet_transactions` (legacy)

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT PK` | |
| `wallet_id` | `BIGINT` | FK to `wallets.id`. |
| `amount_cents` | `BIGINT` | |
| `type` | `TEXT` | `'top_up'` for Stripe credits. |
| `gateway` | `TEXT` | `'stripe'`. |
| `provider_txn_id` | `TEXT` | `session.payment_intent`. |
| `created_at` | `TIMESTAMPTZ` | |

### `phone_numbers` (Stripe‑related columns)

| Column | Notes |
|---|---|
| `stripe_subscription_id` | Set by the webhook on `checkout.session.completed` (subscription) or backfilled on `invoice.paid`. |
| `pathwayid` | Bland.ai pathway created during the same webhook. |
| `monthly_fee` | Hard‑coded to `15` in the current implementation (this is independent of `STRIPE_PRICE_ID` and is informational only — the actual price the customer pays is whatever the Stripe Price represents). |
| `status` | `'active'` on success; `'restricted'` if the Twilio account is blocked from provisioning. |

---

## 12. Stripe APIs used (cheat sheet)

| Stripe API call | Where | Why |
|---|---|---|
| `stripe.customers.retrieve(id)` | `lib/getOrCreateStripeCustomer.ts`, `app/api/payments/stripe/payment-methods/route.ts` | Verify customer; read `invoice_settings.default_payment_method`. |
| `stripe.customers.search({ query })` | `lib/getOrCreateStripeCustomer.ts` | Recover customer by `metadata['userId']`. |
| `stripe.customers.create({ email, name, metadata }, { idempotencyKey })` | `lib/getOrCreateStripeCustomer.ts` | One Customer per app user. |
| `stripe.customers.update(id, { email, name })` | `lib/getOrCreateStripeCustomer.ts` (`syncUserProfileToStripe`) | Keep Stripe in sync with profile edits. |
| `stripe.prices.retrieve(STRIPE_PRICE_ID)` | `app/api/payments/stripe/create-phone-number-checkout/route.ts` | Pre‑flight verification of the configured Price (catches test/live mismatch). |
| `stripe.checkout.sessions.create({ mode: 'payment', … })` | `app/api/payments/stripe/create-checkout-session/route.ts` | Wallet top‑up. |
| `stripe.checkout.sessions.create({ mode: 'subscription', … })` | `app/api/payments/stripe/create-phone-number-checkout/route.ts` | Phone‑number subscription. |
| `stripe.paymentMethods.list({ customer, type: 'card' })` | `app/api/payments/stripe/payment-methods/route.ts` | Render saved cards in billing UI. |
| `stripe.invoices.list({ customer, status, limit })` | `app/api/payments/stripe/invoices/route.ts` | Recent transactions table. |
| `stripe.invoices.retrieve(invoiceId)` | `app/api/payments/stripe/invoices/[invoiceId]/download/route.ts` | Authorize and resolve `invoice_pdf` URL. |
| `stripe.subscriptions.retrieve(subscriptionId)` | `app/api/payments/webhook/route.ts` (`invoice.paid`) | Read subscription metadata to backfill `stripe_subscription_id`. |
| `stripe.webhooks.constructEvent(rawBody, sig, secret)` | `app/api/payments/webhook/route.ts`, `app/api/test-webhook/route.ts` | Verify Stripe signatures. |
| `loadStripe(publishableKey).redirectToCheckout({ sessionId })` (browser) | `components/TopUpStripeButton.jsx` | Fallback redirect when `session.url` is missing. |

---

## 13. End‑to‑end flow diagrams

### 13.1 Wallet top‑up

```
User clicks $50 button on /dashboard/billing
  └─► components/TopUpStripeButton.jsx
        └─► POST /api/payments/stripe/create-checkout-session  { amount: 50 }
              ├─► getCurrentUser()
              ├─► getOrCreateStripeCustomer(userId)
              │     └─► [optional] stripe.customers.create(... metadata.userId)
              └─► stripe.checkout.sessions.create({ mode: 'payment', customer, line_items, metadata.user_id })
                    └─► returns { url, id }
        └─► window.location.href = url   (or stripe.redirectToCheckout fallback)

User completes payment on Stripe Checkout
  └─► Stripe → POST /api/payments/webhook   (event: checkout.session.completed, mode='payment')
        ├─► stripe.webhooks.constructEvent(...)            // verify signature
        ├─► validate session.customer == users.stripe_customer_id
        ├─► BEGIN
        │     INSERT payments (gateway='stripe', gateway_payment_id=session.id, ...)
        │     UPSERT wallets.balance_cents += session.amount_total
        │     INSERT wallet_transactions (type='top_up', provider_txn_id=session.payment_intent)
        ├─► COMMIT
        └─► 200 OK

User returns to /dashboard/billing?success=1
  └─► UI re-fetches /api/wallet/balance after 2s
```

### 13.2 Phone‑number subscription

```
User clicks Purchase on /dashboard/phone-numbers/purchase
  └─► POST /api/payments/stripe/create-phone-number-checkout  { phoneNumber, areaCode, countryCode }
        ├─► stripe.prices.retrieve(STRIPE_PRICE_ID)            // sanity check
        ├─► getOrCreateStripeCustomer(userId)
        └─► stripe.checkout.sessions.create({
              mode: 'subscription',
              customer,
              line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
              metadata: { user_id, phone_number, area_code, country_code, purchase_type: 'phone_number' },
              subscription_data.metadata: <same>
            })

User completes payment on Stripe Checkout
  └─► Stripe → POST /api/payments/webhook   (event: checkout.session.completed, mode='subscription', purchase_type='phone_number')
        ├─► twilioClient.incomingPhoneNumbers.create({ phoneNumber })
        │     └─► may fail with 'restricted' → save status='restricted'
        ├─► Bland.ai POST /v1/inbound/insert            (register number)
        ├─► Bland.ai POST /v1/pathway/create            (create default pathway)
        ├─► Bland.ai POST /v1/inbound/{number}          (link pathway + webhook URL)
        ├─► BEGIN
        │     UPSERT phone_numbers (stripe_subscription_id, pathwayid, status, monthly_fee=15, ...)
        │     INSERT pathways (phone_id, ...)
        ├─► COMMIT
        └─► 200 OK

Stripe → POST /api/payments/webhook   (event: invoice.paid, recurring)
  └─► stripe.subscriptions.retrieve(invoiceSubscriptionId)
  └─► If phone_numbers.stripe_subscription_id is missing, backfill it
```

---

## 14. Operational notes & gotchas

1. **Test vs. live mode mismatch.** `STRIPE_PRICE_ID` must be created in the same mode as `STRIPE_SECRET_KEY`. The phone‑checkout route surfaces a clear error referencing the variable when `stripe.prices.retrieve` returns `resource_missing`.
2. **Webhook secret format.** The webhook handler refuses any `STRIPE_WEBHOOK_SECRET` that doesn't begin with `whsec_`; this guards against accidentally pasting a *signing secret* (without the prefix) or a publishable key.
3. **Raw body required.** Next.js's edge/JSON middleware must not touch the webhook body — `route.ts` uses `req.arrayBuffer()` and is pinned to `runtime = 'nodejs'`. Adding any custom middleware that re‑serializes the body will break signature verification.
4. **`monthly_fee` is informational.** The DB column is hard‑coded to `15` for new phone numbers, but the actual recurring price is whatever `STRIPE_PRICE_ID` represents in Stripe. Keep these in sync if you change the underlying price (and also update `config/plans.ts → usagePricing.phoneNumber.defaultMonthlyFee`).
5. **One Customer per user.** Always use `getOrCreateStripeCustomer(userId)` — never call `stripe.customers.create()` directly. The idempotency key `create_customer_${userId}` plus the metadata‑based search make duplicates effectively impossible.
6. **Cancellation is stubbed.** The "Cancel subscription" button on `/dashboard/billing/subscriptions` currently fakes the action. Real implementation needs `stripe.subscriptions.update(id, { cancel_at_period_end: true })` (or `.cancel(id)`) plus a corresponding webhook handler for `customer.subscription.deleted` to mark the phone number as `unsubscribed` / release it from Twilio + Bland.ai.
7. **Diagnostics.** When Stripe webhooks misbehave, the verbose logs in `app/api/payments/webhook/route.ts` already cover headers, signature parts, body length, and parsed timestamps. `GET /api/test-webhook` and `POST /api/test-webhook` mirror the verification path without side effects.

---

## 15. File index

Backend routes:

- `app/api/stripe/config/route.ts` — `GET` publishable key.
- `app/api/stripe/create-customer/route.ts` — `POST` ensure Customer.
- `app/api/payments/stripe/create-checkout-session/route.ts` — `POST` wallet top‑up Checkout.
- `app/api/payments/stripe/create-phone-number-checkout/route.ts` — `POST` phone‑number subscription Checkout.
- `app/api/payments/stripe/payment-methods/route.ts` — `GET` saved cards.
- `app/api/payments/stripe/invoices/route.ts` — `GET` invoice list.
- `app/api/payments/stripe/invoices/[invoiceId]/download/route.ts` — `GET` invoice PDF.
- `app/api/payments/webhook/route.ts` — `POST` Stripe webhook (`checkout.session.completed`, `invoice.paid`).
- `app/api/test-webhook/route.ts` — diagnostics for signature verification.
- `app/api/admin/payments/route.ts` — admin read of local `payments` table.

Server libraries:

- `lib/stripeClient.ts` — lazy SDK proxy (`apiVersion: '2024-06-20'`).
- `lib/getOrCreateStripeCustomer.ts` — Customer resolution + profile sync.

Frontend:

- `components/TopUpStripeButton.jsx` — top‑up entry point with `loadStripe` fallback.
- `app/dashboard/billing/page.tsx` — wallet, payment methods, invoices.
- `app/dashboard/billing/subscriptions/page.tsx` — phone‑number subscriptions list (stubbed cancel).
- `app/dashboard/phone-numbers/purchase/page.tsx` — calls `create-phone-number-checkout`.
- `app/admin/payments/page.tsx` — admin payments table.

Database / migration:

- `scripts/add-stripe-customer-id.sql` — `users.stripe_customer_id` column + index.
- `scripts/create-payments-table.sql` — `payments` table.
- `scripts/migrate-existing-users-to-stripe.ts` — backfill Stripe Customers for existing users.
- `scripts/DB-schema/dbschema.html` — schema reference (mentions `stripe_customer_id`, `payments`, `wallets`, `wallet_transactions`).

Configuration / deployment:

- `.env`, `amplify.yml`, `DEPLOYMENT.md` — env var wiring for Stripe.
- `config/plans.ts` — public pricing, advertises `paymentProviders: ['stripe', 'paypal']`.
