import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripeClient'

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  console.log('🧪 [TEST-WEBHOOK] GET request received')

  // Environment check
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  return NextResponse.json({ 
    message: 'Test webhook endpoint is working',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasWebhookSecret: !!webhookSecret,
      webhookSecretFormat: webhookSecret?.startsWith('whsec_') ? 'valid' : 'invalid',
      webhookSecretLength: webhookSecret?.length || 0
    }
  })
}

export async function POST(req: Request) {
  // Prevent execution during build time
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ 
      error: 'Stripe not configured',
      message: 'STRIPE_SECRET_KEY environment variable is not set'
    }, { status: 503 })
  }
  console.log('🧪 [TEST-WEBHOOK] ==================== TEST WEBHOOK CALLED ====================')

  try {
    // Get headers first
    const headers = Object.fromEntries(req.headers.entries())
    console.log('🧪 [TEST-WEBHOOK] Headers received:', headers)

    // Check for Stripe signature
    const sig = req.headers.get('stripe-signature')
    console.log('🧪 [TEST-WEBHOOK] Stripe signature present:', !!sig)
    console.log('🧪 [TEST-WEBHOOK] Stripe signature value:', sig)

    // Get body
    const buf = await req.arrayBuffer()
    const rawBody = Buffer.from(buf)
    const bodyText = rawBody.toString('utf8')

    console.log('🧪 [TEST-WEBHOOK] Body length:', rawBody.length)
    console.log('🧪 [TEST-WEBHOOK] Body preview:', bodyText.substring(0, 200))

    // Test signature verification if signature is present
    let signatureTest = 'no-signature'
    if (sig && process.env.STRIPE_WEBHOOK_SECRET) {
      try {
        console.log('🧪 [TEST-WEBHOOK] Testing signature verification...')
        const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
        signatureTest = 'valid'
        console.log('✅ [TEST-WEBHOOK] Signature verification successful!')
        console.log('🧪 [TEST-WEBHOOK] Event type:', event.type)
        console.log('🧪 [TEST-WEBHOOK] Event ID:', event.id)
      } catch (err: any) {
        signatureTest = `invalid: ${err.message}`
        console.error('❌ [TEST-WEBHOOK] Signature verification failed:', err.message)
      }
    }

    const response = {
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      data: {
        bodyLength: rawBody.length,
        hasStripeSignature: !!sig,
        signatureTest,
        contentType: headers['content-type'],
        userAgent: headers['user-agent'],
        headerCount: Object.keys(headers).length
      },
      environment: {
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        webhookSecretFormat: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ? 'valid' : 'invalid'
      }
    }

    console.log('🧪 [TEST-WEBHOOK] Response:', response)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [TEST-WEBHOOK] Error:', error)
    return NextResponse.json(
      { 
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}