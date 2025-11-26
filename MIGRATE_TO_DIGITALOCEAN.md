# Database Migration to DigitalOcean

## Backup File Location
The backup SQL file has been created at: `/tmp/local_db_backup.sql`

## Migration Steps

### Option 1: Using psql (if connection works)
```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
psql "postgresql://doadmin:AVNS_YwkjuL_6zG1hOUWb_Th@conversation-dev-db-cursor-do-user-25025661-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require" -f /tmp/local_db_backup.sql
```

### Option 2: Using pgAdmin or DBeaver
1. Open your database client (pgAdmin, DBeaver, etc.)
2. Connect to your DigitalOcean database
3. Open the SQL file: `/tmp/local_db_backup.sql`
4. Execute the script

### Option 3: Copy backup file and import manually
```bash
# Copy the backup file to a more accessible location
cp /tmp/local_db_backup.sql ~/Desktop/local_db_backup.sql

# Then use any PostgreSQL client to import it
```

## Current Local Database Contents

The backup includes:
- **7 tables**: users, teams, team_members, pathways, phone_numbers, activities, invitations
- **All data** from your local database

## Connection String
```
postgresql://doadmin:AVNS_YwkjuL_6zG1hOUWb_Th@conversation-dev-db-cursor-do-user-25025661-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require
```

## Troubleshooting

If you get DNS resolution errors:
1. Verify the hostname is correct in your DigitalOcean dashboard
2. Check if you need to be on a VPN or whitelist your IP
3. Try using the IP address instead of hostname (if available in DigitalOcean dashboard)

