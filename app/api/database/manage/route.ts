
import { NextResponse } from "next/server"
import { 
  getAllUsers,
  getAllTeams, 
  getAllPathways,
  getUserPhoneNumbers,
  getDatabaseStats
} from "@/lib/init-replit-database"
import { getSSLConfig } from "@/lib/db-client"
import { encryptString, hashPhoneNumber, phoneLast4 } from "@/lib/encryption"
import { toE164Format } from "@/utils/phone-utils"

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
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

      try {
        await client.connect()
        
        // Set user context for RLS
        await client.query(`SET app.current_user_id = '${userId}'`)
        
      const normalizedPhone = toE164Format(phoneNumber)
      const result = await client.query(
          `INSERT INTO phone_numbers (
            phone_number,
            phone_number_enc,
            phone_number_hash,
            phone_number_last4,
            user_id,
            location,
            type,
            status,
            purchased_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING *`,
          [
            normalizedPhone,
            encryptString(normalizedPhone),
            hashPhoneNumber(normalizedPhone),
            phoneLast4(normalizedPhone),
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
