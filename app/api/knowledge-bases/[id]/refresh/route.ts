import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import {
  getKnowledgeBaseById,
  resolveKnowledgeBaseRouteId,
  splitSourceUrls,
  updateKnowledgeBaseAfterReingest,
} from "@/lib/knowledge-bases"
import {
  KB_INGEST_LIMITS,
  cleanText,
  distillKbText,
  extractTextFromUrl,
} from "@/lib/kb-ingest"

/**
 * "Refresh" now means: re-distill the existing text_content. For WEB_SCRAPE
 * KBs we additionally re-fetch each source_url and rebuild text_content first.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id?: string | string[] }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = await resolveKnowledgeBaseRouteId(context.params)
    if (!id) {
      return NextResponse.json({ error: "Invalid knowledge base id" }, { status: 400 })
    }

    const kb = await getKnowledgeBaseById(id, user.id)
    if (!kb) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 })
    }

    let textContent = kb.text_content || ""
    let sourceUrls: string[] | undefined
    const skipped: Array<{ url: string; error: string }> = []

    if (kb.type === "WEB_SCRAPE") {
      const urls = splitSourceUrls(kb.source_urls)
      if (urls.length === 0) {
        return NextResponse.json(
          { error: "Cannot re-scrape: this knowledge base has no source URLs." },
          { status: 400 }
        )
      }

      const successfulPages: Array<{ url: string; title: string | null; text: string }> = []
      for (const url of urls) {
        try {
          const result = await extractTextFromUrl(url)
          const trimmed = cleanText(result.text, KB_INGEST_LIMITS.fullTextChars)
          if (trimmed.trim()) {
            successfulPages.push({ url, title: result.title, text: trimmed })
          } else {
            skipped.push({ url, error: "No readable text" })
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Fetch failed"
          skipped.push({ url, error: message })
        }
      }

      if (successfulPages.length === 0) {
        const detail = skipped.map((p) => `${p.url}: ${p.error}`).join("; ")
        return NextResponse.json(
          { error: "Could not re-scrape any of the URLs.", details: detail },
          { status: 422 }
        )
      }

      const combined = successfulPages
        .map((page) => `=== ${page.title || page.url} (${page.url}) ===\n${page.text}`)
        .join("\n\n")
      textContent = cleanText(combined, KB_INGEST_LIMITS.fullTextChars)
      sourceUrls = successfulPages.map((p) => p.url)
    }

    if (!textContent.trim()) {
      return NextResponse.json(
        { error: "Knowledge base has no text content to re-distill." },
        { status: 422 }
      )
    }

    let kbText = ""
    try {
      const distilled = await distillKbText({
        name: kb.name,
        description: kb.description,
        fullText: textContent,
      })
      kbText = distilled.kbText
    } catch (e) {
      const message = e instanceof Error ? e.message : "Distillation failed"
      console.error("[KNOWLEDGE-BASE] Refresh distill failed:", e)
      return NextResponse.json(
        { error: "AI distillation failed", details: message },
        { status: 502 }
      )
    }

    const updated = await updateKnowledgeBaseAfterReingest(kb.id, user.id, {
      textContent,
      kbText,
      sourceUrls,
      status: "COMPLETED",
    })

    if (!updated) {
      return NextResponse.json({ error: "Failed to persist refresh" }, { status: 500 })
    }

    return NextResponse.json({ knowledgeBase: updated, skipped })
  } catch (error) {
    console.error("[KNOWLEDGE-BASE] Failed to refresh knowledge base:", error)
    const message = error instanceof Error ? error.message : "Failed to refresh knowledge base"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
