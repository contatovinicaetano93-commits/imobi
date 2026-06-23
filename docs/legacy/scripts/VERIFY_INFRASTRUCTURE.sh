#!/bin/bash
set -e

echo "🚀 iMobi Infrastructure Verification — Production Cutover"
echo "=========================================================="
echo ""

# Load production environment
if [ ! -f .env.production ]; then
  echo "❌ ERROR: .env.production not found"
  echo "   Please create .env.production with DATABASE_URL and REDIS_URL"
  exit 1
fi

source .env.production

# ============================================================================
# STEP 2: DATABASE VERIFICATION
# ============================================================================
echo "📦 STEP 2: Database Verification"
echo "---"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

echo "Testing PostgreSQL connection..."
psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1 && echo "✅ PostgreSQL: Connected" || { echo "❌ PostgreSQL: Connection failed"; exit 1; }

echo "Checking PostGIS extension..."
psql "$DATABASE_URL" -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';" | grep -q postgis && echo "✅ PostGIS: Installed" || { echo "❌ PostGIS: Not found"; exit 1; }

echo "Testing GPS validation (ST_IsValid)..."
psql "$DATABASE_URL" -c "SELECT ST_IsValid(ST_GeomFromText('POINT(-46.6333 -23.5505)', 4326)) AS gps_valid;" | grep -q "t" && echo "✅ GPS Validation: Working" || { echo "❌ GPS Validation: Failed"; exit 1; }

echo "Checking Prisma migrations..."
MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM _prisma_migrations;" | tr -d ' ')
echo "✅ Migrations: $MIGRATION_COUNT applied"

echo "Verifying core tables..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo "✅ Tables: $TABLE_COUNT found"

echo "Connection pool health..."
psql "$DATABASE_URL" -c "SELECT datname, count(*) AS connections FROM pg_stat_activity GROUP BY datname;" | head -5
echo "✅ Database: Healthy"
echo ""

# ============================================================================
# STEP 3: REDIS VERIFICATION
# ============================================================================
echo "📦 STEP 3: Redis Verification"
echo "---"

if [ -z "$REDIS_URL" ] && [ -z "$REDIS_HOST" ]; then
  echo "❌ REDIS_URL or REDIS_HOST not set"
  exit 1
fi

# Determine Redis connection method
if [ ! -z "$REDIS_URL" ]; then
  REDIS_CMD="redis-cli -u $REDIS_URL"
  echo "Using REDIS_URL connection..."
else
  REDIS_CMD="redis-cli -h $REDIS_HOST -p ${REDIS_PORT:-6379} -a $REDIS_PASSWORD"
  echo "Using REDIS_HOST:REDIS_PORT connection..."
fi

echo "Testing Redis PING..."
$REDIS_CMD PING | grep -q "PONG" && echo "✅ Redis: Connected" || { echo "❌ Redis: Connection failed"; exit 1; }

echo "Checking BullMQ queues..."
QUEUE_COUNT=$($REDIS_CMD KEYS "bull:*" | wc -l)
if [ $QUEUE_COUNT -gt 0 ]; then
  echo "✅ BullMQ: $QUEUE_COUNT queues found"
  $REDIS_CMD KEYS "bull:*" | head -5
else
  echo "⚠️  BullMQ: No queues yet (will be created on first job)"
fi

echo "Redis memory stats..."
$REDIS_CMD INFO memory | grep -E "used_memory_human|maxmemory"
echo "✅ Redis: Healthy"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "✅ Infrastructure Verification Complete"
echo "=========================================================="
echo "✅ Database: PostgreSQL + PostGIS + Migrations"
echo "✅ Redis: Connected + BullMQ ready"
echo "✅ Ready for STEP 4: Smoke Tests"
echo ""
echo "Next: Execute smoke tests (TC-020, TC-033, TC-028)"
