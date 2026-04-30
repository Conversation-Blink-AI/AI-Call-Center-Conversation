"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPhoneNumber } from "@/utils/phone-utils"
import { useAuth } from "@/contexts/auth-context"
import dynamic from "next/dynamic"
import { NodeEditorDrawer } from "@/components/flowchart-builder/node-editor-drawer"
import { FlowchartBuilder } from "@/components/flowchart-builder/flowchart-builder"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"

// FlowchartBuilder removed

interface PathwayInfo {
  pathway_id: string | null
  /** pathways.id — required for load/save-flowchart (Postgres row key) */
  local_pathway_id?: string | null
  pathway_name: string | null
  pathway_description: string | null
  last_deployed_at?: string
}

interface PathwayEditorPageProps {
  params: Promise<{
    phoneNumber: string
  }>
  searchParams?: Promise<{
    pathwayId?: string
    pathwayName?: string
  }>
}

export default function PathwayEditorPage({ params, searchParams }: PathwayEditorPageProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [formattedNumber, setFormattedNumber] = useState<string>("")
  const [pathwayInfo, setPathwayInfo] = useState<PathwayInfo | null>(null)
  const [isLoadingPathway, setIsLoadingPathway] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [isMetaConfigModalOpen, setIsMetaConfigModalOpen] = useState(false)
  const [metaConfigs, setMetaConfigs] = useState<Array<{
    id: string
    nickname: string
    pixel_id: string
    event_name: string
    created_at: string
  }>>([])
  const [metaConfigLoading, setMetaConfigLoading] = useState(false)
  const [metaConfigError, setMetaConfigError] = useState("")
  const [metaConfigSuccess, setMetaConfigSuccess] = useState("")
  const [newMetaConfig, setNewMetaConfig] = useState({
    nickname: "",
    pixelId: "",
    accessToken: "",
    eventName: ""
  })
  const [editingMetaConfigId, setEditingMetaConfigId] = useState<string | null>(null)
  const [editMetaConfig, setEditMetaConfig] = useState({
    nickname: "",
    pixelId: "",
    accessToken: "",
    eventName: ""
  })
  const [resolvedSearchParams, setResolvedSearchParams] = useState<{
    pathwayId?: string
    pathwayName?: string
  } | null>(null)

  // Resolve async params and searchParams
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params
        const resolvedSearch = searchParams ? await searchParams : {}

        const rawPhoneNumber = resolvedParams?.phoneNumber
        const decodedPhoneNumber = rawPhoneNumber ? decodeURIComponent(rawPhoneNumber) : null

        setPhoneNumber(decodedPhoneNumber)
        setResolvedSearchParams(resolvedSearch)
      } catch (error) {
        console.error("[PATHWAY-PAGE] ❌ Error resolving params:", error)
        setError("Failed to load page parameters")
        setIsInitialized(true)
      }
    }

    resolveParams()
  }, [params, searchParams])

  console.log("[PATHWAY-PAGE] 📞 Decoded phone number:", phoneNumber)
  console.log("[PATHWAY-PAGE] 👤 Auth user:", user?.email)
  console.log("[PATHWAY-PAGE] 🔄 Auth loading:", authLoading)
  console.log("[PATHWAY-PAGE] 🎯 Is initialized:", isInitialized)

  useEffect(() => {
    // Only proceed once we have resolved the phone number
    if (phoneNumber === null) return

    // Validate phone number
    if (!phoneNumber || phoneNumber === "undefined" || phoneNumber === "null") {
      console.error("[PATHWAY-PAGE] ❌ Invalid phone number:", phoneNumber)
      setError("Invalid phone number")
      setIsLoadingPathway(false)
      setIsInitialized(true)
      return
    }

    // Format the phone number for display
    try {
      const normalizedNumber = phoneNumber.replace(/\D/g, "")
      const e164Number = normalizedNumber.startsWith("1") ? `+${normalizedNumber}` : `+1${normalizedNumber}`
      setFormattedNumber(formatPhoneNumber(e164Number))
    } catch (error) {
      console.error("[PATHWAY-PAGE] ❌ Error formatting phone number:", error)
      setFormattedNumber(phoneNumber) // Fallback to raw phone number
    }
  }, [phoneNumber])

  const fetchPathwayInfo = async () => {
    if (!phoneNumber || phoneNumber === "undefined" || phoneNumber === "null") {
      console.error("[PATHWAY-PAGE] ❌ Cannot fetch pathway info - invalid phone number")
      setError("Invalid phone number")
      setIsLoadingPathway(false)
      setIsInitialized(true)
      return
    }

    // Wait for auth to be ready
    if (authLoading) {
      console.log("[PATHWAY-PAGE] ⏳ Waiting for auth to load...")
      return
    }

    if (!user) {
      console.error("[PATHWAY-PAGE] ❌ No authenticated user")
      setError("Authentication required. Please log in.")
      setIsLoadingPathway(false)
      setIsInitialized(true)
      return
    }

    try {
      setError(null)
      console.log("[PATHWAY-PAGE] 🔍 Fetching pathway info for user:", user.email)

      // If pathway info is passed via URL params, still merge lookup for local_pathway_id / canonical ids
      if (resolvedSearchParams?.pathwayId) {
        console.log("[PATHWAY-PAGE] ✅ Merging URL params with lookup-pathway for consistent IDs")
        try {
          const lookupResponse = await fetch(`/api/lookup-pathway?phone=${encodeURIComponent(phoneNumber)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          })
          if (lookupResponse.ok) {
            const result = await lookupResponse.json()
            if (result.success && result.pathway_id) {
              setPathwayInfo({
                pathway_id: result.pathway_id,
                local_pathway_id: result.local_pathway_id ?? null,
                pathway_name: resolvedSearchParams.pathwayName || result.pathway_name || null,
                pathway_description: result.pathway_description ?? null,
                last_deployed_at: result.last_deployed_at,
              })
              setIsLoadingPathway(false)
              setIsInitialized(true)
              return
            }
          }
        } catch (e) {
          console.warn("[PATHWAY-PAGE] Lookup failed with URL params, falling back to URL only:", e)
        }
        setPathwayInfo({
          pathway_id: resolvedSearchParams.pathwayId,
          local_pathway_id: null,
          pathway_name: resolvedSearchParams.pathwayName || null,
          pathway_description: null,
        })
        setIsLoadingPathway(false)
        setIsInitialized(true)
        return
      }

      // ✅ CRITICAL: Ensure proper cookie handling
      console.log("[PATHWAY-PAGE] 📡 Making API request with phone:", phoneNumber)
      const response = await fetch(`/api/lookup-pathway?phone=${encodeURIComponent(phoneNumber)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ✅ CRITICAL: Include cookies for authentication
      })

      console.log("[PATHWAY-PAGE] 📊 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[PATHWAY-PAGE] ❌ API error:", response.status, errorText)

        if (response.status === 401) {
          setError("Authentication failed. Please refresh the page and log in again.")
        } else if (response.status === 404) {
          console.log("[PATHWAY-PAGE] ℹ️ No existing pathway found - will create new")
          setPathwayInfo(null) // This will trigger "Create New" mode
        } else {
          setError(`API error: ${response.status} - ${errorText}`)
        }
        setIsLoadingPathway(false)
        setIsInitialized(true)
        return
      }

      const result = await response.json()
      console.log("[PATHWAY-PAGE] ✅ API response:", result)

      if (result.success && result.pathway_id) {
        console.log("[PATHWAY-PAGE] 🎯 PATHWAY FOUND:", result.pathway_id)
        setPathwayInfo({
          pathway_id: result.pathway_id,
          local_pathway_id: result.local_pathway_id ?? null,
          pathway_name: result.pathway_name,
          pathway_description: result.pathway_description,
          last_deployed_at: result.last_deployed_at,
        })
      } else {
        console.log("[PATHWAY-PAGE] ℹ️ No existing pathway found - will create new")
        setPathwayInfo(null) // This will trigger "Create New" mode
      }
    } catch (error) {
      console.error("[PATHWAY-PAGE] ❌ Error fetching pathway info:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoadingPathway(false)
      setIsInitialized(true)
    }
  }

  useEffect(() => {
    if (phoneNumber && phoneNumber !== "undefined" && !isInitialized && resolvedSearchParams !== null) {
      fetchPathwayInfo()
    }
  }, [phoneNumber, resolvedSearchParams?.pathwayId, user, authLoading, isInitialized])

  const handleAIGeneratorClick = () => {
    if (!phoneNumber || phoneNumber === "undefined") {
      router.push("/dashboard/pathway/generate")
      return
    }
    router.push(`/dashboard/pathway/generate?phoneNumber=${phoneNumber}`)
  }

  const handleEditPathway = () => {
    if (!phoneNumber || phoneNumber === "undefined") {
      toast.error("Invalid phone number")
      return
    }

    // Pathway editing is done directly on this page via FlowchartBuilder
    // No need to redirect to a separate editor
    toast.info("You can edit the pathway directly on this page")
  }

  const loadMetaConfigs = async () => {
    setMetaConfigLoading(true)
    setMetaConfigError("")
    try {
      const response = await fetch("/api/meta-capi/configs", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to load Meta CAPI configs")
      }
      setMetaConfigs(result.configs || [])
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to load Meta CAPI configs")
    } finally {
      setMetaConfigLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadMetaConfigs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleCreateMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setMetaConfigError("")
    setMetaConfigSuccess("")

    try {
      const response = await fetch("/api/meta-capi/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: newMetaConfig.nickname,
          pixel_id: newMetaConfig.pixelId,
          access_token: newMetaConfig.accessToken,
          event_name: newMetaConfig.eventName
        })
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create config")
      }
      setMetaConfigSuccess("Meta CAPI config created")
      setNewMetaConfig({ nickname: "", pixelId: "", accessToken: "", eventName: "" })
      await loadMetaConfigs()
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to create config")
    }
  }

  const handleStartEditMetaConfig = (config: {
    id: string
    nickname: string
    pixel_id: string
    event_name: string
  }) => {
    setEditingMetaConfigId(config.id)
    setEditMetaConfig({
      nickname: config.nickname,
      pixelId: config.pixel_id,
      accessToken: "",
      eventName: config.event_name
    })
    setMetaConfigError("")
    setMetaConfigSuccess("")
  }

  const handleUpdateMetaConfig = async (configId: string) => {
    setMetaConfigError("")
    setMetaConfigSuccess("")
    try {
      const payload: Record<string, string> = {
        nickname: editMetaConfig.nickname,
        pixel_id: editMetaConfig.pixelId,
        event_name: editMetaConfig.eventName
      }
      if (editMetaConfig.accessToken.trim()) {
        payload.access_token = editMetaConfig.accessToken
      }

      const response = await fetch(`/api/meta-capi/configs/${configId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to update config")
      }
      setMetaConfigSuccess("Meta CAPI config updated")
      setEditingMetaConfigId(null)
      setEditMetaConfig({ nickname: "", pixelId: "", accessToken: "", eventName: "" })
      await loadMetaConfigs()
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to update config")
    }
  }

  const handleDeleteMetaConfig = async (configId: string) => {
    const confirmed = window.confirm("Delete this Meta CAPI config? This cannot be undone.")
    if (!confirmed) return
    setMetaConfigError("")
    setMetaConfigSuccess("")
    try {
      const response = await fetch(`/api/meta-capi/configs/${configId}`, {
        method: "DELETE"
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete config")
      }
      setMetaConfigSuccess("Meta CAPI config deleted")
      await loadMetaConfigs()
    } catch (error: any) {
      setMetaConfigError(error.message || "Failed to delete config")
    }
  }

  // ✅ CRITICAL: Only show loading if we're actually loading AND not initialized, or if params aren't resolved yet
  if ((authLoading && !isInitialized) || phoneNumber === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // ✅ CRITICAL: Only show auth required if we're initialized and no user
  if (isInitialized && !user) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please log in to access the pathway editor.</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </div>
    )
  }

  // Show error state for invalid phone number
  if (!phoneNumber || phoneNumber === "undefined" || phoneNumber === "null") {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Phone Number</h1>
          <p className="text-gray-600 mb-4">The phone number parameter is missing or invalid.</p>
          <Button onClick={() => router.push("/dashboard/phone-numbers")}>Go to Phone Numbers</Button>
        </div>
      </div>
    )
  }

  // ✅ CRITICAL: Only render the main content if we're initialized
  if (!isInitialized) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing pathway editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Compact Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/pathway")} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">Pathway for {formattedNumber}</h1>
            {pathwayInfo?.pathway_name && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">{pathwayInfo.pathway_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={() => setIsMetaConfigModalOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Meta CAPI Configs
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={handleAIGeneratorClick}>
            <Sparkles className="h-4 w-4" />
            AI Generator
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-2 bg-destructive/10 border-b border-destructive/20">
          <div className="text-sm text-destructive">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Full-height FlowchartBuilder */}
      <div className="flex-1 overflow-hidden">
        <FlowchartBuilder
          phoneNumber={phoneNumber}
          pathwayInfo={pathwayInfo}
        />
      </div>

      <Dialog open={isMetaConfigModalOpen} onOpenChange={setIsMetaConfigModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Meta CAPI Configs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {metaConfigError && (
              <Alert variant="destructive">
                <AlertDescription>{metaConfigError}</AlertDescription>
              </Alert>
            )}

            {metaConfigSuccess && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{metaConfigSuccess}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateMetaConfig} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-meta-nickname" className="text-sm">Nickname</Label>
                  <Input
                    id="modal-meta-nickname"
                    value={newMetaConfig.nickname}
                    onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, nickname: e.target.value }))}
                    placeholder="Main Pixel"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modal-meta-event-name" className="text-sm">Event Name</Label>
                  <Input
                    id="modal-meta-event-name"
                    value={newMetaConfig.eventName}
                    onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, eventName: e.target.value }))}
                    placeholder="CallLead"
                    className="h-9"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-meta-pixel-id" className="text-sm">Pixel ID</Label>
                  <Input
                    id="modal-meta-pixel-id"
                    value={newMetaConfig.pixelId}
                    onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, pixelId: e.target.value }))}
                    placeholder="123456789012345"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modal-meta-access-token" className="text-sm">Access Token</Label>
                  <Input
                    id="modal-meta-access-token"
                    type="password"
                    value={newMetaConfig.accessToken}
                    onChange={(e) => setNewMetaConfig((prev) => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="EAAG..."
                    className="h-9"
                    required
                  />
                </div>
              </div>
              <div>
                <Button type="submit" size="sm">
                  Add Config
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              {metaConfigLoading && (
                <p className="text-sm text-muted-foreground">Loading configs...</p>
              )}

              {!metaConfigLoading && metaConfigs.length === 0 && (
                <p className="text-sm text-muted-foreground">No configs yet. Add your first Meta CAPI config above.</p>
              )}

              {!metaConfigLoading && metaConfigs.map((config) => (
                <Card key={config.id} className="border">
                  <CardContent className="pt-4 space-y-3">
                    {editingMetaConfigId === config.id ? (
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nickname</Label>
                            <Input
                              value={editMetaConfig.nickname}
                              onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, nickname: e.target.value }))}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Event Name</Label>
                            <Input
                              value={editMetaConfig.eventName}
                              onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, eventName: e.target.value }))}
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Pixel ID</Label>
                            <Input
                              value={editMetaConfig.pixelId}
                              onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, pixelId: e.target.value }))}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">New Access Token</Label>
                            <Input
                              type="password"
                              value={editMetaConfig.accessToken}
                              onChange={(e) => setEditMetaConfig((prev) => ({ ...prev, accessToken: e.target.value }))}
                              placeholder="Leave blank to keep existing"
                              className="h-8"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateMetaConfig(config.id)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMetaConfigId(null)
                              setEditMetaConfig({ nickname: "", pixelId: "", accessToken: "", eventName: "" })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{config.nickname}</p>
                          <p className="text-xs text-muted-foreground">Pixel: {config.pixel_id}</p>
                          <p className="text-xs text-muted-foreground">Event: {config.event_name}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleStartEditMetaConfig(config)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteMetaConfig(config.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}