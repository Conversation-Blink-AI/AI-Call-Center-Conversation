import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripeClient'
import { getCurrentUser } from '@/lib/auth-utils'
import { getOrCreateStripeCustomer } from '@/lib/getOrCreateStripeCustomer'

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getOrigin(req: Request) {
  // Works behind Replit/Vercel proxies
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host  = req.headers.get('x-forwarded-host')  // Replit
            ?? req.headers.get('host');              // Fallback
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const amountCents = Math.round(amount * 100);
    const origin = getOrigin(req); // <-- use dynamic origin detection

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

    console.log('Creating Stripe session with:', {
      amount: amountCents,
      origin,
      userId,
      stripeCustomerId
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: stripeCustomerId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Wallet Top-up' },
          unit_amount: amountCents
        },
        quantity: 1
      }],
      success_url: `${origin}/dashboard/billing?success=1`,
      cancel_url:  `${origin}/dashboard/billing?canceled=1`,
      metadata: { user_id: userId }
    });

    console.log('Stripe session created:', {
      id: session.id,
      url: session.url,
      mode: session.mode,
      status: session.status
    });

    if (!session.url) {
      console.error('No URL returned from Stripe session');
      return NextResponse.json({ error: 'No checkout URL generated' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, id: session.id }, { status: 200 });
  } catch (err: any) {
    console.error('create-checkout-session error:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}