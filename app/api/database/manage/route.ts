
import { NextResponse } from "next/server"
import { 
  getAllUsers,
  getAllTeams, 
  getAllPathways,
  getUserPhoneNumbers,
  getDatabaseStats
} from "@/lib/init-replit-database"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    switch (table) {
      case 'users':
        const users = await getAllUsers()
        return NextResponse.json({ success: true, data: users })

      case 'teams':
        const teams = await getAllTeams()
        return NextResponse.json({ success: true, data: teams })

      case 'pathways':
        const pathways = await getAllPathways()
        return NextResponse.json({ success: true, data: pathways })

      case 'stats':
        const stats = await getDatabaseStats()
        return NextResponse.json({ success: true, data: stats })

      default:
        // Return overview
        const [usersData, teamsData, pathwaysData, statsData] = await Promise.all([
          getAllUsers(),
          getAllTeams(),
          getAllPathways(),
          getDatabaseStats()
        ])

        return NextResponse.json({
          success: true,
          data: {
            users: usersData.slice(0, 5),
            teams: teamsData.slice(0, 5),
            pathways: pathwaysData.slice(0, 5),
            stats: statsData
          }
        })
    }

  } catch (error: any) {
    console.error("[DATABASE/MANAGE] Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'add_phone_number') {
      const { userId, phoneNumber, location, type, pathwayId } = data

      if (!userId || !phoneNumber) {
        return NextResponse.json({ 
          success: false, 
          message: "User ID and phone number are required" 
        }, { status: 400 })
      }

      // Use PostgreSQL to save phone number with RLS
      const { Client } = await import('pg')
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      })

      try {
        await client.connect()
        
        // Set user context for RLS
        await client.query(`SET app.current_user_id = '${userId}'`)
        
        const result = await client.query(
          `INSERT INTO phone_numbers (phone_number, user_id, location, type, status, purchased_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [
            phoneNumber,
            userId,
            location || 'Unknown',
            type || 'Local',
            'active'
          ]
        )
        
        const savedPhone = result.rows[0]
        console.log("✅ [DATABASE/MANAGE] Phone number added:", savedPhone)

        return NextResponse.json({
          success: true,
          message: "Phone number added successfully",
          data: {
            phoneNumber: savedPhone.phone_number,
            userId: savedPhone.user_id,
            location: savedPhone.location,
            type: savedPhone.type,
            status: savedPhone.status,
            purchasedAt: savedPhone.purchased_at
          }
        })
      } finally {
        await client.end()
      }
    }

    return NextResponse.json({ 
      success: false, 
      message: "Invalid action" 
    }, { status: 400 })

  } catch (error: any) {
    console.error("[DATABASE/MANAGE] POST Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}
