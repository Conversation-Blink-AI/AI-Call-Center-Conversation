import {
  hustleOrgSyncSchema,
} from "@/lib/hustle-integration-schemas"
import {
  createHustleIntegrationGetHandler,
  createHustleIntegrationPostHandler,
  hustleIntegrationRuntime,
} from "@/lib/hustle-integration-route"
import { syncHustleOrganization } from "@/lib/forex-org-sync"

export const runtime = hustleIntegrationRuntime.runtime
export const dynamic = hustleIntegrationRuntime.dynamic

const ENDPOINT = "/api/v1/integrations/hustle/org-sync"

export const GET = createHustleIntegrationGetHandler(ENDPOINT, "org.synced")

export const POST = createHustleIntegrationPostHandler({
  logTag: "HUSTLE-ORG-SYNC",
  schema: hustleOrgSyncSchema,
  sync: syncHustleOrganization,
})
