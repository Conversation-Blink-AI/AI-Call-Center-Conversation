import {
  hustleMemberSyncSchema,
} from "@/lib/hustle-integration-schemas"
import {
  createHustleIntegrationGetHandler,
  createHustleIntegrationPostHandler,
  hustleIntegrationRuntime,
} from "@/lib/hustle-integration-route"
import { syncHustleMember } from "@/lib/forex-org-sync"

export const runtime = hustleIntegrationRuntime.runtime
export const dynamic = hustleIntegrationRuntime.dynamic

const ENDPOINT = "/api/v1/integrations/hustle/member-sync"

export const GET = createHustleIntegrationGetHandler(ENDPOINT, "member.synced")

export const POST = createHustleIntegrationPostHandler({
  logTag: "HUSTLE-MEMBER-SYNC",
  schema: hustleMemberSyncSchema,
  sync: syncHustleMember,
})
