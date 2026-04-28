"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Globe,
  Loader2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type KnowledgeBaseStatus = "PROCESSING" | "COMPLETED" | "FAILED" | "DELETED"
type KnowledgeBaseType = "FILE" | "TEXT" | "WEB_SCRAPE"

interface KnowledgeBase {
  id: string
  bland_kb_id: string | null
  name: string
  description: string | null
  status: KnowledgeBaseStatus
  type: KnowledgeBaseType
  source_urls: string | null
  base_url: string | null
  file_name: string | null
  text_content: string | null
  kb_text: string | null
  created_at: string
  updated_at: string
}

function splitUrls(value: string | null): string[] {
  if (!value) return []
  const trimmed = value.trim()
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      // ignore
    }
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function pathFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname || "/"
  } catch {
    return "/"
  }
}

type ChatSource = {
  id?: string
  content?: string
  metadata?: Record<string, unknown>
}

type ChatLine =
  | { role: "user"; content: string }
  | {
      role: "assistant"
      content: string
      context?: string | null
      sources?: ChatSource[]
    }

type Props = {
  kbId: string | null
}

export function KnowledgeBaseEditor({ kbId }: Props) {
  const router = useRouter()
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({})
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [testOpen, setTestOpen] = useState(false)
  const [chatLines, setChatLines] = useState<ChatLine[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatError, setChatError] = useState<string | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [kbTextDraft, setKbTextDraft] = useState("")
  const [isSavingKbText, setIsSavingKbText] = useState(false)
  const [kbTextError, setKbTextError] = useState<string | null>(null)
  const [kbTextNotice, setKbTextNotice] = useState<string | null>(null)
  const [isRedistilling, setIsRedistilling] = useState(false)

  useEffect(() => {
    if (!kbId) {
      setIsLoading(false)
      setError("No knowledge base selected.")
      return
    }

    let cancelled = false

    async function load() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/knowledge-bases/${kbId}`, {
          credentials: "include",
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load knowledge base")
        }
        if (!cancelled) {
          setKnowledgeBase(payload.knowledgeBase as KnowledgeBase)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [kbId])

  useEffect(() => {
    if (testOpen) {
      setChatLines([])
      setChatInput("")
      setChatError(null)
    }
  }, [testOpen])

  useEffect(() => {
    setKbTextDraft(knowledgeBase?.kb_text ?? "")
    setKbTextError(null)
    setKbTextNotice(null)
  }, [knowledgeBase?.id, knowledgeBase?.kb_text])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatLines, testOpen])

  const urls = useMemo(() => splitUrls(knowledgeBase?.source_urls ?? null), [knowledgeBase?.source_urls])

  const urlsByDomain = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const url of urls) {
      const host = hostnameFromUrl(url)
      if (!map.has(host)) map.set(host, [])
      map.get(host)!.push(url)
    }
    return map
  }, [urls])

  const urlCount = urls.length
  const maxUrls = 100

  function openEditDialog() {
    if (!knowledgeBase) return
    setEditName(knowledgeBase.name)
    setEditDescription(knowledgeBase.description ?? "")
    setEditError(null)
    setEditOpen(true)
  }

  async function saveMetadata() {
    if (!kbId) return
    setIsSaving(true)
    setEditError(null)
    try {
      const response = await fetch(`/api/knowledge-bases/${kbId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() === "" ? null : editDescription.trim(),
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update knowledge base")
      }
      setKnowledgeBase(payload.knowledgeBase as KnowledgeBase)
      setEditOpen(false)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setIsSaving(false)
    }
  }

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || !kbId || isChatLoading) return

    const userLine: ChatLine = { role: "user", content: text }
    const history = [...chatLines, userLine]
    setChatLines(history)
    setChatInput("")
    setChatError(null)
    setIsChatLoading(true)

    const messagesPayload = history.map((line) => ({
      role: line.role,
      content: line.content,
    }))

    try {
      const response = await fetch(`/api/knowledge-bases/${kbId}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesPayload }),
      })
      const payload = await response.json()
      if (!response.ok) {
        const rawDetail = payload.details ?? payload.error
        const detail =
          typeof rawDetail === "string"
            ? rawDetail
            : rawDetail != null
              ? JSON.stringify(rawDetail)
              : "Knowledge chat request failed"
        throw new Error(detail)
      }
      const data = payload.data as
        | {
            response?: string
            context?: string
            sources?: ChatSource[]
          }
        | null
        | undefined
      const assistantLine: ChatLine = {
        role: "assistant",
        content: data?.response ?? "",
        context: data?.context,
        sources: data?.sources,
      }
      setChatLines([...history, assistantLine])
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Request failed")
      setChatInput(text)
    } finally {
      setIsChatLoading(false)
    }
  }

  async function saveKbText() {
    if (!kbId) return
    setIsSavingKbText(true)
    setKbTextError(null)
    setKbTextNotice(null)
    try {
      const response = await fetch(`/api/knowledge-bases/${kbId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kbText: kbTextDraft }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save snippet")
      }
      setKnowledgeBase(payload.knowledgeBase as KnowledgeBase)
      setKbTextNotice("Snippet saved.")
    } catch (e) {
      setKbTextError(e instanceof Error ? e.message : "Failed to save snippet")
    } finally {
      setIsSavingKbText(false)
    }
  }

  async function reDistill() {
    if (!kbId) return
    setIsRedistilling(true)
    setKbTextError(null)
    setKbTextNotice(null)
    try {
      const response = await fetch(`/api/knowledge-bases/${kbId}/refresh`, {
        method: "POST",
        credentials: "include",
      })
      const payload = await response.json()
      if (!response.ok) {
        const base = typeof payload.error === "string" ? payload.error : "Re-distill failed"
        const detail =
          payload.details != null
            ? typeof payload.details === "string"
              ? payload.details
              : JSON.stringify(payload.details)
            : ""
        throw new Error(detail ? `${base}: ${detail}` : base)
      }
      setKnowledgeBase(payload.knowledgeBase as KnowledgeBase)
      const skipped = Array.isArray(payload.skipped) ? payload.skipped : []
      setKbTextNotice(
        skipped.length > 0
          ? `Re-distilled. ${skipped.length} URL${skipped.length === 1 ? "" : "s"} skipped.`
          : "Re-distilled from latest content."
      )
    } catch (e) {
      setKbTextError(e instanceof Error ? e.message : "Re-distill failed")
    } finally {
      setIsRedistilling(false)
    }
  }

  async function deleteKnowledgeBase() {
    if (!kbId) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/knowledge-bases/${kbId}`, {
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
      setDeleteOpen(false)
      router.push("/dashboard/knowledgebase")
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading knowledge base…</p>
      </div>
    )
  }

  if (error || !knowledgeBase) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
        <p className="text-center text-sm text-muted-foreground">{error || "Knowledge base not found."}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/knowledgebase")}>
          Back to Knowledge Base
        </Button>
      </div>
    )
  }

  const isWebScrape = knowledgeBase.type === "WEB_SCRAPE"

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/dashboard/knowledgebase")}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600">
            <Globe className="h-5 w-5" />
          </div>
          <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">{knowledgeBase.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete knowledge base"
            onClick={() => {
              setDeleteError(null)
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {urlCount}/{maxUrls} URLs
          </span>
        </div>
      </header>

      {/* Action strip */}
      <div className="shrink-0 border-b border-amber-100 bg-amber-50/90 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-900">
              <Eye className="h-3.5 w-3.5" />
              View Only
            </span>
            <span className="text-sm text-foreground">
              {isWebScrape ? `${urlCount} URL${urlCount === 1 ? "" : "s"} scraped` : "Not a web scrape KB"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="bg-amber-400 font-semibold text-black hover:bg-amber-400/90"
              onClick={() => setTestOpen(true)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Test
            </Button>
            <Button type="button" variant="secondary" className="font-semibold" onClick={openEditDialog}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle>Test knowledge base</DialogTitle>
            <DialogDescription>
              Ask questions in natural language. Answers are generated by OpenRouter using this knowledge base&apos;s stored text as context.
            </DialogDescription>
          </DialogHeader>
          {knowledgeBase.status === "PROCESSING" ? (
            <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-950">
              This knowledge base may still be indexing. Answers can be incomplete until status is completed.
            </p>
          ) : null}
          <ScrollArea className="h-[min(360px,50vh)] px-6">
            <div className="space-y-4 py-4 pr-3">
              {chatLines.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Ask a question about your indexed content. You can continue the conversation in follow-up messages.
                </p>
              ) : (
                chatLines.map((line, index) =>
                  line.role === "user" ? (
                    <div key={`u-${index}`} className="flex justify-end">
                      <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {line.content}
                      </div>
                    </div>
                  ) : (
                    <div key={`a-${index}`} className="space-y-2">
                      <div className="flex justify-start">
                        <div className="max-w-[90%] rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                          {line.content || (
                            <span className="text-muted-foreground">(No response text)</span>
                          )}
                        </div>
                      </div>
                      {line.context ? (
                        <p className="pl-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">Context: </span>
                          {line.context}
                        </p>
                      ) : null}
                      {line.sources && line.sources.length > 0 ? (
                        <div className="space-y-2 pl-1">
                          <p className="text-xs font-medium text-muted-foreground">Sources</p>
                          <ul className="space-y-2">
                            {line.sources.map((src, sIdx) => (
                              <li
                                key={src.id ?? `src-${sIdx}`}
                                className="rounded-md border border-border bg-card px-3 py-2 text-xs"
                              >
                                {src.content ? (
                                  <p className="whitespace-pre-wrap text-foreground">{src.content}</p>
                                ) : null}
                                {src.metadata && Object.keys(src.metadata).length > 0 ? (
                                  <pre className="mt-2 max-h-24 overflow-auto rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                                    {JSON.stringify(src.metadata, null, 2)}
                                  </pre>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ),
                )
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          {chatError ? (
            <p className="shrink-0 border-t border-destructive/30 bg-destructive/5 px-6 py-2 text-sm text-destructive">
              {chatError}
            </p>
          ) : null}
          <div className="shrink-0 space-y-3 border-t border-border px-6 py-4">
            <Textarea
              placeholder="Type your question…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={3}
              disabled={isChatLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void sendChatMessage()
                }
              }}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTestOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                className="bg-amber-400 font-semibold text-black hover:bg-amber-400/90"
                disabled={isChatLoading || !chatInput.trim()}
                onClick={() => void sendChatMessage()}
              >
                {isChatLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit knowledge base</DialogTitle>
            <DialogDescription>Update the name and description. This does not change scraped or file content.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="kb-edit-name">Name</Label>
              <Input
                id="kb-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kb-edit-description">Description</Label>
              <Textarea
                id="kb-edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                placeholder="Optional. Leave empty to remove the description."
              />
            </div>
            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveMetadata()} disabled={isSaving || !editName.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this knowledge base?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the knowledge base from your workspace. You cannot undo this from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void deleteKnowledgeBase()}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Pathway KB snippet
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                This distilled text is what gets injected into the &quot;Knowledge Base&quot; node&apos;s
                <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px]">kb</code>
                field on pathway export. Edit it directly or click Re-distill to regenerate from the stored content.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRedistilling || isSavingKbText}
                onClick={() => void reDistill()}
              >
                {isRedistilling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Re-distill
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  isSavingKbText ||
                  isRedistilling ||
                  kbTextDraft === (knowledgeBase.kb_text ?? "")
                }
                onClick={() => void saveKbText()}
              >
                {isSavingKbText ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>
          <Textarea
            value={kbTextDraft}
            onChange={(e) => {
              setKbTextDraft(e.target.value)
              setKbTextNotice(null)
            }}
            rows={10}
            placeholder="No distilled snippet yet. Re-distill to generate one from the stored content."
            className="font-mono text-xs"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{kbTextDraft.length} characters</span>
            {kbTextError ? (
              <span className="text-xs text-destructive">{kbTextError}</span>
            ) : kbTextNotice ? (
              <span className="text-xs text-emerald-600">{kbTextNotice}</span>
            ) : null}
          </div>
        </section>

        {isWebScrape && urls.length > 0 ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Scraped URLs</h2>
              <Badge variant="secondary" className="rounded-md font-normal">
                {urlCount}
              </Badge>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-card">
              {Array.from(urlsByDomain.entries()).map(([domain, domainUrls]) => {
                const open = openDomains[domain] ?? true
                return (
                  <Collapsible
                    key={domain}
                    open={open}
                    onOpenChange={(next) => setOpenDomains((prev) => ({ ...prev, [domain]: next }))}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/40">
                      <span className="flex min-w-0 items-center gap-2">
                        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium text-foreground">{domain}</span>
                        <Badge variant="outline" className="shrink-0 font-normal">
                          {domainUrls.length}
                        </Badge>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="space-y-0 border-b border-border bg-muted/20 px-4 py-2 last:border-b-0">
                        {domainUrls.map((u) => (
                          <li
                            key={u}
                            className="flex items-center gap-2 border-b border-border/60 py-2 pl-6 text-sm last:border-b-0"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            <span className="truncate font-mono text-muted-foreground">{pathFromUrl(u)}</span>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isWebScrape
                ? "No scraped URLs yet. They will appear here once processing completes."
                : "Editor view for file and text knowledge bases will be available in a future update."}
            </p>
            {knowledgeBase.file_name ? (
              <p className="mt-2 text-sm font-medium text-foreground">{knowledgeBase.file_name}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
