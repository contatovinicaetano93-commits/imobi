#!/bin/bash
set -euo pipefail

STAGING_ENV="staging"
API_HOST="staging-api.imbobi.com"
API_URL="https://${API_HOST}"
DEPLOYMENT_DATE=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
LOG_FILE="staging-deploy-${DEPLOYMENT_DATE// /_}.log"

echo "🚀 Iniciando deployment para staging..." | tee -a "$LOG_FILE"
echo "Timestamp: $DEPLOYMENT_DATE" | tee -a "$LOG_FILE"

# ============================================================================
# 1. Load Environment
# ============================================================================
if [ ! -f .env.staging ]; then
    echo "❌ Arquivo .env.staging não encontrado" | tee -a "$LOG_FILE"
    exit 1
fi

export $(grep -v '^#' .env.staging | xargs)

# ============================================================================
# 2. Build
# ============================================================================
echo "🏗️  Building application..." | tee -a "$LOG_FILE"

# Type check
pnpm type-check 2>&1 | tee -a "$LOG_FILE" || {
    echo "❌ Type check failed" | tee -a "$LOG_FILE"
    exit 1
}

# Build all packages
pnpm build 2>&1 | tee -a "$LOG_FILE" || {
    echo "❌ Build failed" | tee -a "$LOG_FILE"
    exit 1
}

echo "✓ Build concluído" | tee -a "$LOG_FILE"

# ============================================================================
# 3. Database Migrations
# ============================================================================
echo "🗄️  Rodando Prisma migrations..." | tee -a "$LOG_FILE"

# Backup current schema
BACKUP_FILE="prisma/schema-backup-$(date +%s).prisma"
cp services/api/prisma/schema.prisma "$BACKUP_FILE"
echo "✓ Schema backup: $BACKUP_FILE" | tee -a "$LOG_FILE"

# Run migrations
cd services/api
DATABASE_URL="${DATABASE_URL}" pnpm prisma migrate deploy 2>&1 | tee -a "../../$LOG_FILE" || {
    echo "❌ Migration failed - ROLLBACK NECESSÁRIO" | tee -a "../../$LOG_FILE"
    echo "Backup em: $BACKUP_FILE" | tee -a "../../$LOG_FILE"
    cd - > /dev/null
    exit 1
}
cd - > /dev/null

echo "✓ Migrations concluídas" | tee -a "$LOG_FILE"

# ============================================================================
# 4. Start Services (Docker)
# ============================================================================
echo "🐳 Starting Docker services..." | tee -a "$LOG_FILE"

# API Container
API_IMAGE="imbobi-api:staging-$(git rev-parse --short HEAD)"
CONTAINER_NAME="imbobi-api-staging"

# Stop existing container
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Run new container
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p 4000:4000 \
    --env-file .env.staging \
    --network imbobi_network \
    "$API_IMAGE" \
    2>&1 | tee -a "$LOG_FILE"

echo "✓ Container iniciado: $CONTAINER_NAME" | tee -a "$LOG_FILE"

# ============================================================================
# 5. Health Checks
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "🏥 Rodando health checks..." | tee -a "$LOG_FILE"

bash scripts/staging-health-check.sh "$API_URL" 2>&1 | tee -a "$LOG_FILE" || {
    echo "❌ Health checks falharam" | tee -a "$LOG_FILE"
    docker logs "$CONTAINER_NAME" | tail -50 >> "$LOG_FILE"
    exit 1
}

echo "" | tee -a "$LOG_FILE"
echo "✅ Deployment concluído com sucesso!" | tee -a "$LOG_FILE"
echo "📊 Log: $LOG_FILE" | tee -a "$LOG_FILE"
