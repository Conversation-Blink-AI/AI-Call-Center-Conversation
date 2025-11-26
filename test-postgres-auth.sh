
#!/bin/bash

echo "🔄 Testing PostgreSQL Authentication Setup..."
echo ""

# Get the Replit URL
REPLIT_URL="https://${REPL_SLUG}.${REPL_OWNER}.repl.co"

echo "📊 Checking database connectivity and user stats..."
curl -X GET "$REPLIT_URL/api/auth/test-login" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "🔐 Testing login with sample user..."
curl -X POST "$REPLIT_URL/api/auth/test-login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test1@gmail.com", "password": "password123"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Test completed!"
