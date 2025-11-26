
# Scheduled Sync & Billing Setup

## Overview

This application uses **sync-based billing** instead of webhook-based billing. A scheduled job runs every 1 minute to:

1. Fetch new calls from Bland AI API for all users
2. Store them in the database
3. Automatically bill completed calls
4. Deduct costs from user wallets

## Architecture

```
Every 1 minute:
  ↓
GET /api/calls/scheduled-sync
  ↓
CallSyncService.syncCallsForUser() (for each user)
  ↓
Fetch calls from Bland AI
  ↓
Store in database (cost_cents = NULL)
  ↓
CallBillingService.processPendingBills()
  ↓
Bill unbilled calls
  ↓
Wallet deducted, transactions recorded
```

## Setup on Replit

### Option 1: Replit Scheduled Deployment (Recommended)

1. Open your Repl's **Deployments** panel
2. Click **+ Create** and select **Scheduled Deployment**
3. Configure:
   - **Schedule**: `Every 1 minute` or `*/1 * * * *` (cron expression)
   - **Timezone**: Select your timezone
   - **Run Command**: `curl -X GET http://0.0.0.0:5000/api/calls/scheduled-sync`
   - **Build Command**: (leave empty)

4. Click **Deploy**

### Option 2: External Cron Service

Use any external cron service (like cron-job.org, EasyCron, etc.) to hit:

```
GET https://your-repl-url.replit.app/api/calls/scheduled-sync
```

**Frequency**: Every 1 minute

## Manual Testing

You can manually trigger the sync by calling:

```bash
curl -X GET http://0.0.0.0:5000/api/calls/scheduled-sync
```

Or visit in browser:
```
http://your-repl-url.replit.app/api/calls/scheduled-sync
```

## Monitoring

Check the console logs for sync status:

- `🔄 [SCHEDULED-SYNC]` - Sync process logs
- `💰 [BILLING]` - Billing process logs
- `✅ [SCHEDULED-SYNC]` - Success logs
- `❌ [SCHEDULED-SYNC]` - Error logs

## Billing Flow

1. **Call Sync**: Calls are fetched and stored with `cost_cents = NULL`
2. **Auto-Billing**: After sync, `CallBillingService.processPendingBills()` runs
3. **Wallet Deduction**: Completed calls are billed at $0.11/minute
4. **Transaction Record**: Each billing creates a wallet transaction

## Webhook Status

The Bland AI webhook at `/api/webhooks/bland` is **DISABLED for billing**. It only logs events for debugging. All billing happens through scheduled sync.

## Rate: $0.11 per minute

Duration is rounded up to the nearest minute.

## Troubleshooting

**No calls being synced?**
- Check if users have phone numbers in the database
- Verify Bland API key in environment variables
- Check console logs for API errors

**Billing not working?**
- Verify wallet balance is sufficient
- Check `cost_cents` field in calls table
- Look for billing errors in console logs

**Sync not running?**
- Verify Replit Scheduled Deployment is active
- Check deployment logs in Replit dashboard
- Test endpoint manually to verify it works
