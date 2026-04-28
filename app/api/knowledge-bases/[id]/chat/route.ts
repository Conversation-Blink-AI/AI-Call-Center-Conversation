import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getKnowledgeBaseById, resolveKnowledgeBaseRouteId } from "@/lib/knowledge-bases"
import { chatWithKnowledgeBase, type KbChatMessage } from "@/lib/kb-ingest"

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

    const knowledgeBase = await getKnowledgeBaseById(id, user.id)
    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 })
    }

    const body = await request.json()
    const rawMessages: unknown = body.messages
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 })
    }

    const messages: KbChatMessage[] = []
    for (const item of rawMessages) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Each message must be an object" }, { status: 400 })
      }
      const m = item as Record<string, unknown>
      if (typeof m.content !== "string") {
        return NextResponse.json({ error: "Each message requires string content" }, { status: 400 })
      }
      const role = m.role === "system" || m.role === "assistant" ? m.role : "user"
      messages.push({ role, content: m.content })
    }

    const contextText = knowledgeBase.text_content || knowledgeBase.kb_text || ""
    if (!contextText.trim()) {
      return NextResponse.json(
        { error: "This knowledge base has no stored text yet." },
        { status: 422 }
      )
    }

    let result
    try {
      result = await chatWithKnowledgeBase({
        knowledgeBaseName: knowledgeBase.name,
        contextText,
        messages,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Knowledge chat request failed"
      console.error("[KNOWLEDGE-BASE] Chat failed:", e)
      return NextResponse.json(
        { error: "Knowledge chat request failed", details: message },
        { status: 502 }
      )
    }

    // Keep the response shape stable for the existing Test dialog:
    // { data: { response, context, sources }, errors }
    return NextResponse.json({
      data: {
        response: result.reply,
        context: null,
        sources: [],
        model: result.model,
      },
      errors: null,
    })
  } catch (error) {
    console.error("[KNOWLEDGE-BASE] Chat handler crashed:", error)
    const message = error instanceof Error ? error.message : "Chat failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
