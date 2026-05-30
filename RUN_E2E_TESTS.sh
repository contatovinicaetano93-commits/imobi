#!/bin/bash
# Run E2E Test Suite for imobi API
# Prerequisites: PostgreSQL 14+ running on specified port

set -e

DB_HOST=${1:-localhost}
DB_PORT=${2:-5433}
DB_USER=${3:-imbobi}
DB_PASS=${4:-imbobi123}
DB_NAME=${5:-imbobi_test}

echo "🧪 E2E Test Suite for imobi API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Database: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Verify PostgreSQL connection
echo -e "${YELLOW}[1/4]${NC} Verifying PostgreSQL connection..."
if ! nc -z $DB_HOST $DB_PORT 2>/dev/null; then
  echo -e "${RED}✗${NC} Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
  exit 1
fi
echo -e "${GREEN}✓${NC} PostgreSQL connection verified"

# Step 2: Set environment variables
echo -e "${YELLOW}[2/4]${NC} Setting up test environment..."
export DATABASE_URL_TEST="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
export JWT_SECRET="test-secret-key-minimum-64-characters-for-testing-purposes-must-be-64-chars"
export ENCRYPTION_KEY="dGVzdC1lbmNyeXB0aW9uLWtleS1iYXNlNjQtZW5jb2RlZC0zMi1ieXRlLWtleQ=="
echo -e "${GREEN}✓${NC} Test environment configured"

# Step 3: Run E2E tests
echo -e "${YELLOW}[3/4]${NC} Running E2E test suite..."
pnpm --filter @imbobi/api test:e2e --runInBand || {
  echo -e "${RED}✗${NC} E2E tests failed"
  exit 1
}
echo -e "${GREEN}✓${NC} E2E tests passed"

# Step 4: Summary
echo -e "${YELLOW}[4/4]${NC} Test summary"
echo ""
echo -e "${GREEN}✓ E2E Test Suite Passed!${NC}"
echo ""
echo "Test Files Executed:"
echo "  ✓ fluxo-principal.e2e.spec.ts"
echo "  ✓ cache-throttle.e2e.spec.ts"
echo "  ✓ deployment.e2e.spec.ts"
echo "  ✓ security.e2e.spec.ts"
echo "  ✓ kyc.e2e.spec.ts"
echo "  ✓ score.e2e.spec.ts"
echo "  ✓ fluxo-completo.e2e.spec.ts"
echo "  ✓ evidencias.e2e.spec.ts"
echo "  ✓ credito.e2e.spec.ts"
echo "  ✓ obras.e2e.spec.ts"
echo ""
echo "Ready for production deployment!"
