
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface DatabaseStats {
  users: number
  teams: number
  pathways: number
  initialized: boolean
  version: string
}

interface TableData {
  stats: DatabaseStats
  tables: {
    users: any[]
    teams: any[]
    pathways: any[]
  }
}

export default function DatabaseViewer() {
  const [data, setData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [buildingTables, setBuildingTables] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/database/tables')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.message || 'Failed to fetch data')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createSampleData = async () => {
    try {
      setCreating(true)
      const response = await fetch('/api/database/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_sample_data' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchData() // Refresh data
      } else {
        setError(result.message || 'Failed to create sample data')
      }
    } catch (err) {
      setError('Failed to create sample data')
      console.error('Create error:', err)
    } finally {
      setCreating(false)
    }
  }

  const createAllTables = async () => {
    try {
      setBuildingTables(true)
      const response = await fetch('/api/database/create-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_all' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        await fetchData() // Refresh data
        setError(null)
      } else {
        setError(result.message || 'Failed to create tables')
      }
    } catch (err) {
      setError('Failed to create tables')
      console.error('Create tables error:', err)
    } finally {
      setBuildingTables(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Database Viewer</h1>
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Database Viewer</h1>
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
        <h1 className="text-3xl font-bold">Database Viewer</h1>
        <div className="space-x-2">
          <Button onClick={fetchData} variant="outline">
            Refresh
          </Button>
          <Button onClick={createAllTables} disabled={buildingTables}>
            {buildingTables ? "Building..." : "Build All Tables"}
          </Button>
          <Button onClick={createSampleData} disabled={creating} variant="outline">
            {creating ? "Creating..." : "Create Sample Data"}
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Database Stats */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Database Status</CardTitle>
              <CardDescription>Current database statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.stats.users}</div>
                  <div className="text-sm text-gray-600">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.stats.teams}</div>
                  <div className="text-sm text-gray-600">Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{data.stats.pathways}</div>
                  <div className="text-sm text-gray-600">Pathways</div>
                </div>
                <div className="text-center">
                  <Badge variant={data.stats.initialized ? "default" : "destructive"}>
                    {data.stats.initialized ? "Initialized" : "Not Initialized"}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{data.stats.version}</div>
                  <div className="text-sm text-gray-600">Version</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Users ({data.stats.users})</CardTitle>
              <CardDescription>User accounts in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {data.tables.users.length > 0 ? (
                <div className="space-y-4">
                  {data.tables.users.map((user, index) => (
                    <div key={user.id || index} className="border rounded p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <strong>Name:</strong> {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || 'N/A'}
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No users found</div>
              )}
            </CardContent>
          </Card>

          {/* Teams Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Teams ({data.stats.teams})</CardTitle>
              <CardDescription>Teams in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {data.tables.teams.length > 0 ? (
                <div className="space-y-4">
                  {data.tables.teams.map((team, index) => (
                    <div key={team.id || index} className="border rounded p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No teams found</div>
              )}
            </CardContent>
          </Card>

          {/* Pathways Table */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pathways ({data.stats.pathways})</CardTitle>
              <CardDescription>Call flow pathways in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {data.tables.pathways.length > 0 ? (
                <div className="space-y-4">
                  {data.tables.pathways.map((pathway, index) => (
                    <div key={pathway.id || index} className="border rounded p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                          <strong>Created:</strong> {new Date(pathway.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No pathways found</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
