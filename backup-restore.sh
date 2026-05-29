#!/bin/bash

set -e

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/imbobi_dev}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup function
backup() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/imbobi_backup_$timestamp.sql.gz"
  
  echo -e "${YELLOW}Creating database backup...${NC}"
  
  pg_dump "$DATABASE_URL" | gzip > "$backup_file"
  
  echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
  
  # List recent backups
  ls -lah "$BACKUP_DIR" | tail -5
}

# Restore function
restore() {
  if [ -z "$1" ]; then
    echo -e "${RED}❌ Backup file required${NC}"
    echo "Usage: $0 restore <backup_file>"
    exit 1
  fi
  
  local backup_file="$1"
  
  if [ ! -f "$backup_file" ]; then
    echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}Restoring from: $backup_file${NC}"
  echo -e "${YELLOW}This will overwrite the current database!${NC}"
  read -p "Continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
  fi
  
  gunzip < "$backup_file" | psql "$DATABASE_URL"
  
  echo -e "${GREEN}✅ Database restored successfully${NC}"
}

# Cleanup old backups
cleanup() {
  echo -e "${YELLOW}Cleaning up backups older than $RETENTION_DAYS days...${NC}"
  
  find "$BACKUP_DIR" -name "imbobi_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
  
  echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# List backups
list() {
  echo -e "${YELLOW}Available backups:${NC}"
  ls -lh "$BACKUP_DIR"/imbobi_backup_*.sql.gz 2>/dev/null || echo "No backups found"
}

# Main
case "${1:-backup}" in
  backup)
    backup
    cleanup
    ;;
  restore)
    restore "$2"
    ;;
  cleanup)
    cleanup
    ;;
  list)
    list
    ;;
  *)
    echo "Usage: $0 {backup|restore|cleanup|list}"
    exit 1
    ;;
esac
