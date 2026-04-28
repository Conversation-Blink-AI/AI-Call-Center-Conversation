"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { KnowledgeBaseEditor } from "@/components/dashboard/knowledge-base-editor"
import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Clock3,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const websiteFeatures = [
  "Automatic sitemap discovery",
  "Selective URL scraping",
  "Content extraction & cleaning",
  "Bulk processing",
]

type KnowledgeBaseStatus = "PROCESSING" | "COMPLETED" | "FAILED" | "DELETED"
type KnowledgeBaseType = "FILE" | "TEXT" | "WEB_SCRAPE"

interface KnowledgeBase {
  id: string
  bland_kb_id: string | null
  name: string
  description: string | null
  status: KnowledgeBaseStatus
  type: KnowledgeBaseType
  text_content: string | null
  kb_text: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  base_url: string | null
  source_urls: string | null
  created_at: string
  updated_at: string
}

interface WebsiteFormState {
  name: string
  description: string
  urls: string
}

interface TextFormState {
  name: string
  description: string
  text: string
}

interface UploadFormState {
  name: string
  description: string
  file: File | null
}

function formatRelativeType(type: KnowledgeBaseType) {
  if (type === "WEB_SCRAPE") return "Website"
  if (type === "FILE") return "File"
  return "Text"
}

function formatStatusVariant(status: KnowledgeBaseStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default"
  if (status === "FAILED") return "destructive"
  if (status === "DELETED") return "outline"
  return "secondary"
}

function formatBytes(bytes: number | string | null) {
  const numericBytes = typeof bytes === "number" ? bytes : Number(bytes)

  if (!Number.isFinite(numericBytes) || numericBytes <= 0) return "Unknown size"

  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = numericBytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Not available"

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

// Tolerant response parser: returns parsed JSON when possible, otherwise an
// object describing what the server actually sent. Prevents the dreaded
// "Unexpected end of JSON input" when a route returns an empty 5xx body
// (common during dev-server crashes / DB errors).
async function readJsonResponse(response: Response): Promise<{
  ok: boolean
  status: number
  data: any
  rawBody: string
}> {
  let raw = ""
  try {
    raw = await response.text()
  } catch {
    raw = ""
  }
  let data: any = null
  if (raw && raw.trim().length > 0) {
    try {
      data = JSON.parse(raw)
    } catch {
      data = { error: `Server returned non-JSON response (${response.status}): ${raw.slice(0, 200)}` }
    }
  } else {
    data = {
      error: `Server returned an empty response (${response.status} ${response.statusText || ""}). Check the server logs for the underlying error.`,
    }
  }
  return { ok: response.ok, status: response.status, data, rawBody: raw }
}

function formatTimeAgo(dateString: string | null) {
  if (!dateString) return "Just now"

  const timestamp = new Date(dateString).getTime()
  if (Number.isNaN(timestamp)) return "Just now"

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

function splitUrls(value: string | null) {
  if (!value) return []

  const trimmed = value.trim()
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      // Fall back to comma-separated parsing.
    }
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function getKnowledgeBaseVisual(type: KnowledgeBaseType) {
  if (type === "WEB_SCRAPE") {
    return {
      icon: Link2,
      label: "Web Scrape",
      labelClassName: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600",
      metaClassName: "border-blue-200 bg-blue-50 text-blue-600",
      iconClassName: "text-fuchsia-500",
    }
  }

  if (type === "FILE") {
    return {
      icon: Upload,
      label: "File Upload",
      labelClassName: "border-emerald-200 bg-emerald-50 text-emerald-600",
      metaClassName: "border-slate-200 bg-slate-50 text-slate-700",
      iconClassName: "text-emerald-500",
    }
  }

  return {
    icon: FileText,
    label: "Text",
    labelClassName: "border-amber-200 bg-amber-50 text-amber-700",
    metaClassName: "border-slate-200 bg-slate-50 text-slate-700",
    iconClassName: "text-amber-500",
  }
}

function KnowledgeBaseListPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("website")
  const [search, setSearch] = useState("")
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [submittingTab, setSubmittingTab] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null)
  const [isDeletingKb, setIsDeletingKb] = useState(false)
  const [websiteForm, setWebsiteForm] = useState<WebsiteFormState>({
    name: "",
    description: "",
    urls: "",
  })
  const [textForm, setTextForm] = useState<TextFormState>({
    name: "",
    description: "",
    text: "",
  })
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    name: "",
    description: "",
    file: null,
  })

  const selectedKnowledgeBase = useMemo(
    () => knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId) ?? null,
    [knowledgeBases, selectedKnowledgeBaseId]
  )

  const filteredKnowledgeBases = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return knowledgeBases

    return knowledgeBases.filter((item) => {
      const haystack = [
        item.name,
        item.description,
        item.file_name,
        item.base_url,
        item.source_urls,
        item.type,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [knowledgeBases, search])

  useEffect(() => {
    void loadKnowledgeBases()
  }, [])

  async function loadKnowledgeBases(preferredSelectedId?: string | null) {
    try {
      setIsLoadingList(true)
      setErrorMessage(null)

      const response = await fetch("/api/knowledge-bases", {
        credentials: "include",
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load knowledge bases")
      }

      const nextKnowledgeBases = (payload.knowledgeBases || []) as KnowledgeBase[]
      setKnowledgeBases(nextKnowledgeBases)

      const preferredId = preferredSelectedId ?? selectedKnowledgeBaseId
      const existingSelection = preferredId
        ? nextKnowledgeBases.find((item) => item.id === preferredId)?.id
        : null

      setSelectedKnowledgeBaseId(existingSelection || nextKnowledgeBases[0]?.id || null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load knowledge bases")
    } finally {
      setIsLoadingList(false)
    }
  }

  async function loadKnowledgeBaseDetail(id: string) {
    try {
      setIsLoadingDetail(true)
      setErrorMessage(null)

      const response = await fetch(`/api/knowledge-bases/${id}`, {
        credentials: "include",
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load knowledge base")
      }

      const detail = payload.knowledgeBase as KnowledgeBase
      setKnowledgeBases((current) => {
        const exists = current.some((item) => item.id === detail.id)
        if (!exists) return [detail, ...current]
        return current.map((item) => (item.id === detail.id ? detail : item))
      })
      setSelectedKnowledgeBaseId(detail.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load knowledge base")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  async function refreshKnowledgeBase() {
    if (!selectedKnowledgeBase) return

    try {
      setIsRefreshing(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/knowledge-bases/${selectedKnowledgeBase.id}/refresh`, {
        method: "POST",
        credentials: "include",
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Failed to refresh knowledge base")
      }

      const updated = payload.knowledgeBase as KnowledgeBase
      setKnowledgeBases((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedKnowledgeBaseId(updated.id)
      setSuccessMessage(`Refreshed "${updated.name}" successfully.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh knowledge base")
    } finally {
      setIsRefreshing(false)
    }
  }

  async function confirmDeleteKnowledgeBase() {
    if (!deleteTarget) return

    try {
      setIsDeletingKb(true)
      setErrorMessage(null)

      const response = await fetch(`/api/knowledge-bases/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const payload = await response.json()

      if (!response.ok) {
        const base = typeof payload.error === "string" ? payload.error : "Failed to delete knowledge base"
        const detail =
          payload.details != null
            ? typeof payload.details === "string"
              ? payload.details
              : JSON.stringify(payload.details)
            : ""
        throw new Error(detail ? `${base}: ${detail}` : base)
      }

      setKnowledgeBases((current) => current.filter((item) => item.id !== deleteTarget.id))
      if (selectedKnowledgeBaseId === deleteTarget.id) {
        setSelectedKnowledgeBaseId(null)
      }
      setSuccessMessage(`Deleted "${deleteTarget.name}".`)
      setDeleteTarget(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete knowledge base")
    } finally {
      setIsDeletingKb(false)
    }
  }

  async function refreshKnowledgeBaseById(id: string) {
    try {
      const response = await fetch(`/api/knowledge-bases/${id}/refresh`, {
        method: "POST",
        credentials: "include",
      })
      const payload = await response.json()

      if (!response.ok) {
        const base = typeof payload.error === "string" ? payload.error : "Failed to re-distill"
        const detail =
          payload.details != null
            ? typeof payload.details === "string"
              ? payload.details
              : JSON.stringify(payload.details)
            : ""
        setErrorMessage(detail ? `${base}: ${detail}` : base)
        return
      }

      const updated = payload.knowledgeBase as KnowledgeBase
      setKnowledgeBases((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccessMessage(`Re-distilled "${updated.name}".`)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to re-distill")
    }
  }

  async function handleWebsiteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmittingTab("website")
      setErrorMessage(null)
      setSuccessMessage(null)

      const urls = websiteForm.urls
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean)

      const response = await fetch("/api/knowledge-bases", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "web",
          name: websiteForm.name,
          description: websiteForm.description,
          urls,
        }),
      })

      const { ok, data: payload } = await readJsonResponse(response)
      if (!ok) {
        const base = payload?.error || "Failed to create website knowledge base"
        throw new Error(payload?.details ? `${base} — ${payload.details}` : base)
      }

      const knowledgeBase = payload.knowledgeBase as KnowledgeBase
      setKnowledgeBases((current) => [knowledgeBase, ...current.filter((item) => item.id !== knowledgeBase.id)])
      setSelectedKnowledgeBaseId(knowledgeBase.id)
      setWebsiteForm({ name: "", description: "", urls: "" })
      setSuccessMessage(`Created "${knowledgeBase.name}" from website URLs.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create website knowledge base")
    } finally {
      setSubmittingTab(null)
    }
  }

  async function handleTextSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmittingTab("text")
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch("/api/knowledge-bases", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text",
          name: textForm.name,
          description: textForm.description,
          text: textForm.text,
        }),
      })

      const { ok, data: payload } = await readJsonResponse(response)
      if (!ok) {
        const base = payload?.error || "Failed to create text knowledge base"
        throw new Error(payload?.details ? `${base} — ${payload.details}` : base)
      }

      const knowledgeBase = payload.knowledgeBase as KnowledgeBase
      setKnowledgeBases((current) => [knowledgeBase, ...current.filter((item) => item.id !== knowledgeBase.id)])
      setSelectedKnowledgeBaseId(knowledgeBase.id)
      setTextForm({ name: "", description: "", text: "" })
      setSuccessMessage(`Created "${knowledgeBase.name}" from text content.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create text knowledge base")
    } finally {
      setSubmittingTab(null)
    }
  }

  async function handleUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setSubmittingTab("upload")
      setErrorMessage(null)
      setSuccessMessage(null)

      if (!uploadForm.file) {
        throw new Error("Please choose a file to upload.")
      }

      const formData = new FormData()
      formData.append("type", "file")
      formData.append("name", uploadForm.name)
      formData.append("description", uploadForm.description)
      formData.append("file", uploadForm.file)

      const response = await fetch("/api/knowledge-bases", {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const { ok, data: payload } = await readJsonResponse(response)
      if (!ok) {
        const base = payload?.error || "Failed to create file knowledge base"
        throw new Error(payload?.details ? `${base} — ${payload.details}` : base)
      }

      const knowledgeBase = payload.knowledgeBase as KnowledgeBase
      setKnowledgeBases((current) => [knowledgeBase, ...current.filter((item) => item.id !== knowledgeBase.id)])
      setSelectedKnowledgeBaseId(knowledgeBase.id)
      setUploadForm({ name: "", description: "", file: null })
      setSuccessMessage(`Uploaded "${knowledgeBase.name}" successfully.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create file knowledge base")
    } finally {
      setSubmittingTab(null)
    }
  }

  return (
    <div className="h-full bg-background">
      <div className="flex h-full min-h-screen flex-col lg:min-h-0 lg:flex-row">
        <section className="flex min-h-[55vh] flex-1 flex-col border-b border-border bg-background lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Knowledge base"
                className="h-10 rounded-md border-border bg-muted/30 pl-9 shadow-none"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex h-full items-center justify-center px-6 py-12">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading knowledge bases...
                </div>
              </div>
            ) : filteredKnowledgeBases.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 py-12">
                <div className="mx-auto flex max-w-md flex-col items-center text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-background">
                    <BookOpen className="h-10 w-10 text-foreground" strokeWidth={1.8} />
                  </div>
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                    {knowledgeBases.length === 0 ? "No knowledge bases yet." : "No matching results."}
                  </h1>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {knowledgeBases.length === 0
                      ? "Create one from the panel on the right to get started."
                      : "Try a different search term."}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-border border-border">
                {filteredKnowledgeBases.map((item) => {
                  const isSelected = item.id === selectedKnowledgeBaseId
                  const sourceUrls = splitUrls(item.source_urls)
                  const visual = getKnowledgeBaseVisual(item.type)
                  const VisualIcon = visual.icon
                  const sourceCountLabel =
                    item.type === "WEB_SCRAPE"
                      ? `${Math.max(sourceUrls.length, 1)} page${Math.max(sourceUrls.length, 1) === 1 ? "" : "s"}`
                      : item.file_name
                        ? "1 file"
                        : "1 source"

                  return (
                    <li
                      key={item.id}
                      className={`group flex items-center gap-4 px-4 py-3 transition hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => void loadKnowledgeBaseDetail(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            void loadKnowledgeBaseDetail(item.id)
                          }
                        }}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-1 ring-border">
                          <VisualIcon className={`h-5 w-5 ${visual.iconClassName}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                            {isLoadingDetail && isSelected ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                            ) : null}
                            {item.status === "PROCESSING" ? (
                              <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {item.description || item.file_name || item.base_url || "No description available."}
                          </p>
                        </div>

                        <div className="hidden shrink-0 items-center gap-2 lg:flex">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${visual.labelClassName}`}
                          >
                            {visual.label}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${visual.metaClassName}`}
                          >
                            <Globe className="mr-1.5 h-3 w-3" />
                            {sourceCountLabel}
                          </span>
                          <Badge variant={formatStatusVariant(item.status)} className="text-[11px]">
                            {item.status}
                          </Badge>
                        </div>

                        <span className="hidden w-32 shrink-0 truncate text-right text-xs text-muted-foreground md:block">
                          {formatTimeAgo(item.updated_at)}
                        </span>
                      </div>

                      <div
                        className="flex shrink-0 items-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            router.push(`/dashboard/knowledgebase?tab=editor&id=${encodeURIComponent(item.id)}`)
                          }
                          className="h-8 rounded-md bg-amber-400 px-3 text-xs font-semibold text-black hover:bg-amber-400/90"
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label="Re-distill snippet from stored content"
                          onClick={() => void refreshKnowledgeBaseById(item.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Knowledge base actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem disabled className="cursor-not-allowed opacity-70">
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Enable Auto-sync
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onSelect={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="w-full bg-background lg:w-[420px] xl:w-[460px]">
          <div className="h-full overflow-y-auto">
            <div className="px-5 py-6">
              <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Update Knowledge Base</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Add files, text, or URLs. We&apos;ll extract the content, distill it with AI, and inject the
                snippet into your pathway&apos;s Knowledge Base node on export.
              </p>
            </div>

            <div className="space-y-3 px-5 pb-5">
              {errorMessage ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : null}
              {successMessage ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                  {successMessage}
                </div>
              ) : null}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
              <div className="border-y border-border">
                <TabsList className="grid h-auto w-full grid-cols-4 rounded-none bg-transparent p-0">
                  <TabsTrigger
                    value="website"
                    className="rounded-none border-r border-border py-3 text-[12px] font-semibold uppercase tracking-[0.08em] data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Website
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    className="rounded-none border-r border-border py-3 text-[12px] font-semibold uppercase tracking-[0.08em] data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Upload
                  </TabsTrigger>
                  <TabsTrigger
                    value="text"
                    className="rounded-none border-r border-border py-3 text-[12px] font-semibold uppercase tracking-[0.08em] data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Text
                  </TabsTrigger>
                  <TabsTrigger
                    value="integration"
                    className="rounded-none py-3 text-[12px] font-semibold uppercase tracking-[0.08em] data-[state=active]:bg-background data-[state=active]:shadow-none"
                  >
                    Integration
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="website" className="m-0 px-5 py-8">
                <form className="space-y-4" onSubmit={handleWebsiteSubmit}>
                  <Input
                    placeholder="Knowledge base name"
                    value={websiteForm.name}
                    onChange={(event) =>
                      setWebsiteForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Description"
                    value={websiteForm.description}
                    onChange={(event) =>
                      setWebsiteForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="min-h-[90px]"
                  />
                  <Textarea
                    placeholder={"Enter one URL per line\nhttps://example.com/docs\nhttps://example.com/help"}
                    value={websiteForm.urls}
                    onChange={(event) =>
                      setWebsiteForm((current) => ({ ...current, urls: event.target.value }))
                    }
                    className="min-h-[120px]"
                  />

                  <Button className="w-full rounded-none bg-black text-white hover:bg-black/90" disabled={submittingTab === "website"}>
                    {submittingTab === "website" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Select Website"
                    )}
                  </Button>
                </form>

                <div className="mt-8 flex flex-col items-center text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/20">
                    <Globe className="h-9 w-9 text-muted-foreground" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-2xl font-medium text-foreground">Scrape Website</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                    Extract content from websites and add them to your knowledge base. Perfect for documentation,
                    blogs, and other web content.
                  </p>
                </div>

                <Separator className="my-8" />

                <div>
                  <p className="text-sm font-semibold text-foreground">Features:</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {websiteFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-[7px] h-1 w-1 rounded-full bg-muted-foreground" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="m-0 px-5 py-8">
                <form className="space-y-4" onSubmit={handleUploadSubmit}>
                  <Input
                    placeholder="Knowledge base name"
                    value={uploadForm.name}
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Description"
                    value={uploadForm.description}
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="min-h-[90px]"
                  />
                  <Input
                    type="file"
                    accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,audio/*,video/*"
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))
                    }
                  />
                  <Button className="w-full rounded-none bg-black text-white hover:bg-black/90" disabled={submittingTab === "upload"}>
                    {submittingTab === "upload" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Choose Files"
                    )}
                  </Button>
                </form>

                <div className="mt-8">
                  <SourcePlaceholder
                    icon={Upload}
                    title="Upload Files"
                    description="Add PDFs, audio, video, or documents to build your knowledge base."
                  />
                </div>
              </TabsContent>

              <TabsContent value="text" className="m-0 px-5 py-8">
                <form className="space-y-4" onSubmit={handleTextSubmit}>
                  <Input
                    placeholder="Knowledge base name"
                    value={textForm.name}
                    onChange={(event) =>
                      setTextForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                  <Textarea
                    placeholder="Description"
                    value={textForm.description}
                    onChange={(event) =>
                      setTextForm((current) => ({ ...current, description: event.target.value }))
                    }
                    className="min-h-[90px]"
                  />
                  <Textarea
                    placeholder="Paste the text you want the agent to learn from"
                    value={textForm.text}
                    onChange={(event) =>
                      setTextForm((current) => ({ ...current, text: event.target.value }))
                    }
                    className="min-h-[180px]"
                  />
                  <Button className="w-full rounded-none bg-black text-white hover:bg-black/90" disabled={submittingTab === "text"}>
                    {submittingTab === "text" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Add Text"
                    )}
                  </Button>
                </form>

                <div className="mt-8">
                  <SourcePlaceholder
                    icon={FileText}
                    title="Paste Text"
                    description="Create entries from raw text, notes, SOPs, or internal documentation."
                  />
                </div>
              </TabsContent>

              <TabsContent value="integration" className="m-0 px-5 py-8">
                <SourcePlaceholder
                  icon={Link2}
                  title="Connect Integration"
                  description="Integration sources are reserved for a future phase of the Knowledge Base feature."
                />
                <Button variant="outline" className="mt-6 w-full" disabled>
                  Connect Source
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </aside>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingKb) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this knowledge base?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be removed from this list. This cannot be undone from the dashboard.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingKb}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingKb}
              onClick={() => void confirmDeleteKnowledgeBase()}
            >
              {isDeletingKb ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KnowledgeBasePageContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab")
  const editorId = searchParams.get("id")

  if (tab === "editor") {
    return (
      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <KnowledgeBaseEditor kbId={editorId} />
      </div>
    )
  }

  return <KnowledgeBaseListPage />
}

export default function KnowledgeBasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading…</p>
        </div>
      }
    >
      <KnowledgeBasePageContent />
    </Suspense>
  )
}

type SourcePlaceholderProps = {
  icon: LucideIcon
  title: string
  description: string
}

function SourcePlaceholder({ icon: Icon, title, description }: SourcePlaceholderProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/20">
        <Icon className="h-9 w-9 text-muted-foreground" strokeWidth={1.6} />
      </div>
      <h3 className="text-2xl font-medium text-foreground">{title}</h3>
      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm text-foreground">{value}</p>
    </div>
  )
}
