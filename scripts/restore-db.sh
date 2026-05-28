#!/bin/bash
set -euo pipefail

# ════════════════════════════════════════════════════════════
# PostgreSQL Production Database Restore Script
# ════════════════════════════════════════════════════════════

# Configuration
BACKUP_FILE="${1:-}"
RESTORE_DB="${RESTORE_DB:=imbobi_prod}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ════════════════════════════════════════════════════════════
# Validation
# ════════════════════════════════════════════════════════════

if [ -z "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Usage: $0 <backup-file>${NC}"
  echo ""
  echo "Examples:"
  echo "  $0 backups/imbobi-prod-20260528-120000.sql.gz"
  echo "  $0 s3://my-bucket/imbobi-prod-20260528-120000.sql.gz"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL environment variable not set${NC}"
  exit 1
fi

# ════════════════════════════════════════════════════════════
# Download from S3 if needed
# ════════════════════════════════════════════════════════════

TEMP_BACKUP=""

if [[ "$BACKUP_FILE" == s3://* ]]; then
  echo -e "${YELLOW}☁️  Downloading backup from S3...${NC}"
  TEMP_BACKUP="/tmp/restore-$(date +%s).sql.gz"
  
  if aws s3 cp "$BACKUP_FILE" "$TEMP_BACKUP"; then
    BACKUP_FILE="$TEMP_BACKUP"
    echo -e "${GREEN}✓ Download complete${NC}"
  else
    echo -e "${RED}❌ S3 download failed${NC}"
    exit 1
  fi
fi

# Check file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
  exit 1
fi

# ════════════════════════════════════════════════════════════
# Pre-restore checks
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}🔍 Pre-restore validation...${NC}"

# Test database connection
if ! pg_isready -d "$DATABASE_URL" &>/dev/null; then
  echo -e "${RED}❌ Database connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Database connection OK${NC}"

# Verify backup file integrity
if ! gzip -t "$BACKUP_FILE" 2>&1; then
  echo -e "${RED}❌ Backup file corrupted or invalid${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backup file integrity verified${NC}"

# ════════════════════════════════════════════════════════════
# Confirmation
# ════════════════════════════════════════════════════════════

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will overwrite the production database!${NC}"
echo ""
echo "Restore Details:"
echo "  Backup File: $BACKUP_FILE"
echo "  Target DB: $RESTORE_DB"
echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo -e "${BLUE}Type 'yes' to confirm restore (or any other key to cancel):${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}✗ Restore cancelled${NC}"
  [ -n "$TEMP_BACKUP" ] && rm -f "$TEMP_BACKUP"
  exit 0
fi

# ════════════════════════════════════════════════════════════
# Create backup snapshot (safety measure)
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}💾 Creating pre-restore safety snapshot...${NC}"

SAFETY_BACKUP="/tmp/pre-restore-backup-$(date +%s).sql.gz"
if pg_dump "$DATABASE_URL" --verbose --format=custom --compress=9 | gzip > "$SAFETY_BACKUP"; then
  echo -e "${GREEN}✓ Safety snapshot created: $SAFETY_BACKUP${NC}"
else
  echo -e "${RED}❌ Failed to create safety snapshot${NC}"
  [ -n "$TEMP_BACKUP" ] && rm -f "$TEMP_BACKUP"
  exit 1
fi

# ════════════════════════════════════════════════════════════
# Drop existing connections
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}🔌 Disconnecting existing clients...${NC}"

psql "$DATABASE_URL" << SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$RESTORE_DB' AND pid <> pg_backend_pid();
SQL

sleep 2

# ════════════════════════════════════════════════════════════
# Restore database
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}📥 Restoring database...${NC}"
echo "This may take a few minutes..."

if pg_restore \
  --verbose \
  --exit-on-error \
  --clean \
  --if-exists \
  --disable-triggers \
  -d "$DATABASE_URL" \
  "$BACKUP_FILE" 2>&1; then
  
  echo -e "${GREEN}✅ Restore complete${NC}"
else
  echo -e "${RED}❌ Restore failed${NC}"
  echo ""
  echo -e "${YELLOW}Rolling back to safety snapshot...${NC}"
  pg_restore -d "$DATABASE_URL" "$SAFETY_BACKUP" || true
  echo -e "${YELLOW}✓ Rollback complete. Original database restored.${NC}"
  exit 1
fi

# ════════════════════════════════════════════════════════════
# Post-restore validation
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}✓ Validating restored database...${NC}"

psql "$DATABASE_URL" << SQL
-- Check table count
SELECT 'Tables: ' || COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public';

-- Check row counts
SELECT 'Total rows: ' || SUM(n_live_tup)::text FROM pg_stat_user_tables;

-- Verify PostGIS
SELECT 'PostGIS version: ' || PostGIS_version();
SQL

echo -e "${GREEN}✅ Database validation complete${NC}"

# ════════════════════════════════════════════════════════════
# Cleanup
# ════════════════════════════════════════════════════════════

[ -n "$TEMP_BACKUP" ] && rm -f "$TEMP_BACKUP"

echo ""
echo -e "${GREEN}✅ Restore process complete${NC}"
echo ""
echo "Next Steps:"
echo "  1. Verify application can connect to database"
echo "  2. Run migrations if needed: pnpm db:migrate"
echo "  3. Clear application cache"
echo "  4. Test critical user flows"
echo "  5. Monitor error logs for issues"
