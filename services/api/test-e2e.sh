#!/bin/bash
set -e

# Determine docker-compose command
DOCKER_COMPOSE="docker-compose"
if ! command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
fi

echo "🚀 Starting E2E test environment..."

# Start Docker containers in the background
echo "📦 Starting PostgreSQL and Redis..."
$DOCKER_COMPOSE -f docker-compose.test.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if $DOCKER_COMPOSE -f docker-compose.test.yml ps | grep -q "healthy\|running"; then
    # Check if postgres is actually responding
    if $DOCKER_COMPOSE -f docker-compose.test.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
      echo "✅ PostgreSQL is ready"
      break
    fi
  fi

  echo "⏳ Waiting... ($((attempt + 1))/$max_attempts)"
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Services failed to start"
  $DOCKER_COMPOSE -f docker-compose.test.yml logs
  $DOCKER_COMPOSE -f docker-compose.test.yml down
  exit 1
fi

# Wait a bit more for Redis
sleep 2

# Run Prisma migrations
echo "🗄️  Running database migrations..."
NODE_ENV=test npx prisma migrate deploy --schema prisma/schema.prisma || {
  echo "❌ Migrations failed"
  $DOCKER_COMPOSE -f docker-compose.test.yml down
  exit 1
}

# Run tests
echo "🧪 Running E2E tests..."
NODE_ENV=test npm test -- "$@"
TEST_EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up..."
$DOCKER_COMPOSE -f docker-compose.test.yml down

exit $TEST_EXIT_CODE
