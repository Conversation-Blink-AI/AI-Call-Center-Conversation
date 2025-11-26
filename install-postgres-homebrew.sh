#!/bin/bash

# Homebrew PostgreSQL Installation Script
# This script will install Homebrew (if needed) and PostgreSQL

set -e

echo "🚀 Installing PostgreSQL via Homebrew"
echo ""

# Function to check if Homebrew is installed
check_homebrew() {
    if command -v brew &> /dev/null; then
        return 0
    elif [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        return 0
    elif [ -f "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
        return 0
    else
        return 1
    fi
}

# Check and install Homebrew if needed
if ! check_homebrew; then
    echo "📦 Homebrew is not installed. Installing Homebrew..."
    echo "   (This will require your Mac password)"
    echo ""
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    if [ -f "/opt/homebrew/bin/brew" ]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f "/usr/local/bin/brew" ]; then
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew is already installed"
    check_homebrew  # Ensure it's in PATH
fi

echo ""
echo "📦 Installing PostgreSQL..."
brew install postgresql@16

echo ""
echo "🔄 Starting PostgreSQL service..."
brew services start postgresql@16

echo ""
echo "⏳ Waiting for PostgreSQL to start..."
sleep 5

# Check if PostgreSQL is running
if pg_isready &> /dev/null; then
    echo "✅ PostgreSQL is running!"
    echo ""
    echo "📋 Next step: Run the database setup script"
    echo "   ./scripts/setup-local-database.sh"
else
    echo "⚠️  PostgreSQL might still be starting..."
    echo "   Please wait a moment and check with: pg_isready"
    echo "   Then run: ./scripts/setup-local-database.sh"
fi
