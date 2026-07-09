import {
  hustlePermissionSyncSchema,
} from "@/lib/hustle-integration-schemas"
import {
  createHustleIntegrationGetHandler,
  createHustleIntegrationPostHandler,
  hustleIntegrationRuntime,
} from "@/lib/hustle-integration-route"
import { syncHustleMemberPermissions } from "@/lib/forex-org-sync"

export const runtime = hustleIntegrationRuntime.runtime
export const dynamic = hustleIntegrationRuntime.dynamic

const ENDPOINT = "/api/v1/integrations/hustle/permission-sync"

export const GET = createHustleIntegrationGetHandler(ENDPOINT, "member.permission.updated")

export const POST = createHustleIntegrationPostHandler({
  logTag: "HUSTLE-PERMISSION-SYNC",
  schema: hustlePermissionSyncSchema,
  sync: syncHustleMemberPermissions,
})
