# Bland.ai Webhook Field Mapping

This document shows how Bland.ai built-in variables and webhook payload fields are mapped to our `call_logs` table.

## Field Mapping Reference

### Core Call Fields

| Bland.ai Variable/Field | Our Database Field | Notes |
|------------------------|-------------------|-------|
| `call_id`, `c_id`, `id` | `call_id` | Unique call identifier |
| `from`, `from_number` | `from_number` | Outbound number in E.164 format |
| `to`, `to_number` | `to_number` | Inbound number in E.164 format |
| `status` | `status` | Call status (completed, failed, etc.) |
| `duration`, `call_length`, `corrected_duration` | `duration_seconds` | Call duration in seconds |
| `recording_url` | `recording_url` | URL to call recording |
| `transcription`, `transcript` | `transcript` | Full call transcript |
| `summary` | `summary` | Call summary |
| `pathway_id` | `pathway_id` | Pathway used for the call |
| `ended_reason` | `ended_reason` | Reason call ended |
| `started_at`, `start_time` | `start_time` | Call start timestamp |
| `ended_at`, `end_time` | `end_time` | Call end timestamp |
| `queue_time` | `queue_time` | Time spent in queue (seconds) |
| `latency`, `latency_ms` | `latency_ms` | Call latency in milliseconds |
| `interruptions` | `interruptions` | Number of interruptions |

### Bland.ai Built-in Variables

| Bland.ai Variable | Our Database Field | Description |
|-------------------|-------------------|-------------|
| `{{phone_number}}` | `phone_number` | Always the other party's number |
| `{{country}}` | `country` | Country code (e.g., US) |
| `{{state}}` | `state` | State/province abbreviation (e.g., CA) |
| `{{city}}` | `city` | Full city name, capitalized |
| `{{zip}}` | `zip` | Zip code |
| `{{from}}` | `from_number` | The outbound number in E.164 format |
| `{{to}}` | `to_number` | The inbound number in E.164 format |
| `{{short_from}}` | `short_from` | Outbound number with country code removed |
| `{{short_to}}` | `short_to` | Inbound number with country code removed |
| `{{call_id}}` | `call_id` | Unique ID of the current call |
| `{{now}}` | `call_timezone` | Current time in the call's timezone |
| `{{now_utc}}` | `call_time_utc` | Current time in UTC format |

### Internal Fields

| Field | Description |
|-------|-------------|
| `user_id` | Automatically determined by phone number lookup |
| `phone_number_id` | Automatically determined by phone number lookup |
| `created_at` | Timestamp when record was created |
| `updated_at` | Timestamp when record was last updated |

## Webhook Endpoint

**URL:** `/api/webhooks/bland`  
**Method:** `POST`  
**Content-Type:** `application/json`

## Example Webhook Payload

```json
{
  "call_id": "abc123",
  "from": "+14159407394",
  "to": "+19876543210",
  "phone_number": "+19876543210",
  "status": "completed",
  "duration": 120,
  "country": "US",
  "state": "CA",
  "city": "San Francisco",
  "zip": "94102",
  "short_from": "4159407394",
  "short_to": "9876543210",
  "now": "2025-11-27T12:00:00-08:00",
  "now_utc": "2025-11-27T20:00:00Z",
  "recording_url": "https://example.com/recording.mp3",
  "transcript": "Hello, this is a test call...",
  "summary": "Customer called to inquire about services",
  "pathway_id": "pathway-123",
  "ended_reason": "completed",
  "start_time": "2025-11-27T12:00:00Z",
  "end_time": "2025-11-27T12:02:00Z",
  "queue_time": 5,
  "latency_ms": 150,
  "interruptions": 2
}
```

## Database Migration

To add the new Bland.ai built-in variable fields, run:

```bash
psql $DATABASE_URL -f scripts/add-bland-variables-to-call-logs.sql
```

Or execute the SQL directly in your database client.

## Notes

- Phone numbers are automatically normalized to E.164 format
- User identification happens automatically via phone number lookup
- All fields are optional except `call_id`, `from_number`, `to_number`, and `user_id`
- Duplicate calls (same `call_id`) will update existing records instead of creating duplicates

