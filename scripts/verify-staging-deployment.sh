#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║           imobi — Staging Deployment Verification Script             ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_pass() { echo -e "${GREEN}✅ PASS${NC} - $1"; }
check_fail() { echo -e "${RED}❌ FAIL${NC} - $1"; }
check_warn() { echo -e "${YELLOW}⚠️  WARN${NC} - $1"; }

echo "═══════════════════════════════════════════════════════════════════════"
echo "1. ENVIRONMENT CONFIGURATION"
echo "═══════════════════════════════════════════════════════════════════════"

if [ -f .env.staging ]; then
    check_pass ".env.staging file exists"
else
    check_fail ".env.staging file not found"
    exit 1
fi

# Check critical variables
CRITICAL_VARS=("DATABASE_URL" "REDIS_HOST" "JWT_SECRET" "ENCRYPTION_KEY" "AWS_ACCESS_KEY_ID" "S3_BUCKET")

for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^${var}=" .env.staging; then
        check_pass "Variable $var configured"
    else
        check_fail "Variable $var missing from .env.staging"
        exit 1
    fi
done

# Validate JWT_SECRET length
JWT_LENGTH=$(grep "^JWT_SECRET=" .env.staging | cut -d= -f2 | wc -c)
if [ $JWT_LENGTH -gt 64 ]; then
    check_pass "JWT_SECRET meets minimum length requirement ($JWT_LENGTH chars)"
else
    check_fail "JWT_SECRET too short ($JWT_LENGTH chars, need >64)"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "2. BUILD ARTIFACTS"
echo "═══════════════════════════════════════════════════════════════════════"

if [ -d services/api/dist ]; then
    check_pass "NestJS API compiled"
else
    check_fail "NestJS API not compiled - run: pnpm build"
    exit 1
fi

if [ -d apps/web/.next ]; then
    check_pass "Next.js web app built"
else
    check_fail "Next.js web app not built - run: pnpm build"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "3. DATABASE CONNECTIVITY"
echo "═══════════════════════════════════════════════════════════════════════"

# Extract DATABASE_URL from .env.staging
DB_URL=$(grep "^DATABASE_URL=" .env.staging | cut -d= -f2)

if command -v psql &> /dev/null; then
    if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        check_pass "PostgreSQL connection successful"
    else
        check_warn "PostgreSQL connection failed - ensure database is running"
        echo "  Connection string: $DB_URL"
    fi
else
    check_warn "psql not installed - skipping database connectivity check"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "4. REDIS CONNECTIVITY"
echo "═══════════════════════════════════════════════════════════════════════"

REDIS_HOST=$(grep "^REDIS_HOST=" .env.staging | cut -d= -f2)
REDIS_PORT=$(grep "^REDIS_PORT=" .env.staging | cut -d= -f2)

if command -v redis-cli &> /dev/null; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING > /dev/null 2>&1; then
        check_pass "Redis connection successful"
    else
        check_warn "Redis connection failed - ensure Redis is running"
        echo "  Host: $REDIS_HOST:$REDIS_PORT"
    fi
else
    check_warn "redis-cli not installed - skipping Redis check"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "5. TYPESCRIPT TYPE CHECKING"
echo "═══════════════════════════════════════════════════════════════════════"

if pnpm type-check > /dev/null 2>&1; then
    check_pass "TypeScript type checking passed"
else
    check_fail "TypeScript type checking failed"
    pnpm type-check
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "6. DEPLOYMENT READINESS SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════"

echo ""
check_pass "Environment configuration complete"
check_pass "Build artifacts generated"
check_pass "Type checking passed"
check_warn "Database: Manual verification required (psql)"
check_warn "Redis: Manual verification required (redis-cli)"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "NEXT STEPS FOR DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "1. Verify Infrastructure"
echo "   psql \"\$DATABASE_URL\" -c \"SELECT 1;\""
echo "   redis-cli -h localhost -p 6380 PING"
echo ""
echo "2. Generate Prisma Client"
echo "   pnpm db:generate"
echo ""
echo "3. Run Database Migrations"
echo "   pnpm db:migrate"
echo ""
echo "4. Start Services"
echo "   pnpm dev              # (development)"
echo "   # OR"
echo "   ./DEPLOY.sh           # (production)"
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

check_pass "Staging deployment ready for infrastructure verification"
