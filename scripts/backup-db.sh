#!/bin/bash
set -euo pipefail

# ════════════════════════════════════════════════════════════
# PostgreSQL Production Database Backup Script
# ════════════════════════════════════════════════════════════

# Configuration
BACKUP_DIR="${BACKUP_DIR:=./backups}"
RETENTION_DAYS="${RETENTION_DAYS:=30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/imbobi-prod-$TIMESTAMP.sql.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ════════════════════════════════════════════════════════════
# Validation
# ════════════════════════════════════════════════════════════

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}❌ Error: DATABASE_URL environment variable not set${NC}"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# ════════════════════════════════════════════════════════════
# Pre-backup checks
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}🔍 Pre-backup validation...${NC}"

# Test database connection
if ! pg_isready -d "$DATABASE_URL" &>/dev/null; then
  echo -e "${RED}❌ Database connection failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Database connection OK${NC}"

# Check available disk space (need >2x DB size)
AVAILABLE_GB=$(($(df "$BACKUP_DIR" | tail -1 | awk '{print $4}') / 1024 / 1024))
if [ "$AVAILABLE_GB" -lt 5 ]; then
  echo -e "${YELLOW}⚠️  Warning: Only ${AVAILABLE_GB}GB available. Backup may fail.${NC}"
fi

# ════════════════════════════════════════════════════════════
# Create backup
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}📦 Creating backup: $BACKUP_FILE${NC}"

if pg_dump "$DATABASE_URL" \
  --verbose \
  --format=custom \
  --compress=9 \
  --blobs \
  --create \
  --no-owner \
  --no-privileges \
  2>&1 | gzip > "$BACKUP_FILE"; then
  
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✅ Backup complete: $BACKUP_SIZE${NC}"
else
  echo -e "${RED}❌ Backup failed${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ════════════════════════════════════════════════════════════
# Backup verification
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}✓ Verifying backup integrity...${NC}"

if gzip -t "$BACKUP_FILE" 2>&1; then
  echo -e "${GREEN}✓ Backup file integrity verified${NC}"
else
  echo -e "${RED}❌ Backup file corrupted${NC}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ════════════════════════════════════════════════════════════
# Upload to AWS S3 (if configured)
# ════════════════════════════════════════════════════════════

if command -v aws &> /dev/null && [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
  echo -e "${YELLOW}☁️  Uploading to S3...${NC}"
  
  if aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BACKUP_BUCKET}/backups/$(basename "$BACKUP_FILE")" \
    --sse AES256 \
    --storage-class STANDARD_IA \
    2>&1; then
    echo -e "${GREEN}✓ S3 upload complete${NC}"
  else
    echo -e "${RED}❌ S3 upload failed${NC}"
    exit 1
  fi
fi

# ════════════════════════════════════════════════════════════
# Cleanup old backups
# ════════════════════════════════════════════════════════════

echo -e "${YELLOW}🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)...${NC}"

find "$BACKUP_DIR" -name "imbobi-prod-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete

echo -e "${GREEN}✅ Backup process complete${NC}"
echo ""
echo "Backup Summary:"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "  Timestamp: $TIMESTAMP"
