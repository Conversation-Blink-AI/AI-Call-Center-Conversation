import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getOrCreateStripeCustomer } from '@/lib/getOrCreateStripeCustomer'
import { stripe } from '@/lib/stripeClient'

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
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
    const invoiceId = params.invoiceId

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer for this user
    const stripeCustomerId = await getOrCreateStripeCustomer(userId)

    console.log('🔍 [INVOICE-DOWNLOAD] Fetching invoice:', invoiceId, 'for customer:', stripeCustomerId)

    // Retrieve the invoice from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId)

    // Verify that this invoice belongs to the authenticated user
    // Handle both string (customer ID) and expanded Customer object
    const invoiceCustomerId = typeof invoice.customer === 'string' 
      ? invoice.customer 
      : invoice.customer?.id

    if (invoiceCustomerId !== stripeCustomerId) {
      console.error('❌ [INVOICE-DOWNLOAD] Invoice does not belong to user', {
        invoiceCustomerId,
        stripeCustomerId
      })
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 403 }
      )
    }

    // Check if invoice PDF is available
    if (!invoice.invoice_pdf) {
      console.warn('⚠️ [INVOICE-DOWNLOAD] Invoice PDF not available for invoice:', invoiceId)
      return NextResponse.json(
        { error: 'Invoice PDF not available' },
        { status: 404 }
      )
    }

    console.log('✅ [INVOICE-DOWNLOAD] Invoice PDF URL:', invoice.invoice_pdf)

    // Fetch the PDF from Stripe
    const pdfResponse = await fetch(invoice.invoice_pdf)
    
    if (!pdfResponse.ok) {
      console.error('❌ [INVOICE-DOWNLOAD] Failed to fetch PDF from Stripe')
      return NextResponse.json(
        { error: 'Failed to fetch invoice PDF' },
        { status: 500 }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfArray = new Uint8Array(pdfBuffer)

    // Return the PDF with appropriate headers
    return new NextResponse(pdfArray, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.number || invoiceId}.pdf"`,
        'Content-Length': pdfArray.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('❌ [INVOICE-DOWNLOAD] Error:', error)
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to download invoice' 
      },
      { status: 500 }
    )
  }
}
