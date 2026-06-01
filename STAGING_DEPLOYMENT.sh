#!/bin/bash
# Staging Deployment Script for imobi
# Usage: ./STAGING_DEPLOYMENT.sh <environment> <database_url> <redis_url>

set -e

ENVIRONMENT=${1:-staging}
DATABASE_URL=${2:-"postgresql://imbobi:password@staging-db:5432/imbobi_staging"}
REDIS_URL=${3:-"redis://staging-redis:6379"}

echo "🚀 Starting imobi Staging Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment: $ENVIRONMENT"
echo "Database: $DATABASE_URL"
echo "Redis: $REDIS_URL"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_step() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Step 1: Verify environment
echo -e "${YELLOW}[1/8]${NC} Verifying environment..."
command -v node >/dev/null || log_error "Node.js not found"
command -v pnpm >/dev/null || log_error "pnpm not found"
log_step "Node.js and pnpm available"

# Step 2: Install dependencies
echo -e "${YELLOW}[2/8]${NC} Installing dependencies..."
pnpm install --frozen-lockfile || log_error "Failed to install dependencies"
log_step "Dependencies installed"

# Step 3: Type checking
echo -e "${YELLOW}[3/8]${NC} Type checking..."
pnpm type-check || log_error "Type checking failed"
log_step "All packages type-safe"

# Step 4: Build production artifacts
echo -e "${YELLOW}[4/8]${NC} Building production artifacts..."
pnpm build || log_error "Production build failed"
log_step "API and Web built successfully"

# Step 5: Database migrations
echo -e "${YELLOW}[5/8]${NC} Running database migrations..."
export DATABASE_URL="$DATABASE_URL"
pnpm db:migrate || log_error "Database migrations failed"
log_step "Database migrations completed"

# Step 6: Verify database connection
echo -e "${YELLOW}[6/8]${NC} Verifying database connection..."
pnpm exec prisma db execute --stdin --schema services/api/prisma/schema.prisma <<EOF || log_error "Database connection failed"
SELECT 1;
EOF
log_step "Database connection verified"

# Step 7: Run E2E tests (optional, requires running instance)
echo -e "${YELLOW}[7/8]${NC} E2E Test Suite Ready"
log_warn "Run E2E tests separately: export DATABASE_URL_TEST='...' && pnpm --filter @imbobi/api test:e2e"

# Step 8: Deployment checklist
echo -e "${YELLOW}[8/8]${NC} Deployment Checklist"
cat << 'EOF'

✅ READY FOR DEPLOYMENT

Next steps:

1. API Server
   $ node services/api/dist/main.js
   Runs on port 4000
   Health check: GET /api/v1/health

2. Web Server (choose one)

   a) Production build:
      $ npx next start --cwd apps/web
      Runs on port 3000

   b) Development:
      $ pnpm --filter @imbobi/web dev

3. Mobile App
   $ cd apps/mobile && npx expo start

4. Validation Checklist
   - [ ] Web signup page loads: GET http://localhost:3000/cadastro
   - [ ] API health check: GET http://localhost:4000/api/v1/health
   - [ ] Database migrations applied: pnpm db:migrate status
   - [ ] Redis cache working: redis-cli PING
   - [ ] Run E2E tests (with test DB): pnpm --filter @imbobi/api test:e2e

5. Security Validation (from STAGING_DEPLOYMENT.md)
   - [ ] CORS properly configured
   - [ ] Security headers present (Helmet)
   - [ ] JWT tokens encrypted
   - [ ] Rate limiting active
   - [ ] Authorization guards working

6. Monitoring Setup
   - [ ] API logs configured
   - [ ] Database query monitoring
   - [ ] Redis memory monitoring
   - [ ] Error tracking (Sentry/similar)
   - [ ] Uptime monitoring

EOF

log_step "Staging deployment script completed successfully!"
echo ""
echo "📚 Full guide: STAGING_DEPLOYMENT.md"
echo "🔐 Security details: SECURITY_SUMMARY.md"
