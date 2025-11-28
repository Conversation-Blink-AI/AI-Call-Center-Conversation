"use client"

import { useState, useEffect, useCallback } from "react"

// Force dynamic rendering - this page requires database access
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/auth"
import { useRouter } from "next/navigation"
import { Trash2, Edit, Plus, Download, Upload, Database, Users, Building, Route, Activity } from "lucide-react"
import Link from "next/link"

interface DatabaseStats {
  users: number
  teams: number
  pathways: number
  initialized: boolean
  version: string
}

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  role: string
  phone_number: string | null
  created_at: string
  updated_at: string
}

interface Team {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

interface Pathway {
  id: string
  name: string
  description: string | null
  team_id: string
  creator_id: string
  created_at: string
  updated_at: string
  bland_id: string | null
  phone_number: string | null
}

export default function DatabaseManagement() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [pathways, setPathways] = useState<Pathway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null)

  const [editMode, setEditMode] = useState<'user' | 'team' | 'pathway' | null>(null)
  const [newRecord, setNewRecord] = useState<any>({})

  const fetchData = useCallback(async () => {
    if (isAuthenticated === false) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/database/tables", { cache: "no-store" })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load database overview")
      }

      const apiStats = result.data?.stats || {}
      const tables = result.data?.tables || {}

      setStats({
        users: apiStats.totalUsers ?? apiStats.users ?? 0,
        teams: apiStats.totalTeams ?? apiStats.teams ?? 0,
        pathways: apiStats.totalPathways ?? apiStats.pathways ?? 0,
        initialized:
          (apiStats.totalUsers ?? 0) +
            (apiStats.totalTeams ?? 0) +
            (apiStats.totalPathways ?? 0) >
          0,
        version: "PostgreSQL",
      })

      setUsers(tables.users ?? [])
      setTeams(tables.teams ?? [])
      setPathways(tables.pathways ?? [])
    } catch (err) {
      console.error("[DATABASE] Failed to fetch overview", err)
      setError(err instanceof Error ? err.message : "Failed to load database data")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchTable = useCallback(async (table: "users" | "teams" | "pathways") => {
    try {
      setError(null)
      const response = await fetch(`/api/database/manage?table=${table}`, { cache: "no-store" })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to load ${table}`)
      }

      return result.data || []
    } catch (err) {
      console.error(`[DATABASE] Failed to load ${table}`, err)
      setError(err instanceof Error ? err.message : `Failed to load ${table}`)
      return null
    }
  }, [])

  const fetchAllUsers = useCallback(async () => {
    const data = await fetchTable("users")
    if (data) {
      setUsers(data as User[])
    }
  }, [fetchTable])

  const fetchAllTeams = useCallback(async () => {
    const data = await fetchTable("teams")
    if (data) {
      setTeams(data as Team[])
    }
  }, [fetchTable])

  const fetchAllPathways = useCallback(async () => {
    const data = await fetchTable("pathways")
    if (data) {
      setPathways(data as Pathway[])
    }
  }, [fetchTable])

  // Check authentication and redirect if necessary
  useEffect(() => {
    console.log('[DATABASE] Auth state check:', { isAuthenticated, user, userRole: user?.role })

    // Redirect to home page if not authenticated
    if (!loading && isAuthenticated === false) {
      router.push("/")
    }
  }, [loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  // Show error if user is not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Show error if user is authenticated but user object is null
  if (isAuthenticated === true && !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">User Data Loading Error</h1>
          <p className="text-gray-600 mt-2">You are authenticated but user data could not be loaded.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded text-left text-sm">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <p><strong>Authentication Status:</strong> {String(isAuthenticated)}</p>
            <p><strong>User Object:</strong> {user ? 'Loaded' : 'null'}</p>
            <p><strong>Token Present:</strong> {document.cookie.includes('auth-token') ? 'Yes' : 'No'}</p>
          </div>
          <div className="mt-4 space-x-2">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Database Management</h1>
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Database Management</h1>
        <div className="text-red-500 text-center">Error: {error}</div>
        <div className="text-center mt-4">
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8" />
          Database Management
        </h1>
        <Button onClick={fetchData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Database Stats Overview */}
      {stats && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Overview</CardTitle>
            <CardDescription>Current database statistics and health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                  <Users className="h-5 w-5" />
                  {stats.users}
                </div>
                <div className="text-sm text-gray-600">Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                  <Building className="h-5 w-5" />
                  {stats.teams}
                </div>
                <div className="text-sm text-gray-600">Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1">
                  <Route className="h-5 w-5" />
                  {stats.pathways}
                </div>
                <div className="text-sm text-gray-600">Pathways</div>
              </div>
              <div className="text-center">
                <Badge variant={stats.initialized ? "default" : "destructive"}>
                  {stats.initialized ? "Initialized" : "Not Initialized"}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">Status</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.version}</div>
                <div className="text-sm text-gray-600">Version</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Data Management Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Teams ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="pathways" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Pathways ({pathways.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Users Management</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </div>
                <div className="space-x-2">
                  <Button onClick={fetchAllUsers} variant="outline" size="sm">
                    Load All
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                          <div>
                            <strong>First Name:</strong> {user.first_name || 'N/A'}
                          </div>
                          <div>
                            <strong>Last Name:</strong> {user.last_name || 'N/A'}
                          </div>
                          <div>
                            <strong>Full Name:</strong> {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || 'N/A'}
                          </div>
                          <div>
                            <strong>Email:</strong> {user.email}
                          </div>
                          <div>
                            <strong>Role:</strong> <Badge variant="outline">{user.role}</Badge>
                          </div>
                          <div>
                            <strong>Company:</strong> {user.company || 'N/A'}
                          </div>
                          <div>
                            <strong>Phone:</strong> {user.phone_number || 'N/A'}
                          </div>
                          <div>
                            <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || user.email}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No users found
                  <Button onClick={fetchAllUsers} className="ml-4" variant="outline">
                    Load All Users
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Teams Management</CardTitle>
                  <CardDescription>Manage teams and their members</CardDescription>
                </div>
                <div className="space-x-2">
                  <Button onClick={fetchAllTeams} variant="outline" size="sm">
                    Load All
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Team
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                          <div>
                            <strong>Name:</strong> {team.name}
                          </div>
                          <div>
                            <strong>Owner ID:</strong> {team.owner_id}
                          </div>
                          <div className="md:col-span-2">
                            <strong>Description:</strong> {team.description || 'No description'}
                          </div>
                          <div>
                            <strong>Created:</strong> {new Date(team.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Team</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {team.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No teams found
                  <Button onClick={fetchAllTeams} className="ml-4" variant="outline">
                    Load All Teams
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pathways Tab */}
        <TabsContent value="pathways">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pathways Management</CardTitle>
                  <CardDescription>Manage call flow pathways</CardDescription>
                </div>
                <div className="space-x-2">
                  <Button onClick={fetchAllPathways} variant="outline" size="sm">
                    Load All
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Pathway
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pathways.length > 0 ? (
                <div className="space-y-4">
                  {pathways.map((pathway) => (
                    <div key={pathway.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                          <div>
                            <strong>Name:</strong> {pathway.name}
                          </div>
                          <div>
                            <strong>Team ID:</strong> {pathway.team_id}
                          </div>
                          <div className="md:col-span-2">
                            <strong>Description:</strong> {pathway.description || 'No description'}
                          </div>
                          <div>
                            <strong>Creator ID:</strong> {pathway.creator_id}
                          </div>
                          <div>
                            <strong>Phone Number:</strong> {pathway.phone_number || 'N/A'}
                          </div>
                          <div>
                            <strong>Bland ID:</strong> {pathway.bland_id || 'N/A'}
                          </div>
                          <div>
                            <strong>Created:</strong> {new Date(pathway.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Pathway</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {pathway.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No pathways found
                  <Button onClick={fetchAllPathways} className="ml-4" variant="outline">
                    Load All Pathways
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}