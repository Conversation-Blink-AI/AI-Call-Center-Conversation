
// User phone numbers using API routes instead of direct Supabase access

export interface UserPhoneNumber {
  id: string
  number: string
  status: string
  location?: string
  type?: string
  purchased_at: string
  user_id: string
}

export async function getUserPhoneNumbers(userId: string): Promise<UserPhoneNumber[]> {
  try {
    const response = await fetch(`/api/user/phone-numbers?userId=${userId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      console.error("Error fetching user phone numbers:", response.statusText)
      return []
    }

    const data = await response.json()
    return data.phoneNumbers || []
  } catch (error) {
    console.error("Error in getUserPhoneNumbers:", error)
    return []
  }
}

export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}
