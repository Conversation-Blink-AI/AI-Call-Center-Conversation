/**
 * Local Knowledge Base ingestion + distillation.
 *
 * - extractTextFromFile: PDF / DOCX / plain text -> raw string
 * - extractTextFromUrl:  fetch + Readability/cheerio -> { text, title, baseUrl }
 * - cleanText:           normalize whitespace and trim to a safe size
 * - distillKbText:       OpenRouter call that compresses the cleaned text
 *                         into a compact "fact sheet" suitable for inlining
 *                         in a Bland pathway "Knowledge Base" node `kb` field.
 */

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini"
const DEFAULT_FULL_TEXT_LIMIT = 200_000 // ~200KB of text per KB row
const DEFAULT_KB_TEXT_LIMIT = 6_000 // distilled snippet target ceiling

export const KB_INGEST_LIMITS = {
  fullTextChars: DEFAULT_FULL_TEXT_LIMIT,
  kbTextChars: DEFAULT_KB_TEXT_LIMIT,
} as const

/* ------------------------------------------------------------------ */
/* Cleaning                                                            */
/* ------------------------------------------------------------------ */

export function cleanText(raw: string | null | undefined, maxChars: number = DEFAULT_FULL_TEXT_LIMIT): string {
  if (!raw) return ""

  const stripped = raw
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")

  const collapsed = stripped
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()

  if (collapsed.length <= maxChars) return collapsed
  return `${collapsed.slice(0, maxChars)}\n[...truncated]`
}

/* ------------------------------------------------------------------ */
/* File extraction                                                     */
/* ------------------------------------------------------------------ */

export interface FileExtractionInput {
  buffer: Buffer
  mimeType: string | null | undefined
  fileName: string | null | undefined
}

export interface FileExtractionResult {
  text: string
  detectedType: "pdf" | "docx" | "text" | "unknown"
}

function extensionOf(name: string | null | undefined): string {
  if (!name) return ""
  const idx = name.lastIndexOf(".")
  if (idx < 0) return ""
  return name.slice(idx + 1).toLowerCase()
}

export async function extractTextFromFile(input: FileExtractionInput): Promise<FileExtractionResult> {
  const mime = (input.mimeType || "").toLowerCase()
  const ext = extensionOf(input.fileName)

  if (mime === "application/pdf" || ext === "pdf") {
    const text = await extractPdfText(input.buffer)
    return { text, detectedType: "pdf" }
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const text = await extractDocxText(input.buffer)
    return { text, detectedType: "docx" }
  }

  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/x-yaml" ||
    ext === "txt" ||
    ext === "md" ||
    ext === "csv" ||
    ext === "json" ||
    ext === "xml" ||
    ext === "yaml" ||
    ext === "yml"
  ) {
    const text = input.buffer.toString("utf-8")
    return { text, detectedType: "text" }
  }

  // Best-effort fallback: try utf-8 decode; caller can decide if empty.
  const text = input.buffer.toString("utf-8")
  return { text, detectedType: "unknown" }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse v2 exports a class. Lazy import keeps the heavy pdfjs
  // dependency out of the cold-start path of unrelated routes.
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result?.text || ""
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = (await import("mammoth")) as {
    extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>
  }
  const { value } = await mammoth.extractRawText({ buffer })
  return value || ""
}

/* ------------------------------------------------------------------ */
/* URL extraction                                                      */
/* ------------------------------------------------------------------ */

export interface UrlExtractionResult {
  url: string
  finalUrl: string
  title: string | null
  text: string
}

// Threshold under which we consider static-HTML extraction to have "failed"
// (most likely a JS-rendered SPA where the body shell carries no real text).
const STATIC_EXTRACTION_MIN_CHARS = 200

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

async function staticExtract(url: string): Promise<UrlExtractionResult | null> {
  let res: Response
  try {
    res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": BROWSER_UA,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    throw new Error(
      `Failed to fetch ${url}: ${e instanceof Error ? e.message : "network error"}`
    )
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }

  const html = await res.text()
  const finalUrl = res.url || url

  const { JSDOM } = (await import("jsdom")) as typeof import("jsdom")
  const dom = new JSDOM(html, { url: finalUrl })
  const documentTitle = dom.window.document.title || null

  let articleText = ""
  let articleTitle: string | null = null
  try {
    const { Readability } = (await import("@mozilla/readability")) as typeof import("@mozilla/readability")
    const reader = new Readability(dom.window.document)
    const article = reader.parse()
    if (article?.textContent && article.textContent.trim().length > 0) {
      articleText = article.textContent
      articleTitle = article.title || null
    }
  } catch {
    // fall through to cheerio extraction below
  }

  if (!articleText) {
    const cheerio = (await import("cheerio")) as typeof import("cheerio")
    const $ = cheerio.load(html)
    $("script, style, noscript, svg, iframe, nav, footer, header, form").remove()
    articleText = $("body").text() || $.root().text() || ""
  }

  if (articleText.trim().length < STATIC_EXTRACTION_MIN_CHARS) {
    return null
  }

  return {
    url,
    finalUrl,
    title: articleTitle ?? documentTitle,
    text: articleText,
  }
}

/**
 * Fallback for JS-rendered pages (SPAs) where the static HTML shell carries
 * no real text. Uses the public Jina Reader proxy (https://r.jina.ai), which
 * runs the page in a real browser and returns clean markdown.
 *
 * Set KB_READER_PROXY=off to disable, or override the base via KB_READER_PROXY_URL
 * (default: https://r.jina.ai). An optional bearer token may be provided via
 * JINA_API_KEY for higher rate limits.
 */
async function readerProxyExtract(url: string): Promise<UrlExtractionResult | null> {
  if (process.env.KB_READER_PROXY === "off") return null

  const proxyBase = (process.env.KB_READER_PROXY_URL || "https://r.jina.ai").replace(/\/+$/, "")
  const proxyUrl = `${proxyBase}/${url}`

  const headers: Record<string, string> = {
    "user-agent": BROWSER_UA,
    accept: "text/plain, text/markdown, text/*;q=0.9, */*;q=0.5",
    // Ask Jina Reader to return plain text/markdown rather than JSON.
    "x-return-format": "markdown",
  }
  if (process.env.JINA_API_KEY) {
    headers.authorization = `Bearer ${process.env.JINA_API_KEY}`
  }

  let res: Response
  try {
    res = await fetch(proxyUrl, {
      method: "GET",
      redirect: "follow",
      headers,
      signal: AbortSignal.timeout(45_000),
    })
  } catch (e) {
    throw new Error(
      `Reader proxy failed for ${url}: ${e instanceof Error ? e.message : "network error"}`
    )
  }

  if (!res.ok) {
    throw new Error(`Reader proxy failed for ${url}: ${res.status} ${res.statusText}`)
  }

  const body = await res.text()
  if (!body || body.trim().length < STATIC_EXTRACTION_MIN_CHARS) {
    return null
  }

  // Jina Reader output usually starts with metadata lines like:
  //   Title: ...
  //   URL Source: ...
  //   Markdown Content:
  //   ...actual content...
  // Capture title if present and strip the header block from the body.
  let title: string | null = null
  let content = body
  const titleMatch = body.match(/^Title:\s*(.+)$/m)
  if (titleMatch) title = titleMatch[1].trim()

  const splitIdx = body.indexOf("Markdown Content:")
  if (splitIdx >= 0) {
    content = body.slice(splitIdx + "Markdown Content:".length).trimStart()
  }

  return {
    url,
    finalUrl: url,
    title,
    text: content,
  }
}

export async function extractTextFromUrl(url: string): Promise<UrlExtractionResult> {
  const errors: string[] = []

  try {
    const fast = await staticExtract(url)
    if (fast) return fast
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
  }

  try {
    const rendered = await readerProxyExtract(url)
    if (rendered) return rendered
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
  }

  if (errors.length > 0) {
    throw new Error(errors.join(" | "))
  }
  throw new Error(`No readable text found at ${url} (the page may render content with JavaScript)`)
}

/* ------------------------------------------------------------------ */
/* Distillation (OpenRouter)                                           */
/* ------------------------------------------------------------------ */

export interface DistillInput {
  name: string
  description?: string | null
  fullText: string
  /** Approximate output character target (model is asked to stay under). */
  targetChars?: number
}

export interface DistillResult {
  kbText: string
  model: string
}

const DISTILL_SYSTEM_PROMPT = `You compress reference material into a compact "fact sheet" that an AI voice agent will quote at runtime.

Rules:
- Output PLAIN TEXT only. No markdown, no JSON, no code fences, no preamble, no commentary.
- Group related facts under short ALL-CAPS section headings followed by a colon. Each fact on its own line.
- Preserve specific values exactly: prices, hours, phone numbers, addresses, URLs, model numbers, dates, names.
- Drop marketing fluff, navigation, legal boilerplate, and duplicate entries.
- Use short, telegraphic lines. Aim for the smallest output that retains all distinct facts.
- If a section has no real facts, omit it.`

export async function distillKbText(input: DistillInput): Promise<DistillResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const model = process.env.OPENROUTER_KB_MODEL || DEFAULT_OPENROUTER_MODEL
  const targetChars = input.targetChars ?? DEFAULT_KB_TEXT_LIMIT

  const trimmedFull = cleanText(input.fullText, DEFAULT_FULL_TEXT_LIMIT)
  if (!trimmedFull) {
    return { kbText: "", model }
  }

  const userPrompt = [
    `Knowledge base name: ${input.name || "(untitled)"}`,
    input.description ? `Description: ${input.description}` : null,
    `Target output length: at most ${targetChars} characters.`,
    "",
    "REFERENCE MATERIAL START",
    trimmedFull,
    "REFERENCE MATERIAL END",
  ]
    .filter(Boolean)
    .join("\n")

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://bland-flowchart-builder.vercel.app/",
      "X-Title": "Bland.ai Flowchart Builder - KB Distill",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: DISTILL_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const rawText = await res.text()

  if (!res.ok) {
    let detail: unknown = rawText
    try {
      detail = JSON.parse(rawText)
    } catch {
      // keep raw text
    }
    throw new Error(
      `OpenRouter distill failed (${res.status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
    )
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> } = {}
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    payload = {}
  }

  const content = payload.choices?.[0]?.message?.content?.trim() || ""
  const stripped = content
    .replace(/^```[a-zA-Z]*\n?/m, "")
    .replace(/```\s*$/m, "")
    .trim()

  return {
    kbText: stripped,
    model,
  }
}

/* ------------------------------------------------------------------ */
/* OpenRouter chat (used by the KB Test dialog)                        */
/* ------------------------------------------------------------------ */

export interface KbChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface KbChatInput {
  knowledgeBaseName: string
  contextText: string
  messages: KbChatMessage[]
}

export interface KbChatResult {
  reply: string
  model: string
  raw: unknown
}

const CHAT_SYSTEM_PROMPT_TEMPLATE = (kbName: string) =>
  `You are a helpful assistant answering questions strictly from the knowledge base named "${kbName}".

- Use only the REFERENCE MATERIAL provided in the next system message as your source of truth.
- If a fact is not in the reference material, say you do not know.
- Be concise. Prefer short, direct answers.`

export async function chatWithKnowledgeBase(input: KbChatInput): Promise<KbChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const model = process.env.OPENROUTER_KB_MODEL || DEFAULT_OPENROUTER_MODEL
  const trimmedContext = cleanText(input.contextText, DEFAULT_FULL_TEXT_LIMIT)

  const messages: KbChatMessage[] = [
    { role: "system", content: CHAT_SYSTEM_PROMPT_TEMPLATE(input.knowledgeBaseName || "(untitled)") },
    {
      role: "system",
      content: `REFERENCE MATERIAL START\n${trimmedContext || "(empty knowledge base)"}\nREFERENCE MATERIAL END`,
    },
    ...input.messages,
  ]

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://bland-flowchart-builder.vercel.app/",
      "X-Title": "Bland.ai Flowchart Builder - KB Chat",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const rawText = await res.text()

  if (!res.ok) {
    let detail: unknown = rawText
    try {
      detail = JSON.parse(rawText)
    } catch {
      // keep raw text
    }
    throw new Error(
      `OpenRouter chat failed (${res.status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
    )
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> } = {}
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    payload = {}
  }

  const reply = payload.choices?.[0]?.message?.content?.trim() || ""
  return { reply, model, raw: payload }
}
