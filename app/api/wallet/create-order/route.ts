
import { NextRequest, NextResponse } from 'next/server'
import { paypalClient } from '../../../../lib/paypalClient'
import paypal from '@paypal/checkout-server-sdk'

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Prevent execution during build time
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'PayPal not configured. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.' },
      { status: 503 }
    )
  }

  try {
    // Parse the request body
    const { amount } = await request.json()

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Create the PayPal order request
    const orderRequest = new paypal.orders.OrdersCreateRequest()
    orderRequest.prefer('return=representation')
    orderRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toFixed(2)
        }
      }]
    })

    // Execute the request
    const response = await paypalClient.execute(orderRequest)

    // Return the order ID
    return NextResponse.json(
      { orderID: response.result.id },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error creating PayPal order:', error)
    return NextResponse.json(
      { error: 'Could not create order' },
      { status: 500 }
    )
  }
}
