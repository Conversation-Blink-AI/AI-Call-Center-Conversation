
"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, ArrowRight, Plus, AlertCircle, RefreshCw, Copy } from "lucide-react"
import { formatPhoneNumber } from "@/utils/phone-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"

interface PhoneNumber {
  id: string
  number: string
  location: string
  type: string
  status: string
  created_at: string
  user_id: string
  pathway_id?: string | null
  local_pathway_id?: string | null
  has_pathway?: boolean
  pathway_name?: string | null
  pathway_description?: string | null
}

interface Pathway {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export default function PathwayListingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeactiveDialog, setShowDeactiveDialog] = useState(false)
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null)

  const isInitialized = true
  const authLoading = false

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        console.log("🔍 [PATHWAY-PAGE] Fetching data for user:", user.email)

        const phoneResponse = await fetch('/api/user/phone-numbers', {
          credentials: 'include'
        })

        if (!phoneResponse.ok) {
          const errorText = await phoneResponse.text()
          console.error('❌ [PATHWAY-PAGE] Error fetching phone numbers:', phoneResponse.status, errorText)
          setError(`Failed to load phone numbers: ${phoneResponse.status}`)
          return
        }

        const phoneData = await phoneResponse.json()
        const phoneNumbers = phoneData.phoneNumbers || []

        console.log("✅ [PATHWAY-PAGE] Phone numbers loaded:", phoneNumbers)

        const cleanedPhoneNumbers = phoneNumbers.map((phone: PhoneNumber) => ({
          ...phone,
          number: phone.number.replace(/^\+\+/, '+')
        }))

        setPhoneNumbers(cleanedPhoneNumbers)

        const pathwaysResponse = await fetch('/api/pathways', {
          credentials: 'include'
        })

        if (!pathwaysResponse.ok) {
          const errorText = await pathwaysResponse.text()
          console.error('❌ [PATHWAY-PAGE] Error fetching pathways:', pathwaysResponse.status, errorText)
          setError(`Failed to load pathways: ${pathwaysResponse.status}`)
          return
        }

        const pathwaysData = await pathwaysResponse.json()
        console.log("✅ [PATHWAY-PAGE] Pathways data:", pathwaysData)
        setPathways(pathwaysData.pathways || pathwaysData || [])

      } catch (err) {
        console.error('❌ [PATHWAY-PAGE] Error fetching data:', err)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleManagePathway = (phoneNumber: string, status: string) => {
    // Normalize status for comparison (trim whitespace and convert to lowercase)
    const normalizedStatus = status ? status.trim().toLowerCase() : ''
    
    // Check if the phone number is in deactive state
    // Handles: "deactive", "deacative" (typo), "inactive", etc.
    // Check for exact matches and variations
    const isDeactive = 
      normalizedStatus === 'deactive' ||
      normalizedStatus === 'deacative' || // Handle typo "Deacative"
      normalizedStatus === 'inactive' ||
      normalizedStatus.includes('deactive') || 
      normalizedStatus.includes('deacative') || // Handle typo "Deacative" 
      normalizedStatus.startsWith('deact') || // Catch "deactive", "deactivated", etc.
      normalizedStatus.startsWith('deac') // Catch "deacative" typo
    
    console.log('[PATHWAY-PAGE] handleManagePathway called:', {
      phoneNumber,
      originalStatus: status,
      normalizedStatus,
      isDeactive,
      statusLength: status?.length,
      normalizedLength: normalizedStatus.length
    })
    
    if (isDeactive) {
      // Show confirmation dialog
      console.log('[PATHWAY-PAGE] Showing deactive confirmation dialog')
      setPendingPhoneNumber(phoneNumber)
      setShowDeactiveDialog(true)
    } else {
      // Proceed directly if not deactive
      console.log('[PATHWAY-PAGE] Proceeding directly to pathway editor (status is active)')
      const cleanNumber = phoneNumber.replace(/^\+\+/, '+').replace(/\D/g, "")
      router.push(`/dashboard/pathway/${cleanNumber}`)
    }
  }

  const handleConfirmEdit = () => {
    if (pendingPhoneNumber) {
      const cleanNumber = pendingPhoneNumber.replace(/^\+\+/, '+').replace(/\D/g, "")
      router.push(`/dashboard/pathway/${cleanNumber}`)
    }
    setShowDeactiveDialog(false)
    setPendingPhoneNumber(null)
  }

  const handleCancelEdit = () => {
    setShowDeactiveDialog(false)
    setPendingPhoneNumber(null)
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyPathwayId = (pathwayId: string) => {
    navigator.clipboard.writeText(pathwayId)
    setCopiedId(pathwayId)
    toast.success("Pathway ID copied to clipboard")
    
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  // Helper function to check if status is deactive
  const isDeactiveStatus = (status: string): boolean => {
    if (!status) return false
    const normalizedStatus = status.trim().toLowerCase()
    return (
      normalizedStatus === 'deactive' ||
      normalizedStatus === 'deacative' ||
      normalizedStatus === 'inactive' ||
      normalizedStatus.includes('deactive') ||
      normalizedStatus.includes('deacative') ||
      normalizedStatus.startsWith('deact') ||
      normalizedStatus.startsWith('deac')
    )
  }

  // Helper function to get badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    if (isDeactiveStatus(status)) {
      return 'destructive' // Red/orange color for deactive
    }
    if (status?.toLowerCase() === 'active') {
      return 'default' // Primary color for active
    }
    return 'secondary' // Gray for other statuses
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Pathways</h1>
            <p className="text-muted-foreground mt-1">Manage call flow pathways for your phone numbers</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your pathways...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Pathways</h1>
          <p className="text-muted-foreground mt-1">
            Manage call flow pathways for your phone numbers
            {user && <span className="text-xs ml-2 text-muted-foreground">(User: {user.email})</span>}
          </p>
        </div>
        <Link href="/dashboard/phone-numbers/purchase">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Purchase New Number
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!error && phoneNumbers.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Phone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Phone Numbers Found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You need to purchase a phone number before creating a pathway. Each phone number gets its own call flow
              pathway.
            </p>
            <Link href="/dashboard/phone-numbers/purchase">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Purchase a Number
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {phoneNumbers.map((phone) => {
            const hasPathway = phone.has_pathway || Boolean(phone.pathway_name) || Boolean(phone.pathway_id)
            const isDeactive = isDeactiveStatus(phone.status)

            return (
              <Card 
                key={phone.id} 
                className={`shadow-sm hover:shadow-md transition-shadow ${
                  isDeactive 
                    ? 'border-destructive/50 bg-destructive/5 opacity-90' 
                    : ''
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className={`h-5 w-5 ${isDeactive ? 'text-destructive' : 'text-blue-600'}`} />
                      <div className="flex items-center gap-2">
                        <CardTitle className={`text-lg ${isDeactive ? 'text-destructive' : ''}`}>
                          {formatPhoneNumber(phone.number)}
                        </CardTitle>
                        <Badge variant={getStatusBadgeVariant(phone.status)}>
                          {phone.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className={`mt-2 ${isDeactive ? 'text-destructive/70' : ''}`}>
                    {phone.location} • {phone.type}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-4">
                  {hasPathway ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div 
                          className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                            isDeactive ? 'bg-destructive' : 'bg-green-500'
                          }`}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${
                              isDeactive ? 'text-destructive' : 'text-green-700'
                            }`}>
                              Pathway Connected
                            </span>
                          </div>
                          <h4 className="font-medium mb-2">
                            {phone.pathway_name}
                          </h4>
                          {phone.pathway_description && (
                            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                              {phone.pathway_description}
                            </p>
                          )}
                          
                          {phone.pathway_id ? (
                            <div className="bg-muted rounded-lg p-3 border">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-muted-foreground mb-1">Pathway ID</p>
                                  <p className="text-sm font-mono text-foreground break-all">
                                    {phone.pathway_id}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 flex-shrink-0 relative"
                                  onClick={() => copyPathwayId(phone.pathway_id!)}
                                  title={copiedId === phone.pathway_id ? "Copied!" : "Copy Pathway ID"}
                                >
                                  {copiedId === phone.pathway_id ? (
                                    <span className="text-xs font-medium text-green-600">✓</span>
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Bland AI pathway ID not yet linked for this number.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">No pathway configured</span>
                        <p className="text-xs text-muted-foreground mt-1">Create a pathway to handle incoming calls</p>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManagePathway(phone.number, phone.status)}
                    className="w-full justify-center"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    {hasPathway ? 'Edit Pathway' : 'Create Pathway'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={showDeactiveDialog} onOpenChange={setShowDeactiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Number is Deactive</AlertDialogTitle>
            <AlertDialogDescription>
              This Number is Deactive state do you still want to edit the Pathway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelEdit}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
