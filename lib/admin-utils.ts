import { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getUserFromRequest, getCurrentUser } from "./auth-utils"
import { Client } from "pg"
import { getSSLConfig } from "./db-client"
import { encryptString } from "./encryption"

export interface AdminUser {
  id: string
  email: string
  name?: string | null
  role?: string | null
  is_admin?: boolean
}

/**
 * Check if a user has admin privileges
 */
export function isAdmin(user: any): boolean {
  return user?.is_admin === true
}

/**
 * Require admin access - throws error if user is not admin
 * Use this in API routes to protect admin endpoints
 */
export async function requireAdmin(request: NextRequest): Promise<AdminUser> {
  const user = await getUserFromRequest(request)
  
  if (!user) {
    throw new Error("Unauthorized: No authenticated user")
  }

  // Get full user from database to check is_admin flag
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })

  try {
    await client.connect()
    const result = await client.query(
      'SELECT id, email, first_name, last_name, role, is_admin FROM users WHERE id = $1',
      [user.id]
    )

    if (result.rows.length === 0) {
      throw new Error("Unauthorized: User not found")
    }

    const dbUser = result.rows[0]
    
    if (!dbUser.is_admin) {
      throw new Error("Forbidden: Admin access required")
    }

    // Construct name from first_name and last_name
    const name = dbUser.first_name && dbUser.last_name
      ? `${dbUser.first_name} ${dbUser.last_name}`.trim()
      : dbUser.first_name || dbUser.last_name || null

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: name,
      role: dbUser.role,
      is_admin: dbUser.is_admin
    }
  } finally {
    await client.end()
  }
}

/**
 * Require admin access using getCurrentUser (for routes without NextRequest)
 */
export async function requireAdminFromCookies(): Promise<AdminUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized: No authenticated user")
  }

  // Get full user from database to check is_admin flag
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })

  try {
    await client.connect()
    const result = await client.query(
      'SELECT id, email, first_name, last_name, role, is_admin FROM users WHERE id = $1',
      [user.id]
    )

    if (result.rows.length === 0) {
      throw new Error("Unauthorized: User not found")
    }

    const dbUser = result.rows[0]
    
    if (!dbUser.is_admin) {
      throw new Error("Forbidden: Admin access required")
    }

    // Construct name from first_name and last_name
    const name = dbUser.first_name && dbUser.last_name
      ? `${dbUser.first_name} ${dbUser.last_name}`.trim()
      : dbUser.first_name || dbUser.last_name || null

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: name,
      role: dbUser.role,
      is_admin: dbUser.is_admin
    }
  } finally {
    await client.end()
  }
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(params: {
  adminUserId: string
  action: string
  resourceType: string
  resourceId?: string | null
  oldValue?: any
  newValue?: any
  metadata?: any
  ipAddress?: string | null
}): Promise<void> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })

  try {
    await client.connect()
    
    const oldValueJson = params.oldValue ? JSON.stringify(params.oldValue) : null
    const newValueJson = params.newValue ? JSON.stringify(params.newValue) : null
    await client.query(
      `INSERT INTO admin_audit_logs (
        admin_user_id, action, resource_type, resource_id,
        old_value, old_value_enc, new_value, new_value_enc,
        metadata, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        params.adminUserId,
        params.action,
        params.resourceType,
        params.resourceId || null,
        oldValueJson,
        oldValueJson ? encryptString(oldValueJson) : null,
        newValueJson,
        newValueJson ? encryptString(newValueJson) : null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ipAddress || null
      ]
    )
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error("❌ [ADMIN-UTILS] Failed to log admin action:", error)
  } finally {
    await client.end()
  }
}

/**
 * Get IP address from request
 */
export function getIpAddress(request: NextRequest): string | null {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip") // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  return null
}
