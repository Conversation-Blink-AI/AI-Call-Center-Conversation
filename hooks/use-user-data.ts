import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

interface PhoneNumber {
  id: string
  number: string
  status: string
  location?: string
  type?: string
  created_at?: string
  purchased_at?: string
  user_id?: string
  pathway_id?: string
}

export function useUserPhoneNumbers() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchPhoneNumbers = async () => {
    if (!user?.id) {
      console.log("🔍 [USE-USER-DATA] No authenticated user, skipping fetch")
      setPhoneNumbers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [USE-USER-DATA] Fetching phone numbers for user:", user.id)

      const response = await fetch(`/api/user/phone-numbers?userId=${user.id}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [USE-USER-DATA] Phone numbers fetched from API:", {
          count: data?.phoneNumbers?.length || 0,
          userId: user.id,
        })

        setPhoneNumbers(data.phoneNumbers || [])
      } else if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.")
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `API request failed with status ${response.status}`)
      }
    } catch (fetchError: any) {
      console.error("❌ [USE-USER-DATA] Error fetching phone numbers:", fetchError.message)
      setError(fetchError.message || "Failed to fetch phone numbers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPhoneNumbers()
  }, [user?.id])

  const refetch = () => {
    fetchPhoneNumbers()
  }

  return {
    phoneNumbers,
    loading,
    error,
    refetch,
  }
}

// Legacy function for backward compatibility
export function useUserPathways() {
  return {
    pathways: [],
    loading: false,
    error: null,
    refetch: () => {},
  }
}

export function useUserTeams() {
  return {
    teams: [],
    loading: false,
    error: null,
    refetch: () => {},
  }
}