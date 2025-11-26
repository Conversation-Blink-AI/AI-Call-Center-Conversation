"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function RecentFlows() {
  const { user, isAuthenticated } = useAuth()
  const [flows, setFlows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadFlows() {
      if (!user?.id) {
        console.log("[RECENT-FLOWS] No user ID available")
        return
      }

      try {
        setLoading(true)
        console.log("[RECENT-FLOWS] Loading flows for user:", user.email)

        const response = await fetch('/api/pathways', {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch flows: ${response.status}`)
        }

        const data = await response.json()
        console.log("[RECENT-FLOWS] Received data:", data.pathways)

        setFlows(data.pathways || [])
      } catch (error) {
        console.error("[RECENT-FLOWS] Error loading flows:", error)
        setFlows([])
      } finally {
        setLoading(false)
      }
    }

    loadFlows()
  }, [user?.id, user?.email])

  const handleEditFlow = (pathway: any) => {
    if (pathway.phone_number) {
      const cleanNumber = pathway.phone_number.replace(/\D/g, "")
      router.push(`/dashboard/call-flows/editor?phone=${cleanNumber}&pathwayId=${pathway.id}&source=pathway`)
    } else {
      router.push(`/dashboard/call-flows/editor?pathwayId=${pathway.id}&source=pathway`)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Call Flows</CardTitle>
          <CardDescription>Your recently created or updated call flows</CardDescription>
        </CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-4 flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-[200px] mb-2" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-8 w-[80px]" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Call Flows</CardTitle>
          <CardDescription>Unable to load your call flows</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <p className="text-center text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (flows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Call Flows</CardTitle>
          <CardDescription>You haven't created any call flows yet</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <p className="text-center text-muted-foreground mb-4">
            Create your first call flow to start making automated calls
          </p>
          <Button onClick={() => router.push("/dashboard/call-flows/new")}>Create Call Flow</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Call Flows</CardTitle>
        <CardDescription>Your recently created or updated call flows</CardDescription>
      </CardHeader>
      <CardContent>
        {flows.map((flow) => (
          <div key={flow.id} className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">{flow.name || "Untitled Flow"}</h4>
              <p className="text-sm text-muted-foreground">
                Last updated: {new Date(flow.updated_at).toLocaleDateString()}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleEditFlow(flow)}>
              Edit
            </Button>
          </div>
        ))}
        <div className="mt-4 text-center">
          <Button variant="link" onClick={() => router.push("/dashboard/call-flows")}>
            View All Call Flows
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}