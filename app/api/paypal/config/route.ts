// app/api/paypal/config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const env = process.env.PAYPAL_ENV || 'sandbox';

  if (!clientId) {
    return NextResponse.json(
      { error: 'PayPal client ID not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({ clientId, env });
}
