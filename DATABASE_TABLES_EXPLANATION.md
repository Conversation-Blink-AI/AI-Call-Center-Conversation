# Database Tables Used by `/dashboard/calls` Page

## Overview
The `/dashboard/calls` page makes API calls that query **two main database tables**:

1. **`calls`** - Main table storing call data
2. **`phone_numbers`** - Table storing user phone numbers (joined with calls)

---

## API Endpoints Called

### 1. `/api/calls/database` - Fetches Call List
**Database Tables Used:**
- **`calls`** (aliased as `c`)
- **`phone_numbers`** (aliased as `pn`) - LEFT JOIN

**SQL Queries Executed:**

```sql
-- Count Query (for pagination)
SELECT COUNT(*) as total 
FROM calls c 
WHERE c.user_id = $1

-- Main Query (with pagination)
SELECT c.*, pn.phone_number as phone_number_detail
FROM calls c
LEFT JOIN phone_numbers pn ON c.phone_number_id = pn.id
WHERE c.user_id = $1
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3
```

**Location in Code:**
- Service: `services/call-database-service.ts` → `getCallsForUser()` method (lines 87-156)
- API Route: `app/api/calls/database/route.ts` (lines 6-61)

---

### 2. `/api/calls/stats` - Fetches Call Statistics
**Database Tables Used:**
- **`calls`** - Multiple queries for different timeframes

**SQL Queries Executed:**

```sql
-- Basic Stats Query
SELECT 
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
  COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as failed_calls,
  COALESCE(SUM(duration_seconds), 0) as total_duration,
  COALESCE(SUM(cost_cents), 0) as total_cost
FROM calls 
WHERE user_id = $1

-- Enhanced Stats Queries (6 parallel queries for different timeframes)
-- Today
SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
FROM calls 
WHERE user_id = $1 AND created_at >= $2

-- Yesterday
SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
FROM calls 
WHERE user_id = $1 AND created_at >= $2 AND created_at < $3

-- This Week
SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
FROM calls 
WHERE user_id = $1 AND created_at >= $2

-- Last Week
SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
FROM calls 
WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3

-- This Month
SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
FROM calls 
WHERE user_id = $1 AND created_at >= $2

-- Last Month
SELECT COUNT(*) as count, COALESCE(SUM(cost_cents), 0) as cost 
FROM calls 
WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
```

**Location in Code:**
- Service: `services/call-database-service.ts` → `getCallStats()` method (lines 306-334)
- API Route: `app/api/calls/stats/route.ts` → `getEnhancedStats()` function (lines 100-162)

---

## Database Table Schema

### `calls` Table Structure
```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id VARCHAR(255) UNIQUE NOT NULL,  -- Bland.ai's call ID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_number VARCHAR(50) NOT NULL,
    from_number VARCHAR(50) NOT NULL,
    duration_seconds INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recording_url TEXT,
    transcript TEXT,
    summary TEXT,
    cost_cents INTEGER,
    pathway_id VARCHAR(255),
    ended_reason VARCHAR(100),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    queue_time INTEGER,
    latency_ms INTEGER,
    interruptions INTEGER,
    phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL
);
```

### `phone_numbers` Table Structure (Referenced)
```sql
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY,
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    -- ... other fields
);
```

---

## Additional Tables

### `meta_capi_configs` Table Structure
Stores Meta Conversions API configuration per user.

```sql
CREATE TABLE meta_capi_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    pixel_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    event_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Why "Internal Server Error" is Happening

The error "Server error: Internal server error" occurs when:

1. **Database Connection Issues:**
   - `DATABASE_URL` environment variable is missing or incorrect
   - Database server is unreachable
   - SSL configuration is incorrect

2. **Table Doesn't Exist:**
   - The `calls` table hasn't been created in your database
   - The `phone_numbers` table is missing

3. **Permission Issues:**
   - Database user doesn't have SELECT permissions on `calls` table
   - Row Level Security (RLS) policies are blocking access

4. **Query Errors:**
   - Column names don't match (e.g., `user_id` vs `userId`)
   - Data type mismatches
   - Foreign key constraint violations

5. **Authentication Issues:**
   - `getCurrentUser()` is failing (returning null)
   - User ID mismatch between authenticated user and query parameter

---

## How to Debug

### Step 1: Check Server Logs
Look for error messages in your server console. The API routes log errors with prefixes:
- `🚨 [DATABASE-CALLS] Error:` - from `/api/calls/database`
- `Error fetching call stats:` - from `/api/calls/stats`

### Step 2: Verify Database Connection
Check if `DATABASE_URL` is set correctly:
```bash
echo $DATABASE_URL
```

### Step 3: Verify Tables Exist
Run this SQL query in your database:
```sql
-- Check if calls table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'calls';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;
```

### Step 4: Test Database Query Directly
Try running the query manually:
```sql
-- Test the exact query being used
SELECT COUNT(*) as total 
FROM calls c 
WHERE c.user_id = 'YOUR_USER_ID_HERE';
```

### Step 5: Check Browser Console
Open browser DevTools → Console tab and look for:
- Network errors (failed fetch requests)
- Detailed error messages from the API response

---

## Quick Fixes

### If Table Doesn't Exist:
Run the migration script:
```bash
# The SQL file is located at:
scripts/add-calls-table.sql
# or
scripts/create-postgres-tables.sql
```

### If Database Connection Fails:
1. Verify `DATABASE_URL` in your `.env` file
2. Check database server is running
3. Verify SSL configuration in `lib/db-client.ts`

### If Authentication Fails:
1. Check if user is logged in
2. Verify auth token in cookies
3. Check `getCurrentUser()` function in `lib/auth-utils.ts`

---

## Code Flow Summary

```
User visits /dashboard/calls
    ↓
Page loads → useEffect triggers
    ↓
fetchCalls() → GET /api/calls/database
    ↓
getCurrentUser() → Verify auth
    ↓
CallDatabaseService.getCallsForUser()
    ↓
db.query() → Execute SQL on 'calls' table
    ↓
Return results or throw error
```

If any step fails, it catches the error and returns "Internal server error".
