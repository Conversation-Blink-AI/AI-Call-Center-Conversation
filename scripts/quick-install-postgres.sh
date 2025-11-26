#!/bin/bash
# Quick PostgreSQL Installation Script for macOS

echo "🚀 Quick PostgreSQL Installation"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Install PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    brew install postgresql@16
    
    # Add PostgreSQL to PATH
    echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
fi

# Start PostgreSQL
echo "🔄 Starting PostgreSQL service..."
brew services start postgresql@16

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to start..."
sleep 5

# Check if PostgreSQL is running
if pg_isready &> /dev/null; then
    echo "✅ PostgreSQL is running!"
    echo ""
    echo "Next step: Run ./scripts/setup-local-database.sh"
else
    echo "⚠️  PostgreSQL might still be starting. Please wait a moment and run:"
    echo "   ./scripts/setup-local-database.sh"
fi
