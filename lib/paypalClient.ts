
import paypal from '@paypal/checkout-server-sdk'

// Lazy initialization to prevent build-time errors
let paypalClientInstance: paypal.core.PayPalHttpClient | null = null

function getPaypalClient(): paypal.core.PayPalHttpClient {
  if (!paypalClientInstance) {
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials are missing. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.')
    }

    let environment: paypal.core.Environment
    if (process.env.NODE_ENV === 'production') {
      environment = new paypal.core.LiveEnvironment(clientId, clientSecret)
    } else {
      environment = new paypal.core.SandboxEnvironment(clientId, clientSecret)
    }

    paypalClientInstance = new paypal.core.PayPalHttpClient(environment)
  }
  return paypalClientInstance
}

// Export a proxy object that lazily initializes PayPal client
// This allows the module to load during build without requiring PayPal credentials
export const paypalClient = new Proxy({} as paypal.core.PayPalHttpClient, {
  get(_target, prop) {
    try {
      const instance = getPaypalClient()
      const value = (instance as any)[prop]
      return typeof value === 'function' ? value.bind(instance) : value
    } catch (error) {
      // During build or when PayPal credentials are missing, return a function that throws
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          throw new Error(`PayPal not initialized: ${error instanceof Error ? error.message : 'PayPal credentials are required'}`)
        }
      }
      throw error
    }
  }
})
