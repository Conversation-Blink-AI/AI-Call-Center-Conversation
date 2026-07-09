import {
  hustlePermissionSyncSchema,
} from "@/lib/hustle-integration-schemas"
import {
  createHustleIntegrationGetHandler,
  createHustleIntegrationPostHandler,
} from "@/lib/hustle-integration-route"
import { syncHustleMemberPermissions } from "@/lib/forex-org-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ENDPOINT = "/api/v1/integrations/hustle/permission-sync"

export const GET = createHustleIntegrationGetHandler(ENDPOINT, "member.permission.updated")

export const POST = createHustleIntegrationPostHandler({
  logTag: "HUSTLE-PERMISSION-SYNC",
  schema: hustlePermissionSyncSchema,
  sync: syncHustleMemberPermissions,
})
