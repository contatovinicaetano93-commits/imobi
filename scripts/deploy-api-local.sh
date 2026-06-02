#!/bin/bash
set -e

# Deploy and verify NestJS API locally
# Usage: ./deploy-api-local.sh [port]

PORT=${1:-4000}
ENVIRONMENT=${ENVIRONMENT:-"development"}

echo "🚀 Building and deploying API locally (Port: $PORT, Env: $ENVIRONMENT)..."

# 1. Clean and build
echo "🧹 Cleaning previous builds..."
rm -rf services/api/dist

echo "🔨 Building API..."
pnpm --filter @imbobi/api build

# 2. Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f services/api/.env ]; then
  if [ ! -f services/api/.env.example ]; then
    echo "⚠️  Creating minimal .env..."
    cat > services/api/.env << ENVEOF
NODE_ENV=${ENVIRONMENT}
PORT=${PORT}
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://user:password@localhost:5432/imobi
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
EXPO_PUBLIC_API_URL=http://localhost:${PORT}
ENVEOF
  fi
fi

# 3. Database migration (optional)
echo "💾 Checking database..."
npx prisma migrate status --skip-generate || echo "Note: Database not available - skipping migration"

# 4. Start API
echo "🚀 Starting API server on port $PORT..."
export NODE_ENV=${ENVIRONMENT}
export PORT=${PORT}

node services/api/dist/main.js &
API_PID=$!

echo "Process ID: $API_PID"

# 5. Health check
echo "⏳ Waiting for API to start..."
max_retries=20
retry=0

while [ $retry -lt $max_retries ]; do
  if curl -s "http://localhost:${PORT}/api/v1/health" > /dev/null 2>&1; then
    health=$(curl -s "http://localhost:${PORT}/api/v1/health")
    echo "✅ API is healthy!"
    echo "Health check response: $health"
    echo ""
    echo "📊 API Summary:"
    echo "  URL: http://localhost:${PORT}"
    echo "  Docs: http://localhost:${PORT}/docs"
    echo "  Health: http://localhost:${PORT}/api/v1/health"
    echo "  Liveness: http://localhost:${PORT}/api/v1/health/live"
    echo "  Readiness: http://localhost:${PORT}/api/v1/health/ready"
    echo ""
    echo "💡 To stop the API: kill $API_PID"
    echo ""
    exit 0
  fi
  
  echo "  Waiting for API... (attempt $((retry+1))/$max_retries)"
  sleep 1
  retry=$((retry+1))
done

echo "❌ API failed to start"
kill $API_PID 2>/dev/null || true
exit 1
