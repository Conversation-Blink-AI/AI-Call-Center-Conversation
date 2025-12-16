import { NextResponse } from "next/server"
import { Client } from "pg"
import { getSSLConfig } from "@/lib/db-client"

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      success: false,
      message: "DATABASE_URL environment variable is not set"
    }, { status: 500 })
  }

  const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig()
    })

  try {
    await client.connect()
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    const tables = tablesResult.rows.map(row => row.table_name)
    
    // Get schema for each table
    const schemas: Record<string, any> = {}
    
    for (const tableName of tables) {
      // Get columns
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName])

      // Get constraints (primary keys, foreign keys)
      const constraintsResult = await client.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY tc.constraint_type, tc.constraint_name
      `, [tableName])

      // Get indexes
      const indexesResult = await client.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = $1
      `, [tableName])

      schemas[tableName] = {
        columns: columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type,
          maxLength: col.character_maximum_length,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        })),
        constraints: constraintsResult.rows.map(con => ({
          name: con.constraint_name,
          type: con.constraint_type,
          column: con.column_name,
          foreignTable: con.foreign_table_name,
          foreignColumn: con.foreign_column_name
        })),
        indexes: indexesResult.rows.map(idx => ({
          name: idx.indexname,
          definition: idx.indexdef
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tables,
        schemas
      }
    })

  } catch (error: any) {
    console.error("[DATABASE/SCHEMA] Error:", error)
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 })
  } finally {
    await client.end()
  }
}

