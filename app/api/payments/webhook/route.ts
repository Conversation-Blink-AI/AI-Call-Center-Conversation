
import { NextResponse } from 'next/server'
import { stripe } from '../../../../lib/stripeClient'
import { db } from '../../../../lib/db'
import type StripeType from 'stripe'

export const runtime = 'nodejs'

export async function GET() {
  console.log('🔔 [WEBHOOK] GET request to webhook endpoint')
  return NextResponse.json({ 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    url: process.env.VERCEL_URL || 'localhost',
    environment: process.env.NODE_ENV,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  })
}

export async function POST(req: Request) {
  console.log('🔔 [WEBHOOK] ==================== WEBHOOK CALLED ====================')
  console.log('🔔 [WEBHOOK] Timestamp:', new Date().toISOString())
  console.log('🔔 [WEBHOOK] Request URL:', req.url)
  console.log('🔔 [WEBHOOK] Request method:', req.method)
  
  // Log all headers with detailed analysis
  const headers = Object.fromEntries(req.headers.entries())
  console.log('🔔 [WEBHOOK] All Headers:', headers)
  
  try {
    // Read signature with detailed validation
    const sig = req.headers.get('stripe-signature')
    
    console.log('🔔 [WEBHOOK] ==================== SIGNATURE ANALYSIS ====================')
    console.log('🔔 [WEBHOOK] Raw signature header:', sig)
    console.log('🔔 [WEBHOOK] Signature exists:', !!sig)
    console.log('🔔 [WEBHOOK] Signature length:', sig?.length || 0)
    console.log('🔔 [WEBHOOK] Signature type:', typeof sig)
    
    if (!sig) {
      console.error('❌ [WEBHOOK] Missing stripe-signature header')
      console.error('❌ [WEBHOOK] Available headers:', Object.keys(headers))
      console.error('❌ [WEBHOOK] Header case analysis:')
      Object.keys(headers).forEach(key => {
        if (key.toLowerCase().includes('stripe') || key.toLowerCase().includes('signature')) {
          console.error(`   - Found related header: ${key} = ${headers[key]}`)
        }
      })
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Parse signature components
    console.log('🔔 [WEBHOOK] ==================== SIGNATURE PARSING ====================')
    const sigParts = sig.split(',')
    console.log('🔔 [WEBHOOK] Signature parts count:', sigParts.length)
    sigParts.forEach((part, index) => {
      console.log(`🔔 [WEBHOOK] Part ${index}:`, part)
      if (part.startsWith('t=')) {
        const timestamp = part.substring(2)
        console.log(`🔔 [WEBHOOK] Timestamp: ${timestamp} (${new Date(parseInt(timestamp) * 1000).toISOString()})`)
      } else if (part.startsWith('v1=')) {
        console.log(`🔔 [WEBHOOK] Signature v1: ${part.substring(3).substring(0, 10)}...`)
      }
    })

    // Read raw body with comprehensive analysis
    console.log('🔔 [WEBHOOK] ==================== BODY ANALYSIS ====================')
    const buf = await req.arrayBuffer()
    const rawBody = Buffer.from(buf)

    console.log('🔔 [WEBHOOK] Raw body length:', rawBody.length)
    console.log('🔔 [WEBHOOK] Raw body type:', typeof rawBody)
    console.log('🔔 [WEBHOOK] Buffer is Buffer:', Buffer.isBuffer(rawBody))
    console.log('🔔 [WEBHOOK] Raw body first 100 chars:', rawBody.toString('utf8').substring(0, 100))
    
    // Environment validation
    console.log('🔔 [WEBHOOK] ==================== ENVIRONMENT VALIDATION ====================')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    console.log('🔔 [WEBHOOK] STRIPE_WEBHOOK_SECRET exists:', !!webhookSecret)
    console.log('🔔 [WEBHOOK] STRIPE_WEBHOOK_SECRET length:', webhookSecret?.length || 0)
    console.log('🔔 [WEBHOOK] STRIPE_WEBHOOK_SECRET starts with whsec_:', webhookSecret?.startsWith('whsec_') || false)
    console.log('🔔 [WEBHOOK] STRIPE_WEBHOOK_SECRET first 10 chars:', webhookSecret?.substring(0, 10) || 'N/A')
    
    if (!webhookSecret) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET environment variable is not set!')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (!webhookSecret.startsWith('whsec_')) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET does not start with whsec_ prefix!')
      console.error('❌ [WEBHOOK] This indicates the wrong secret is being used')
      return NextResponse.json(
        { error: 'Invalid webhook secret format' },
        { status: 500 }
      )
    }
    
    // Construct event with detailed error handling
    console.log('🔔 [WEBHOOK] ==================== SIGNATURE VERIFICATION ====================')
    let event: StripeType.Event
    try {
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
      console.log('🔔 [WEBHOOK] Event livemode:', event.livemode)
    } catch (err: any) {
      console.error('❌ [WEBHOOK] ==================== SIGNATURE VERIFICATION FAILED ====================')
      console.error('❌ [WEBHOOK] Error name:', err.name)
      console.error('❌ [WEBHOOK] Error message:', err.message)
      console.error('❌ [WEBHOOK] Error type:', err.type)
      console.error('❌ [WEBHOOK] Error code:', err.code)
      console.error('❌ [WEBHOOK] Full error object:', JSON.stringify(err, null, 2))
      console.error('❌ [WEBHOOK] Error stack:', err.stack)
      
      // Additional debugging for common issues
      console.error('❌ [WEBHOOK] ==================== DEBUGGING HINTS ====================')
      
      if (err.message.includes('timestamp')) {
        console.error('❌ [WEBHOOK] TIMESTAMP ISSUE: Check if your server time is correct')
        console.error('❌ [WEBHOOK] Current server time:', new Date().toISOString())
      }
      
      if (err.message.includes('signature')) {
        console.error('❌ [WEBHOOK] SIGNATURE ISSUE: Check webhook endpoint secret in Stripe Dashboard')
        console.error('❌ [WEBHOOK] Make sure you are using the endpoint secret, not the signing secret')
      }
      
      if (err.message.includes('payload')) {
        console.error('❌ [WEBHOOK] PAYLOAD ISSUE: Request body may have been modified')
        console.error('❌ [WEBHOOK] Check middleware, body parsers, or proxy configurations')
      }
      
      return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log('🔔 [WEBHOOK] Processing event:', event.type)

    // Switch on event type
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('🔔 [WEBHOOK] Processing checkout.session.completed')
        const session = event.data.object as any
        
        console.log('🔔 [WEBHOOK] Session mode:', session.mode)
        console.log('🔔 [WEBHOOK] Session ID:', session.id)
        console.log('🔔 [WEBHOOK] Session metadata:', session.metadata)
        
        // Only handle payment mode sessions
        if (session.mode !== 'payment') {
          console.log('🔔 [WEBHOOK] Skipping non-payment session')
          break
        }

        const amount = session.amount_total ?? 0 // cents
        const userId = session.metadata?.user_id
        const stripeCustomerId = session.customer

        console.log('🔔 [WEBHOOK] Extracted data:', {
          amount,
          userId,
          stripeCustomerId,
          sessionId: session.id
        })

        // Validate required data
        if (!userId || !amount) {
          console.error('❌ [WEBHOOK] Missing userId or amount in checkout.session.completed:', { 
            userId, 
            amount, 
            sessionId: session.id,
            metadata: session.metadata,
            customer: stripeCustomerId
          })
          break
        }

        // Additional validation: verify the customer belongs to the user
        if (stripeCustomerId) {
          try {
            console.log('🔔 [WEBHOOK] Validating customer ID...')
            const userResult = await db.query(
              'SELECT stripe_customer_id FROM users WHERE id = $1',
              [userId]
            )
            
            if (userResult.rows.length > 0) {
              const userStripeCustomerId = userResult.rows[0].stripe_customer_id
              if (userStripeCustomerId && userStripeCustomerId !== stripeCustomerId) {
                console.error('❌ [WEBHOOK] Customer ID mismatch:', {
                  sessionCustomer: stripeCustomerId,
                  userCustomer: userStripeCustomerId,
                  userId
                })
                break
              }
              console.log('✅ [WEBHOOK] Customer ID validated')
            }
          } catch (error) {
            console.error('❌ [WEBHOOK] Error validating customer:', error)
          }
        }

        console.log('🔔 [WEBHOOK] Processing payment for user:', userId, 'amount:', amount)

        try {
          // Insert payment record using direct database query
          console.log('🔔 [WEBHOOK] Creating payment record...')
          const paymentResult = await db.query(`
            INSERT INTO payments (gateway, gateway_payment_id, amount_cents, status, user_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [
            'stripe',
            session.id,
            amount,
            'succeeded',
            userId,
            new Date().toISOString(),
            new Date().toISOString()
          ])

          console.log('✅ [WEBHOOK] Payment record created:', paymentResult.rows[0]?.id)

          // Find or create wallet using direct database query
          console.log('🔔 [WEBHOOK] Finding/creating wallet...')
          const existingWallet = await db.query(
            'SELECT id, balance_cents FROM wallets WHERE user_id = $1',
            [userId]
          )

          let walletId
          let newBalance

          if (existingWallet.rows.length > 0) {
            // Update existing wallet balance
            walletId = existingWallet.rows[0].id
            const currentBalance = parseInt(existingWallet.rows[0].balance_cents) || 0
            newBalance = currentBalance + amount

            console.log('🔔 [WEBHOOK] Updating existing wallet:', walletId, 'from', currentBalance, 'to', newBalance)

            const updateResult = await db.query(`
              UPDATE wallets 
              SET balance_cents = $1, updated_at = $2 
              WHERE id = $3
            `, [newBalance, new Date().toISOString(), walletId])

            console.log('✅ [WEBHOOK] Updated wallet balance:', walletId, 'new balance:', newBalance)
            console.log('✅ [WEBHOOK] Balance update result:', updateResult.rowCount, 'rows affected')
          } else {
            // Create new wallet
            console.log('🔔 [WEBHOOK] Creating new wallet for user:', userId)
            const newWalletResult = await db.query(`
              INSERT INTO wallets (user_id, balance_cents, created_at, updated_at)
              VALUES ($1, $2, $3, $4)
              RETURNING id
            `, [
              userId,
              amount,
              new Date().toISOString(),
              new Date().toISOString()
            ])

            walletId = newWalletResult.rows[0].id
            newBalance = amount
            console.log('✅ [WEBHOOK] Created new wallet:', walletId, 'balance:', newBalance)
          }

          // Insert wallet transaction using direct database query
          if (walletId) {
            console.log('🔔 [WEBHOOK] Creating wallet transaction...')
            const transactionResult = await db.query(`
              INSERT INTO wallet_transactions (wallet_id, amount_cents, type, gateway, provider_txn_id, created_at)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING id
            `, [
              walletId,
              amount,
              'top_up',
              'stripe',
              session.payment_intent,
              new Date().toISOString()
            ])

            console.log('✅ [WEBHOOK] Wallet transaction created:', transactionResult.rows[0]?.id)
          }

          console.log(`✅ [WEBHOOK] Successfully processed Stripe payment: ${session.id} for user ${userId}, amount: $${amount / 100}`)

        } catch (error) {
          console.error('❌ [WEBHOOK] Error processing checkout.session.completed:', error)
          // Don't throw here, we want to return 200 to Stripe even if our processing fails
        }
        break

      default:
        console.log(`🔔 [WEBHOOK] Unhandled Stripe event type: ${event.type}`)
    }

    console.log('✅ [WEBHOOK] Webhook processing completed successfully')
    return NextResponse.json({ received: true, eventType: event.type, eventId: event.id })

  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing Stripe webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
