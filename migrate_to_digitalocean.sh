#!/bin/bash
# Database Migration Script to DigitalOcean

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

BACKUP_FILE="./database_backup_$(ls -t database_backup_*.sql 2>/dev/null | head -1 | cut -d'_' -f3- | cut -d'.' -f1).sql"
if [ ! -f "$BACKUP_FILE" ]; then
    BACKUP_FILE="$(ls -t database_backup_*.sql 2>/dev/null | head -1)"
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found. Please create it first."
    exit 1
fi

echo "📦 Migrating database to DigitalOcean..."
echo "📄 Using backup file: $BACKUP_FILE"
echo ""

# Try to connect and import
psql "postgresql://doadmin:AVNS_YwkjuL_6zG1hOUWb_Th@conversation-dev-db-cursor-do-user-25025661-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check:"
    echo "   1. Network connectivity"
    echo "   2. Database hostname is correct"
    echo "   3. Credentials are correct"
    echo "   4. Your IP is whitelisted in DigitalOcean"
    echo ""
    echo "You can also import manually using pgAdmin or DBeaver"
fi
