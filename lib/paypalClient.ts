
import paypal from '@paypal/checkout-server-sdk'

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are missing')
  }

  if (process.env.NODE_ENV === 'production') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret)
  } else {
    return new paypal.core.SandboxEnvironment(clientId, clientSecret)
  }
}

function client() {
  return new paypal.core.PayPalHttpClient(environment())
}

export const paypalClient = client()
