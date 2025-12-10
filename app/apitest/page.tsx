"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function APITestPage() {
  const [method, setMethod] = useState("GET")
  const [endpoint, setEndpoint] = useState("")
  const [requestBody, setRequestBody] = useState("")
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://localhost:3000"

  const presetEndpoints = [
    { name: "Get Phone Numbers", method: "GET", path: "/api/user/phone-numbers" },
    { name: "Get Pathways", method: "GET", path: "/api/pathways" },
    { name: "Get Calls", method: "GET", path: "/api/bland-ai/calls?limit=100&page=1" },
    { name: "Get Call Summary", method: "GET", path: "/api/bland-ai/call-summary?callId=" },
    { name: "Get Wallet Balance", method: "GET", path: "/api/wallet/balance" },
    { name: "Get User Info", method: "GET", path: "/api/auth/me" },
    { name: "Test Database", method: "GET", path: "/api/auth/test-postgres" },
    { name: "Database Schema", method: "GET", path: "/api/database/schema" },
  ]

  const handlePresetClick = (preset: typeof presetEndpoints[0]) => {
    setMethod(preset.method)
    setEndpoint(preset.path)
    setRequestBody("")
  }

  const handleTest = async () => {
    if (!endpoint) {
      setError("Please enter an endpoint")
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`
      
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      }

      if (method !== "GET" && method !== "HEAD" && requestBody) {
        try {
          options.body = JSON.stringify(JSON.parse(requestBody))
        } catch (e) {
          options.body = requestBody
        }
      }

      const startTime = Date.now()
      const res = await fetch(url, options)
      const endTime = Date.now()
      const duration = endTime - startTime

      let responseData
      const contentType = res.headers.get("content-type")
      
      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json()
      } else {
        responseData = await res.text()
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setResponse({
        error: err.message,
        stack: err.stack,
      })
    } finally {
      setLoading(false)
    }
  }

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Test Page</h1>
        <p className="text-muted-foreground">
          Test all your API endpoints from this page
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Request</CardTitle>
            <CardDescription>Configure and send API requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset Endpoints */}
            <div>
              <Label className="mb-2 block">Quick Test Endpoints</Label>
              <div className="grid grid-cols-2 gap-2">
                {presetEndpoints.map((preset, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                    className="text-left justify-start"
                  >
                    <span className="truncate">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Method Selection */}
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Endpoint Input */}
            <div>
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/user/phone-numbers"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Base URL: {baseUrl}
              </p>
            </div>

            {/* Request Body */}
            {method !== "GET" && (
              <div>
                <Label htmlFor="body">Request Body (JSON)</Label>
                <Textarea
                  id="body"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleTest}
              disabled={loading || !endpoint}
              className="w-full"
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>View API response details</CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="data">Data</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        response.status >= 200 && response.status < 300
                          ? "default"
                          : "destructive"
                      }
                    >
                      {response.status} {response.statusText}
                    </Badge>
                    {response.duration && (
                      <Badge variant="outline">{response.duration}</Badge>
                    )}
                  </div>
                  <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] text-sm font-mono">
                    {formatJSON(response.data || response.error)}
                  </pre>
                </TabsContent>

                <TabsContent value="headers" className="space-y-2">
                  <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] text-sm font-mono">
                    {formatJSON(response.headers || {})}
                  </pre>
                </TabsContent>

                <TabsContent value="info" className="space-y-2">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {response.status} {response.statusText}
                    </div>
                    {response.duration && (
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {response.duration}
                      </div>
                    )}
                    {response.timestamp && (
                      <div>
                        <span className="font-medium">Timestamp:</span>{" "}
                        {response.timestamp}
                      </div>
                    )}
                    {response.error && (
                      <div className="mt-4">
                        <span className="font-medium text-destructive">
                          Error:
                        </span>
                        <pre className="bg-destructive/10 p-2 rounded mt-1 text-xs">
                          {response.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <p>No response yet. Send a request to see results.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

