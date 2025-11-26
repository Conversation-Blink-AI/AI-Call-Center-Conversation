
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
  } catch (error) {
    console.error('Stripe config error:', error)
    return NextResponse.json(
      { error: 'Failed to get Stripe config' },
      { status: 500 }
    )
  }
}
