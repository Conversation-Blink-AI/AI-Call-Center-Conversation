
// Client-side database interface - no server dependencies
export interface User {
  id: string
  email: string
  name: string | null
  company: string | null
  role: string
  phone_number: string | null
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface Team {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Pathway {
  id: string
  name: string
  description: string | null
  team_id: string
  creator_id: string
  updater_id: string
  created_at: string
  updated_at: string
  data: any
  bland_id: string | null
  phone_number: string | null
}

// Client-side API functions
export async function createUser(userData: {
  email: string
  password: string
  name?: string
  company?: string
  phoneNumber?: string
}) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create user')
  }
  
  return response.json()
}

export async function loginUser(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Login failed')
  }
  
  return response.json()
}

export async function getCurrentUser() {
  const response = await fetch('/api/auth/me')
  
  if (!response.ok) {
    throw new Error('Not authenticated')
  }
  
  return response.json()
}

export async function logoutUser() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST'
  })
  
  return response.ok
}

export async function savePathway(pathwayData: {
  id?: string
  name: string
  description?: string
  phoneNumber?: string
  data: any
}) {
  const response = await fetch('/api/pathways', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pathwayData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to save pathway')
  }
  
  return response.json()
}

export async function getUserPathways() {
  const response = await fetch('/api/pathways')
  
  if (!response.ok) {
    throw new Error('Failed to fetch pathways')
  }
  
  return response.json()
}

export async function getUserPhoneNumbers() {
  const response = await fetch('/api/user/phone-numbers')
  
  if (!response.ok) {
    throw new Error('Failed to fetch phone numbers')
  }
  
  return response.json()
}

// Helper function to add phone number to user
export async function addUserPhoneNumber(phoneData: {
  phoneNumber: string
  location?: string
  type?: string
  pathwayId?: string
}) {
  const response = await fetch('/api/user/phone-numbers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(phoneData)
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to add phone number')
  }
  
  return response.json()
}
