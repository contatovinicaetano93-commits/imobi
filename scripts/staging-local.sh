#!/bin/bash

# LOCAL STAGING SIMULATION
# Este script simula um environment de staging localmente para testes
# Útil para validar deployment antes de enviar para cloud

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "           🎯 LOCAL STAGING SIMULATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Create .env.staging
create_staging_env() {
  echo "📝 STEP 1: Creating .env.staging..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -f ".env.staging" ]; then
    echo "✅ .env.staging already exists"
    return
  fi

  cat > .env.staging << 'ENV'
# Staging Environment Configuration
NODE_ENV=staging
PORT=4000

# Database (localhost for simulation)
DATABASE_URL="postgresql://imbobi:imbobi123@localhost:5432/imbobi_staging?schema=public"

# Redis (localhost for simulation)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT & Encryption (generate new keys)
JWT_SECRET="staging-secret-key-minimum-64-characters-for-production-use"
ENCRYPTION_KEY="base64-encoded-32-byte-key-for-aes-256-encryption-staging"

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:3001,http://localhost:19000"

# Sentry (optional for local testing)
SENTRY_DSN=""
RELEASE_VERSION="staging-local"

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@imbobi.com

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=imbobi-assets

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=""
FIREBASE_CLIENT_EMAIL=

# Expo
EXPO_PUBLIC_API_URL="http://localhost:4000/api/v1"
EAS_PROJECT_ID=
ENV

  echo "✅ Created .env.staging"
  echo "⚠️  Update credentials in .env.staging before running"
  echo ""
}

# Step 2: Setup database
setup_database() {
  echo "💾 STEP 2: Setting up database..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Checking PostgreSQL..."
  if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL CLI not installed"
    echo "   Install: brew install postgresql (macOS)"
    echo "            apt-get install postgresql-client (Linux)"
    return 1
  fi

  echo "Creating staging database..."
  psql -U imbobi -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = 'imbobi_staging'" | grep -q 1 || \
    psql -U imbobi -h localhost -c "CREATE DATABASE imbobi_staging;"

  echo "Running migrations..."
  # Load environment and run migrations
  export $(cat .env.staging | grep -v '^#')
  pnpm db:migrate

  echo "✅ Database ready"
  echo ""
}

# Step 3: Setup Redis
setup_redis() {
  echo "⚡ STEP 3: Setting up Redis..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Checking Redis..."
  if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis not installed"
    echo "   Install: brew install redis (macOS)"
    echo "            apt-get install redis-server (Linux)"
    return 1
  fi

  # Check if Redis is running
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis already running"
  else
    echo "🚀 Starting Redis..."
    redis-server --daemonize yes --port 6379
    echo "✅ Redis started"
  fi

  echo ""
}

# Step 4: Build
build_apps() {
  echo "📦 STEP 4: Building applications..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Building API..."
  pnpm --filter @imbobi/api build

  echo "Building Web..."
  pnpm --filter @imbobi/web build

  echo "✅ Build complete"
  echo ""
}

# Step 5: Start services
start_services() {
  echo "🚀 STEP 5: Starting services..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Load environment
  export $(cat .env.staging | grep -v '^#')

  echo "Starting API service..."
  pnpm --filter @imbobi/api start &
  API_PID=$!
  echo "✅ API started (PID: $API_PID)"

  echo "Starting Web app..."
  pnpm --filter @imbobi/web start &
  WEB_PID=$!
  echo "✅ Web started (PID: $WEB_PID)"

  echo ""
  echo "📊 Services running:"
  echo "   API: http://localhost:4000"
  echo "   Web: http://localhost:3000"
  echo ""
  echo "Press Ctrl+C to stop"

  # Keep running
  wait
}

# Step 6: Health checks
health_check() {
  echo "🏥 STEP 6: Health checks..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  sleep 3  # Give services time to start

  # Check API
  if curl -s -f http://localhost:4000/api/v1/health > /dev/null; then
    echo "✅ API healthy"
  else
    echo "❌ API not responding"
    return 1
  fi

  # Check Web
  if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ Web responsive"
  else
    echo "❌ Web not responding"
    return 1
  fi

  echo "✅ All services healthy"
  echo ""
}

# Main
main() {
  create_staging_env

  echo "Would you like to:"
  echo "  1) Setup database and Redis (requires PostgreSQL/Redis installed)"
  echo "  2) Just start services (requires DB/Redis already running)"
  echo "  3) Run tests only"
  read -p "Choose (1-3): " choice

  case $choice in
    1)
      setup_database || true
      setup_redis || true
      build_apps
      health_check
      start_services
      ;;
    2)
      build_apps
      health_check
      start_services
      ;;
    3)
      echo "Running validation tests..."
      health_check
      ;;
    *)
      echo "Invalid choice"
      exit 1
      ;;
  esac
}

main
