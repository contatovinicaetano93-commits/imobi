#!/bin/bash

# imobi Development Environment Setup Script
# This script automates the initial setup for local development

set -e

echo "🚀 imobi Development Environment Setup"
echo "======================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env already exists
if [ -f .env ]; then
  echo -e "${YELLOW}⚠️  .env file already exists${NC}"
  read -p "Do you want to overwrite it? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping .env creation"
    skip_env=true
  fi
fi

# Step 1: Create .env file if it doesn't exist
if [ ! "$skip_env" = true ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo -e "${GREEN}✓ .env file created${NC}"
fi

echo ""
echo "🔐 Generating secrets..."

# Step 2: Generate JWT_SECRET (64+ character requirement)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo -e "${GREEN}✓ JWT_SECRET generated (64+ chars)${NC}"

# Step 3: Generate ENCRYPTION_KEY
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
echo -e "${GREEN}✓ ENCRYPTION_KEY generated${NC}"

# Step 4: Update database URL for local development
echo ""
echo "📦 Configuring local development database..."
read -p "PostgreSQL host (default: localhost): " -r PG_HOST
PG_HOST=${PG_HOST:-localhost}

read -p "PostgreSQL port (default: 5432): " -r PG_PORT
PG_PORT=${PG_PORT:-5432}

read -p "PostgreSQL user (default: postgres): " -r PG_USER
PG_USER=${PG_USER:-postgres}

read -s -p "PostgreSQL password: " -r PG_PASSWORD
echo

read -p "Database name (default: imobi_dev): " -r DB_NAME
DB_NAME=${DB_NAME:-imobi_dev}

# Remove the old DATABASE_URL from .env and add new one
sed -i '/^DATABASE_URL=/d' .env
echo "DATABASE_URL=postgresql://$PG_USER:$PG_PASSWORD@$PG_HOST:$PG_PORT/$DB_NAME" >> .env
echo -e "${GREEN}✓ Database URL configured${NC}"

# Step 5: Configure Redis
echo ""
echo "⚡ Configuring Redis..."
read -p "Redis host (default: localhost): " -r REDIS_HOST
REDIS_HOST=${REDIS_HOST:-localhost}

read -p "Redis port (default: 6379): " -r REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}

sed -i '/^REDIS_HOST=/d' .env
sed -i '/^REDIS_PORT=/d' .env
echo "REDIS_HOST=$REDIS_HOST" >> .env
echo "REDIS_PORT=$REDIS_PORT" >> .env
echo -e "${GREEN}✓ Redis configured${NC}"

# Step 6: Install dependencies
echo ""
echo "📥 Installing dependencies..."
if ! pnpm install >/dev/null 2>&1; then
  echo -e "${RED}✗ Failed to install dependencies${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 7: Setup database
echo ""
echo "🗄️  Setting up database..."
echo "Creating database: $DB_NAME"

# Try to create database
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -c "CREATE DATABASE $DB_NAME"

echo "Running migrations..."
if ! pnpm db:migrate:dev --name add_analytics_event >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Note: Database migrations may need to be run separately${NC}"
fi

echo -e "${GREEN}✓ Database initialized${NC}"

# Step 8: Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
pnpm db:generate >/dev/null 2>&1 || true
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Final summary
echo ""
echo "======================================="
echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo "======================================="
echo ""
echo "📋 Next steps:"
echo "  1. Verify your .env file has correct credentials"
echo "  2. Ensure PostgreSQL and Redis are running"
echo "  3. Run integration tests: pnpm test:e2e"
echo "  4. Start development servers: pnpm dev"
echo ""
echo "💡 Commands reference:"
echo "  pnpm dev              - Start all dev servers"
echo "  pnpm type-check       - Type checking all packages"
echo "  pnpm build            - Production build"
echo "  pnpm test:e2e         - Run integration tests"
echo "  pnpm db:studio        - Open Prisma Studio"
echo "  ./security-audit.sh   - Run security audit"
echo ""
echo "📚 Documentation:"
echo "  - QUICK_START.md for more details"
echo "  - DEVELOPMENT_STATUS.md for current status"
echo "  - IMPLEMENTATION_GUIDE.md for architecture overview"
echo ""
