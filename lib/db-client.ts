// Shared database client configuration
import { Client } from "pg"

// Helper function to get SSL config for DigitalOcean and other cloud databases
export function getSSLConfig() {
  const dbUrl = process.env.DATABASE_URL || ""
  const isProduction = process.env.NODE_ENV === "production"
  
  // If no database URL, return undefined
  if (!dbUrl) {
    return undefined
  }
  
  // Check if connecting to localhost - no SSL needed for local development
  const isLocalhost = dbUrl.includes("localhost") || 
                      dbUrl.includes("127.0.0.1") || 
                      dbUrl.includes("::1") ||
                      dbUrl.match(/postgresql?:\/\/[^:]+@(localhost|127\.0\.0\.1)/)
  
  // For localhost connections, only use SSL if explicitly required
  if (isLocalhost && !dbUrl.includes("sslmode=require")) {
    return undefined
  }
  
  // For all remote/non-localhost connections, enable SSL with self-signed cert support
  // This covers DigitalOcean, AWS RDS, and other cloud databases
  // Most cloud databases require SSL and use self-signed certificates
  if (!isLocalhost) {
    return { rejectUnauthorized: false }
  }
  
  // If sslmode=require or sslmode=prefer is in the connection string, enable SSL
  if (dbUrl.includes("sslmode=require") || dbUrl.includes("sslmode=prefer")) {
    return { rejectUnauthorized: false }
  }
  
  // For production environments, always use SSL
  if (isProduction) {
    return { rejectUnauthorized: false }
  }
  
  // Default: no SSL for local development
  return undefined
}

/**
 * Creates a PostgreSQL client with proper SSL configuration
 * Use this function instead of creating Client instances directly
 */
export function createDatabaseClient() {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig()
  })
}

