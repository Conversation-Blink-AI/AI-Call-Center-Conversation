
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface UserData {
  id: string
  email: string
  name: string
  company?: string
  role: string
  phone_number?: string
  created_at: string
  updated_at: string
}

interface PhoneNumber {
  id: string
  phone_number: string
  pathway_id?: string
  status: string
  created_at: string
}

interface Pathway {
  id: string
  name: string
  description?: string
  flowchart_data: any
  created_at: string
  updated_at: string
}

export function useUserDataEnhanced() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserData() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch user profile
        const userResponse = await fetch("/api/auth/me")
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setUserData(userData)
        }

        // Fetch phone numbers
        const phoneResponse = await fetch("/api/user/phone-numbers")
        if (phoneResponse.ok) {
          const phoneData = await phoneResponse.json()
          setPhoneNumbers(phoneData.phoneNumbers || [])
        }

        // Fetch pathways
        const pathwaysResponse = await fetch("/api/flowcharts")
        if (pathwaysResponse.ok) {
          const pathwaysData = await pathwaysResponse.json()
          setPathways(pathwaysData.flowcharts || [])
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        setError("Failed to fetch user data")
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const refetch = async () => {
    if (user) {
      await fetchUserData()
    }
  }

  return {
    userData,
    phoneNumbers,
    pathways,
    loading,
    error,
    refetch
  }
}
