import { NextResponse } from "next/server"
import { Client } from "pg"
import * as fs from "fs"
import * as path from "path"
import csv from "csv-parser"
import * as bcrypt from "bcryptjs"
import { getSSLConfig } from "@/lib/db-client"

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

  try {
    const { fileName, tableName } = await request.json()

    if (!fileName || !tableName) {
      return NextResponse.json({
        success: false,
        message: "fileName and tableName are required"
      }, { status: 400 })
    }

    await pgClient.connect()
    console.log("✅ Connected to PostgreSQL")

    // Path to CSV files folder
    const csvFolderPath = path.join(process.cwd(), 'csv-data')
    const filePath = path.join(csvFolderPath, fileName)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        message: `CSV file '${fileName}' not found in csv-data folder`
      }, { status: 404 })
    }

    console.log(`🔄 Reading CSV file: ${fileName}`)

    const results: any[] = []

    // Read and parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject)
    })

    console.log(`📊 Found ${results.length} rows in CSV`)

    let insertedCount = 0
    let errorCount = 0

    // Process each row based on table type
    for (const row of results) {
      try {
        await processRow(pgClient, tableName, row)
        insertedCount++
        console.log(`✅ Inserted row ${insertedCount}`)
      } catch (error) {
        errorCount++
        console.error(`❌ Error inserting row:`, error.message)
        console.log('Row data:', JSON.stringify(row, null, 2))
      }
    }

    // Get final count
    const countResult = await pgClient.query(`SELECT COUNT(*) as count FROM ${tableName}`)
    const finalCount = parseInt(countResult.rows[0].count)

    return NextResponse.json({
      success: true,
      message: `CSV import completed for ${tableName}`,
      data: {
        fileName,
        tableName,
        totalRowsInCSV: results.length,
        successfulInserts: insertedCount,
        errors: errorCount,
        finalTableCount: finalCount
      }
    })

  } catch (error) {
    console.error("❌ CSV import error:", error)
    return NextResponse.json({
      success: false,
      message: "CSV import failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  } finally {
    await pgClient.end()
  }
}

async function processRow(pgClient: Client, tableName: string, row: any) {
  // Clean up row data - remove empty strings and convert to null
  const cleanRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().trim(),
      value === '' || value === null || value === undefined ? null : value
    ])
  )

  switch (tableName.toLowerCase()) {
    case 'users':
      await insertUser(pgClient, cleanRow)
      break
    case 'teams':
      await insertTeam(pgClient, cleanRow)
      break
    case 'pathways':
      await insertPathway(pgClient, cleanRow)
      break
    case 'phone_numbers':
      await insertPhoneNumber(pgClient, cleanRow)
      break
    default:
      throw new Error(`Unsupported table: ${tableName}`)
  }
}

async function insertUser(pgClient: Client, row: any) {
  // Hash password if provided, otherwise use default
  const passwordHash = row.password ? 
    row.password : 
    'defaultpassword123'

  // Split name into first_name and last_name if name field exists
  const nameParts = row.name ? row.name.trim().split(/\s+/) : []
  const firstName = row.first_name || (nameParts.length > 0 ? nameParts[0] : null)
  const lastName = row.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : null)

  const query = `
    INSERT INTO users (id, email, first_name, last_name, company, role, phone_number, password_hash, created_at, updated_at, last_login)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      company = EXCLUDED.company,
      role = EXCLUDED.role,
      phone_number = EXCLUDED.phone_number,
      updated_at = EXCLUDED.updated_at
  `

  const values = [
    row.id || generateUUID(),
    row.email,
    firstName,
    lastName,
    row.company,
    row.role || 'user',
    row.phone_number,
    passwordHash,
    row.created_at || new Date().toISOString(),
    row.updated_at || new Date().toISOString(),
    row.last_login
  ]

  await pgClient.query(query, values)
}

async function insertTeam(pgClient: Client, row: any) {
  const query = `
    INSERT INTO teams (id, name, description, owner_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      updated_at = EXCLUDED.updated_at
  `

  const values = [
    row.id || generateUUID(),
    row.name,
    row.description,
    row.owner_id,
    row.created_at || new Date().toISOString(),
    row.updated_at || new Date().toISOString()
  ]

  await pgClient.query(query, values)
}

async function insertPathway(pgClient: Client, row: any) {
  const query = `
    INSERT INTO pathways (id, name, description, team_id, creator_id, updater_id, created_at, updated_at, data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      team_id = EXCLUDED.team_id,
      updater_id = EXCLUDED.updater_id,
      updated_at = EXCLUDED.updated_at,
      data = EXCLUDED.data
  `

  // Parse JSON data if provided
  let pathwayData = {}
  if (row.data) {
    try {
      pathwayData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
    } catch (e) {
      console.warn('Invalid JSON in pathway data, using empty object')
    }
  }

  const values = [
    row.id || generateUUID(),
    row.name,
    row.description,
    row.team_id,
    row.creator_id,
    row.updater_id || row.creator_id,
    row.created_at || new Date().toISOString(),
    row.updated_at || new Date().toISOString(),
    JSON.stringify(pathwayData)
  ]

  await pgClient.query(query, values)
}

async function insertPhoneNumber(pgClient: Client, row: any) {
  const query = `
    INSERT INTO phone_numbers (id, phone_number, user_id, pathway_id, location, type, status, monthly_fee, assigned_to)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (phone_number) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      pathway_id = EXCLUDED.pathway_id,
      location = EXCLUDED.location,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      monthly_fee = EXCLUDED.monthly_fee,
      assigned_to = EXCLUDED.assigned_to
  `

  const values = [
    row.id || generateUUID(),
    row.phone_number,
    row.user_id,
    row.pathway_id,
    row.location,
    row.type || 'Local',
    row.status || 'Active',
    parseFloat(row.monthly_fee) || 0,
    row.assigned_to
  ]

  await pgClient.query(query, values)
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export async function GET() {
  const csvFolderPath = path.join(process.cwd(), 'csv-data')

  try {
    // Check if csv-data folder exists
    if (!fs.existsSync(csvFolderPath)) {
      return NextResponse.json({
        success: false,
        message: "csv-data folder not found. Please create it and add your CSV files.",
        availableFiles: []
      })
    }

    // List all CSV files in the folder
    const files = fs.readdirSync(csvFolderPath)
      .filter(file => file.toLowerCase().endsWith('.csv'))

    return NextResponse.json({
      success: true,
      message: `Found ${files.length} CSV files`,
      data: {
        csvFolderPath,
        availableFiles: files,
        supportedTables: ['users', 'teams', 'pathways', 'phone_numbers']
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Error reading csv-data folder",
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}