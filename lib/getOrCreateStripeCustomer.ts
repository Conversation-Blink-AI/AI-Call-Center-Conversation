
import { stripe } from './stripeClient'
import { db } from './db'

export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  try {
    // 1) Check if user already has a Stripe customer ID in our database
    const userResult = await db.query(
      'SELECT stripe_customer_id, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      throw new Error('User not found')
    }

    const user = userResult.rows[0]

    // 2) If we already have a Stripe customer ID, verify it exists in Stripe
    if (user.stripe_customer_id) {
      try {
        // Verify the customer exists in Stripe
        await stripe.customers.retrieve(user.stripe_customer_id)
        console.log(`✅ Using existing Stripe customer: ${user.stripe_customer_id}`)
        return user.stripe_customer_id
      } catch (error: any) {
        // Customer doesn't exist in Stripe (deleted or wrong account)
        console.warn(`⚠️ Stripe customer ${user.stripe_customer_id} not found in Stripe, will create new one`)
        // Clear the invalid customer ID from database
        await db.query(
          'UPDATE users SET stripe_customer_id = NULL, updated_at = $1 WHERE id = $2',
          [new Date().toISOString(), userId]
        )
        // Continue to create a new customer below
      }
    }

    // 3) Try to find existing customer by metadata (fallback for lost DB records)
    const searchResults = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
    })

    if (searchResults.data.length > 0) {
      const existingCustomer = searchResults.data[0]
      console.log(`✅ Found existing Stripe customer via metadata: ${existingCustomer.id}`)
      
      // Update our database with the found customer ID
      await db.query(
        'UPDATE users SET stripe_customer_id = $1, updated_at = $2 WHERE id = $3',
        [existingCustomer.id, new Date().toISOString(), userId]
      )

      return existingCustomer.id
    }

    // 4) Create new Stripe customer
    console.log(`🆕 Creating new Stripe customer for user: ${userId}`)
    
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.first_name || undefined,
      metadata: {
        userId: userId,
      },
    }, {
      // Idempotency key to prevent duplicates
      idempotencyKey: `create_customer_${userId}`
    })

    // 5) Save the customer ID to our database
    await db.query(
      'UPDATE users SET stripe_customer_id = $1, updated_at = $2 WHERE id = $3',
      [customer.id, new Date().toISOString(), userId]
    )

    console.log(`✅ Created and saved new Stripe customer: ${customer.id}`)
    return customer.id

  } catch (error) {
    console.error('❌ Error in getOrCreateStripeCustomer:', error)
    throw error
  }
}

// Optional: Function to sync user profile changes to Stripe
export async function syncUserProfileToStripe(userId: string): Promise<void> {
  try {
    const userResult = await db.query(
      'SELECT stripe_customer_id, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      throw new Error('User not found')
    }

    const user = userResult.rows[0]

    if (!user.stripe_customer_id) {
      console.log('No Stripe customer ID found, skipping sync')
      return
    }

    await stripe.customers.update(user.stripe_customer_id, {
      email: user.email,
      name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.first_name || undefined,
    })

    console.log(`✅ Synced user profile to Stripe customer: ${user.stripe_customer_id}`)
  } catch (error) {
    console.error('❌ Error syncing user profile to Stripe:', error)
    throw error
  }
}
