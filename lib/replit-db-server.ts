
import Database from "@replit/database"
import * as crypto from "crypto"
import * as jwt from "jsonwebtoken"
import * as bcrypt from "bcryptjs"

const db = new Database()

// Export db for use in other server-side files
export { db }

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// User management functions
export async function createUser(userData: {
  email: string
  password: string
  name?: string
  company?: string
  phoneNumber?: string
}) {
  const { email, password, name, company, phoneNumber } = userData
  
  // Check if user exists using new structure
  const existingUserId = await db.get(`users:email:${email}`)
  if (existingUserId) {
    throw new Error("User already exists")
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12)

  // Get counter and create new user ID
  const counter = await db.get('counters:users') || 0
  const newCounter = counter + 1
  await db.set('counters:users', newCounter)

  const userId = `user_${newCounter.toString().padStart(8, '0')}`
  const now = new Date().toISOString()

  const user = {
    id: userId,
    email,
    name: name || null,
    company: company || null,
    role: "user",
    phone_number: phoneNumber || null,
    created_at: now,
    updated_at: now,
    last_login: null,
    passwordHash
  }

  // Save user to database using new structure
  await db.set(`users:${userId}`, user)
  await db.set(`users:email:${email}`, userId) // Email lookup
  
  // Add to users index
  const usersIndex = await db.get('index:users') || []
  usersIndex.push(userId)
  await db.set('index:users', usersIndex)

  return user
}

export async function getUserByEmail(email: string) {
  const userId = await db.get(`users:email:${email}`)
  if (!userId) return null
  return await db.get(`users:${userId}`)
}

export async function getUserById(userId: string) {
  return await db.get(`users:${userId}`)
}

export async function updateUser(email: string, updates: any) {
  const userId = await db.get(`users:email:${email}`)
  if (!userId) throw new Error("User not found")
  
  const user = await db.get(`users:${userId}`)
  if (!user) throw new Error("User not found")
  
  const updatedUser = {
    ...user,
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  await db.set(`users:${userId}`, updatedUser)
  return updatedUser
}

export async function verifyPassword(email: string, password: string) {
  const userId = await db.get(`users:email:${email}`)
  if (!userId) return false
  
  const user = await db.get(`users:${userId}`)
  if (!user) return false
  
  return await bcrypt.compare(password, user.passwordHash)
}

export async function generateJWT(userId: string) {
  return jwt.sign(
    { userId, exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) }, // 24 hours
    JWT_SECRET
  )
}

export async function verifyJWT(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// Pathway management functions
export async function savePathway(pathwayData: {
  id?: string
  name: string
  description?: string
  creatorId: string
  phoneNumber?: string
  data: any
}) {
  const pathwayId = pathwayData.id || `pathway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const pathway = {
    id: pathwayId,
    name: pathwayData.name,
    description: pathwayData.description || null,
    creatorId: pathwayData.creatorId,
    phoneNumber: pathwayData.phoneNumber || null,
    data: pathwayData.data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await db.set(`pathway:${pathwayId}`, pathway)
  
  // Add to user's pathways list
  const userPathways = await db.get(`userPathways:${pathwayData.creatorId}`) || []
  if (!userPathways.includes(pathwayId)) {
    userPathways.push(pathwayId)
    await db.set(`userPathways:${pathwayData.creatorId}`, userPathways)
  }

  return pathway
}

export async function getPathway(pathwayId: string) {
  return await db.get(`pathway:${pathwayId}`)
}

export async function getUserPathways(userId: string) {
  const pathwayIds = await db.get(`userPathways:${userId}`) || []
  const pathways = []
  
  for (const pathwayId of pathwayIds) {
    const pathway = await db.get(`pathway:${pathwayId}`)
    if (pathway) pathways.push(pathway)
  }
  
  return pathways
}

export async function updatePathway(pathwayId: string, updates: any) {
  const pathway = await db.get(`pathway:${pathwayId}`)
  if (!pathway) throw new Error("Pathway not found")
  
  const updatedPathway = {
    ...pathway,
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  await db.set(`pathway:${pathwayId}`, updatedPathway)
  return updatedPathway
}

// Phone number management
export async function savePhoneNumber(phoneData: {
  phoneNumber: string
  userId: string
  pathwayId?: string
  purchasedAt?: string
  location?: string
  type?: string
  status?: string
}) {
  const { Client } = await import('pg')
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    const result = await client.query(
      `INSERT INTO phone_numbers (phone_number, user_id, location, type, status, pathway_id, purchased_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (phone_number) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         location = EXCLUDED.location,
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         pathway_id = EXCLUDED.pathway_id
       RETURNING *`,
      [
        phoneData.phoneNumber,
        phoneData.userId,
        phoneData.location || 'Unknown',
        phoneData.type || 'Local',
        phoneData.status || 'active',
        phoneData.pathwayId,
        phoneData.purchasedAt || new Date().toISOString()
      ]
    )
    
    const savedPhone = result.rows[0]
    return {
      phoneNumber: savedPhone.phone_number,
      userId: savedPhone.user_id,
      location: savedPhone.location,
      type: savedPhone.type,
      status: savedPhone.status,
      purchasedAt: savedPhone.purchased_at,
      pathwayId: savedPhone.pathway_id
    }
  } finally {
    await client.end()
  }
}

export async function getUserPhoneNumbers(userId: string) {
  const phoneNumbers = await db.get(`userPhones:${userId}`) || []
  const phones = []
  
  for (const phoneNumber of phoneNumbers) {
    const phone = await db.get(`phone:${phoneNumber}`)
    if (phone) phones.push(phone)
  }
  
  return phones
}

// Call history management
export async function saveCall(callData: {
  id?: string
  toNumber: string
  fromNumber: string
  startTime: string
  duration: number
  status: string
  pathwayId?: string
  pathwayName?: string
  userId: string
}) {
  const callId = callData.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const call = {
    ...callData,
    id: callId,
    createdAt: new Date().toISOString()
  }

  await db.set(`call:${callId}`, call)
  
  // Add to user's calls
  const userCalls = await db.get(`userCalls:${callData.userId}`) || []
  userCalls.unshift(callId) // Add to beginning for recent calls
  
  // Keep only last 100 calls
  if (userCalls.length > 100) {
    userCalls.splice(100)
  }
  
  await db.set(`userCalls:${callData.userId}`, userCalls)

  return call
}

export async function getUserCalls(userId: string) {
  const callIds = await db.get(`userCalls:${userId}`) || []
  const calls = []
  
  for (const callId of callIds) {
    const call = await db.get(`call:${callId}`)
    if (call) calls.push(call)
  }
  
  return calls
}

// Database utility functions
export async function listAllKeys() {
  return await db.list()
}

export async function getAllUsers() {
  const keys = await db.list()
  const userKeys = keys.filter(key => key.startsWith('user:'))
  const users = []
  
  for (const key of userKeys) {
    const user = await db.get(key)
    if (user) {
      // Remove password hash for security
      const { passwordHash, ...safeUser } = user
      users.push(safeUser)
    }
  }
  
  return users
}

export default db
