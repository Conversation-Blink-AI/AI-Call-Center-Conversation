
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

export default function CSVImportPage() {
  const [availableFiles, setAvailableFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState("")
  const [selectedTable, setSelectedTable] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  const supportedTables = ['users', 'teams', 'pathways', 'phone_numbers']

  useEffect(() => {
    loadAvailableFiles()
  }, [])

  const loadAvailableFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/import/csv')
      const data = await response.json()
      
      if (data.success) {
        setAvailableFiles(data.data.availableFiles)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error("Failed to load available files")
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !selectedTable) {
      toast.error("Please select both a file and a table")
      return
    }

    setImporting(true)
    try {
      const response = await fetch('/api/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: selectedFile,
          tableName: selectedTable
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Successfully imported ${data.data.successfulInserts} records into ${selectedTable}`)
        console.log('Import results:', data.data)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error("Failed to import CSV data")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>CSV Import Tool</CardTitle>
            <CardDescription>
              Import data from CSV files in the csv-data folder into your database tables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Available CSV Files</label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a CSV file" />
                </SelectTrigger>
                <SelectContent>
                  {availableFiles.map((file) => (
                    <SelectItem key={file} value={file}>
                      {file}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableFiles.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground mt-2">
                  No CSV files found. Add CSV files to the csv-data folder.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Target Table</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a database table" />
                </SelectTrigger>
                <SelectContent>
                  {supportedTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleImport} 
                disabled={importing || !selectedFile || !selectedTable}
                className="flex-1"
              >
                {importing ? "Importing..." : "Import CSV Data"}
              </Button>
              <Button 
                variant="outline" 
                onClick={loadAvailableFiles}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh Files"}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Instructions:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Place your CSV files in the <code>csv-data</code> folder</li>
                <li>Ensure CSV headers match the database column names</li>
                <li>For users table: email, name, company, role, phone_number, password</li>
                <li>For teams table: name, description, owner_id</li>
                <li>For pathways table: name, description, team_id, creator_id, data (JSON)</li>
                <li>For phone_numbers table: phone_number, user_id, pathway_id, location, type, status, monthly_fee, assigned_to</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
