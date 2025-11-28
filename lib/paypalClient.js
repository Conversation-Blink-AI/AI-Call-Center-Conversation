
import paypal from '@paypal/checkout-server-sdk'

// Lazy initialization to prevent build-time errors
let paypalClientInstance = null

function getPaypalClient() {
  if (!paypalClientInstance) {
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
    paypalClientInstance = new paypal.core.PayPalHttpClient(environment)
  }
  return paypalClientInstance
}

// Export a proxy object that lazily initializes PayPal client
// This allows the module to load during build without requiring PayPal credentials
export const paypalClient = new Proxy({}, {
  get(_target, prop) {
    try {
      const instance = getPaypalClient()
      const value = instance[prop]
      return typeof value === 'function' ? value.bind(instance) : value
    } catch (error) {
      // During build or when PayPal credentials are missing, return a function that throws
      if (typeof prop === 'string') {
        return (...args) => {
          throw new Error(`PayPal not initialized: ${error.message || 'PayPal credentials are required'}`)
        }
      }
      throw error
    }
  }
})
