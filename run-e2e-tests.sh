#!/bin/bash
set -e
set -o pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/imbobi_test}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export JWT_SECRET="${JWT_SECRET:-test-secret-key}"

echo "🧪 iMobi E2E Tests — Local Validation"
echo "====================================="
echo ""

cd "$(dirname "$0")"

# Step 1: Start containers
echo "📦 Starting PostgreSQL + Redis..."
docker-compose -f docker-compose.test.yml up -d
sleep 3

# Step 2: Wait for containers
echo "⏳ Waiting for services to be healthy..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker-compose -f docker-compose.test.yml ps | grep -q "healthy"; then
    echo "✅ Services are healthy"
    break
  fi
  echo "  Attempt $((attempt+1))/$max_attempts..."
  sleep 2
  attempt=$((attempt+1))
done

# Step 3: Setup database
echo ""
echo "🗄️  Setting up database..."
cd services/api

# Generate Prisma client with test environment
NODE_ENV=test pnpm prisma generate --schema prisma/schema.prisma

# Run migrations with test environment
NODE_ENV=test pnpm prisma migrate deploy --schema prisma/schema.prisma

echo "✅ Database ready"
echo ""

# Step 4: Run E2E tests
echo "🚀 Running E2E tests..."
NODE_ENV=test pnpm test 2>&1 | tee /tmp/imbobi-e2e.log

# Step 5: Cleanup
echo ""
echo "🧹 Cleaning up..."
cd ../..
docker-compose -f docker-compose.test.yml down

echo ""
echo "✅ E2E validation complete!"
