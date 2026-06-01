#!/bin/bash
set -e

echo "🔑 Secret Rotation Utility for imobi"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="${HOME}/.imbobi-secrets-backup"
BACKUP_TIME=$(date +%Y%m%d_%H%M%S)

# Generate secure random string
generate_secret() {
  local length=${1:-32}
  openssl rand -base64 "$length" | tr -d '\n'
}

# Backup existing secrets
backup_secrets() {
  echo -e "${YELLOW}[1/4]${NC} Backing up existing secrets..."
  mkdir -p "$BACKUP_DIR"

  if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/.env.backup.$BACKUP_TIME"
    echo -e "${GREEN}✓${NC} Backed up .env to $BACKUP_DIR/.env.backup.$BACKUP_TIME"
  fi

  if [ -f ".env.production" ]; then
    cp .env.production "$BACKUP_DIR/.env.production.backup.$BACKUP_TIME"
    echo -e "${GREEN}✓${NC} Backed up .env.production"
  fi
}

# Rotate JWT Secret
rotate_jwt_secret() {
  echo -e "${YELLOW}[2/4]${NC} Rotating JWT_SECRET..."

  local new_jwt=$(generate_secret 64)

  # Update .env files
  if [ -f ".env" ]; then
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$new_jwt/" .env
  fi

  if [ -f ".env.production" ]; then
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$new_jwt/" .env.production
  fi

  echo -e "${GREEN}✓${NC} JWT_SECRET rotated"
  echo "  New JWT_SECRET length: ${#new_jwt}"
}

# Rotate Encryption Key
rotate_encryption_key() {
  echo -e "${YELLOW}[3/4]${NC} Rotating ENCRYPTION_KEY..."

  local new_encryption=$(openssl rand -base64 32)

  if [ -f ".env" ]; then
    sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$new_encryption/" .env
  fi

  if [ -f ".env.production" ]; then
    sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$new_encryption/" .env.production
  fi

  echo -e "${GREEN}✓${NC} ENCRYPTION_KEY rotated"
  echo "  New ENCRYPTION_KEY created (32-byte base64)"
}

# Rotate Database Password
rotate_db_password() {
  echo -e "${YELLOW}[4/4]${NC} Rotating Database Password..."

  local new_db_pass=$(generate_secret 24)

  # In production, you'd also update the actual database password
  # For now, just update the connection string

  if [ -f ".env" ]; then
    # Extract current DATABASE_URL
    local current_url=$(grep "DATABASE_URL" .env | cut -d'=' -f2-)
    if [[ $current_url == *"@"* ]]; then
      local new_url=$(echo "$current_url" | sed "s/:.*@/:$new_db_pass@/")
      sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$new_url|" .env
    fi
  fi

  if [ -f ".env.production" ]; then
    local current_url=$(grep "DATABASE_URL" .env.production | cut -d'=' -f2-)
    if [[ $current_url == *"@"* ]]; then
      local new_url=$(echo "$current_url" | sed "s/:.*@/:$new_db_pass@/")
      sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$new_url|" .env.production
    fi
  fi

  echo -e "${GREEN}✓${NC} Database password rotated"
  echo "  Note: Remember to update the actual database user password:"
  echo "    ALTER USER postgres WITH PASSWORD '$new_db_pass';"
}

# Verify new secrets
verify_secrets() {
  echo -e "\n${YELLOW}Verification${NC}"
  echo "======================================"

  local checks_passed=0
  local checks_failed=0

  # Check JWT_SECRET length
  if [ -f ".env" ]; then
    local jwt=$(grep "JWT_SECRET=" .env | cut -d'=' -f2-)
    if [ ${#jwt} -ge 64 ]; then
      echo -e "${GREEN}✓${NC} JWT_SECRET is secure (${#jwt} chars)"
      checks_passed=$((checks_passed + 1))
    else
      echo -e "${RED}✗${NC} JWT_SECRET is too short (${#jwt} chars, need >= 64)"
      checks_failed=$((checks_failed + 1))
    fi

    local encryption=$(grep "ENCRYPTION_KEY=" .env | cut -d'=' -f2-)
    if [ -n "$encryption" ]; then
      echo -e "${GREEN}✓${NC} ENCRYPTION_KEY is set"
      checks_passed=$((checks_passed + 1))
    else
      echo -e "${RED}✗${NC} ENCRYPTION_KEY is missing"
      checks_failed=$((checks_failed + 1))
    fi
  fi

  echo -e "\n${YELLOW}Backup Location${NC}"
  echo "======================================"
  echo "Secrets backed up to: $BACKUP_DIR"
  ls -lh "$BACKUP_DIR" | tail -5
}

# Main execution
main() {
  echo "This will rotate your application secrets."
  echo "A backup will be created before any changes."
  echo ""
  read -p "Continue? (y/N) " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    backup_secrets
    rotate_jwt_secret
    rotate_encryption_key
    rotate_db_password
    verify_secrets

    echo -e "\n${GREEN}✅ Secret rotation complete!${NC}"
    echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
    echo "  1. Update database user password in PostgreSQL"
    echo "  2. Invalidate all existing user sessions (optional but recommended)"
    echo "  3. Deploy changes to staging/production"
    echo "  4. Monitor application logs for any issues"
  else
    echo "Rotation cancelled"
  fi
}

main
