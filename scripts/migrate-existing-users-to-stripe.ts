
import { db } from '../lib/db'
import { getOrCreateStripeCustomer } from '../lib/getOrCreateStripeCustomer'

async function migrateExistingUsers() {
  console.log('🔄 Starting migration of existing users to Stripe customers...')
  
  try {
    // Get all users who don't have a Stripe customer ID
    const usersResult = await db.query(
      'SELECT id, email, name FROM users WHERE stripe_customer_id IS NULL OR stripe_customer_id = \'\''
    )

    const users = usersResult.rows
    console.log(`Found ${users.length} users to migrate`)

    let successCount = 0
    let errorCount = 0

    for (const user of users) {
      try {
        console.log(`Migrating user: ${user.email} (${user.id})`)
        await getOrCreateStripeCustomer(user.id)
        successCount++
        console.log(`✅ Migrated user: ${user.email}`)
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        errorCount++
        console.error(`❌ Failed to migrate user ${user.email}:`, error)
      }
    }

    console.log('🎉 Migration completed!')
    console.log(`✅ Successfully migrated: ${successCount} users`)
    console.log(`❌ Failed migrations: ${errorCount} users`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    process.exit(0)
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateExistingUsers()
}

export { migrateExistingUsers }
