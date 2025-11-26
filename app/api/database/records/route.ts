import { NextResponse } from "next/server"
import { 
  createUserRecord,
  createTeamRecord,
  createPathwayRecord,
  getUserById,
  getTeamById,
  getPathwayById,
  getAllUsers,
  getAllTeams,
  getAllPathways
} from "@/lib/init-replit-database"
import { db } from "@/lib/replit-db-server"


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const id = searchParams.get('id')

    if (!table) {
      return NextResponse.json({ 
        success: false, 
        message: "Table parameter required" 
      }, { status: 400 })
    }

    if (id) {
      // Get specific record
      let record = null
      switch (table) {
        case 'users':
          record = await getUserById(id)
          if (record) {
            const { passwordHash, ...safeRecord } = record
            record = safeRecord
          }
          break
        case 'teams':
          record = await getTeamById(id)
          break
        case 'pathways':
          record = await getPathwayById(id)
          break
        default:
          return NextResponse.json({ 
            success: false, 
            message: "Invalid table name" 
          }, { status: 400 })
      }

      if (!record) {
        return NextResponse.json({ 
          success: false, 
          message: "Record not found" 
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: record })
    } else {
      // Get all records
      let records = []
      switch (table) {
        case 'users':
          records = await getAllUsers()
          break
        case 'teams':
          records = await getAllTeams()
          break
        case 'pathways':
          records = await getAllPathways()
          break
        default:
          return NextResponse.json({ 
            success: false, 
            message: "Invalid table name" 
          }, { status: 400 })
      }

      return NextResponse.json({ success: true, data: records })
    }

  } catch (error: any) {
    console.error("[DATABASE/RECORDS] GET Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { table, data } = await request.json()

    if (!table || !data) {
      return NextResponse.json({ 
        success: false, 
        message: "Table and data parameters required" 
      }, { status: 400 })
    }

    let record = null

    switch (table) {
      case 'users':
        if (!data.email) {
          return NextResponse.json({ 
            success: false, 
            message: "Email is required for user creation" 
          }, { status: 400 })
        }

        // Store password as plain text
        let passwordHash = ""
        if (data.password) {
          passwordHash = data.password
        } else {
          passwordHash = "defaultpassword123"
        }

        record = await createUserRecord({
          email: data.email,
          name: data.name || null,
          company: data.company || null,
          role: data.role || 'user',
          phone_number: data.phone_number || null,
          passwordHash
        })

        // Remove password hash from response
        const { passwordHash: _, ...safeRecord } = record
        record = safeRecord
        break

      case 'teams':
        if (!data.name || !data.owner_id) {
          return NextResponse.json({ 
            success: false, 
            message: "Name and owner_id are required for team creation" 
          }, { status: 400 })
        }

        record = await createTeamRecord({
          name: data.name,
          description: data.description || null,
          owner_id: data.owner_id
        })
        break

      case 'pathways':
        if (!data.name || !data.team_id || !data.creator_id) {
          return NextResponse.json({ 
            success: false, 
            message: "Name, team_id, and creator_id are required for pathway creation" 
          }, { status: 400 })
        }

        record = await createPathwayRecord({
          name: data.name,
          description: data.description || null,
          team_id: data.team_id,
          creator_id: data.creator_id,
          updater_id: data.updater_id || data.creator_id,
          data: data.pathwayData || null,
          bland_id: data.bland_id || null,
          phone_number: data.phone_number || null
        })
        break

      default:
        return NextResponse.json({ 
          success: false, 
          message: "Invalid table name" 
        }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      data: record,
      message: `${table.slice(0, -1)} created successfully`
    })

  } catch (error: any) {
    console.error("[DATABASE/RECORDS] POST Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { table, id, data } = await request.json()

    if (!table || !id || !data) {
      return NextResponse.json({ 
        success: false, 
        message: "Table, id, and data parameters required" 
      }, { status: 400 })
    }

    // Get existing record
    let existingRecord = null
    switch (table) {
      case 'users':
        existingRecord = await getUserById(id)
        break
      case 'teams':
        existingRecord = await getTeamById(id)
        break
      case 'pathways':
        existingRecord = await getPathwayById(id)
        break
      default:
        return NextResponse.json({ 
          success: false, 
          message: "Invalid table name" 
        }, { status: 400 })
    }

    if (!existingRecord) {
      return NextResponse.json({ 
        success: false, 
        message: "Record not found" 
      }, { status: 404 })
    }

    // Update record
    const updatedRecord = {
      ...existingRecord,
      ...data,
      updated_at: new Date().toISOString()
    }

    // Handle password updates for users
    if (table === 'users' && data.password) {
      updatedRecord.passwordHash = await bcrypt.hash(data.password, 12)
    }

    await db.set(`${table}:${id}`, updatedRecord)

    // Remove sensitive data from response
    if (table === 'users') {
      const { passwordHash, ...safeRecord } = updatedRecord
      return NextResponse.json({ 
        success: true, 
        data: safeRecord,
        message: "User updated successfully"
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedRecord,
      message: `${table.slice(0, -1)} updated successfully`
    })

  } catch (error: any) {
    console.error("[DATABASE/RECORDS] PUT Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { table, id } = await request.json()

    if (!table || !id) {
      return NextResponse.json({ 
        success: false, 
        message: "Table and id parameters required" 
      }, { status: 400 })
    }

    // Check if record exists
    const existingRecord = await db.get(`${table}:${id}`)
    if (!existingRecord) {
      return NextResponse.json({ 
        success: false, 
        message: "Record not found" 
      }, { status: 404 })
    }

    // Delete the record
    await db.delete(`${table}:${id}`)

    // Remove from indexes
    switch (table) {
      case 'users':
        const usersIndex = await db.get('index:users') || []
        const updatedUsersIndex = usersIndex.filter((userId: string) => userId !== id)
        await db.set('index:users', updatedUsersIndex)

        // Remove email lookup
        if (existingRecord.email) {
          await db.delete(`users:email:${existingRecord.email}`)
        }
        break

      case 'teams':
        const teamsIndex = await db.get('index:teams') || []
        const updatedTeamsIndex = teamsIndex.filter((teamId: string) => teamId !== id)
        await db.set('index:teams', updatedTeamsIndex)
        break

      case 'pathways':
        const pathwaysIndex = await db.get('index:pathways') || []
        const updatedPathwaysIndex = pathwaysIndex.filter((pathwayId: string) => pathwayId !== id)
        await db.set('index:pathways', updatedPathwaysIndex)
        break
    }

    return NextResponse.json({ 
      success: true, 
      message: `${table.slice(0, -1)} deleted successfully`
    })

  } catch (error: any) {
    console.error("[DATABASE/RECORDS] DELETE Error:", error)
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 })
  }
}