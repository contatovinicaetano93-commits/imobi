#!/bin/bash
set -e

# Post-deployment configuration for imobi AWS infrastructure
# Executes after infrastructure is deployed and /tmp/imobi-aws-config.txt exists

CONFIG_FILE="/tmp/imobi-aws-config.txt"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
  log_error "Configuration file not found: $CONFIG_FILE"
  log_info "Run: bash scripts/deploy-aws-infrastructure.sh first"
  exit 1
fi

log_info "🚀 Starting post-deployment configuration..."

# Extract configuration from file
log_info "Extracting infrastructure details..."

RDS_ENDPOINT=$(grep "Endpoint:" "$CONFIG_FILE" | head -1 | sed 's/.*Endpoint: //' | tr -d ' ')
RDS_PASSWORD=$(grep "Password:" "$CONFIG_FILE" | head -1 | sed 's/.*Password: //' | tr -d ' ')
RDS_HOST=$(echo "$RDS_ENDPOINT" | cut -d: -f1)
RDS_PORT="5432"

REDIS_ENDPOINT=$(grep "Endpoint:" "$CONFIG_FILE" | tail -1 | sed 's/.*Endpoint: //' | tr -d ' ')
if [ "$REDIS_ENDPOINT" = "None" ]; then
  REDIS_ENDPOINT="pending"
fi
REDIS_HOST=$(echo "$REDIS_ENDPOINT" | cut -d: -f1)
REDIS_PORT="6379"

API_INSTANCE=$(grep "API Instance:" "$CONFIG_FILE" | awk '{print $3}')
API_IP=$(grep "API IP:" "$CONFIG_FILE" | awk '{print $3}')
WEB_INSTANCE=$(grep "Web Instance:" "$CONFIG_FILE" | awk '{print $3}')
WEB_IP=$(grep "Web IP:" "$CONFIG_FILE" | awk '{print $3}')

S3_BUCKET=$(grep "S3 Bucket:" "$CONFIG_FILE" | awk '{print $3}')
SSH_KEY_PATH=$(grep "Key Pair:" "$CONFIG_FILE" | awk '{print $3}')

log_success "Configuration extracted:"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  Redis Endpoint: $REDIS_ENDPOINT"
echo "  API Instance: $API_INSTANCE @ $API_IP"
echo "  Web Instance: $WEB_INSTANCE @ $WEB_IP"
echo "  S3 Bucket: $S3_BUCKET"
echo ""

# Create .env.production files
log_info "Creating environment files..."

# Root .env.production
cat > "$PROJECT_ROOT/.env.production" << EOF
# Production Environment
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="postgresql://postgres:${RDS_PASSWORD}@${RDS_HOST}:5432/imobi_prod?schema=public"

# Redis
REDIS_URL="redis://${REDIS_HOST}:6379"

# CORS
CORS_ORIGIN="http://${WEB_IP}:3000,http://${API_IP}:3001"

# API URLs
API_URL="http://${API_IP}:3001"
NEXT_PUBLIC_API_URL="http://${API_IP}:3001"

# JWT (Generate new secret in production)
JWT_SECRET="$(openssl rand -base64 32)"

# AWS S3
AWS_S3_BUCKET="${S3_BUCKET}"
AWS_S3_REGION="sa-east-1"
EOF

log_success ".env.production created"

# API .env.production
cat > "$PROJECT_ROOT/services/api/.env.production" << EOF
# NestJS API Production Environment
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="postgresql://postgres:${RDS_PASSWORD}@${RDS_HOST}:5432/imobi_prod?schema=public"

# Redis
REDIS_URL="redis://${REDIS_HOST}:6379"

# Security
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRATION=86400

# AWS S3
AWS_S3_BUCKET="${S3_BUCKET}"
AWS_S3_REGION="sa-east-1"

# CORS
CORS_ORIGIN="http://${WEB_IP}:3000"

# Logging
LOG_LEVEL="info"
EOF

log_success "services/api/.env.production created"

# Web .env.production
cat > "$PROJECT_ROOT/apps/web/.env.production" << EOF
# Next.js Web Production Environment
NEXT_PUBLIC_API_URL="http://${API_IP}:3001"
NODE_ENV=production
EOF

log_success "apps/web/.env.production created"

echo ""
log_info "📋 Next steps:"
echo ""
echo "1️⃣  Initialize database:"
echo "    PGPASSWORD='${RDS_PASSWORD}' psql -h ${RDS_HOST} -U postgres -d imobi_prod -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
echo ""
echo "2️⃣  Deploy API:"
echo "    bash scripts/deploy-api.sh ${API_IP} production"
echo ""
echo "3️⃣  Deploy Web:"
echo "    bash scripts/deploy-web.sh ${WEB_IP} http://${API_IP}:3001 production"
echo ""
echo "4️⃣  Run database migrations:"
echo "    pnpm db:migrate"
echo ""
echo "5️⃣  Verify services:"
echo "    curl -I http://${API_IP}:3001/health"
echo "    curl -I http://${WEB_IP}:3000"
echo ""
echo "Configuration files created successfully! ✨"
log_success "Post-deployment setup complete"
