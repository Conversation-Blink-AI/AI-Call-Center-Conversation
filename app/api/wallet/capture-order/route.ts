import { NextResponse } from 'next/server'
import { paypalClient } from '../../../../lib/paypalClient'
import paypal from '@paypal/checkout-server-sdk'
import { PhoneBlockService } from '@/services/phone-block-service'

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req) {
  // Prevent execution during build time
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'PayPal not configured. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.' },
      { status: 503 }
    )
  }

  try {
    // Get user from session/auth
    const { getUser } = await import('../../../../lib/auth-utils')
    const user = await getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { orderID } = await req.json()

    if (!orderID) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    // Capture the order using PayPal SDK
    const captureRequest = new paypal.orders.OrdersCaptureRequest(orderID)
    const response = await paypalClient.execute(captureRequest)
    const captureDetails = response.result

    console.log('PayPal capture response:', captureDetails)

    // Check if the payment was successful
    if (captureDetails.status === 'COMPLETED') {
      // Extract amount from the captured order
      const amountValue = parseFloat(captureDetails.purchase_units[0].payments.captures[0].amount.value)
      const amountCents = Math.round(amountValue * 100) // Convert to cents

      // Insert payment record
      const paymentResponse = await fetch('/api/database/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'payments',
          data: {
            gateway: 'paypal',
            gateway_payment_id: orderID,
            amount_cents: amountCents,
            status: 'succeeded',
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })
      })

      if (!paymentResponse.ok) {
        console.error('Failed to insert payment record:', await paymentResponse.text())
        return NextResponse.json(
          { error: 'Failed to record payment' },
          { status: 500 }
        )
      }

      // Find or create wallet
      const walletResponse = await fetch(`/api/database/records?table=wallets&user_id=${userId}`)
      let walletId
      let currentBalance = 0

      if (walletResponse.ok) {
        const walletData = await walletResponse.json()
        if (walletData.length > 0) {
          walletId = walletData[0].id
          currentBalance = walletData[0].balance_cents || 0
        }
      }

      // Create wallet if it doesn't exist
      if (!walletId) {
        const createWalletResponse = await fetch('/api/database/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'wallets',
            data: {
              user_id: userId,
              balance_cents: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          })
        })

        if (!createWalletResponse.ok) {
          console.error('Failed to create wallet:', await createWalletResponse.text())
          return NextResponse.json(
            { error: 'Failed to create wallet' },
            { status: 500 }
          )
        }

        const walletResult = await createWalletResponse.json()
        walletId = walletResult.id
        currentBalance = 0
      }

      // Update wallet balance
      const newBalance = currentBalance + amountCents
      const updateWalletResponse = await fetch('/api/database/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'wallets',
          id: walletId,
          data: {
            balance_cents: newBalance,
            updated_at: new Date().toISOString()
          }
        })
      })

      if (!updateWalletResponse.ok) {
        console.error('Failed to update wallet balance:', await updateWalletResponse.text())
        return NextResponse.json(
          { error: 'Failed to update wallet' },
          { status: 500 }
        )
      }

      // Insert wallet transaction
      const transactionResponse = await fetch('/api/database/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'wallet_transactions',
          data: {
            wallet_id: walletId,
            amount_cents: amountCents,
            type: 'top_up',
            gateway: 'paypal',
            provider_txn_id: orderID,
            created_at: new Date().toISOString()
          }
        })
      })

      if (!transactionResponse.ok) {
        console.error('Failed to insert wallet transaction:', await transactionResponse.text())
      }

      console.log(`✅ PayPal payment captured and wallet updated: ${userId}, amount: $${amountValue}, new balance: ${newBalance} cents`)

      // Check if balance changed from <=0 to >0, and unblock phone numbers if needed
      if (currentBalance <= 0 && newBalance > 0) {
        try {
          console.log(`🔓 [WALLET] Balance changed from ${currentBalance} to ${newBalance}, unblocking phone numbers for user ${userId}`)
          await PhoneBlockService.unblockUserNumbers(userId)
        } catch (unblockError) {
          // Don't fail payment capture if unblocking fails - it's non-critical
          console.error(`❌ [WALLET] Failed to unblock numbers after top-up (non-critical):`, unblockError)
        }
      }

      return NextResponse.json({
        message: 'Payment captured successfully',
        balance_cents: newBalance,
        orderDetails: captureDetails
      })
    } else {
      return NextResponse.json(
        { error: 'Payment could not be captured', status: captureDetails.status },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error capturing PayPal order:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}

// GET request to check order status
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const orderID = searchParams.get('orderID')

    if (!orderID) {
      return NextResponse.json(
        { error: 'Order ID is required for status check' },
        { status: 400 }
      )
    }

    // Fetch order details from PayPal
    const orderRequest = new paypal.orders.OrdersGetRequest(orderID)
    const response = await paypalClient.execute(orderRequest)
    const orderDetails = response.result

    return NextResponse.json({
      orderID: orderDetails.id,
      status: orderDetails.status,
      details: orderDetails
    })

  } catch (error) {
    console.error('Error checking PayPal order status:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}