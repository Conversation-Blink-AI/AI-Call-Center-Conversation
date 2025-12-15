import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripeClient'
import { getCurrentUser } from '@/lib/auth-utils'
import { getOrCreateStripeCustomer } from '@/lib/getOrCreateStripeCustomer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getOrigin(req: Request) {
  // Works behind Replit/Vercel proxies
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host')  // Replit
            ?? req.headers.get('host')              // Fallback
  return `${proto}://${host}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { phoneNumber, areaCode, countryCode = 'US' } = body

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Get Stripe Price ID from environment
    const stripePriceId = process.env.STRIPE_PRICE_ID
    if (!stripePriceId) {
      console.error('STRIPE_PRICE_ID environment variable is not set')
      return NextResponse.json(
        { error: 'Stripe price ID not configured' },
        { status: 500 }
      )
    }

    const origin = getOrigin(req)

    // Get authenticated user
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Get or create Stripe customer for this user
    const stripeCustomerId = await getOrCreateStripeCustomer(userId)

    console.log('📞 [PHONE-CHECKOUT] Creating Stripe checkout session for phone number purchase:', {
      phoneNumber,
      areaCode,
      countryCode,
      userId,
      stripeCustomerId,
      stripePriceId,
      origin
    })

    // Create Stripe Checkout Session in subscription mode
    const session = await stripe.checkout.sessions.create({
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
      }
    })

    console.log('✅ [PHONE-CHECKOUT] Stripe session created:', {
      id: session.id,
      url: session.url,
      mode: session.mode,
      status: session.status
    })

    if (!session.url) {
      console.error('❌ [PHONE-CHECKOUT] No URL returned from Stripe session')
      return NextResponse.json({ error: 'No checkout URL generated' }, { status: 500 })
    }

    return NextResponse.json({ 
      url: session.url, 
      id: session.id 
    }, { status: 200 })

  } catch (err: any) {
    console.error('❌ [PHONE-CHECKOUT] Error creating checkout session:', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

