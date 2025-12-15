// Shared database client configuration
import { Client } from "pg"

// Helper function to get SSL config for DigitalOcean and other cloud databases
export function getSSLConfig() {
  const dbUrl = process.env.DATABASE_URL || ""
  const isProduction = process.env.NODE_ENV === "production"
  
  // Check if connecting to DigitalOcean (by IP or hostname)
  if (dbUrl.includes("ondigitalocean.com") || dbUrl.includes("157.245.104.224")) {
    // DigitalOcean uses self-signed certificates, so we need to allow them
    return { rejectUnauthorized: false }
  }
  
  // If sslmode=require or sslmode=prefer is in the connection string, enable SSL
  if (dbUrl.includes("sslmode=require") || dbUrl.includes("sslmode=prefer")) {
    return { rejectUnauthorized: false }
  }
  
  // For production environments, default to SSL with self-signed cert support
  // Most cloud databases (AWS RDS, DigitalOcean, etc.) require SSL in production
  if (isProduction && dbUrl) {
    return { rejectUnauthorized: false }
  }
  
  // For development, only use SSL if explicitly required
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

