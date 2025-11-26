#!/bin/bash

# ============================================
# Local PostgreSQL Database Setup Script
# ============================================

set -e

echo "🚀 Setting up local PostgreSQL database for AI Call Center v4"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is already installed${NC}"
    psql --version
else
    echo -e "${YELLOW}⚠️  PostgreSQL is not installed${NC}"
    echo ""
    echo "Please install PostgreSQL using one of these methods:"
    echo ""
    echo "Option 1: Install via Homebrew (Recommended)"
    echo "  1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  2. Install PostgreSQL: brew install postgresql@16"
    echo "  3. Start PostgreSQL: brew services start postgresql@16"
    echo ""
    echo "Option 2: Install Postgres.app (GUI)"
    echo "  1. Download from: https://postgresapp.com/"
    echo "  2. Install and start the app"
    echo ""
    echo "Option 3: Use Docker"
    echo "  docker run --name postgres-ai-call-center -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ai_call_center -p 5432:5432 -d postgres:16"
    echo ""
    read -p "Press Enter after installing PostgreSQL, or Ctrl+C to cancel..."
fi

# Check if PostgreSQL is running
if pg_isready &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL service is running${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL service is not running${NC}"
    echo ""
    echo "Please start PostgreSQL:"
    echo "  - If using Homebrew: brew services start postgresql@16"
    echo "  - If using Postgres.app: Open the app"
    echo "  - If using Docker: docker start postgres-ai-call-center"
    echo ""
    read -p "Press Enter after starting PostgreSQL, or Ctrl+C to cancel..."
fi

# Database configuration
DB_NAME="ai_call_center"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo ""
echo "📋 Database Configuration:"
echo "  Database Name: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""

# Test connection
echo "🔌 Testing PostgreSQL connection..."
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT version();" &> /dev/null; then
    echo -e "${GREEN}✅ Successfully connected to PostgreSQL${NC}"
else
    echo -e "${RED}❌ Failed to connect to PostgreSQL${NC}"
    echo ""
    echo "Please check:"
    echo "  1. PostgreSQL is running"
    echo "  2. Connection details are correct"
    echo "  3. User has proper permissions"
    exit 1
fi

# Create database if it doesn't exist
echo ""
echo "📦 Creating database '$DB_NAME' if it doesn't exist..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database '$DB_NAME' is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Database might already exist (this is okay)${NC}"
fi

# Update .env file
echo ""
echo "📝 Updating .env file with database connection string..."
ENV_FILE=".env"
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found, creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Update DATABASE_URL in .env file
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    # Replace existing DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" "$ENV_FILE"
    fi
    echo -e "${GREEN}✅ Updated DATABASE_URL in .env file${NC}"
else
    # Add DATABASE_URL if it doesn't exist
    echo "DATABASE_URL=$DATABASE_URL" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Added DATABASE_URL to .env file${NC}"
fi

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. The database '$DB_NAME' has been created"
echo "  2. Your .env file has been updated with: DATABASE_URL=$DATABASE_URL"
echo "  3. Run the database setup API to create tables:"
echo "     curl -X POST http://localhost:3000/api/postgres/setup"
echo "  4. Or use the database setup page in the app"
echo ""
echo "🔐 Default credentials:"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo "  Database: $DB_NAME"
echo ""
echo -e "${YELLOW}⚠️  Remember to change the default password in production!${NC}"

