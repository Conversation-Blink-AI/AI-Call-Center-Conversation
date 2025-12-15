
import { NextResponse } from 'next/server'
import { stripe } from '../../../../lib/stripeClient'
import { createDatabaseClient, getSSLConfig } from '../../../../lib/db-client'
import type StripeType from 'stripe'
import { Client } from 'pg'
import { Twilio } from 'twilio'

export const runtime = 'nodejs'

// Helper to register purchased numbers with Bland.ai
async function registerNumbersWithBland(numbers: string[]): Promise<void> {
  console.log('📨 [WEBHOOK] Registering numbers with Bland.ai:', numbers)

  const apiKey = process.env.BLAND_AI_API_KEY
  const encryptedKey = process.env.BLAND_TWILIO_ENCRYPTED_KEY

  if (!apiKey || !encryptedKey) {
    console.error('❌ [WEBHOOK] Bland.ai credentials not configured', {
      hasApiKey: !!apiKey,
      hasEncryptedKey: !!encryptedKey,
    })
    throw new Error('Bland.ai API key or encrypted key not configured')
  }

  const response = await fetch('https://api.bland.ai/v1/inbound/insert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: apiKey,
      encrypted_key: encryptedKey,
    } as any,
    body: JSON.stringify({ numbers }),
  })

  const text = await response.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    console.error('❌ [WEBHOOK] Bland.ai inbound insert failed:', {
      status: response.status,
      statusText: response.statusText,
      body: data,
    })
    throw new Error(
      `Bland.ai inbound insert failed: ${response.status} ${response.statusText}`,
    )
  }

  if (data.status !== 'success') {
    console.error('❌ [WEBHOOK] Bland.ai responded with non-success status:', data)
    throw new Error(`Bland.ai inbound insert status: ${data.status || 'unknown'}`)
  }

  console.log('✅ [WEBHOOK] Bland.ai inbound insert success:', {
    inserted: data.inserted,
    message: data.message,
  })
}

// Helper to update Bland.ai inbound config (webhook URL etc.) for a specific number
async function updateBlandInboundConfig(phoneNumber: string): Promise<void> {
  const apiKey = process.env.BLAND_AI_API_KEY
  if (!apiKey) {
    console.error('❌ [WEBHOOK] BLAND_AI_API_KEY is not configured')
    throw new Error('BLAND_AI_API_KEY is not configured')
  }

  // Bland inbound endpoints expect the number without leading + or %2B
  const formatted = phoneNumber.replace(/^\+|^%2B/, '')
  const blandUrl = `https://api.bland.ai/v1/inbound/${encodeURIComponent(formatted)}`

  console.log('🌐 [WEBHOOK] Updating Bland inbound config:', {
    phoneNumber,
    formatted,
    blandUrl,
  })

  const response = await fetch(blandUrl, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Set the inbound webhook to your Bland webhook endpoint
      webhook_url: 'https://dev.conversation.blinklab.in/api/webhooks/bland',
    }),
  })

  const text = await response.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    console.error('❌ [WEBHOOK] Failed to update Bland inbound config:', {
      status: response.status,
      statusText: response.statusText,
      body: data,
    })
    throw new Error(
      `Failed to update Bland inbound config: ${response.status} ${response.statusText}`,
    )
  }

  console.log('✅ [WEBHOOK] Bland inbound config updated:', data)
}

// Helper function to handle phone number purchase via Twilio
async function handlePhoneNumberPurchase(
  userId: string,
  phoneNumber: string,
  areaCode: string,
  countryCode: string,
  sessionId: string
) {
  console.log('📞 [WEBHOOK] Starting phone number purchase process (Twilio):', {
    userId,
    phoneNumber,
    areaCode,
    countryCode,
    sessionId
  })

  // Get Twilio credentials from environment variables
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID || process.env.REPLIT_SECRET_TWILIO_ACCOUNT_SID
  const authToken =
    process.env.TWILIO_AUTH_TOKEN || process.env.REPLIT_SECRET_TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    console.error('❌ [WEBHOOK] Twilio credentials not configured')
    throw new Error('Twilio credentials not configured')
  }

  try {
    // Initialize Twilio client
    const twilioClient = new Twilio(accountSid, authToken)

    // Purchase the phone number from Twilio
    console.log('📞 [WEBHOOK] Calling Twilio API to purchase number...')
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber,
    })

    console.log('✅ [WEBHOOK] Twilio purchase successful:', {
      sid: purchasedNumber.sid,
      phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName,
    })

    // Store the purchased number in PostgreSQL database
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(),
    })

    try {
      await client.connect()

      // Extract area code and location from phone number
      const extractedAreaCode = phoneNumber.replace(/\D/g, '').slice(1, 4) // Remove country code and get area code
      const location = getLocationFromAreaCode(extractedAreaCode)

      // Check if number already exists for this user
      const existingNumber = await client.query(
        'SELECT id FROM phone_numbers WHERE phone_number = $1 AND user_id = $2',
        [phoneNumber, userId],
      )

      if (existingNumber.rows.length > 0) {
        console.log('⚠️ [WEBHOOK] Phone number already exists for user, updating status')
        await client.query(
          `
          UPDATE phone_numbers 
          SET status = 'active', updated_at = NOW()
          WHERE phone_number = $1 AND user_id = $2
        `,
          [phoneNumber, userId],
        )
      } else {
        // Insert new phone number
        const result = await client.query(
          `INSERT INTO phone_numbers (phone_number, user_id, location, type, status, purchased_at, area_code, country_code)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
           RETURNING *`,
          [
            phoneNumber,
            userId,
            location,
            'Local',
            'active',
            extractedAreaCode,
            countryCode,
          ],
        )

        const savedPhone = result.rows[0]
        console.log('✅ [WEBHOOK] Phone number saved to database:', savedPhone)

        // Register the number with Bland.ai and configure inbound webhook
        await registerNumbersWithBland([phoneNumber])
        console.log('✅ [WEBHOOK] Phone number registered with Bland.ai')

        await updateBlandInboundConfig(phoneNumber)
        console.log('✅ [WEBHOOK] Bland inbound webhook configured for phone number')
      }
    } finally {
      await client.end()
    }

    console.log('✅ [WEBHOOK] Phone number purchase completed successfully')
  } catch (error) {
    console.error('❌ [WEBHOOK] Error purchasing phone number via Twilio:', error)
    throw error
  }
}

// Helper function to get location from area code
function getLocationFromAreaCode(areaCode: string): string {
  const areaCodeMap: { [key: string]: string } = {
    '415': 'San Francisco, CA',
    '510': 'Oakland, CA',
    '628': 'San Francisco, CA',
    '212': 'New York, NY',
    '646': 'New York, NY',
    '917': 'New York, NY',
    '213': 'Los Angeles, CA',
    '310': 'Los Angeles, CA',
    '424': 'Los Angeles, CA',
    '312': 'Chicago, IL',
    '773': 'Chicago, IL',
    '872': 'Chicago, IL',
    '305': 'Miami, FL',
    '786': 'Miami, FL',
    '954': 'Fort Lauderdale, FL',
    '206': 'Seattle, WA',
    '425': 'Seattle, WA',
    '253': 'Tacoma, WA',
    '416': 'Toronto, ON',
    '647': 'Toronto, ON',
    '437': 'Toronto, ON',
    '514': 'Montreal, QC',
    '438': 'Montreal, QC',
    '604': 'Vancouver, BC',
    '778': 'Vancouver, BC',
    '236': 'Vancouver, BC',
  }

  return areaCodeMap[areaCode] || 'Unknown Location'
}

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
        
        const purchaseType = session.metadata?.purchase_type
        const userId = session.metadata?.user_id
        
        // Handle phone number purchase (subscription mode)
        if (session.mode === 'subscription' && purchaseType === 'phone_number') {
          console.log('📞 [WEBHOOK] Processing phone number purchase subscription')
          
          const phoneNumber = session.metadata?.phone_number
          const areaCode = session.metadata?.area_code
          const countryCode = session.metadata?.country_code || 'US'
          
          if (!phoneNumber || !userId) {
            console.error('❌ [WEBHOOK] Missing phone number or user ID in subscription metadata:', {
              phoneNumber,
              userId,
              metadata: session.metadata
            })
            break
          }
          
          // Purchase phone number from Bland.ai
          try {
            await handlePhoneNumberPurchase(userId, phoneNumber, areaCode, countryCode, session.id)
            console.log('✅ [WEBHOOK] Phone number purchase completed successfully')
          } catch (error) {
            console.error('❌ [WEBHOOK] Error purchasing phone number:', error)
            // Re-throw error so Stripe can retry the webhook
            throw error
          }
          break
        }
        
        // Handle wallet top-up (payment mode)
        if (session.mode !== 'payment') {
          console.log('🔔 [WEBHOOK] Skipping non-payment session (not wallet top-up or phone purchase)')
          break
        }

        const amount = session.amount_total ?? 0 // cents
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

        // Use a single database connection with transaction support
        const client = createDatabaseClient()
        
        try {
          await client.connect()
          console.log('🔔 [WEBHOOK] Database connection established')
          
          // Start transaction
          await client.query('BEGIN')
          console.log('🔔 [WEBHOOK] Transaction started')

          // Idempotency check: Check if payment already exists
          console.log('🔔 [WEBHOOK] Checking for existing payment...')
          const existingPayment = await client.query(
            'SELECT id FROM payments WHERE gateway = $1 AND gateway_payment_id = $2',
            ['stripe', session.id]
          )

          if (existingPayment.rows.length > 0) {
            console.log('⚠️ [WEBHOOK] Payment already exists, skipping duplicate processing:', existingPayment.rows[0].id)
            // Rollback since we didn't make any changes (read-only transaction)
            await client.query('ROLLBACK')
            await client.end()
            console.log('✅ [WEBHOOK] Transaction rolled back (idempotency check - no changes needed)')
            break
          }

          // Insert payment record
          console.log('🔔 [WEBHOOK] Creating payment record...')
          const paymentResult = await client.query(`
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

          // Find or create wallet
          console.log('🔔 [WEBHOOK] Finding/creating wallet...')
          const existingWallet = await client.query(
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

            const updateResult = await client.query(`
              UPDATE wallets 
              SET balance_cents = $1, updated_at = $2 
              WHERE id = $3
            `, [newBalance, new Date().toISOString(), walletId])

            console.log('✅ [WEBHOOK] Updated wallet balance:', walletId, 'new balance:', newBalance)
            console.log('✅ [WEBHOOK] Balance update result:', updateResult.rowCount, 'rows affected')
          } else {
            // Create new wallet (removed created_at as wallets table doesn't have this column)
            console.log('🔔 [WEBHOOK] Creating new wallet for user:', userId)
            const newWalletResult = await client.query(`
              INSERT INTO wallets (user_id, balance_cents, updated_at)
              VALUES ($1, $2, $3)
              RETURNING id
            `, [
              userId,
              amount,
              new Date().toISOString()
            ])

            walletId = newWalletResult.rows[0].id
            newBalance = amount
            console.log('✅ [WEBHOOK] Created new wallet:', walletId, 'balance:', newBalance)
          }

          // Insert wallet transaction
          if (walletId) {
            console.log('🔔 [WEBHOOK] Creating wallet transaction...')
            const transactionResult = await client.query(`
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

          // Commit transaction
          await client.query('COMMIT')
          console.log('✅ [WEBHOOK] Transaction committed successfully')
          console.log(`✅ [WEBHOOK] Successfully processed Stripe payment: ${session.id} for user ${userId}, amount: $${amount / 100}`)

        } catch (error) {
          // Rollback transaction on error
          try {
            await client.query('ROLLBACK')
            console.error('❌ [WEBHOOK] Transaction rolled back due to error')
          } catch (rollbackError) {
            console.error('❌ [WEBHOOK] Error during rollback:', rollbackError)
          }
          
          console.error('❌ [WEBHOOK] Error processing checkout.session.completed:', error)
          console.error('❌ [WEBHOOK] Error details:', error instanceof Error ? error.message : String(error))
          console.error('❌ [WEBHOOK] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
          
          // Re-throw error so Stripe can retry the webhook
          throw error
        } finally {
          // Always close the database connection
          await client.end()
          console.log('🔔 [WEBHOOK] Database connection closed')
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
