# Local PostgreSQL Database Setup Guide

This guide will help you install and configure PostgreSQL on your local machine for the AI Call Center v4 project.

## Quick Start Options

### Option 1: Using Homebrew (Recommended for macOS)

1. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install PostgreSQL**:
   ```bash
   brew install postgresql@16
   ```

3. **Start PostgreSQL service**:
   ```bash
   brew services start postgresql@16
   ```

4. **Run the setup script**:
   ```bash
   ./scripts/setup-local-database.sh
   ```

### Option 2: Using Postgres.app (Easiest for macOS)

1. **Download Postgres.app**:
   - Visit: https://postgresapp.com/
   - Download and install the app

2. **Start Postgres.app**:
   - Open the app from Applications
   - Click "Initialize" if prompted

3. **Run the setup script**:
   ```bash
   ./scripts/setup-local-database.sh
   ```

### Option 3: Using Docker (Cross-platform)

1. **Install Docker Desktop** (if not already installed):
   - Visit: https://www.docker.com/products/docker-desktop
   - Download and install Docker Desktop

2. **Start PostgreSQL with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Run the setup script**:
   ```bash
   ./scripts/setup-local-database.sh
   ```

### Option 4: Manual Docker Setup

```bash
docker run --name ai-call-center-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ai_call_center \
  -p 5432:5432 \
  -d postgres:16-alpine
```

## Default Database Configuration

After running the setup script, your database will be configured with:

- **Database Name**: `ai_call_center`
- **Username**: `postgres`
- **Password**: `postgres`
- **Host**: `localhost`
- **Port**: `5432`
- **Connection String**: `postgresql://postgres:postgres@localhost:5432/ai_call_center`

## Next Steps

1. **Verify the database connection**:
   ```bash
   psql -h localhost -U postgres -d ai_call_center
   ```

2. **Create database tables**:
   - Option A: Use the API endpoint (after starting the dev server):
     ```bash
     curl -X POST http://localhost:3000/api/postgres/setup
     ```
   - Option B: Use the database setup page in the app at `/database`

3. **Seed initial data** (optional):
   ```bash
     curl -X POST http://localhost:3000/api/postgres/seed
   ```

## Troubleshooting

### PostgreSQL service not running

**Homebrew**:
```bash
brew services start postgresql@16
```

**Postgres.app**:
- Make sure the app is running (check the menu bar)

**Docker**:
```bash
docker start ai-call-center-postgres
```

### Connection refused

- Make sure PostgreSQL is running on port 5432
- Check if another service is using port 5432:
  ```bash
  lsof -i :5432
  ```

### Permission denied

- Make sure you're using the correct username and password
- For local development, the default user is `postgres`

### Change default password

1. Connect to PostgreSQL:
   ```bash
   psql -h localhost -U postgres -d postgres
   ```

2. Change password:
   ```sql
   ALTER USER postgres WITH PASSWORD 'your-new-password';
   ```

3. Update `.env` file with the new password

## Security Notes

⚠️ **Important**: The default password (`postgres`) is only for local development. 

For production:
- Use a strong, unique password
- Never commit `.env` file to version control
- Use environment variables or a secrets manager
- Enable SSL connections

## Database Schema

The database includes the following main tables:
- `users` - User accounts and authentication
- `teams` - Team/organization management
- `team_members` - Team membership
- `pathways` - Call flow pathways
- `phone_numbers` - Purchased phone numbers
- `activities` - Activity logging
- `invitations` - Team invitations
- `calls` - Call history and analytics
- `wallet_transactions` - Payment transactions

See `scripts/create-postgres-tables.sql` for the complete schema.

