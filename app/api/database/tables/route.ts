
import { NextResponse } from "next/server"
import { 
  initializeDatabase,
  createUserRecord,
  createTeamRecord,
  createPathwayRecord,
  getAllUsers,
  getAllTeams,
  getAllPathways,
  getDatabaseStats
} from "@/lib/init-replit-database"
import * as bcrypt from "bcryptjs"

export async function GET() {
  try {
    const stats = await getDatabaseStats()
    const users = await getAllUsers()
    const teams = await getAllTeams()
    const pathways = await getAllPathways()

    return NextResponse.json({
      success: true,
      data: {
        stats,
        tables: {
          users: users.length > 0 ? users.slice(0, 3) : [],
          teams: teams.length > 0 ? teams.slice(0, 3) : [],
          pathways: pathways.length > 0 ? pathways.slice(0, 3) : []
        }
      }
    })
  } catch (error) {
    console.error("Error fetching tables:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to fetch tables",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    if (action === 'create_sample_data') {
      // Initialize database first
      await initializeDatabase()

      // Create sample data if tables are empty
      const stats = await getDatabaseStats()
      
      if (stats.users === 0) {
        const passwordHash = await bcrypt.hash("password123", 12)
        
        // Create users
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

        // Create team
        const team = await createTeamRecord({
          name: "Default Team",
          description: "Main company team",
          owner_id: user1.id
        })

        // Create pathway
        const pathway = await createPathwayRecord({
          name: "Welcome Call Flow",
          description: "Standard welcome call pathway",
          team_id: team.id,
          creator_id: user1.id,
          updater_id: user1.id,
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
          message: "Sample data created successfully",
          data: {
            users: [user1, user2],
            teams: [team],
            pathways: [pathway]
          }
        })
      } else {
        return NextResponse.json({
          success: true,
          message: "Sample data already exists"
        })
      }
    }

    return NextResponse.json({
      success: false,
      message: "Invalid action"
    })
  } catch (error) {
    console.error("Error creating tables:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to create tables",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
