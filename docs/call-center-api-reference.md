# Call Center API Reference

Short reference for **public** (`/Public_api/*`) and **Hustle integration** (`/api/v1/integrations/hustle/*`) endpoints.

**Base URL (production):** `https://conversation.hustleapp.co`  
**Interactive docs:** `/public-api`  
**URL rewrite:** `/Public_api/:path*` → `/api/Public_api/:path*`

---

## 1. Public APIs (no session cookie)

All public routes support CORS (`Access-Control-Allow-Origin: *`). Auth is via query parameters, not cookies.

### GET `/Public_api/getPurchaseNumber`

Look up a user and their purchased phone numbers.

| Query param | Required | Description |
|-------------|----------|-------------|
| `email` | Yes | User email |

**Success (200)**

```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "user_name": "John Doe",
  "phoneNumbers": [
    {
      "id": "123",
      "number": "+1234567890",
      "status": "active",
      "location": "San Francisco, CA",
      "type": "Local",
      "purchased_at": "2024-01-15T10:30:00.000Z",
      "monthly_fee": 1.5
    }
  ],
  "count": 1
}
```

**User not found (200):** `{ "success": false, "message": "User not found", "phoneNumbers": [], "count": 0 }`  
**Missing email (400):** `{ "success": false, "message": "Email parameter is required" }`

---

### GET `/Public_api/getCallHistory`

Paginated call logs. **Email alone is not enough** — verify ownership via email + userId + purchased number.

| Query param | Required | Description |
|-------------|----------|-------------|
| `email` | Yes | Must match `userId` account |
| `userId` | Yes | UUID from `getPurchaseNumber` |
| `phoneNumber` | Yes | Purchased number from `phoneNumbers[].number` |
| `page` | No | Default `1` |
| `limit` | No | Default `50` |

**Success (200)**

```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "callLogs": [
    {
      "call_id": "call-abc",
      "from_number": "+14155550100",
      "to_number": "+14155550200",
      "duration_seconds": 120,
      "status": "completed",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "total": 12,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

**Verification failed (200):** `{ "success": false, "message": "Email, userId, and purchased number could not be verified" }`

---

### GET `/Public_api/getPlans`

Pricing catalogue for the Call Center platform.

| Query param | Required | Description |
|-------------|----------|-------------|
| `platform` | No | `callCenter` (only supported value) |
| `planId` | No | e.g. `starter`, `growth`, `pro`, `scale` |

**Success (200):** `{ "success": true, "platform": "callCenter", "plans": [...], "usagePricing": {...}, ... }`  
**Unknown platform (404):** `{ "success": false, "message": "..." }`

---

### GET `/Public_api/getWallet`

Organization wallet balance (sum of member wallets). Requires active org membership with `canViewWallet` or `call_center_admin`.

| Query param | Required | Description |
|-------------|----------|-------------|
| `email` | Yes | Must match `userId` |
| `userId` | Yes | UUID from `getPurchaseNumber` |
| `orgId` | Yes | Hustle org id (`forex_organizations.external_org_id`) |

**Success (200)**

```json
{
  "success": true,
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "email": "admin@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "balanceCents": 15000,
  "balanceDollars": "150.00",
  "memberWalletCount": 3,
  "scopedTo": "organization"
}
```

**No permission (403):** `{ "success": false, "message": "You do not have permission to view the organization wallet" }`

---

### GET `/Public_api/getAnalytics`

Organization call analytics (same metrics as `/dashboard/calls`). Scoped by Call Center role:

- **Org-wide:** `canViewOrgAnalytics` or `call_center_admin`
- **Self only:** `canViewOwnCallLogs` (operator)

| Query param | Required | Description |
|-------------|----------|-------------|
| `email` | Yes | Must match `userId` |
| `userId` | Yes | UUID from `getPurchaseNumber` |
| `orgId` | Yes | Hustle org id |
| `startDate` | No | ISO date string |
| `endDate` | No | ISO date string |
| `allTime` | No | `true` for all-time |
| `timeframe` | No | e.g. `7d`, `14d`, `all` |

**Success (200)**

```json
{
  "success": true,
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "email": "admin@example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "scopedTo": "organization",
  "scopedUserCount": 5,
  "dateRange": { "start": "2026-07-01T00:00:00.000Z", "end": "2026-07-07T23:59:59.999Z" },
  "stats": {
    "totalCalls": 42,
    "completedCalls": 38,
    "failedCalls": 2,
    "transferredCalls": 10,
    "totalDuration": 3600,
    "totalCost": 0,
    "averageDuration": 86,
    "successRate": 90.5,
    "qualifiedLeadsRate": 23.8,
    "averageCostPerCall": 0,
    "callsThisWeek": 12,
    "callsThisMonth": 42,
    "costThisWeek": 0,
    "costThisMonth": 0,
    "volumeSeries": [{ "date": "2026-07-01T00:00:00.000Z", "count": 5 }],
    "qualifiedLeadsSeries": [{ "date": "2026-07-01T00:00:00.000Z", "count": 1 }]
  },
  "timeframeCounts": {
    "today": 3,
    "yesterday": 5,
    "thisWeek": 12,
    "lastWeek": 8,
    "thisMonth": 42,
    "lastMonth": 30
  },
  "metaCapi": {
    "stats": {
      "eventsFired": 10,
      "eventsSuccessful": 9,
      "eventsFailed": 1,
      "successRate": 90,
      "lastEventFired": "2026-07-08T12:00:00.000Z"
    },
    "series": [
      { "date": "2026-07-01T00:00:00.000Z", "fired": 3, "success": 3, "failed": 0 }
    ]
  }
}
```

Does **not** return individual call rows — use `getCallHistory` for that.

---

## 2. Hustle integration APIs (server-to-server)

Called by the Hustle backend to sync organizations and members. **Not public** — requires internal auth.

**Base path:** `/api/v1/integrations/hustle`

### Auth headers (POST)

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Yes (prod) | `Bearer <SUBSCRIPTION_INTERNAL_API_TOKEN>` |
| `X-Hustle-Timestamp` | If HMAC on | Unix seconds |
| `X-Hustle-Request-Id` | Recommended | Trace id (logged) |
| `X-Hustle-Signature` | If HMAC on | `sha256=<hmac>` of `timestamp + "." + rawBody` |

**Env vars:** `SUBSCRIPTION_INTERNAL_API_TOKEN`, `SUBSCRIPTION_INTERNAL_HMAC_SECRET` (optional)

Each route also supports **GET** (no auth) returning endpoint metadata for health checks.

---

### POST `/api/v1/integrations/hustle/org-sync`

**Event:** `org.synced` — create or update organization + owner membership.

**Body**

```json
{
  "event": "org.synced",
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
  "workspaceType": "organization",
  "ownerUserId": "507f1f77bcf86cd799439011",
  "ownerEmail": "owner@example.com",
  "ownerName": "Owner Name",
  "orgName": "Acme Corp",
  "status": "active",
  "hustlePlan": "trial",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "updatedAt": "2026-07-08T00:00:00.000Z"
}
```

**Success (200)**

```json
{
  "status": "success",
  "message": "HUSTLE-ORG-SYNC processed",
  "data": {
    "externalOrgId": "6a3fa22872bf1d9f23eabc6d",
    "ownerExternalUserId": "507f1f77bcf86cd799439011",
    "localOwnerUserId": "uuid-or-null"
  }
}
```

---

### POST `/api/v1/integrations/hustle/member-sync`

**Event:** `member.synced` — invite (`status: pending`) or accept (`status: active`).

**Body**

```json
{
  "event": "member.synced",
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
  "userId": "608a1234567890abcdef",
  "email": "member@example.com",
  "name": "Jane Doe",
  "hustleRole": "organization_user",
  "role": "no_access",
  "callCenterRole": "no_access",
  "status": "pending",
  "permissions": {
    "canBuyNumber": false,
    "canTopUpWallet": false,
    "canManageAgents": false,
    "canManageCallFlows": false,
    "canAssignNumbers": false,
    "canUseAssignedNumbers": false,
    "canEditAssignedFlow": false,
    "canViewOwnCallLogs": false,
    "canViewAllCallLogs": false,
    "canViewOrgAnalytics": false,
    "canViewWallet": false,
    "canManageBilling": false
  },
  "createdAt": "2026-07-08T00:00:00.000Z",
  "updatedAt": "2026-07-08T00:00:00.000Z"
}
```

**`callCenterRole` values:** `call_center_admin` | `call_center_operator` | `no_access`

**Success (200)**

```json
{
  "status": "success",
  "message": "HUSTLE-MEMBER-SYNC processed",
  "data": {
    "externalOrgId": "6a3fa22872bf1d9f23eabc6d",
    "userExternalId": "608a1234567890abcdef",
    "localUserId": "uuid-or-null",
    "status": "pending",
    "callCenterRole": "no_access"
  }
}
```

**Org not found (404):** `{ "status": "error", "message": "Organization not found: ..." }`

---

### POST `/api/v1/integrations/hustle/permission-sync`

**Event:** `member.permission.updated` — update Call Center role and permissions.

**Body**

```json
{
  "event": "member.permission.updated",
  "orgId": "6a3fa22872bf1d9f23eabc6d",
  "workspaceId": "org_6a3fa22872bf1d9f23eabc6d",
  "userId": "608a1234567890abcdef",
  "role": "call_center_operator",
  "callCenterRole": "call_center_operator",
  "status": "active",
  "permissions": {
    "canBuyNumber": false,
    "canTopUpWallet": false,
    "canManageAgents": false,
    "canManageCallFlows": false,
    "canAssignNumbers": false,
    "canUseAssignedNumbers": true,
    "canEditAssignedFlow": true,
    "canViewOwnCallLogs": true,
    "canViewAllCallLogs": false,
    "canViewOrgAnalytics": false,
    "canViewWallet": false,
    "canManageBilling": false
  },
  "updatedAt": "2026-07-08T07:30:00.000Z"
}
```

**Success (200)**

```json
{
  "status": "success",
  "message": "HUSTLE-PERMISSION-SYNC processed",
  "data": {
    "externalOrgId": "6a3fa22872bf1d9f23eabc6d",
    "userExternalId": "608a1234567890abcdef",
    "membershipId": "uuid",
    "callCenterRole": "call_center_operator",
    "status": "active"
  }
}
```

**Membership not found (404):** `{ "status": "error", "message": "Membership not found for org ... and user ..." }`

---

## 3. Deprecated endpoint

### POST `/api/webhooks/forex/organization` — **410 Gone**

Replaced by the Hustle integration routes above. GET returns migration pointers.

---

## 4. Common error codes

| HTTP | When |
|------|------|
| 200 | Success (public APIs may return `success: false` in body for soft failures) |
| 400 | Missing/invalid params or JSON body |
| 401 | Hustle integration auth failure |
| 403 | Verified user lacks Call Center permission |
| 404 | User, org, or membership not found |
| 410 | Legacy forex webhook |
| 500 | Server/database error |

---

## 5. Typical public API flow

```
1. GET /Public_api/getPurchaseNumber?email=...
   → save userId + phoneNumbers

2. GET /Public_api/getCallHistory?email=&userId=&phoneNumber=...
   → call logs for a purchased number

3. GET /Public_api/getWallet?email=&userId=&orgId=...
   → org wallet (requires org membership sync + permission)

4. GET /Public_api/getAnalytics?email=&userId=&orgId=&startDate=&endDate=...
   → dashboard-style analytics for the org
```

Org/member data must be synced first via Hustle `org-sync` and `member-sync` webhooks.
