#!/bin/bash
set -e

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
npm install > /dev/null 2>&1 || true

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

echo "✅ Database ready"
echo ""

# Step 4: Run E2E tests
echo "🚀 Running E2E tests..."
NODE_ENV=test npm test 2>&1 | tail -100

# Step 5: Cleanup
echo ""
echo "🧹 Cleaning up..."
cd ../..
docker-compose -f docker-compose.test.yml down

echo ""
echo "✅ E2E validation complete!"
