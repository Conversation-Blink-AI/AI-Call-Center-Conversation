
import { NextResponse } from "next/server"
import { 
  initializeDatabase, 
  clearDatabase, 
  getDatabaseStats,
  createUserRecord,
  createTeamRecord,
  createPathwayRecord,
  getAllUsers,
  getAllTeams,
  getAllPathways
} from "@/lib/init-replit-database"
import * as bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'initialize':
        await initializeDatabase()
        return NextResponse.json({ 
          success: true, 
          message: "Database initialized successfully" 
        })

      case 'clear':
        await clearDatabase()
        return NextResponse.json({ 
          success: true, 
          message: "Database cleared successfully" 
        })

      case 'seed':
        // Initialize first
        await initializeDatabase()

        // Create sample users
        const passwordHash = await bcrypt.hash("password123", 12)
        
        const user1 = await createUserRecord({
          email: "admin@example.com",
          name: "Admin User",
          company: "Replit Inc",
          role: "admin",
          phone_number: "+1234567890",
          passwordHash
        })

        const user2 = await createUserRecord({
          email: "user@example.com", 
          name: "Regular User",
          company: "Test Company",
          role: "user",
          phone_number: "+1987654321",
          passwordHash
        })

        // Create sample team
        const team1 = await createTeamRecord({
          name: "Default Team",
          description: "Main company team",
          owner_id: user1.id
        })

        // Create sample pathway
        const pathway1 = await createPathwayRecord({
          name: "Welcome Call Flow",
          description: "Standard welcome call pathway",
          team_id: team1.id,
          creator_id: user1.id,
          data: {
            nodes: [
              {
                id: "1",
                type: "greetingNode",
                position: { x: 100, y: 100 },
                data: { 
                  name: "Welcome",
                  text: "Hello! Welcome to our service.",
                  extractVars: []
                }
              }
            ],
            edges: []
          }
        })

        return NextResponse.json({ 
          success: true, 
          message: "Database seeded with sample data",
          data: {
            users: [user1, user2],
            teams: [team1],
            pathways: [pathway1]
          }
        })

      case 'stats':
        const stats = await getDatabaseStats()
        return NextResponse.json({ 
          success: true, 
          stats 
        })

      default:
        return NextResponse.json({ 
          success: false, 
          message: "Invalid action" 
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error("[DATABASE/INIT] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const stats = await getDatabaseStats()
    const users = await getAllUsers()
    const teams = await getAllTeams()
    const pathways = await getAllPathways()

    return NextResponse.json({
      success: true,
      stats,
      data: {
        users: users.slice(0, 10), // Limit for display
        teams: teams.slice(0, 10),
        pathways: pathways.slice(0, 10)
      }
    })

  } catch (error: any) {
    console.error("[DATABASE/INIT] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}
