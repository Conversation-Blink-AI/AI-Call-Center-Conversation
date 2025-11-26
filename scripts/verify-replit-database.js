
const Database = require('@replit/database')

async function verifyDatabase() {
  const db = new Database()
  
  console.log('🔍 Checking Replit Database...')
  
  try {
    // Check if database is initialized
    const initialized = await db.get('db:initialized')
    console.log('Database initialized:', initialized)
    
    // Check database stats
    const stats = {
      users: (await db.get('index:users') || []).length,
      teams: (await db.get('index:teams') || []).length,
      pathways: (await db.get('index:pathways') || []).length
    }
    
    console.log('Database stats:', stats)
    
    // List some sample data
    if (stats.users > 0) {
      const userIds = await db.get('index:users') || []
      const sampleUser = await db.get(`users:${userIds[0]}`)
      console.log('Sample user:', sampleUser ? { id: sampleUser.id, email: sampleUser.email, name: sampleUser.name } : 'None')
    }
    
    if (stats.teams > 0) {
      const teamIds = await db.get('index:teams') || []
      const sampleTeam = await db.get(`teams:${teamIds[0]}`)
      console.log('Sample team:', sampleTeam ? { id: sampleTeam.id, name: sampleTeam.name } : 'None')
    }
    
    if (stats.pathways > 0) {
      const pathwayIds = await db.get('index:pathways') || []
      const samplePathway = await db.get(`pathways:${pathwayIds[0]}`)
      console.log('Sample pathway:', samplePathway ? { id: samplePathway.id, name: samplePathway.name } : 'None')
    }
    
    // List all keys for debugging
    const allKeys = await db.list()
    console.log('\nAll database keys:')
    console.log(allKeys.slice(0, 20)) // Show first 20 keys
    if (allKeys.length > 20) {
      console.log(`... and ${allKeys.length - 20} more keys`)
    }
    
  } catch (error) {
    console.error('Error verifying database:', error)
  }
}

verifyDatabase()
