
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getOrCreateStripeCustomer } from '@/lib/getOrCreateStripeCustomer'

export const runtime = 'nodejs'

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

  } catch (error: any) {
    console.error('❌ Error creating Stripe customer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Stripe customer' },
      { status: 500 }
    )
  }
}
