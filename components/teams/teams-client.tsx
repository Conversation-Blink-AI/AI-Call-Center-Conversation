"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Settings, Trash2, UserPlus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { CreateTeamDialog } from "./create-team-dialog"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"

interface Team {
  id: string
  name: string
  description: string | null
  created_at: string
  member_count: number
  role: "owner" | "admin" | "member"
}

export function TeamsClient() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true)
        setError(null)

        if (!user) {
          setError("No authenticated user found. Please log in.")
          return
        }

        // Fetch teams using API route
        const response = await fetch(`/api/teams?userId=${user.id}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch teams: ${response.statusText}`)
        }

        const data = await response.json()
        setTeams(data.teams || [])

      } catch (err: any) {
        console.error("Error loading teams:", err)
        setError(err.message || "Failed to load teams")
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadTeams()
    }
  }, [user, authLoading])

  const handleCreateTeam = async (teamData: { name: string; description: string }) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a team",
          variant: "destructive"
        })
        return
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: teamData.name,
          description: teamData.description,
          ownerId: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create team')
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Team created successfully"
        })

        // Refresh teams list
        const teamsResponse = await fetch(`/api/teams?userId=${user.id}`, {
          credentials: 'include'
        })

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          setTeams(teamsData.teams || [])
        }

        setIsCreateDialogOpen(false)
      } else {
        throw new Error(data.message || 'Failed to create team')
      }
    } catch (err: any) {
      console.error("Error creating team:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to create team",
        variant: "destructive"
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start collaborating with others.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {team.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant={team.role === "owner" ? "default" : "secondary"}>
                    {team.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {team.member_count || 0} members
                  </span>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateTeam={handleCreateTeam}
      />
    </div>
  )
}
```
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, Settings, Trash2 } from 'lucide-react'

interface Team {
  id: string
  name: string
  description?: string
  created_at: string
}

export function TeamsClient() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading teams...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Teams</h2>
          <p className="text-muted-foreground">
            Manage your teams and collaborators
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      <div className="grid gap-4">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first team to start collaborating with others.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {team.name}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-muted-foreground">{team.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
