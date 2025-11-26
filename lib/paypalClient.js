
import paypal from '@paypal/checkout-server-sdk'

// Read environment variables
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

// Validate required environment variables
if (!PAYPAL_CLIENT_ID) {
  throw new Error('PAYPAL_CLIENT_ID environment variable is required')
}

if (!PAYPAL_CLIENT_SECRET) {
  throw new Error('PAYPAL_CLIENT_SECRET environment variable is required')
}

// Create the appropriate environment
let environment
if (PAYPAL_ENV === 'live' || PAYPAL_ENV === 'production') {
  environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
} else {
  environment = new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
}

// Create and export the PayPal HTTP client
export const paypalClient = new paypal.core.PayPalHttpClient(environment)
