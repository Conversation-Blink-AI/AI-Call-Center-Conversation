#!/bin/bash
# View Database Schema Script

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "📊 Database Schema for 'ai_call_center'"
echo "=========================================="
echo ""

# List all tables
echo "📋 Available Tables:"
psql -h localhost -p 5432 -d ai_call_center -c "\dt" | grep "public" | awk '{print "  -", $3}'

echo ""
echo "=========================================="
echo ""

# Show schema for each table
for table in users teams team_members pathways phone_numbers activities invitations; do
    echo "📄 Table: $table"
    echo "----------------------------------------"
    psql -h localhost -p 5432 -d ai_call_center -c "\d+ $table" | head -30
    echo ""
done

echo "✅ Schema view complete!"
echo ""
echo "💡 Tip: To view a specific table in detail, run:"
echo "   psql -d ai_call_center -c '\d+ table_name'"
