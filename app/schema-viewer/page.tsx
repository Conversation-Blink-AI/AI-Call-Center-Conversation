"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Table, Key, Hash } from "lucide-react"

interface Column {
  name: string
  type: string
  maxLength: number | null
  nullable: boolean
  default: string | null
}

interface Constraint {
  name: string
  type: string
  column: string
  foreignTable: string | null
  foreignColumn: string | null
}

interface Index {
  name: string
  definition: string
}

interface TableSchema {
  columns: Column[]
  constraints: Constraint[]
  indexes: Index[]
}

interface SchemaData {
  tables: string[]
  schemas: Record<string, TableSchema>
}

export default function SchemaViewer() {
  const [data, setData] = useState<SchemaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSchema()
  }, [])

  const fetchSchema = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/database/schema')
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.message || 'Failed to fetch schema')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Database className="h-8 w-8" />
          Database Schema Viewer
        </h1>
        <div className="text-center">Loading schema...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Database Schema Viewer</h1>
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchSchema}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Database Schema Viewer</h1>
        <p>No schema data available</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Database className="h-8 w-8" />
          Database Schema Viewer
        </h1>
        <p className="text-gray-600">View all tables, columns, constraints, and indexes</p>
        <Badge className="mt-2">{data.tables.length} tables</Badge>
      </div>

      <Tabs defaultValue={data.tables[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-4">
          {data.tables.map((table) => (
            <TabsTrigger key={table} value={table} className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              {table}
            </TabsTrigger>
          ))}
        </TabsList>

        {data.tables.map((tableName) => {
          const schema = data.schemas[tableName]
          if (!schema) return null

          return (
            <TabsContent key={tableName} value={tableName}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table className="h-5 w-5" />
                    {tableName}
                  </CardTitle>
                  <CardDescription>
                    {schema.columns.length} columns, {schema.constraints.length} constraints, {schema.indexes.length} indexes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Columns */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      Columns
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Nullable</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schema.columns.map((col, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 font-mono font-semibold">
                                {col.name}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <code className="text-sm">
                                  {col.type}
                                  {col.maxLength && `(${col.maxLength})`}
                                </code>
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {col.nullable ? (
                                  <Badge variant="outline">YES</Badge>
                                ) : (
                                  <Badge variant="destructive">NO</Badge>
                                )}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                                {col.default ? (
                                  <code className="text-xs">{col.default}</code>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Constraints */}
                  {schema.constraints.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Constraints
                      </h3>
                      <div className="space-y-2">
                        {schema.constraints.map((constraint, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={constraint.type === 'PRIMARY KEY' ? 'default' : 'secondary'}>
                                {constraint.type}
                              </Badge>
                              <span className="font-mono text-sm">{constraint.name}</span>
                            </div>
                            <div className="text-sm text-gray-600 ml-2">
                              Column: <code className="font-mono">{constraint.column}</code>
                              {constraint.foreignTable && (
                                <>
                                  <br />
                                  References: <code className="font-mono">{constraint.foreignTable}.{constraint.foreignColumn}</code>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indexes */}
                  {schema.indexes.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Indexes
                      </h3>
                      <div className="space-y-2">
                        {schema.indexes.map((index, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{index.name}</Badge>
                            </div>
                            <code className="text-xs text-gray-600">{index.definition}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

