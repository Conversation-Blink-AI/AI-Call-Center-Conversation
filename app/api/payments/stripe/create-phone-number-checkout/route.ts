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

    // Verify the price exists in Stripe
    try {
      const price = await stripe.prices.retrieve(stripePriceId)
      console.log('✅ [PHONE-CHECKOUT] Verified Stripe price:', {
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring
      })
    } catch (priceError: any) {
      console.error('❌ [PHONE-CHECKOUT] Price verification failed:', priceError)
      if (priceError.code === 'resource_missing') {
        return NextResponse.json(
          { 
            error: `Stripe price ID not found: ${stripePriceId}. Please check your STRIPE_PRICE_ID environment variable matches your Stripe account (test/live mode).`,
            priceId: stripePriceId,
            hint: 'Ensure you are using the correct Stripe API keys (test vs live) that match the price ID'
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { 
          error: `Failed to verify Stripe price: ${priceError.message}`,
          priceId: stripePriceId
        },
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
    let stripeCustomerId: string
    try {
      stripeCustomerId = await getOrCreateStripeCustomer(userId)
    } catch (error: any) {
      console.error('❌ [PHONE-CHECKOUT] Error getting/creating Stripe customer:', error)
      return NextResponse.json(
        { error: `Failed to get Stripe customer: ${error.message}` },
        { status: 500 }
      )
    }

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
    let session
    try {
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
    } catch (stripeError: any) {
      console.error('❌ [PHONE-CHECKOUT] Stripe API error:', stripeError)
      
      // Handle specific Stripe errors
      if (stripeError.code === 'resource_missing' && stripeError.param === 'customer') {
        // Customer doesn't exist - try to recreate it
        console.log('🔄 [PHONE-CHECKOUT] Customer not found, attempting to recreate...')
        try {
          // Clear invalid customer ID and create new one
          const { db } = await import('@/lib/db')
          await db.query(
            'UPDATE users SET stripe_customer_id = NULL, updated_at = $1 WHERE id = $2',
            [new Date().toISOString(), userId]
          )
          
          // Retry getting/creating customer
          stripeCustomerId = await getOrCreateStripeCustomer(userId)
          
          // Retry creating checkout session
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
        } catch (retryError: any) {
          return NextResponse.json(
            { error: `Failed to create checkout session: ${retryError.message}` },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: `Stripe error: ${stripeError.message}` },
          { status: 500 }
        )
      }
    }

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

