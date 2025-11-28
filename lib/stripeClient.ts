
import Stripe from 'stripe'

// Lazy initialization to prevent build-time errors
let stripeInstance: Stripe | null = null

function getStripe(): Stripe | null {
  // Only initialize if we have a secret key
  // This prevents build-time errors when STRIPE_SECRET_KEY is not set
  if (!stripeInstance && process.env.STRIPE_SECRET_KEY) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    })
  }
  return stripeInstance
}

// Export a proxy object that lazily initializes Stripe
// During build (when STRIPE_SECRET_KEY is not set), this returns a mock that won't break the build
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe()
    if (!instance) {
      // During build or when STRIPE_SECRET_KEY is missing
      // Return a function that throws a helpful error when called
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          throw new Error(`Stripe not initialized: STRIPE_SECRET_KEY environment variable is required`)
        }
      }
      // For non-function properties, return undefined (routes should check for env var first)
      return undefined
    }
    const value = (instance as any)[prop]
    return typeof value === 'function' ? value.bind(instance) : value
  }
})
