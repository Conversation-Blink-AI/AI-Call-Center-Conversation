'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Plus, MapPin, Calendar } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

interface PhoneNumber {
  id: string
  number: string
  location: string
  status: string
  type: string
  purchased_at: string
  user_id: string
  monthly_fee: number;
  assigned_to: string;
}

export default function PhoneNumbersPage() {
  const { user } = useAuth()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchPhoneNumbers()
    } else {
      setLoading(false)
    }
  }, [user?.id])

  const fetchPhoneNumbers = async () => {
    if (!user?.id) {
      console.log('🔍 [PHONE-NUMBERS] No user ID available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔍 [PHONE-NUMBERS] Fetching phone numbers for user:', user.id)

      const response = await fetch(`/api/user/phone-numbers?userId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📱 [PHONE-NUMBERS] Response:', data)

      if (data.success && data.phoneNumbers) {
        const phoneNumbers = data.phoneNumbers.map((row: any) => ({
          id: row.id,
          number: row.number,
          status: row.status || 'active',
          location: row.location || 'Unknown',
          type: row.type || 'Local', 
          purchased_at: row.created_at || row.purchased_at,
          user_id: row.user_id,
          monthly_fee: row.monthly_fee || 1.50,
          assigned_to: row.assigned_to || 'Unassigned'
        }));
        setPhoneNumbers(phoneNumbers)
        console.log('✅ [PHONE-NUMBERS] Successfully loaded', phoneNumbers.length, 'phone numbers')
      } else {
        console.log('⚠️ [PHONE-NUMBERS] No phone numbers found or API returned error')
        setPhoneNumbers([])
        if (!data.success) {
          setError(data.message || 'Failed to fetch phone numbers')
        }
      }
    } catch (err) {
      console.error('❌ [PHONE-NUMBERS] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhoneNumbers([])
    } finally {
      setLoading(false)
    }
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'suspended':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <p className="text-gray-600">You need to be logged in to view your phone numbers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Numbers</h1>
          <p className="text-muted-foreground">
            Manage your purchased phone numbers and assign them to call flows
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/phone-numbers/purchase">
            <Plus className="h-4 w-4 mr-2" />
            Purchase Number
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading phone numbers...</p>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Phone Numbers</h3>
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={fetchPhoneNumbers} 
                variant="outline" 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : phoneNumbers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Phone Numbers</h3>
              <p className="text-gray-600 mb-4">
                You haven't purchased any phone numbers yet. Get started by purchasing your first number.
              </p>
              <Button asChild>
                <Link href="/dashboard/phone-numbers/purchase">
                  <Plus className="h-4 w-4 mr-2" />
                  Purchase Your First Number
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {phoneNumbers.map((phoneNumber) => (
            <Card key={phoneNumber.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {phoneNumber.number}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(phoneNumber.status)}>
                    {phoneNumber.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  {phoneNumber.location || 'Unknown Location'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Type</span>
                    <span className="font-medium">{phoneNumber.type || 'Local'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Monthly Fee</span>
                    <span className="font-medium">${phoneNumber.monthly_fee?.toFixed(2) || '1.50'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Assigned To</span>
                    <span className="font-medium">{phoneNumber.assigned_to || 'Unassigned'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Purchased</span>
                    <span className="font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(phoneNumber.purchased_at)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Number
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}