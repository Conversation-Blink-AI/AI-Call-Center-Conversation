
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Database, Download, Upload, RefreshCw, Trash2, Settings, FileJson, FileText } from "lucide-react"
import { useAuth } from "@/contexts/auth"
import { useRouter } from "next/navigation"

export default function DatabaseTools() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check admin access
  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/dashboard')
    return null
  }

  const initializeDatabase = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/database/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setResult('Database initialized successfully')
      } else {
        setError(result.message || 'Failed to initialize database')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const seedDatabase = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/database/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setResult('Database seeded with sample data successfully')
      } else {
        setError(result.message || 'Failed to seed database')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const clearDatabase = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/database/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setResult('Database cleared successfully')
      } else {
        setError(result.message || 'Failed to clear database')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (table: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/database/manage?table=${table}`)
      const result = await response.json()
      
      if (result.success) {
        const data = JSON.stringify(result.data, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${table}_export_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        setResult(`${table} data exported successfully`)
      } else {
        setError(result.message || 'Failed to export data')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Database Tools
        </h1>
        <Button onClick={() => router.push('/database')} variant="outline">
          Back to Database
        </Button>
      </div>

      {/* Status Messages */}
      {result && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{result}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <Tabs defaultValue="maintenance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="maintenance">Database Maintenance</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Initialization
                </CardTitle>
                <CardDescription>
                  Initialize or reset the database structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={initializeDatabase} 
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Initialize Database
                  </Button>
                  
                  <Button 
                    onClick={seedDatabase} 
                    disabled={loading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Seed Sample Data
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Initialize will set up the database structure. Seed will add sample users, teams, and pathways.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Destructive operations that cannot be undone
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Database Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL data from the database including users, teams, pathways, and all other records. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={clearDatabase}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Data
              </CardTitle>
              <CardDescription>
                Download database tables as JSON files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button 
                  onClick={() => exportData('users')} 
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Export Users
                </Button>
                
                <Button 
                  onClick={() => exportData('teams')} 
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Export Teams
                </Button>
                
                <Button 
                  onClick={() => exportData('pathways')} 
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4" />
                  Export Pathways
                </Button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Exported files will be downloaded as JSON format. You can use these for backups or data migration.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Upload and import data from CSV or JSON files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-file">Select File</Label>
                  <Input 
                    id="import-file" 
                    type="file" 
                    accept=".csv,.json"
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="import-table">Target Table</Label>
                  <select 
                    id="import-table"
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select table...</option>
                    <option value="users">Users</option>
                    <option value="teams">Teams</option>
                    <option value="pathways">Pathways</option>
                  </select>
                </div>
                
                <Button disabled={loading} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Data
                </Button>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> Import functionality will validate data structure and prevent duplicates based on email/ID fields.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
