import { db } from "@/lib/db"

/** Next.js 15+ passes `params` as a Promise in route handlers; IDs may be string or string[]. */
export async function resolveKnowledgeBaseRouteId(
  params: Promise<{ id?: string | string[] }>
): Promise<string | null> {
  const p = await params
  const raw = p.id
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) return raw[0].trim()
  return null
}

export type KnowledgeBaseStatus = "PROCESSING" | "COMPLETED" | "FAILED" | "DELETED"
export type KnowledgeBaseType = "FILE" | "TEXT" | "WEB_SCRAPE"

export interface KnowledgeBaseRecord {
  id: string
  user_id: string
  /** Legacy: only present on rows created before the local-ingestion switch. */
  bland_kb_id: string | null
  name: string
  description: string | null
  status: KnowledgeBaseStatus
  type: KnowledgeBaseType
  /** Full cleaned extracted text (all types). */
  text_content: string | null
  /** AI-distilled snippet that gets injected into the pathway "Knowledge Base" node `kb` field. */
  kb_text: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  base_url: string | null
  source_urls: string | null
  bland_raw_response: unknown
  bland_created_at: string | null
  bland_updated_at: string | null
  created_at: string
  updated_at: string
}

export function normalizeKnowledgeBaseStatus(
  status: string | null | undefined
): KnowledgeBaseStatus {
  if (status === "COMPLETED" || status === "FAILED" || status === "DELETED") {
    return status
  }
  return "PROCESSING"
}

export function normalizeKnowledgeBaseType(
  type: string | null | undefined
): KnowledgeBaseType {
  if (type === "FILE" || type === "TEXT" || type === "WEB_SCRAPE") {
    return type
  }
  if (type === "file") return "FILE"
  if (type === "text") return "TEXT"
  if (type === "web" || type === "WEB") return "WEB_SCRAPE"
  return "TEXT"
}

export function joinSourceUrls(urls: string[] | null | undefined): string | null {
  if (!urls || urls.length === 0) return null
  const normalizedUrls = urls.map((url) => url.trim()).filter(Boolean)
  return normalizedUrls.length > 0 ? normalizedUrls.join(",") : null
}

export function splitSourceUrls(sourceUrls: string | null | undefined): string[] {
  if (!sourceUrls) return []

  const trimmed = sourceUrls.trim()

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((url) => String(url).trim()).filter(Boolean)
      }
    } catch {
      // Fall back to comma-separated parsing below.
    }
  }

  return sourceUrls
    .split(",")
    .map((url) => url.replace(/^\[?"/, "").replace(/"\]?$/, "").trim())
    .filter(Boolean)
}

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function listKnowledgeBasesByUserId(userId: string): Promise<KnowledgeBaseRecord[]> {
  const result = await db.query(
    `SELECT *
     FROM knowledge_bases
     WHERE user_id = $1 AND status <> 'DELETED'
     ORDER BY updated_at DESC, created_at DESC`,
    [userId]
  )

  return result.rows as KnowledgeBaseRecord[]
}

export async function getKnowledgeBaseById(id: string, userId: string): Promise<KnowledgeBaseRecord | null> {
  const result = await db.query(
    `SELECT *
     FROM knowledge_bases
     WHERE id = $1 AND user_id = $2 AND status <> 'DELETED'
     LIMIT 1`,
    [id, userId]
  )

  return (result.rows[0] as KnowledgeBaseRecord | undefined) ?? null
}

/* ------------------------------------------------------------------ */
/* Mutations                                                            */
/* ------------------------------------------------------------------ */

export interface CreateKnowledgeBaseInput {
  userId: string
  name: string
  description?: string | null
  type: KnowledgeBaseType
  status?: KnowledgeBaseStatus
  textContent?: string | null
  kbText?: string | null
  fileName?: string | null
  fileSize?: number | null
  fileType?: string | null
  baseUrl?: string | null
  sourceUrls?: string[] | string | null
}

function normalizeSourceUrlsInput(input: string[] | string | null | undefined): string | null {
  if (input == null) return null
  if (Array.isArray(input)) return joinSourceUrls(input)
  return joinSourceUrls(splitSourceUrls(input))
}

export async function createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseRecord> {
  const status = input.status ?? "COMPLETED"
  const sourceUrls = normalizeSourceUrlsInput(input.sourceUrls ?? null)

  const result = await db.query(
    `INSERT INTO knowledge_bases (
       user_id,
       name,
       description,
       status,
       type,
       text_content,
       kb_text,
       file_name,
       file_size,
       file_type,
       base_url,
       source_urls,
       bland_raw_response,
       created_at,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW(), NOW()
     )
     RETURNING *`,
    [
      input.userId,
      input.name,
      input.description ?? null,
      status,
      input.type,
      input.textContent ?? null,
      input.kbText ?? null,
      input.fileName ?? null,
      input.fileSize ?? null,
      input.fileType ?? null,
      input.baseUrl ?? null,
      sourceUrls,
      JSON.stringify({}),
    ]
  )

  return result.rows[0] as KnowledgeBaseRecord
}

export interface UpdateKnowledgeBaseMetadataInput {
  name?: string | null
  description?: string | null
  /** Pass an explicit string (or null) to override the distilled snippet. */
  kbText?: string | null
}

export async function updateKnowledgeBaseMetadata(
  id: string,
  userId: string,
  patch: UpdateKnowledgeBaseMetadataInput
): Promise<KnowledgeBaseRecord | null> {
  const result = await db.query(
    `UPDATE knowledge_bases
     SET
       name = COALESCE($3, name),
       description = CASE WHEN $4::boolean THEN $5 ELSE description END,
       kb_text = CASE WHEN $6::boolean THEN $7 ELSE kb_text END,
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [
      id,
      userId,
      patch.name ?? null,
      patch.description !== undefined,
      patch.description ?? null,
      patch.kbText !== undefined,
      patch.kbText ?? null,
    ]
  )

  return (result.rows[0] as KnowledgeBaseRecord | undefined) ?? null
}

export async function updateKnowledgeBaseAfterReingest(
  id: string,
  userId: string,
  patch: {
    textContent?: string | null
    kbText?: string | null
    sourceUrls?: string[] | string | null
    baseUrl?: string | null
    status?: KnowledgeBaseStatus
  }
): Promise<KnowledgeBaseRecord | null> {
  const sourceUrls =
    patch.sourceUrls === undefined ? undefined : normalizeSourceUrlsInput(patch.sourceUrls)

  const result = await db.query(
    `UPDATE knowledge_bases
     SET
       text_content = CASE WHEN $3::boolean THEN $4 ELSE text_content END,
       kb_text = CASE WHEN $5::boolean THEN $6 ELSE kb_text END,
       source_urls = CASE WHEN $7::boolean THEN $8 ELSE source_urls END,
       base_url = CASE WHEN $9::boolean THEN $10 ELSE base_url END,
       status = COALESCE($11, status),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [
      id,
      userId,
      patch.textContent !== undefined,
      patch.textContent ?? null,
      patch.kbText !== undefined,
      patch.kbText ?? null,
      sourceUrls !== undefined,
      sourceUrls ?? null,
      patch.baseUrl !== undefined,
      patch.baseUrl ?? null,
      patch.status ?? null,
    ]
  )

  return (result.rows[0] as KnowledgeBaseRecord | undefined) ?? null
}

export async function markKnowledgeBaseDeleted(
  id: string,
  userId: string
): Promise<KnowledgeBaseRecord | null> {
  const result = await db.query(
    `UPDATE knowledge_bases
     SET status = 'DELETED',
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  )

  return (result.rows[0] as KnowledgeBaseRecord | undefined) ?? null
}
