import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import {
  createKnowledgeBase,
  listKnowledgeBasesByUserId,
  type KnowledgeBaseRecord,
} from "@/lib/knowledge-bases"
import {
  KB_INGEST_LIMITS,
  cleanText,
  distillKbText,
  extractTextFromFile,
  extractTextFromUrl,
} from "@/lib/kb-ingest"

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const knowledgeBases = await listKnowledgeBasesByUserId(user.id)
    return NextResponse.json({ knowledgeBases, count: knowledgeBases.length })
  } catch (error) {
    console.error("[KNOWLEDGE-BASES] Failed to list knowledge bases:", error)
    return NextResponse.json({ error: "Failed to load knowledge bases" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      return handleFileUpload(user.id, request)
    }

    const body = await request.json()
    const type = String(body.type || "").trim().toLowerCase()
    const name = String(body.name || "").trim()
    const description = body.description ? String(body.description).trim() : null

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (type === "text") {
      const text = String(body.text || "")
      return handleTextCreate(user.id, { name, description, text })
    }

    if (type === "web") {
      const rawUrls = Array.isArray(body.urls) ? body.urls : []
      const urls = rawUrls
        .map((url: unknown) => String(url || "").trim())
        .filter(Boolean)
      return handleWebCreate(user.id, { name, description, urls })
    }

    return NextResponse.json({ error: `Unsupported knowledge base type: ${type}` }, { status: 400 })
  } catch (error) {
    console.error("[KNOWLEDGE-BASES] POST failed:", error)
    const message = error instanceof Error ? error.message : "Failed to create knowledge base"

    // Postgres errors carry a `code` field; surface common schema-mismatch
    // problems with a clear hint to run the migration.
    const pgCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : ""

    if (pgCode === "42703" /* undefined_column */ || /column .* does not exist/i.test(message)) {
      return NextResponse.json(
        {
          error: "Database schema is out of date.",
          details:
            `${message}. Run: psql "$DATABASE_URL" -f scripts/alter-knowledge-bases-local-ingest.sql`,
        },
        { status: 500 }
      )
    }
    if (pgCode === "23502" /* not_null_violation */ && /bland_kb_id/.test(message)) {
      return NextResponse.json(
        {
          error: "Database schema is out of date.",
          details:
            `bland_kb_id is still NOT NULL. Run: psql "$DATABASE_URL" -f scripts/alter-knowledge-bases-local-ingest.sql`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/* Type-specific handlers                                              */
/* ------------------------------------------------------------------ */

async function handleFileUpload(userId: string, request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData()
  const type = String(formData.get("type") || "").trim().toLowerCase()
  const name = String(formData.get("name") || "").trim()
  const descriptionRaw = String(formData.get("description") || "").trim()
  const description = descriptionRaw || null
  const file = formData.get("file")

  if (type !== "file") {
    return NextResponse.json({ error: "Invalid knowledge base type for file upload" }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Limit is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.` },
      { status: 413 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let extracted
  try {
    extracted = await extractTextFromFile({
      buffer,
      mimeType: file.type,
      fileName: file.name,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read file"
    return NextResponse.json({ error: `Could not read file: ${message}` }, { status: 422 })
  }

  const fullText = cleanText(extracted.text, KB_INGEST_LIMITS.fullTextChars)
  if (!fullText.trim()) {
    return NextResponse.json(
      { error: "We could not extract any readable text from this file." },
      { status: 422 }
    )
  }

  let kbText = ""
  try {
    const distilled = await distillKbText({ name, description, fullText })
    kbText = distilled.kbText
  } catch (e) {
    return distillFailureResponse(e)
  }

  const record = await createKnowledgeBase({
    userId,
    name,
    description,
    type: "FILE",
    status: "COMPLETED",
    textContent: fullText,
    kbText,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || null,
  })

  return NextResponse.json({ knowledgeBase: record satisfies KnowledgeBaseRecord })
}

async function handleTextCreate(
  userId: string,
  input: { name: string; description: string | null; text: string }
): Promise<NextResponse> {
  const fullText = cleanText(input.text, KB_INGEST_LIMITS.fullTextChars)
  if (!fullText.trim()) {
    return NextResponse.json({ error: "Text content is required" }, { status: 400 })
  }

  let kbText = ""
  try {
    const distilled = await distillKbText({
      name: input.name,
      description: input.description,
      fullText,
    })
    kbText = distilled.kbText
  } catch (e) {
    return distillFailureResponse(e)
  }

  const record = await createKnowledgeBase({
    userId,
    name: input.name,
    description: input.description,
    type: "TEXT",
    status: "COMPLETED",
    textContent: fullText,
    kbText,
  })

  return NextResponse.json({ knowledgeBase: record satisfies KnowledgeBaseRecord })
}

async function handleWebCreate(
  userId: string,
  input: { name: string; description: string | null; urls: string[] }
): Promise<NextResponse> {
  if (input.urls.length === 0) {
    return NextResponse.json({ error: "At least one URL is required" }, { status: 400 })
  }

  const successfulPages: Array<{ url: string; title: string | null; text: string }> = []
  const failedPages: Array<{ url: string; error: string }> = []

  for (const url of input.urls) {
    try {
      const result = await extractTextFromUrl(url)
      const trimmed = cleanText(result.text, KB_INGEST_LIMITS.fullTextChars)
      if (trimmed.trim()) {
        successfulPages.push({ url, title: result.title, text: trimmed })
      } else {
        failedPages.push({ url, error: "No readable text" })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Fetch failed"
      failedPages.push({ url, error: message })
    }
  }

  if (successfulPages.length === 0) {
    const detail = failedPages.map((p) => `${p.url}: ${p.error}`).join("; ")
    return NextResponse.json(
      { error: "Could not extract text from any of the URLs.", details: detail },
      { status: 422 }
    )
  }

  const combined = successfulPages
    .map((page) => `=== ${page.title || page.url} (${page.url}) ===\n${page.text}`)
    .join("\n\n")

  const fullText = cleanText(combined, KB_INGEST_LIMITS.fullTextChars)

  let kbText = ""
  try {
    const distilled = await distillKbText({
      name: input.name,
      description: input.description,
      fullText,
    })
    kbText = distilled.kbText
  } catch (e) {
    return distillFailureResponse(e)
  }

  let baseUrl: string | null = null
  try {
    baseUrl = new URL(successfulPages[0].url).origin
  } catch {
    baseUrl = null
  }

  const record = await createKnowledgeBase({
    userId,
    name: input.name,
    description: input.description,
    type: "WEB_SCRAPE",
    status: "COMPLETED",
    textContent: fullText,
    kbText,
    baseUrl,
    sourceUrls: successfulPages.map((p) => p.url),
  })

  return NextResponse.json({
    knowledgeBase: record satisfies KnowledgeBaseRecord,
    skipped: failedPages,
  })
}

function distillFailureResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Distillation failed"
  console.error("[KNOWLEDGE-BASES] Distill failed:", error)
  return NextResponse.json(
    {
      error: "AI distillation failed",
      details: message,
    },
    { status: 502 }
  )
}
