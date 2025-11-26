"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { TeamMembersList } from "@/components/teams/team-members-list"
import { TeamPathwaysList } from "@/components/teams/team-pathways-list"
import { InviteMemberDialog } from "@/components/teams/invite-member-dialog"
import { ArrowLeft, UserPlus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"

export function TeamDetailClient({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [pathways, setPathways] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    async function loadTeamData() {
      try {
        setLoading(true)
        setError(null)

        if (!user) {
          setError("No authenticated user found. Please log in.")
          return
        }

        // Fetch team details using API route
        const teamResponse = await fetch(`/api/teams/${teamId}`, {
          credentials: 'include'
        })

        if (!teamResponse.ok) {
          throw new Error("Failed to load team details")
        }

        const teamData = await teamResponse.json()

        if (teamData.success) {
          setTeam(teamData.team)
          setMembers(teamData.members || [])
          setPathways(teamData.pathways || [])

          // Determine current user's role
          const userMember = teamData.members?.find((m: any) => m.user_id === user.id)
          if (teamData.team.owner_id === user.id) {
            setCurrentUserRole("owner")
          } else if (userMember) {
            setCurrentUserRole(userMember.role)
          }
        } else {
          throw new Error(teamData.message || "Failed to load team")
        }

      } catch (err: any) {
        console.error("Error loading team data:", err)
        setError(err.message || "Failed to load team details")
      } finally {
        setLoading(false)
      }
    }

    loadTeamData()
  }, [teamId, user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <Button onClick={() => router.push("/dashboard/teams")}>
          Back to Teams
        </Button>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">Team not found</div>
        <Button onClick={() => router.push("/dashboard/teams")}>
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/teams")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            {team.description && (
              <p className="text-muted-foreground">{team.description}</p>
            )}
          </div>
        </div>

        {(currentUserRole === "owner" || currentUserRole === "admin") && (
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="pathways">Pathways</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <TeamMembersList 
            members={members} 
            currentUserRole={currentUserRole}
            teamId={teamId}
          />
        </TabsContent>

        <TabsContent value="pathways">
          <TeamPathwaysList 
            pathways={pathways}
            currentUserRole={currentUserRole}
            teamId={teamId}
          />
        </TabsContent>
      </Tabs>

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        teamId={teamId}
        onMemberAdded={() => {
          // Refresh team data
          window.location.reload()
        }}
      />
    </div>
  )
}