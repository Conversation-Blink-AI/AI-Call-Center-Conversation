# Public Plans & Pricing API

> Public, unauthenticated REST endpoint that returns the full plan and pricing
> details for the **Hustle Call Center** platform.

- **Base URL (dev):** `https://dev.conversation.blinklab.in`
- **Endpoint path:** `/Public_api/getPlans`
- **Method:** `GET`
- **Auth:** None (public)
- **CORS:** `*` (browser-callable)
- **Content-Type:** `application/json`

---

## TL;DR for the consuming team

```bash
curl https://dev.conversation.blinklab.in/Public_api/getPlans
```

Returns every plan, every per-usage rate, every feature, and the URLs your
frontend needs to redirect users into signup / checkout. One request, one
response, no auth, no setup.

---

## 1. Endpoints

| # | Method | URL | Returns |
|---|--------|-----|---------|
| 1 | `GET` | `/Public_api/getPlans` | All plans + usage pricing + product info |
| 2 | `GET` | `/Public_api/getPlans?platform=callCenter` | Same as above (explicit platform filter) |
| 3 | `GET` | `/Public_api/getPlans?planId=<id>` | A single plan by `planId` |

### Query parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `platform` | string | No | Currently only `callCenter` is supported. Reserved for future platforms (Lander, Flow). Accepts `callCenter`, `call_center`, `call-center` (case-insensitive). |
| `planId` | string | No | If provided, returns just that one plan. One of: `starter`, `growth`, `pro`, `scale`. |

---

## 2. Quick start

### cURL

```bash
# Full response
curl https://dev.conversation.blinklab.in/Public_api/getPlans

# Single plan
curl "https://dev.conversation.blinklab.in/Public_api/getPlans?planId=growth"
```

### JavaScript / Fetch

```javascript
const res = await fetch("https://dev.conversation.blinklab.in/Public_api/getPlans");
const data = await res.json();

if (data.success) {
  data.plans.forEach((plan) => {
    console.log(`${plan.name}: $${plan.price} ${plan.currency} → ${plan.estimatedCallMinutes} min`);
  });
}
```

### Python / requests

```python
import requests

r = requests.get("https://dev.conversation.blinklab.in/Public_api/getPlans")
data = r.json()

if data["success"]:
    for plan in data["plans"]:
        print(f"{plan['name']}: ${plan['price']} {plan['currency']}")
```

### Node.js

```javascript
const fetch = require("node-fetch");

(async () => {
  const r = await fetch("https://dev.conversation.blinklab.in/Public_api/getPlans");
  const data = await r.json();
  console.log(JSON.stringify(data, null, 2));
})();
```

---

## 3. Pricing model (read this first)

Hustle Call Center is **pay-as-you-go with a prepaid wallet**, not a classic
Free / Pro / Enterprise subscription. The response reflects that:

| Concept | Where in the response | Notes |
|---|---|---|
| Wallet top-up tiers | `plans[]` | $25 Starter, $50 Growth, $100 Pro, $250 Scale. `billingCycle: "one_time"` — funds never expire. |
| Per-minute call cost | `usagePricing.callRate` | $0.11/min, 30-second minimum, partial minutes rounded up. |
| Phone number rental | `usagePricing.phoneNumber` | $1.50/month per virtual number, recurring monthly. |

So a typical user pays: **(top-up amount) + ($1.50/mo × number of phone numbers) + ($0.11/min × call minutes)**, drawn from their wallet balance.

---

## 4. Full response shape

### Successful response — `200 OK`

```json
{
  "success": true,
  "platform": "callCenter",
  "displayName": "Hustle Call Center",
  "description": "AI-powered call center platform with virtual phone numbers, conversational pathways, and pay-as-you-go billing.",
  "productUrl": "https://dev.conversation.blinklab.in",
  "signupUrl": "https://dev.conversation.blinklab.in/signup",
  "loginUrl": "https://dev.conversation.blinklab.in/login",
  "pricingModel": "pay_as_you_go_with_topups",
  "currency": "USD",
  "plans": [
    {
      "planId": "starter",
      "name": "Starter",
      "description": "Try the platform with a small wallet top-up. Great for testing pathways and a first phone number.",
      "price": 25,
      "currency": "USD",
      "billingCycle": "one_time",
      "credits": 25,
      "estimatedCallMinutes": 227,
      "features": [
        "Wallet top-up of $25",
        "≈ 227 minutes of AI calls",
        "1 virtual phone number ($1.50/mo)",
        "Conversational AI pathways",
        "Stripe & PayPal checkout"
      ],
      "detailedFeatures": [
        { "label": "AI calling (inbound + outbound)", "included": true },
        { "label": "Pathway designer", "included": true },
        { "label": "Call history & transcripts", "included": true },
        { "label": "Knowledge bases", "included": true },
        { "label": "Public API access", "included": true },
        { "label": "Priority support", "included": false }
      ],
      "popular": false,
      "ctaLabel": "Top up $25",
      "redirectUrl": "https://dev.conversation.blinklab.in/dashboard/billing",
      "paymentProviders": ["stripe", "paypal"],
      "metadata": { "notes": "One-time wallet top-up. Funds never expire." }
    },
    {
      "planId": "growth",
      "name": "Growth",
      "price": 50,
      "credits": 50,
      "estimatedCallMinutes": 454,
      "popular": true,
      "ctaLabel": "Top up $50",
      "redirectUrl": "https://dev.conversation.blinklab.in/dashboard/billing"
    },
    {
      "planId": "pro",
      "name": "Pro",
      "price": 100,
      "credits": 100,
      "estimatedCallMinutes": 909,
      "ctaLabel": "Top up $100"
    },
    {
      "planId": "scale",
      "name": "Scale",
      "price": 250,
      "credits": 250,
      "estimatedCallMinutes": 2272,
      "ctaLabel": "Top up $250"
    }
  ],
  "usagePricing": {
    "callRate": {
      "pricePerMinute": 0.11,
      "pricePerMinuteCents": 11,
      "currency": "USD",
      "minimumBillableSeconds": 30,
      "roundUpPartialMinutes": true,
      "description": "AI calls are billed at $0.11/minute, with a 30-second minimum and partial minutes rounded up."
    },
    "phoneNumber": {
      "defaultMonthlyFee": 1.5,
      "currency": "USD",
      "billingCycle": "monthly",
      "description": "Each virtual phone number is billed at $1.50/month, charged on a recurring monthly cycle."
    }
  },
  "features": [
    "AI-powered inbound and outbound calling",
    "Visual conversational pathway designer",
    "Virtual phone number purchase & management",
    "Call recordings, transcripts, and history",
    "Knowledge bases for AI agents",
    "Webhooks and public REST API",
    "Stripe and PayPal checkout",
    "Wallet-based prepaid billing"
  ],
  "paymentProviders": ["stripe", "paypal"],
  "support": {
    "email": "support@hustleapp.co",
    "docsUrl": "https://dev.conversation.blinklab.in/docs",
    "apiDocsUrl": "https://dev.conversation.blinklab.in/public-api"
  },
  "version": "1.0.0",
  "lastUpdated": "2026-05-04",
  "fetchedAt": "2026-05-04T14:34:12.123Z"
}
```

> Plans 2–4 above are abbreviated for readability — in the actual response they
> have the same full structure as `starter`.

---

## 5. Field reference

### Root fields

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `true` when the request succeeded. |
| `platform` | string | Always `"callCenter"` for this API. |
| `displayName` | string | Human-readable product name. |
| `description` | string | One-line product description. |
| `productUrl` | string | Marketing / app home URL. |
| `signupUrl` | string | Where to send a new user to sign up. |
| `loginUrl` | string | Where to send an existing user to log in. |
| `pricingModel` | string | `"pay_as_you_go_with_topups"`. |
| `currency` | string | ISO 4217 code; always `"USD"` today. |
| `plans` | array | Available wallet top-up tiers (see below). |
| `usagePricing` | object | Per-usage rates (call + phone number). |
| `features` | string[] | Headline product features. |
| `paymentProviders` | string[] | Supported checkout providers (`"stripe"`, `"paypal"`). |
| `support` | object | Contact & docs URLs. |
| `version` | string | Semver of the pricing schema (bump on breaking changes). |
| `lastUpdated` | string | `YYYY-MM-DD` — when the config was last edited. |
| `fetchedAt` | string | ISO timestamp when the response was generated. |

### `plans[]` object

| Field | Type | Description |
|---|---|---|
| `planId` | string | Stable machine ID (`starter`, `growth`, `pro`, `scale`). Use this — never the name. |
| `name` | string | Display name. |
| `description` | string | Short marketing description. |
| `price` | number | Top-up amount in `currency`. |
| `originalPrice` | number? | Optional — set when the plan is discounted. |
| `currency` | string | ISO 4217 code. |
| `billingCycle` | string | `"one_time"`, `"monthly"`, or `"yearly"`. All current plans are `"one_time"`. |
| `credits` | number | Wallet credits granted (1 credit = $1 USD of wallet balance). |
| `estimatedCallMinutes` | number | Calculated as `credits / 0.11` — purely informational. |
| `features` | string[] | Bullet list for marketing tiles. |
| `detailedFeatures` | object[] | `{ label, included }` for feature comparison tables. |
| `popular` | boolean | `true` for the recommended plan (use to render a "Most popular" badge). |
| `ctaLabel` | string | Suggested button label (e.g. `"Top up $50"`). |
| `redirectUrl` | string | Where to send the user when they click the CTA. |
| `paymentProviders` | string[] | Providers that accept this plan. |
| `metadata` | object | Free-form: `bonusCredits`, `discountPercent`, `notes`. |

### `usagePricing.callRate` object

| Field | Type | Description |
|---|---|---|
| `pricePerMinute` | number | Decimal price (e.g. `0.11`). |
| `pricePerMinuteCents` | number | Same value in cents (e.g. `11`). |
| `currency` | string | ISO 4217. |
| `minimumBillableSeconds` | number | Calls shorter than this are billed as if they hit the minimum. |
| `roundUpPartialMinutes` | boolean | If `true`, a 61-second call is billed as 2 minutes. |
| `description` | string | Human-readable summary safe to render on a pricing page. |

### `usagePricing.phoneNumber` object

| Field | Type | Description |
|---|---|---|
| `defaultMonthlyFee` | number | Default per-number monthly cost (e.g. `1.5`). |
| `currency` | string | ISO 4217. |
| `billingCycle` | string | Always `"monthly"`. |
| `description` | string | Human-readable summary. |

### Single-plan response shape

When you pass `?planId=...`, the root payload is slimmer:

```json
{
  "success": true,
  "platform": "callCenter",
  "currency": "USD",
  "plan": { /* one Plan object */ },
  "fetchedAt": "2026-05-04T14:34:12.123Z"
}
```

---

## 6. Error responses

All errors keep the same `{ success: false, message }` envelope used by the
rest of `Public_api/*`.

### Unknown platform — `404 Not Found`

```json
{
  "success": false,
  "message": "Platform \"lander\" is not available from this API. Supported: \"callCenter\".",
  "supportedPlatforms": ["callCenter"]
}
```

### Unknown `planId` — `404 Not Found`

```json
{
  "success": false,
  "message": "planId \"enterprise\" not found.",
  "availablePlanIds": ["starter", "growth", "pro", "scale"]
}
```

### Server error — `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Internal server error"
}
```

(In `development` mode the response also includes an `error` field with the
underlying message — never present in production.)

### HTTP status codes used

| Status | When |
|---|---|
| `200 OK` | Successful `GET` — full or single-plan response. |
| `200 OK` | Successful `OPTIONS` preflight. |
| `404 Not Found` | Unknown `platform` or `planId`. |
| `500 Internal Server Error` | Unhandled exception on the server. |

---

## 7. Integration recipes

### Render a pricing page

```javascript
const res = await fetch("https://dev.conversation.blinklab.in/Public_api/getPlans");
const data = await res.json();

return data.plans.map((plan) => ({
  id: plan.planId,
  title: plan.name,
  subtitle: plan.description,
  priceLabel: `$${plan.price} ${plan.currency}`,
  cycleLabel: plan.billingCycle === "one_time" ? "one-time" : `per ${plan.billingCycle.replace("ly", "")}`,
  bullets: plan.features,
  cta: { label: plan.ctaLabel, href: plan.redirectUrl },
  highlighted: plan.popular,
}));
```

### Show the per-usage rates underneath the plans

```javascript
const { callRate, phoneNumber } = data.usagePricing;

const usageNote = `
Calls: $${callRate.pricePerMinute}/min (${callRate.minimumBillableSeconds}s minimum).
Numbers: $${phoneNumber.defaultMonthlyFee}/mo each.
`;
```

### Cache responsibly

This response changes only when our team edits pricing (a code deploy). Cache
it client-side / CDN-side for **1 hour** and you'll be fine. Use the
`lastUpdated` field to invalidate when needed.

---

## 8. Versioning & change policy

- Schema version is exposed at `version` (currently `1.0.0`).
- **Additive changes** (new optional fields, new plans, new platforms) → no
  version bump. Your code should ignore unknown fields.
- **Breaking changes** (renamed/removed fields, type changes) → `version` will
  bump to `2.0.0` and we'll communicate before deploy.
- `lastUpdated` (date) and `fetchedAt` (timestamp) help you distinguish
  "config edited" from "response generated".

---

## 9. Roadmap (heads-up, not promises)

The `platform` query parameter exists because we plan to expose two more
platforms from the same endpoint family in the future:

- `lander` — landing page builder (separate codebase)
- `flow` — flow builder (separate codebase)

When those ship, calling `/Public_api/getPlans?platform=lander` will return the
same response shape with that platform's plans. **No breaking change to your
current integration** — today's call to `/Public_api/getPlans` will continue
returning Call Center data.

---

## 10. Support

| Channel | Where |
|---|---|
| Email | support@hustleapp.co |
| Interactive API docs | https://dev.conversation.blinklab.in/public-api |
| Product docs | https://dev.conversation.blinklab.in/docs |

For questions about this endpoint specifically, ping the backend team and
reference this doc (`docs/public-plans-api.md`).
