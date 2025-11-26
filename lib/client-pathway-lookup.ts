
"use client"

// Client-side pathway lookup utilities
// This file handles pathway lookups from the browser

export async function lookupPathwayByPhoneNumber(phoneNumber: string) {
  try {
    const response = await fetch(`/api/lookup-pathway?phoneNumber=${encodeURIComponent(phoneNumber)}`)
    
    if (!response.ok) {
      throw new Error(`Failed to lookup pathway: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error looking up pathway:", error)
    throw error
  }
}

export async function getPathwayId(phoneNumber: string) {
  try {
    const response = await fetch(`/api/pathway-id?phoneNumber=${encodeURIComponent(phoneNumber)}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get pathway ID: ${response.statusText}`)
    }

    const data = await response.json()
    return data.pathwayId
  } catch (error) {
    console.error("Error getting pathway ID:", error)
    throw error
  }
}

export async function getUserPhoneNumbers() {
  try {
    const response = await fetch("/api/user/phone-numbers")
    
    if (!response.ok) {
      throw new Error(`Failed to get phone numbers: ${response.statusText}`)
    }

    const data = await response.json()
    return data.phoneNumbers || []
  } catch (error) {
    console.error("Error getting phone numbers:", error)
    throw error
  }
}
