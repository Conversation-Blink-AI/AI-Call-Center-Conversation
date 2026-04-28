import { type NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import {
  getKnowledgeBaseById,
  markKnowledgeBaseDeleted,
  resolveKnowledgeBaseRouteId,
  updateKnowledgeBaseMetadata,
} from "@/lib/knowledge-bases"

export async function GET(request: NextRequest, context: { params: Promise<{ id?: string | string[] }> }) {
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

    return NextResponse.json({ knowledgeBase })
  } catch (error) {
    console.error("[KNOWLEDGE-BASE] Failed to fetch knowledge base:", error)
    return NextResponse.json({ error: "Failed to fetch knowledge base" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id?: string | string[] }> }) {
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

    const body = await request.json().catch(() => ({}))
    const patch: { name?: string; description?: string | null; kbText?: string | null } = {}

    if (typeof body.name === "string") {
      const trimmed = body.name.trim()
      if (!trimmed) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      }
      patch.name = trimmed
    }

    if (body.description === null) {
      patch.description = null
    } else if (typeof body.description === "string") {
      patch.description = body.description
    }

    if (body.kbText === null || body.kb_text === null) {
      patch.kbText = null
    } else if (typeof body.kbText === "string") {
      patch.kbText = body.kbText
    } else if (typeof body.kb_text === "string") {
      patch.kbText = body.kb_text
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "Provide name, description, or kb_text to update" },
        { status: 400 }
      )
    }

    const updated = await updateKnowledgeBaseMetadata(knowledgeBase.id, user.id, patch)
    if (!updated) {
      return NextResponse.json({ error: "Failed to persist knowledge base update" }, { status: 500 })
    }

    return NextResponse.json({ knowledgeBase: updated })
  } catch (error) {
    console.error("[KNOWLEDGE-BASE] PUT failed:", error)
    const message = error instanceof Error ? error.message : "Failed to update knowledge base"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id?: string | string[] }> }) {
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

    const deleted = await markKnowledgeBaseDeleted(knowledgeBase.id, user.id)
    if (!deleted) {
      return NextResponse.json({ error: "Failed to persist deletion" }, { status: 500 })
    }

    return NextResponse.json({ success: true, knowledgeBase: deleted })
  } catch (error) {
    console.error("[KNOWLEDGE-BASE] DELETE failed:", error)
    const pg = error as { code?: string; message?: string }
    if (pg.code === "23514" && pg.message?.includes("knowledge_bases_status_check")) {
      return NextResponse.json(
        {
          error: "Database cannot store deleted knowledge bases until the schema is updated.",
          details:
            'Run: psql "$DATABASE_URL" -f scripts/alter-knowledge-bases-add-deleted-status.sql',
        },
        { status: 500 }
      )
    }
    const message = error instanceof Error ? error.message : "Failed to delete knowledge base"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
