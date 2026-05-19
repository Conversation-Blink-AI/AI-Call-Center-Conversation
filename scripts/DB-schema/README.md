# Database Schema (Developer Reference)

This folder documents the **current** application database schema as defined
by the SQL scripts in `scripts/` and the setup/migration entrypoints.

## Source of truth and drift

Use these in order of priority:

1. **Baseline schema**: `scripts/create-postgres-tables.sql`
2. **Migrations/additions**: `scripts/add-*.sql`, `scripts/create-*-table.sql`,
   `scripts/migrate-*.sql`, `scripts/fix-*.sql`
3. **RLS policies**: `scripts/enable-rls.sql`

Notes on drift:

- `app/api/postgres/setup/route.ts` contains an older "Supabase-like" schema
  used by the setup API. It does **not** include newer tables/columns (e.g.
  `calls`, `call_logs` webhook columns, `admin_audit_logs`, `meta_capi_configs`,
  `payments`, `users.is_admin`, `users.stripe_customer_id`).
- `development_export.sql` is a database snapshot. It includes tables like
  `wallets`, `wallet_transactions`, and `number_subscriptions` that are used
  by billing code but are **not** defined in the current setup scripts. Treat
  these as **legacy/operational** tables that still exist in deployed DBs.

## Entity relationships (high level)

- `users` 1--* `teams` (owner)
- `users` 1--* `team_members`
- `teams` 1--* `pathways`
- `pathways` 1--* `phone_numbers` (legacy) and 1--1 `phone_numbers` (current)
- `pathways` *--* `phone_numbers` via `pathway_phone_numbers`
- `users` 1--* `phone_numbers`
- `users` 1--* `calls`
- `users` 1--* `call_logs` (webhook logs)
- `users` 1--* `payments`
- `users` 1--* `admin_audit_logs` (as admin user)
- `users` 1--1 `wallets` (legacy)
- `wallets` 1--* `wallet_transactions` (legacy)

## Tables (current scripts)

### `users`
Source: `scripts/create-postgres-tables.sql` + migrations

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `email` VARCHAR(255) UNIQUE NOT NULL
- `first_name` VARCHAR(255) NULL
- `last_name` VARCHAR(255) NULL
- `company` VARCHAR(255) NULL
- `phone_number` VARCHAR(50) NULL
- `role` VARCHAR(50) DEFAULT `'user'`
- `password_hash` VARCHAR(255) NULL (legacy)
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `updated_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `last_login` TIMESTAMPTZ NULL
- `external_id` VARCHAR(255) NULL
- `external_token` TEXT NULL
- `is_verified` BOOLEAN DEFAULT `false`
- `platform` VARCHAR(50) DEFAULT `'AI Call'`
- `verification_token` VARCHAR(255) NULL
- `verification_expires_at` TIMESTAMPTZ NULL
- `is_admin` BOOLEAN DEFAULT `false`
- `stripe_customer_id` VARCHAR(255) UNIQUE NULL

Indexes:
- `idx_users_email`
- `idx_users_external_id`
- `idx_users_is_verified`
- `idx_users_is_admin` (partial where `is_admin = true`)
- `idx_users_stripe_customer_id`
- `idx_users_first_name`, `idx_users_last_name` (from migration)

### `teams`
Source: `scripts/create-postgres-tables.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `name` VARCHAR(255) NOT NULL
- `description` TEXT NULL
- `owner_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `updated_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`

### `team_members`
Source: `scripts/create-postgres-tables.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `team_id` UUID FK -> `teams(id)` ON DELETE CASCADE
- `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `role` VARCHAR(50) DEFAULT `'member'`
- `joined_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- UNIQUE (`team_id`, `user_id`)

Indexes:
- `idx_team_members_team_id`
- `idx_team_members_user_id`

### `pathways`
Source: `scripts/create-postgres-tables.sql` + `scripts/migrate-pathway-phone-relationship.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `name` VARCHAR(255) NOT NULL
- `description` TEXT NULL
- `team_id` UUID FK -> `teams(id)` ON DELETE CASCADE
- `creator_id` UUID FK -> `users(id)` ON DELETE SET NULL
- `updater_id` UUID FK -> `users(id)` ON DELETE SET NULL
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `updated_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `data` JSONB NULL
- `phone_number_id` UUID UNIQUE FK -> `phone_numbers(id)` ON DELETE CASCADE

Indexes:
- `idx_pathways_team_id`
- `idx_pathways_creator_id`
- `idx_pathways_phone_number_id`

Notes:
- This schema **replaces** the old `phone_numbers.pathway_id` relationship.

### `phone_numbers`
Source: `scripts/create-postgres-tables.sql` + migrations

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `phone_number` VARCHAR(50) UNIQUE NOT NULL
- `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `location` VARCHAR(255) NULL
- `type` VARCHAR(50) NULL
- `status` VARCHAR(50) DEFAULT `'active'`
- `assigned_to` VARCHAR(255) NULL
- `purchased_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `subscription_plan` VARCHAR(100) NULL
- `bland_block_id` INTEGER NULL (Bland block rule ID)

Indexes:
- `idx_phone_numbers_user_id`
- `idx_phone_numbers_phone_number`
- `idx_phone_numbers_bland_block_id` (partial where non-null)

Legacy note:
- `phone_numbers.pathway_id` is dropped by
  `scripts/migrate-pathway-phone-relationship.sql`.

### `pathway_phone_numbers`
Source: `scripts/create-postgres-tables.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `pathway_id` UUID FK -> `pathways(id)` ON DELETE CASCADE
- `phone_number_id` UUID FK -> `phone_numbers(id)` ON DELETE CASCADE
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- UNIQUE (`pathway_id`, `phone_number_id`)

Indexes:
- `idx_pathway_phone_numbers_pathway_id`
- `idx_pathway_phone_numbers_phone_number_id`

### `calls`
Source: `scripts/create-postgres-tables.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `call_id` VARCHAR(255) UNIQUE NOT NULL (Bland call ID)
- `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `to_number` VARCHAR(50) NOT NULL
- `from_number` VARCHAR(50) NOT NULL
- `duration_seconds` INTEGER NULL
- `status` VARCHAR(50) NULL
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `updated_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `recording_url` TEXT NULL
- `transcript` TEXT NULL
- `summary` TEXT NULL
- `cost_cents` INTEGER NULL
- `pathway_id` VARCHAR(255) NULL
- `ended_reason` VARCHAR(100) NULL
- `start_time` TIMESTAMPTZ NULL
- `end_time` TIMESTAMPTZ NULL
- `queue_time` INTEGER NULL
- `latency_ms` INTEGER NULL
- `interruptions` INTEGER NULL
- `phone_number_id` UUID FK -> `phone_numbers(id)` ON DELETE SET NULL

Indexes:
- `idx_calls_user_id`
- `idx_calls_call_id`
- `idx_calls_from_number`
- `idx_calls_to_number`
- `idx_calls_created_at` (DESC)
- `idx_calls_status`
- `idx_calls_phone_number_id`
- `idx_calls_pathway_id`

Triggers:
- `update_calls_updated_at` updates `updated_at` on UPDATE

### `call_logs`
Source: `scripts/add-call-logs-table.sql` +
`scripts/add-cost-cents-to-call-logs.sql` +
`scripts/add-bland-variables-to-call-logs.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `call_id` VARCHAR(255) UNIQUE NOT NULL (Bland call ID)
- `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `from_number` VARCHAR(50) NOT NULL
- `to_number` VARCHAR(50) NOT NULL
- `duration_seconds` INTEGER NULL
- `status` VARCHAR(50) NULL
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `updated_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`
- `recording_url` TEXT NULL
- `transcript` TEXT NULL
- `summary` TEXT NULL
- `pathway_id` VARCHAR(255) NULL
- `ended_reason` VARCHAR(100) NULL
- `start_time` TIMESTAMPTZ NULL
- `end_time` TIMESTAMPTZ NULL
- `queue_time` INTEGER NULL
- `latency_ms` INTEGER NULL
- `interruptions` INTEGER NULL
- `phone_number_id` UUID FK -> `phone_numbers(id)` ON DELETE SET NULL
- `cost_cents` INTEGER NULL
- `phone_number` VARCHAR(50) NULL
- `country` VARCHAR(10) NULL
- `state` VARCHAR(10) NULL
- `city` VARCHAR(100) NULL
- `zip` VARCHAR(20) NULL
- `short_from` VARCHAR(50) NULL
- `short_to` VARCHAR(50) NULL
- `call_timezone` TIMESTAMPTZ NULL
- `call_time_utc` TIMESTAMPTZ NULL

Indexes:
- `idx_call_logs_user_id`
- `idx_call_logs_call_id`
- `idx_call_logs_from_number`
- `idx_call_logs_to_number`
- `idx_call_logs_created_at` (DESC)
- `idx_call_logs_status`
- `idx_call_logs_phone_number_id`
- `idx_call_logs_pathway_id`
- `idx_call_logs_country`
- `idx_call_logs_state`
- `idx_call_logs_city`
- `idx_call_logs_phone_number`

Triggers:
- `update_call_logs_updated_at` updates `updated_at` on UPDATE

### `meta_capi_configs`
Source: `scripts/create-meta-capi-configs-table.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `nickname` TEXT NOT NULL
- `pixel_id` TEXT NOT NULL
- `access_token` TEXT NOT NULL
- `event_name` TEXT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT `now()`

Indexes:
- `meta_capi_configs_user_id_idx`

### `payments`
Source: `scripts/create-payments-table.sql` +
`scripts/fix-wallet-transactions-table.sql`

Columns:
- `id` BIGSERIAL PK
- `gateway` TEXT NOT NULL (stripe/paypal)
- `gateway_payment_id` TEXT NOT NULL
- `amount_cents` BIGINT NOT NULL
- `status` TEXT NOT NULL
- `user_id` UUID FK -> `users(id)` ON DELETE CASCADE
- `created_at` TIMESTAMPTZ DEFAULT `NOW()`
- `updated_at` TIMESTAMPTZ DEFAULT `NOW()`

Indexes:
- `idx_payments_user_id`
- `idx_payments_gateway_payment_id`
- `idx_payments_created_at` (DESC)
- `idx_payments_status`

### `admin_audit_logs`
Source: `scripts/create-admin-audit-logs-table.sql`

Columns:
- `id` UUID PK, default `gen_random_uuid()`
- `admin_user_id` UUID FK -> `users(id)` ON DELETE SET NULL
- `action` VARCHAR(100) NOT NULL
- `resource_type` VARCHAR(50) NOT NULL
- `resource_id` UUID NULL
- `old_value` JSONB NULL
- `new_value` JSONB NULL
- `metadata` JSONB NULL
- `ip_address` VARCHAR(45) NULL
- `created_at` TIMESTAMPTZ DEFAULT `CURRENT_TIMESTAMP`

Indexes:
- `idx_admin_audit_logs_admin_user_id`
- `idx_admin_audit_logs_resource_type`
- `idx_admin_audit_logs_resource_id`
- `idx_admin_audit_logs_created_at` (DESC)
- `idx_admin_audit_logs_action`

## Row level security (RLS)
Source: `scripts/enable-rls.sql`

RLS is enabled on:
- `users`, `phone_numbers`, `teams`, `team_members`,
  `pathways`, `activities`, `invitations`

Policies are based on `current_user_id()` which reads
`app.current_user_id` from the session setting.

## Legacy/operational tables (from `development_export.sql`)

These tables are present in database dumps and are referenced by
billing code but are **not** created by the current SQL scripts.

### `wallets`
Columns:
- `id` BIGINT PK (sequence)
- `user_id` UUID NOT NULL
- `balance_cents` BIGINT NOT NULL DEFAULT 0
- `updated_at` TIMESTAMPTZ DEFAULT `now()`

### `wallet_transactions`
Columns:
- `id` BIGINT PK (sequence)
- `wallet_id` BIGINT NOT NULL (FK -> `wallets(id)` in dumps)
- `amount_cents` BIGINT NOT NULL
- `type` TEXT NOT NULL
- `provider_txn_id` TEXT NULL
- `metadata` JSONB NULL
- `created_at` TIMESTAMPTZ DEFAULT `now()`
- `gateway` TEXT NULL (added by `scripts/fix-wallet-transactions-table.sql`)

### `number_subscriptions`
Columns:
- `id` BIGINT PK (sequence)
- `user_id` UUID NOT NULL
- `phone_number` VARCHAR NOT NULL
- `paypal_sub_id` TEXT NOT NULL
- `status` TEXT NOT NULL
- `next_billing_at` TIMESTAMPTZ NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT `now()`

### `activities` and `invitations`
These are defined in `app/api/postgres/setup/route.ts` and in dumps,
but are not present in `scripts/create-postgres-tables.sql`.
If your environment needs them, add them to the setup script or
keep using the setup API for local bootstrap.
