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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const status = searchParams.get('status') || 'paid' // Default to paid invoices

    // Get or create Stripe customer for this user
    const stripeCustomerId = await getOrCreateStripeCustomer(userId)

    console.log('🔍 [INVOICES] Fetching invoices for customer:', stripeCustomerId)

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      status: status as 'paid' | 'open' | 'draft' | 'uncollectible' | 'void',
      limit: limit,
    })

    console.log(`✅ [INVOICES] Found ${invoices.data.length} invoices`)

    // Transform Stripe invoices to our format
    const formattedInvoices = invoices.data.map((invoice) => {
      // Use amount_paid for paid invoices, fallback to total for other statuses
      const amountCents = invoice.amount_paid || invoice.total || 0
      const amount = (amountCents / 100).toFixed(2)
      
      return {
        id: invoice.id,
        number: invoice.number || invoice.id,
        date: new Date(invoice.created * 1000).toISOString().split('T')[0], // Format as YYYY-MM-DD
        description: invoice.description || 
                     invoice.lines?.data[0]?.description || 
                     'Invoice Payment',
        amount: amount,
        amountFormatted: `$${amount}`,
        status: invoice.status,
        invoicePdf: invoice.invoice_pdf, // URL to download the invoice PDF
        hostedInvoiceUrl: invoice.hosted_invoice_url, // URL to view invoice in Stripe
        currency: invoice.currency?.toUpperCase() || 'USD',
      }
    })

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
      total: invoices.data.length,
    })
  } catch (error: any) {
    console.error('❌ [INVOICES] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch invoices' 
      },
      { status: 500 }
    )
  }
}
