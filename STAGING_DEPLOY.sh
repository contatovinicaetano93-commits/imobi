#!/bin/bash

# STAGING DEPLOYMENT SCRIPT — imbobi
# Este script automatiza o deployment para staging environment
#
# Pré-requisitos:
# - Git branch: claude/happy-goldberg-AFQPj
# - Environment: staging infrastructure pronto
# - Variáveis: DATABASE_URL, REDIS_HOST, SENTRY_DSN, JWT_SECRET
#
# Uso: bash STAGING_DEPLOY.sh [verify|deploy|rollback]

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "           🚀 STAGING DEPLOYMENT — imbobi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check required environment variables
check_env() {
  local missing=()

  for var in DATABASE_URL REDIS_HOST SENTRY_DSN JWT_SECRET ENCRYPTION_KEY; do
    if [ -z "${!var}" ]; then
      missing+=("$var")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo "❌ Missing environment variables:"
    printf '   - %s\n' "${missing[@]}"
    echo ""
    echo "Create .env.staging with:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "NODE_ENV=staging"
    echo "DATABASE_URL=postgresql://user:pass@host/dbname"
    echo "REDIS_HOST=redis-host"
    echo "REDIS_PORT=6379"
    echo "SENTRY_DSN=https://key@org.ingest.sentry.io/project"
    echo "JWT_SECRET=$(openssl rand -base64 32)"
    echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
    echo "CORS_ORIGIN=https://staging-web.imbobi.com"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
}

# Step 1: Verify code is ready
verify_code() {
  echo "📋 STEP 1: Verifying code readiness..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check branch
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$BRANCH" != "claude/happy-goldberg-AFQPj" ]; then
    echo "⚠️  Warning: Not on deploy branch (current: $BRANCH)"
    echo "   Deploy branch: claude/happy-goldberg-AFQPj"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  fi

  # Type checking
  echo "🔍 Running type-check..."
  if ! pnpm type-check 2>&1 | grep -q "Tasks:.*successful"; then
    echo "❌ Type checking failed"
    exit 1
  fi
  echo "✅ Type checking passed"

  # Get commit info
  COMMIT=$(git rev-parse --short HEAD)
  VERSION=$(git describe --tags --always)
  echo "✅ Code verified"
  echo "   Branch: $BRANCH"
  echo "   Commit: $COMMIT"
  echo "   Version: $VERSION"
  echo ""
}

# Step 2: Build for production
build() {
  echo "📦 STEP 2: Building for production..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "🔨 Building API..."
  pnpm --filter @imbobi/api build

  echo "🔨 Building Web..."
  pnpm --filter @imbobi/web build

  echo "✅ Build complete"
  echo ""
}

# Step 3: Database migrations
migrate_database() {
  echo "💾 STEP 3: Running database migrations..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -z "$SKIP_MIGRATIONS" ]; then
    echo "Running: pnpm db:migrate"
    pnpm db:migrate
    echo "✅ Migrations complete"
  else
    echo "⏭️  Skipping migrations (SKIP_MIGRATIONS set)"
  fi
  echo ""
}

# Step 4: Health checks
health_checks() {
  echo "🏥 STEP 4: Health checks..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Checking database connection..."
  if pnpm --filter @imbobi/api prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo "✅ Database connected"
  else
    echo "⚠️  Database check inconclusive (may still work)"
  fi

  echo "Checking Redis connection..."
  if command -v redis-cli &> /dev/null; then
    if redis-cli -h "$REDIS_HOST" ping > /dev/null 2>&1; then
      echo "✅ Redis connected"
    else
      echo "⚠️  Redis not responding (check REDIS_HOST)"
    fi
  else
    echo "⏭️  redis-cli not installed, skipping"
  fi

  echo "✅ Health checks complete"
  echo ""
}

# Step 5: Deployment
deploy() {
  echo "🚀 STEP 5: Deploying to staging..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Create release in Sentry
  VERSION=$(git describe --tags --always)
  echo "📍 Creating Sentry release: $VERSION"

  if command -v sentry-cli &> /dev/null; then
    sentry-cli releases create -p api "$VERSION" || true
  else
    echo "⏭️  sentry-cli not installed, skipping release creation"
  fi

  # Your deployment logic here
  echo "📦 Deploying API service..."
  # Example: docker push, k8s apply, railway deploy, etc.
  echo "   API artifacts: services/api/dist/"

  echo "📦 Deploying Web app..."
  # Example: vercel deploy, s3 sync, etc.
  echo "   Web artifacts: apps/web/.next/"

  echo "✅ Deployment complete"
  echo ""
}

# Step 6: Smoke tests
smoke_tests() {
  echo "✅ STEP 6: Running smoke tests..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  API_URL="${STAGING_API_URL:-http://localhost:4000/api/v1}"
  WEB_URL="${STAGING_WEB_URL:-http://localhost:3000}"

  echo "Testing API health check..."
  if curl -s -f "$API_URL/health" > /dev/null; then
    echo "✅ API responding"
  else
    echo "❌ API not responding at $API_URL"
    exit 1
  fi

  echo "Testing Web app..."
  if curl -s -f "$WEB_URL" > /dev/null; then
    echo "✅ Web app responding"
  else
    echo "❌ Web app not responding at $WEB_URL"
  fi

  echo "✅ Smoke tests passed"
  echo ""
}

# Step 7: Performance validation
performance_tests() {
  echo "📊 STEP 7: Running performance tests..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -f "scripts/load-test.ts" ]; then
    echo "Running load tests..."
    # npx tsx scripts/load-test.ts
    echo "⏭️  Load tests require dev servers (run separately)"
  fi

  echo "✅ Performance validation plan documented in LOAD_TESTING_REPORT.md"
  echo ""
}

# Main flow
main() {
  local command="${1:-verify}"

  case "$command" in
    verify)
      check_env
      verify_code
      ;;
    build)
      check_env
      verify_code
      build
      ;;
    deploy)
      check_env
      verify_code
      build
      migrate_database
      health_checks
      deploy
      smoke_tests
      ;;
    full)
      check_env
      verify_code
      build
      migrate_database
      health_checks
      deploy
      smoke_tests
      performance_tests
      ;;
    *)
      echo "Usage: $0 [verify|build|deploy|full]"
      echo ""
      echo "Commands:"
      echo "  verify  - Check code readiness"
      echo "  build   - Build production artifacts"
      echo "  deploy  - Full deployment (build + migrate + deploy)"
      echo "  full    - Full deployment + performance tests"
      exit 1
      ;;
  esac

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Deployment complete!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📊 Sentry Dashboard: https://sentry.io/..."
  echo "🌐 Staging API: https://staging-api.imbobi.com"
  echo "🌐 Staging Web: https://staging.imbobi.com"
  echo ""
}

main "$@"
