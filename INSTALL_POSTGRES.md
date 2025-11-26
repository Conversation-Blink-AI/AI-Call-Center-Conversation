# PostgreSQL Installation Instructions

## Quick Installation (Choose One Method)

### Method 1: Postgres.app (Easiest - No Terminal Required)

1. **Download Postgres.app**:
   - Visit: https://postgresapp.com/downloads.html
   - Download the latest version
   - Drag to Applications folder

2. **Start Postgres.app**:
   - Open from Applications
   - Click "Initialize" if this is the first time

3. **Run setup script**:
   ```bash
   ./scripts/setup-local-database.sh
   ```

### Method 2: Homebrew (Recommended for Developers)

1. **Install Homebrew** (requires your password):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   Follow the on-screen instructions. You'll need to enter your Mac password.

2. **Install PostgreSQL**:
   ```bash
   brew install postgresql@16
   ```

3. **Start PostgreSQL**:
   ```bash
   brew services start postgresql@16
   ```

4. **Run setup script**:
   ```bash
   ./scripts/setup-local-database.sh
   ```

### Method 3: Docker (If you have Docker Desktop)

1. **Start PostgreSQL**:
   ```bash
   docker-compose up -d
   ```

2. **Run setup script**:
   ```bash
   ./scripts/setup-local-database.sh
   ```

## After Installation

Once PostgreSQL is installed and running, the setup script will:
- ✅ Create the database
- ✅ Configure your .env file
- ✅ Set up the connection string

Then you can create the tables by visiting:
- http://localhost:3000/database (in your browser)
- Or run: `curl -X POST http://localhost:3000/api/postgres/setup`

## Need Help?

See `DATABASE_SETUP.md` for detailed troubleshooting and configuration options.
