import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getOrCreateStripeCustomer } from '@/lib/getOrCreateStripeCustomer'
import { stripe } from '@/lib/stripeClient'

export async function GET(request: NextRequest) {
  try {
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

    console.log('🔍 [PAYMENT-METHODS] Fetching payment methods for customer:', stripeCustomerId)

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

    // Mark the default payment method
    if (defaultPaymentMethodId) {
      const defaultIndex = formattedPaymentMethods.findIndex(
        (pm) => pm.id === defaultPaymentMethodId
      )
      if (defaultIndex !== -1) {
        formattedPaymentMethods[defaultIndex].isDefault = true
      }
    }

    return NextResponse.json({
      success: true,
      paymentMethods: formattedPaymentMethods,
    })
  } catch (error: any) {
    console.error('❌ [PAYMENT-METHODS] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch payment methods' 
      },
      { status: 500 }
    )
  }
}
