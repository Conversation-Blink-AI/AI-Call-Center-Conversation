# Replit-Related Code Analysis

This document identifies all Replit-specific code, dependencies, and configurations that remain in the application after migration from Replit to other hosting platforms.

---

## 📦 Dependencies

### 1. `@replit/database` Package
**Location:** `package.json:47`
```json
"@replit/database": "^3.0.1"
```

**Status:** ⚠️ **STILL INSTALLED** - This package is only needed for Replit's key-value database service.

**Usage:** Used in several files (see below)

**Recommendation:** Remove if you're using PostgreSQL exclusively.

---

## 🔧 Core Replit Database Files

### 1. `lib/replit-db-server.ts`
**Purpose:** Server-side Replit Database wrapper  
**Status:** ⚠️ **ACTIVELY USED** in multiple API routes

**Key Features:**
- Wraps `@replit/database` package
- Provides key-value storage interface
- Used for user management, pathways, calls, phone numbers
- Falls back to `DATABASE_URL` if `REPLIT_DB_URL` not set

**Used By:**
- `app/api/debug/fix-users/route.ts`
- `app/api/debug/database-users/route.ts`
- `app/api/debug/verify-password/route.ts`
- `app/api/debug/database/route.ts`
- `app/api/auth/profile/route.ts`
- `app/api/test-auth/route.ts`

**Recommendation:** 
- If using PostgreSQL exclusively, migrate all functionality to PostgreSQL
- Remove this file and update all imports

---

### 2. `lib/replit-db.ts`
**Purpose:** Client-side database interface (appears to be unused)  
**Status:** ❓ **POTENTIALLY UNUSED**

**Content:** TypeScript interfaces and client-side API functions

**Recommendation:** Check if this is actually used. If not, remove it.

---

### 3. `lib/init-replit-database.ts`
**Purpose:** Database initialization and migration utilities  
**Status:** ⚠️ **ACTIVELY USED** but name is misleading

**Note:** Despite the name, this file actually uses **PostgreSQL** (`pg` client), not Replit Database. The name is a legacy artifact.

**Used By:**
- `app/api/database/manage/route.ts`
- `app/api/database/records/route.ts`
- `app/api/database/tables/route.ts`
- `app/api/database/create-tables/route.ts`
- `app/api/database/init/route.ts`
- `app/api/debug/update-user-role/route.ts`
- `app/api/debug/users/route.ts`

**Recommendation:** 
- **Rename** to `lib/postgres-database.ts` or `lib/database-utils.ts` to avoid confusion
- The code itself is fine (uses PostgreSQL), just the name is misleading

---

## 🔍 Environment Variables

### Replit-Specific Environment Variables

1. **`REPLIT_DB_URL`**
   - **Location:** `lib/replit-db-server.ts:13`
   - **Purpose:** Replit Database connection URL
   - **Status:** Optional fallback (also checks `DATABASE_URL`)

2. **`REPLIT_SECRET_TWILIO_ACCOUNT_SID`**
   - **Location:** 
     - `app/api/payments/webhook/route.ts:225`
     - `app/api/bland-ai/available-numbers/route.ts:15`
   - **Purpose:** Twilio credentials stored in Replit Secrets
   - **Status:** Fallback if `TWILIO_ACCOUNT_SID` not set

3. **`REPLIT_SECRET_TWILIO_AUTH_TOKEN`**
   - **Location:** Same as above
   - **Purpose:** Twilio auth token from Replit Secrets
   - **Status:** Fallback if `TWILIO_AUTH_TOKEN` not set

**Recommendation:** Remove these fallbacks if not using Replit. Use standard environment variables only.

---

## 🌐 Replit-Specific Headers/Proxies

### `x-forwarded-host` Header
**Location:** 
- `app/api/payments/stripe/create-checkout-session/route.ts:12`
- `app/api/payments/stripe/create-phone-number-checkout/route.ts:12`

**Code:**
```typescript
// Works behind Replit/Vercel proxies
const host = req.headers.get('x-forwarded-host')  // Replit
```

**Status:** ⚠️ **ACTIVE** - Used for getting the correct host behind proxies

**Recommendation:** This is actually fine - `x-forwarded-host` is a standard header used by many hosting platforms (Vercel, Replit, etc.). Keep it, but remove the Replit comment.

---

## 📝 Test/Debug Scripts

### 1. `scripts/verify-replit-database.js`
**Purpose:** Script to verify Replit Database contents  
**Status:** ❌ **OBSOLETE** if not using Replit Database

**Recommendation:** Remove if not using Replit Database

---

### 2. `test-postgres-auth.sh`
**Location:** Root directory  
**Contains:** References to Replit URLs:
```bash
# Get the Replit URL
REPLIT_URL="https://${REPL_SLUG}.${REPL_OWNER}.repl.co"
```

**Status:** ❌ **OBSOLETE** - Uses Replit-specific environment variables

**Recommendation:** Update to use your actual domain or remove

---

## 🗄️ Database Seed Data

### Replit References in Seed Data

**Locations:**
- `app/api/postgres/seed/route.ts:31` - `'admin@replit.com'`
- `app/api/database/tables/route.ts:61` - `company: "Replit Inc"`
- `app/api/database/create-tables/route.ts:42-44` - `'admin@replit.com'`, `"Replit Inc"`
- `app/api/database/init/route.ts:45` - `company: "Replit Inc"`
- `scripts/seed-postgres-data.sql:7` - `'admin@replit.com'`, `'Replit Inc'`
- `production_backup_20250818_072116.sql:450` - Contains Replit user data
- `development_export.sql:457` - Contains Replit user data

**Status:** ⚠️ **HARMLESS** but should be updated

**Recommendation:** Replace with your company name and admin email

---

## 📚 Documentation References

### Files with Replit References

1. **`docs/scheduled-sync-setup.md`**
   - Contains Replit deployment instructions
   - Lines 33-108 discuss Replit-specific setup

2. **`docs/webhook-troubleshooting.md`**
   - Line 45: Mentions Replit deployment

3. **`types/supabase.ts:2`**
   - Comment: `"Supabase types have been removed - using direct PostgreSQL with Replit DB authentication"`
   - **Status:** Outdated comment (should say PostgreSQL, not Replit DB)

4. **`lib/supabase.ts:3`**
   - Comment: `"All authentication is now handled by PostgreSQL with Replit DB"`
   - **Status:** Outdated comment

5. **`lib/supabase-checker.ts:3`**
   - Comment: `"All authentication is now handled by PostgreSQL with Replit DB"`

6. **`lib/supabase-server-app.ts:3`**
   - Comment: `"All authentication is now handled by PostgreSQL with Replit DB"`

7. **`lib/supabase-browser.ts:2`**
   - Comment: `"but we're now using Replit DB for authentication"`

8. **`lib/supabase-server.ts:2`**
   - Comment: `"This file has been replaced with Replit DB authentication"`

9. **`lib/session-sync.ts:1`**
   - Comment: `"Session sync functionality is now handled by Replit DB authentication"`

**Recommendation:** Update all comments to reflect current architecture (PostgreSQL, not Replit DB)

---

## 🔌 API Routes Using Replit Database

### Debug Routes (Should be removed in production)

1. **`app/api/debug/fix-users/route.ts`**
   - Uses: `import { db } from "@/lib/replit-db-server"`

2. **`app/api/debug/database-users/route.ts`**
   - Uses: `import { db } from "@/lib/replit-db-server"`

3. **`app/api/debug/verify-password/route.ts`**
   - Uses: `import { db } from "@/lib/replit-db-server"`

4. **`app/api/debug/database/route.ts`**
   - Uses: `import { listAllKeys, getAllUsers } from "@/lib/replit-db-server"`

5. **`app/api/debug/database-table/route.ts`**
   - Uses: `import Database from "@replit/database"`
   - Uses: `import { listAllKeys, getAllUsers } from "@/lib/replit-db-server"`

### Production Routes

6. **`app/api/auth/profile/route.ts`**
   - Uses: `import { db } from "@/lib/replit-db-server"`
   - ⚠️ **CRITICAL:** This is used in production!

7. **`app/api/test-auth/route.ts`**
   - Contains: `"Authentication successful with Replit DB"`
   - Comment should be updated

---

## 📋 Summary of Replit Code

### Files to Remove/Update

#### **High Priority (Remove if not using Replit):**

1. ✅ `lib/replit-db-server.ts` - Remove if using PostgreSQL exclusively
2. ✅ `lib/replit-db.ts` - Check if used, remove if not
3. ✅ `scripts/verify-replit-database.js` - Remove if not using Replit DB
4. ✅ `package.json` - Remove `@replit/database` dependency

#### **Medium Priority (Update/Refactor):**

5. ⚠️ `lib/init-replit-database.ts` - **RENAME** (misleading name, actually uses PostgreSQL)
6. ⚠️ All debug routes using Replit DB - Migrate to PostgreSQL or remove
7. ⚠️ `app/api/auth/profile/route.ts` - Migrate to PostgreSQL

#### **Low Priority (Cleanup):**

8. 📝 Update all comments mentioning "Replit DB" to "PostgreSQL"
9. 📝 Replace "admin@replit.com" and "Replit Inc" in seed data
10. 📝 Update `test-postgres-auth.sh` to remove Replit URL references
11. 📝 Remove Replit environment variable fallbacks (`REPLIT_SECRET_*`)
12. 📝 Update documentation files

---

## 🔄 Migration Checklist

If you want to completely remove Replit dependencies:

- [ ] Audit all imports of `lib/replit-db-server.ts`
- [ ] Migrate `app/api/auth/profile/route.ts` to use PostgreSQL
- [ ] Remove or migrate all debug routes
- [ ] Remove `@replit/database` from `package.json`
- [ ] Delete `lib/replit-db-server.ts`
- [ ] Delete `lib/replit-db.ts` (if unused)
- [ ] Delete `scripts/verify-replit-database.js`
- [ ] Remove `REPLIT_*` environment variable fallbacks
- [ ] Rename `lib/init-replit-database.ts` to something more appropriate
- [ ] Update all comments mentioning Replit
- [ ] Update seed data to remove Replit references
- [ ] Update documentation

---

## ⚠️ Important Notes

1. **`lib/init-replit-database.ts`** is **NOT** actually using Replit Database - it uses PostgreSQL. The name is just misleading.

2. **`x-forwarded-host` header** usage is fine - it's a standard header, just remove the Replit comment.

3. Some routes may still be using Replit Database for certain operations. Check each route individually.

4. The application appears to be in a **hybrid state** - using both PostgreSQL (primary) and potentially Replit Database (legacy).

---

*Analysis completed: $(date)*

