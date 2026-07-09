import {
  hustleOrgSyncSchema,
} from "@/lib/hustle-integration-schemas"
import {
  createHustleIntegrationGetHandler,
  createHustleIntegrationPostHandler,
} from "@/lib/hustle-integration-route"
import { syncHustleOrganization } from "@/lib/forex-org-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ENDPOINT = "/api/v1/integrations/hustle/org-sync"

export const GET = createHustleIntegrationGetHandler(ENDPOINT, "org.synced")

export const POST = createHustleIntegrationPostHandler({
  logTag: "HUSTLE-ORG-SYNC",
  schema: hustleOrgSyncSchema,
  sync: syncHustleOrganization,
})
