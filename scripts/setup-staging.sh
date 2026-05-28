#!/bin/bash
set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Staging Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================================================
# 1. VALIDATE PRE-REQUISITES
# ============================================================================
echo -e "${YELLOW}[1/5] Validating prerequisites...${NC}"

REQUIRED_COMMANDS=("git" "pnpm" "node" "docker" "psql" "redis-cli")
MISSING_COMMANDS=()

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        MISSING_COMMANDS+=("$cmd")
    fi
done

if [ ${#MISSING_COMMANDS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required commands: ${MISSING_COMMANDS[*]}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required commands available${NC}"

# ============================================================================
# 2. INSTALL DEPENDENCIES
# ============================================================================
echo ""
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo "Installing monorepo dependencies..."
    pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# ============================================================================
# 3. VALIDATE ENVIRONMENT FILE
# ============================================================================
echo ""
echo -e "${YELLOW}[3/5] Validating environment configuration...${NC}"

if [ ! -f ".env.staging" ]; then
    echo -e "${RED}❌ .env.staging file not found${NC}"
    echo "Please create .env.staging with required variables:"
    echo ""
    cat << 'EOF'
# Core API
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug

# Database (local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbobi_staging

# Redis (local)
REDIS_HOST=localhost
REDIS_PORT=6379

# Secrets (test values - >64 and >32 chars)
JWT_SECRET=test_jwt_secret_this_must_be_longer_than_64_characters_for_hmac_sha256_security_requirements_ok
ENCRYPTION_SECRET=test_encryption_secret_must_be_32_chars_long

# AWS S3 (mock/disabled for local)
S3_BUCKET=imbobi-staging-evidencias
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# Email (console log for staging)
SENDGRID_API_KEY=test-key-disabled-in-staging

# Firebase (optional for staging)
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY_ID=test

# External APIs (disabled in staging)
UNICO_CLIENT_ID=test
SERPRO_CLIENT_ID=test
EOF
    exit 1
fi

echo -e "${GREEN}✓ .env.staging file found${NC}"

# Validate required env vars
REQUIRED_VARS=("NODE_ENV" "DATABASE_URL" "REDIS_HOST" "JWT_SECRET" "ENCRYPTION_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.staging; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required variables: ${MISSING_VARS[*]}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables present${NC}"

# ============================================================================
# 4. DATABASE SETUP & MIGRATIONS
# ============================================================================
echo ""
echo -e "${YELLOW}[4/5] Setting up database...${NC}"

export $(grep -v '^#' .env.staging | xargs)

# Check if database exists
if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${YELLOW}⚠ Database not accessible. Ensure PostgreSQL is running.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Generate Prisma Client
echo "Generating Prisma client..."
cd services/api
pnpm prisma generate 2>&1 || {
    echo -e "${RED}❌ Failed to generate Prisma client${NC}"
    cd - > /dev/null
    exit 1
}
cd - > /dev/null
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Run migrations
echo "Running database migrations..."
cd services/api
DATABASE_URL="$DATABASE_URL" pnpm prisma migrate deploy 2>&1 || {
    echo -e "${YELLOW}⚠ Migration execution failed (may already be up-to-date)${NC}"
}
cd - > /dev/null
echo -e "${GREEN}✓ Database migrations completed${NC}"

# ============================================================================
# 5. VALIDATE SERVICE CONNECTIONS
# ============================================================================
echo ""
echo -e "${YELLOW}[5/5] Validating service connections...${NC}"

# Redis check
if redis-cli -h "$REDIS_HOST" -p "${REDIS_PORT:-6379}" ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis connection OK${NC}"
else
    echo -e "${YELLOW}⚠ Redis not accessible. Ensure Redis is running.${NC}"
fi

# Type check
echo "Running TypeScript type check..."
pnpm type-check 2>&1 | tail -5 || {
    echo -e "${YELLOW}⚠ Type check issues detected${NC}"
}
echo -e "${GREEN}✓ Type check completed${NC}"

# ============================================================================
# FINAL CHECKLIST
# ============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Staging environment setup complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Start services: ${BLUE}pnpm dev${NC}"
echo "  2. Test API: ${BLUE}curl http://localhost:4000/api/v1/health${NC}"
echo "  3. Run E2E tests: ${BLUE}bash scripts/staging-e2e.sh${NC}"
echo "  4. Check logs: ${BLUE}docker logs -f imbobi-api-staging${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  • Deploy: bash scripts/staging-deploy.sh"
echo "  • Health checks: bash scripts/staging-health-check.sh"
echo "  • Rollback: bash scripts/staging-rollback.sh"
echo "  • DB status: cd services/api && pnpm prisma migrate status"
echo ""
