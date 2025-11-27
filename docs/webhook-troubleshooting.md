# Bland.ai Webhook Troubleshooting Guide

## Issue: Webhook works with curl but not receiving data from Bland.ai

### Common Causes & Solutions

#### 1. **Webhook URL Configuration in Bland.ai**

**Problem:** Webhook URL might be incorrect or pointing to localhost

**Solution:**
- ✅ **For Production:** Use your production domain
  ```
  https://your-domain.com/api/webhooks/bland
  ```
- ❌ **Don't use localhost:** Bland.ai cannot reach `http://localhost:3000`
  ```
  ❌ http://localhost:3000/api/webhooks/bland  (Won't work!)
  ```

**Check in Bland.ai Dashboard:**
1. Go to your Bland.ai dashboard
2. Navigate to Webhook settings
3. Verify the webhook URL is your production domain
4. Ensure it's using `https://` (not `http://`)

#### 2. **Webhook Events Not Configured**

**Problem:** Bland.ai might not be configured to send webhooks for call events

**Solution:**
- In Bland.ai dashboard, ensure webhooks are enabled for:
  - Call completion events
  - Call status updates
- Check webhook event types are selected

#### 3. **Network/Firewall Issues**

**Problem:** Your server might be blocking incoming requests from Bland.ai

**Solution:**
- Check server logs for incoming requests
- Verify firewall rules allow incoming POST requests
- Check if your hosting provider blocks webhook requests
- For Replit: Ensure the repl is running and accessible

#### 4. **SSL/HTTPS Issues**

**Problem:** Bland.ai requires HTTPS for webhooks

**Solution:**
- Ensure your webhook URL uses `https://`
- Verify SSL certificate is valid
- For local testing, use a tunneling service like:
  - ngrok: `ngrok http 3000`
  - localtunnel: `lt --port 3000`

#### 5. **Error Responses Causing Retries**

**Problem:** Returning error status codes causes Bland.ai to retry

**Solution:**
- We now return `200` status even when user not found (to prevent retries)
- Check server logs for actual errors
- Ensure all errors are logged properly

#### 6. **Phone Number Not in Database**

**Problem:** Bland.ai sends webhook but phone number doesn't match any user

**Solution:**
- Check server logs for "User not found" messages
- Verify phone numbers in database match the format Bland.ai sends
- Ensure phone numbers are registered in `phone_numbers` table

### Debugging Steps

#### Step 1: Test Webhook Endpoint

```bash
# Test with GET (health check)
curl http://your-domain.com/api/webhooks/bland

# Test with POST (simulate Bland.ai)
curl -X POST https://your-domain.com/api/webhooks/bland \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "test-123",
    "from": "+14159407394",
    "to": "+19876543210",
    "status": "completed",
    "duration": 120
  }'
```

#### Step 2: Check Server Logs

Look for these log messages:
- `🔔 [BLAND-WEBHOOK] ==================== BLAND WEBHOOK CALLED ====================`
- If you don't see this, Bland.ai isn't reaching your endpoint

#### Step 3: Verify Webhook URL in Bland.ai

1. Log into Bland.ai dashboard
2. Go to Settings → Webhooks
3. Check the webhook URL matches your production domain
4. Test the webhook from Bland.ai dashboard if available

#### Step 4: Use ngrok for Local Testing

If testing locally, use ngrok to expose your localhost:

```bash
# Install ngrok (if not installed)
# macOS: brew install ngrok
# Or download from https://ngrok.com/

# Start your Next.js server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL in Bland.ai
# Example: https://abc123.ngrok.io/api/webhooks/bland
```

#### Step 5: Check Middleware

The middleware has been updated to skip authentication for `/api/webhooks/*` routes. Verify:
- Middleware is not blocking webhook requests
- No authentication required for webhook endpoint

### Expected Webhook Payload from Bland.ai

Bland.ai typically sends:

```json
{
  "call_id": "abc123",
  "from": "+14159407394",
  "to": "+19876543210",
  "status": "completed",
  "duration": 120,
  "recording_url": "https://...",
  "transcript": "...",
  "summary": "...",
  "pathway_id": "...",
  "country": "US",
  "state": "CA",
  "city": "San Francisco",
  "zip": "94102"
}
```

### Server Log Checklist

When Bland.ai sends a webhook, you should see:

1. ✅ `🔔 [BLAND-WEBHOOK] ==================== BLAND WEBHOOK CALLED ====================`
2. ✅ `🔔 [BLAND-WEBHOOK] Request URL: ...`
3. ✅ `🔔 [BLAND-WEBHOOK] Headers: ...`
4. ✅ `🔔 [BLAND-WEBHOOK] Received webhook payload: ...`
5. ✅ `🔍 [BLAND-WEBHOOK] Looking up user for phone numbers...`
6. ✅ `✅ [BLAND-WEBHOOK] Found user: ...` OR `⚠️ [BLAND-WEBHOOK] User not found...`
7. ✅ `💾 [BLAND-WEBHOOK] Saving call log to database...`
8. ✅ `✅ [BLAND-WEBHOOK] Successfully saved call log`

### If Still Not Working

1. **Check Bland.ai Dashboard:**
   - Look for webhook delivery logs
   - Check for error messages
   - Verify webhook is enabled

2. **Check Your Server:**
   - Verify server is running and accessible
   - Check server logs for any errors
   - Test endpoint manually with curl

3. **Network Debugging:**
   - Use `tcpdump` or similar to see if requests are reaching your server
   - Check firewall logs
   - Verify DNS is resolving correctly

4. **Contact Support:**
   - Check Bland.ai documentation for webhook requirements
   - Contact Bland.ai support if webhooks aren't being sent
   - Share server logs if needed

### Quick Test Script

Save this as `test-webhook.sh`:

```bash
#!/bin/bash

WEBHOOK_URL="https://your-domain.com/api/webhooks/bland"

echo "Testing webhook endpoint..."
echo "URL: $WEBHOOK_URL"
echo ""

# Test GET (health check)
echo "1. Testing GET request..."
curl -X GET "$WEBHOOK_URL"
echo -e "\n\n"

# Test POST (simulate Bland.ai)
echo "2. Testing POST request..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "call_id": "test-'$(date +%s)'",
    "from": "+14159407394",
    "to": "+19876543210",
    "status": "completed",
    "duration": 120,
    "country": "US",
    "state": "CA",
    "city": "San Francisco"
  }'
echo -e "\n\n"

echo "Check your server logs for [BLAND-WEBHOOK] messages"
```

Make it executable and run:
```bash
chmod +x test-webhook.sh
./test-webhook.sh
```

