import {
  hustleMemberSyncSchema,
} from "@/lib/hustle-integration-schemas"
import {
  createHustleIntegrationGetHandler,
  createHustleIntegrationPostHandler,
} from "@/lib/hustle-integration-route"
import { syncHustleMember } from "@/lib/forex-org-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ENDPOINT = "/api/v1/integrations/hustle/member-sync"

export const GET = createHustleIntegrationGetHandler(ENDPOINT, "member.synced")

export const POST = createHustleIntegrationPostHandler({
  logTag: "HUSTLE-MEMBER-SYNC",
  schema: hustleMemberSyncSchema,
  sync: syncHustleMember,
})
