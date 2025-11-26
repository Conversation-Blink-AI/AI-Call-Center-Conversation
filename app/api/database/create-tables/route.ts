
import { NextResponse } from "next/server"
import { 
  initializeDatabase,
  createUserRecord,
  createTeamRecord,
  createPathwayRecord,
  createTeamMemberRecord,
  createActivityRecord,
  createInvitationRecord,
  createPhoneNumberRecord,
  getAllUsers,
  getAllTeams,
  getAllPathways,
  getDatabaseStats
} from "@/lib/init-replit-database"
import * as bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { action = 'create_all' } = await request.json()

    // Initialize database first
    await initializeDatabase()

    // Check if data already exists
    const stats = await getDatabaseStats()
    
    if (stats.users > 0 && action !== 'force_recreate') {
      return NextResponse.json({
        success: true,
        message: "Tables already exist with data",
        data: stats
      })
    }

    // Create sample data for all tables
    const passwordHash = await bcrypt.hash("password123", 12)
    
    // Create Users
    const user1 = await createUserRecord({
      email: "admin@replit.com",
      name: "Admin User",
      company: "Replit Inc",
      role: "admin",
      phone_number: "+1-555-0101",
      passwordHash
    })

    const user2 = await createUserRecord({
      email: "user@test.com",
      name: "Test User",
      company: "Test Company",
      role: "user",
      phone_number: "+1-555-0102",
      passwordHash
    })

    const user3 = await createUserRecord({
      email: "manager@example.com",
      name: "Manager User",
      company: "Example Corp",
      role: "manager",
      phone_number: "+1-555-0103",
      passwordHash
    })

    // Create Teams
    const team1 = await createTeamRecord({
      name: "Engineering Team",
      description: "Main development team",
      owner_id: user1.id
    })

    const team2 = await createTeamRecord({
      name: "Sales Team",
      description: "Customer acquisition team",
      owner_id: user2.id
    })

    // Create Team Members
    const member1 = await createTeamMemberRecord({
      team_id: team1.id,
      user_id: user2.id,
      role: "developer"
    })

    const member2 = await createTeamMemberRecord({
      team_id: team1.id,
      user_id: user3.id,
      role: "manager"
    })

    const member3 = await createTeamMemberRecord({
      team_id: team2.id,
      user_id: user1.id,
      role: "admin"
    })

    // Create Pathways
    const pathway1 = await createPathwayRecord({
      name: "Customer Onboarding Flow",
      description: "Standard customer onboarding call flow",
      team_id: team1.id,
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
              text: "Hello! Thank you for choosing our service. How can I help you today?",
              extractVars: []
            }
          },
          {
            id: "2",
            type: "questionNode",
            position: { x: 300, y: 200 },
            data: {
              name: "Qualification",
              text: "Can you tell me about your current situation?",
              extractVars: ["situation", "needs"]
            }
          }
        ],
        edges: [
          {
            id: "e1-2",
            source: "1",
            target: "2",
            type: "default"
          }
        ]
      },
      phone_number: "+1-555-1001"
    })

    const pathway2 = await createPathwayRecord({
      name: "Sales Qualification Call",
      description: "Qualifying potential customers",
      team_id: team2.id,
      creator_id: user2.id,
      updater_id: user2.id,
      data: {
        nodes: [
          {
            id: "1",
            type: "greetingNode",
            position: { x: 100, y: 100 },
            data: {
              name: "Sales Greeting",
              text: "Hi there! I'm calling to discuss how we can help your business grow.",
              extractVars: []
            }
          }
        ],
        edges: []
      },
      phone_number: "+1-555-1002"
    })

    // Create Activities
    const activity1 = await createActivityRecord({
      pathway_id: pathway1.id,
      user_id: user1.id,
      action: "created",
      details: { message: "Pathway created successfully" }
    })

    const activity2 = await createActivityRecord({
      pathway_id: pathway1.id,
      user_id: user3.id,
      action: "updated",
      details: { message: "Updated greeting node", changes: ["text"] }
    })

    const activity3 = await createActivityRecord({
      pathway_id: pathway2.id,
      user_id: user2.id,
      action: "created",
      details: { message: "Sales pathway initialized" }
    })

    // Create Invitations
    const invitation1 = await createInvitationRecord({
      email: "newuser@example.com",
      team_id: team1.id,
      role: "developer",
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    })

    const invitation2 = await createInvitationRecord({
      email: "contractor@freelance.com",
      team_id: team2.id,
      role: "member",
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days
    })

    // Create Phone Numbers
    const phone1 = await createPhoneNumberRecord({
      phoneNumber: "+1-555-1001",
      userId: user1.id,
      pathwayId: pathway1.id,
      location: "New York, NY",
      type: "Local",
      status: "Active",
      monthlyFee: 1.50,
      assignedTo: "Customer Onboarding"
    })

    const phone2 = await createPhoneNumberRecord({
      phoneNumber: "+1-555-1002",
      userId: user2.id,
      pathwayId: pathway2.id,
      location: "San Francisco, CA",
      type: "Local",
      status: "Active",
      monthlyFee: 1.50,
      assignedTo: "Sales Team"
    })

    const phone3 = await createPhoneNumberRecord({
      phoneNumber: "+1-800-555-0123",
      userId: user1.id,
      location: "Toll-Free",
      type: "Toll-Free",
      status: "Active",
      monthlyFee: 3.00,
      assignedTo: "General Inquiries"
    })

    // Get final stats
    const finalStats = await getDatabaseStats()
    const users = await getAllUsers()
    const teams = await getAllTeams()
    const pathways = await getAllPathways()

    return NextResponse.json({
      success: true,
      message: "All database tables created and populated successfully!",
      data: {
        stats: finalStats,
        created: {
          users: users.length,
          teams: teams.length,
          pathways: pathways.length,
          team_members: 3,
          activities: 3,
          invitations: 2,
          phone_numbers: 3
        },
        sample_data: {
          users: users.slice(0, 2),
          teams: teams.slice(0, 2),
          pathways: pathways.slice(0, 2)
        }
      }
    })

  } catch (error) {
    console.error("Error creating tables:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to create tables",
      error: error instanceof Error ? error.message : "Unknown error"
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
      data: {
        stats,
        counts: {
          users: users.length,
          teams: teams.length,
          pathways: pathways.length
        },
        samples: {
          users: users.slice(0, 3),
          teams: teams.slice(0, 2),
          pathways: pathways.slice(0, 2)
        }
      }
    })
  } catch (error) {
    console.error("Error fetching table data:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to fetch table data",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
