"use client"

import { KeyboardEvent, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Play, Search, X } from "lucide-react"

interface Voice {
  id: string
  name: string
  description: string
  voiceId: string
  tags: string[]
}

export default function AdminVoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [voiceId, setVoiceId] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    fetchVoices()
  }, [])

  const fetchVoices = async (overrideSearch?: string) => {
    try {
      setLoading(true)
      const searchValue = overrideSearch ?? search
      const params = new URLSearchParams()
      if (searchValue.trim()) {
        params.append("search", searchValue.trim())
      }

      const response = await fetch(`/api/admin/voices?${params.toString()}`, {
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error("Failed to fetch voices")
      }

      const data = await response.json()
      if (data.success) {
        setVoices(data.voices)
      }
    } catch (err) {
      console.error("Error fetching voices:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchVoices(search)
  }

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) return
    setTags((prev) => [...prev, trimmed])
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      addTag(tagInput)
      setTagInput("")
    }
  }

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((tag) => tag !== value))
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setVoiceId("")
    setTags([])
    setTagInput("")
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!name.trim() || !description.trim() || !voiceId.trim() || tags.length === 0) {
      setFormError("All fields are required, including at least one tag.")
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch("/api/admin/voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          voiceId: voiceId.trim(),
          tags
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to add voice")
      }

      resetForm()
      setFormSuccess("Voice added successfully.")
      await fetchVoices()
    } catch (err: any) {
      setFormError(err.message || "Failed to add voice.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch (err) {
      console.error("Failed to copy voice id:", err)
    }
  }

  const emptyState = useMemo(() => {
    if (loading) return ""
    if (voices.length > 0) return ""
    if (search.trim()) return "No voices match your search."
    return "No voices yet. Add your first voice above."
  }, [loading, search, voices.length])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Voices</h1>
        <p className="text-muted-foreground">Manage voice catalog for admin use</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Voices</CardTitle>
          <CardDescription>Handpicked voices tailored for professional use cases.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search voices..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("")
                fetchVoices("")
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Voice</CardTitle>
          <CardDescription>All fields are required for new voices.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Maeve"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Voice ID</label>
                <Input
                  value={voiceId}
                  onChange={(event) => setVoiceId(event.target.value)}
                  placeholder="bland-voice-123"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A clear, friendly voice with a neutral accent."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Type a tag and press Enter"
                  className="min-w-[220px] flex-1"
                />
              </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {formSuccess && <p className="text-sm text-green-500">{formSuccess}</p>}

            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Add Voice"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voices</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `${voices.length} voices`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : voices.length ? (
            <div className="divide-y divide-border">
              {voices.map((voice) => (
                <div key={voice.id} className="flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{voice.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">{voice.name}</span>
                        <span className="text-xs text-muted-foreground">{voice.voiceId}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopy(voice.id, voice.voiceId)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {copiedId === voice.id && (
                          <span className="text-xs text-muted-foreground">Copied</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{voice.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <div className="flex flex-wrap gap-2">
                      {voice.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" disabled title="Audio preview coming soon">
                      <Play className="mr-2 h-4 w-4" />
                      Play
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">{emptyState}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
