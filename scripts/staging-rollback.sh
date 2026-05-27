#!/bin/bash
set -euo pipefail

CONTAINER_NAME="imbobi-api-staging"
BACKUP_DIR="/var/backups/imbobi-staging"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
LOG_FILE="staging-rollback-${TIMESTAMP// /_}.log"

echo "🔄 Iniciando rollback de staging..." | tee -a "$LOG_FILE"
echo "Timestamp: $TIMESTAMP" | tee -a "$LOG_FILE"

echo "🛑 Pausando tráfego..." | tee -a "$LOG_FILE"
docker pause "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE" || true

echo "" | tee -a "$LOG_FILE"
echo "🗄️  Revertendo migrations do Prisma..." | tee -a "$LOG_FILE"

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/schema-backup-*.prisma 2>/dev/null | head -1 || echo "")

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ Nenhum backup de schema encontrado!" | tee -a "$LOG_FILE"
    echo "Continuando com rollback de container apenas..." | tee -a "$LOG_FILE"
else
    echo "Usando backup: $LATEST_BACKUP" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "🐳 Restaurando versão anterior do container..." | tee -a "$LOG_FILE"

PREVIOUS_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" \
    | grep "imbobi-api:staging" \
    | grep -v "latest" \
    | sort -k2 -r \
    | head -2 \
    | tail -1 \
    | awk '{print $1}' || echo "")

if [ -z "$PREVIOUS_IMAGE" ]; then
    echo "❌ Nenhuma versão anterior encontrada!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "Versão anterior: $PREVIOUS_IMAGE" | tee -a "$LOG_FILE"

docker stop "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE" || true
docker rm "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE" || true

docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p 4000:4000 \
    --env-file .env.staging \
    --network imbobi_network \
    "$PREVIOUS_IMAGE" \
    2>&1 | tee -a "$LOG_FILE"

echo "✓ Container restaurado" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "🏥 Validando rollback..." | tee -a "$LOG_FILE"

sleep 5

API_URL="https://staging-api.imbobi.com"
for i in {1..10}; do
    if curl -s -f "$API_URL/api/v1/health" > /dev/null 2>&1; then
        echo "✓ API health OK" | tee -a "$LOG_FILE"
        break
    fi
    
    if [ "$i" -lt 10 ]; then
        echo "  Retry $i/10..." | tee -a "$LOG_FILE"
        sleep 3
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "✅ Rollback completado!" | tee -a "$LOG_FILE"
echo "📊 Log: $LOG_FILE" | tee -a "$LOG_FILE"
