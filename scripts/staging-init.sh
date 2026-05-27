#!/bin/bash
set -euo pipefail

STAGING_ENV="staging"
REGION="us-east-1"
BUCKET_NAME="imbobi-staging-evidencias"
DB_NAME="imbobi_staging"
DB_USER="imbobi_staging"
REDIS_NAME="staging-redis"

echo "🚀 Iniciando setup de staging..."

# ============================================================================
# 1. AWS S3 Bucket
# ============================================================================
echo "📦 Validando S3 bucket..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "✓ Bucket $BUCKET_NAME já existe"
else
    echo "Criando bucket $BUCKET_NAME..."
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION" || true

    # Versioning
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled

    # Encryption
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'

    echo "✓ Bucket criado com versioning e encryption"
fi

# ============================================================================
# 2. RDS PostgreSQL (com PostGIS)
# ============================================================================
echo "🗄️  Validando RDS PostgreSQL..."
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "imbobi-staging-db" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text 2>/dev/null || echo "")

if [ "$DB_ENDPOINT" != "" ] && [ "$DB_ENDPOINT" != "None" ]; then
    echo "✓ RDS disponível: $DB_ENDPOINT"
else
    echo "❌ RDS não encontrado. Crie manualmente:"
    echo "  • Engine: PostgreSQL 15"
    echo "  • PostGIS extension habilitada"
    echo "  • VPC security group configurado"
    exit 1
fi

# ============================================================================
# 3. ElastiCache Redis
# ============================================================================
echo "⚡ Validando ElastiCache Redis..."
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$REDIS_NAME" \
    --show-cache-node-info \
    --query 'CacheClusters[0].CacheNodes[0].Address' \
    --output text 2>/dev/null || echo "")

if [ "$REDIS_ENDPOINT" != "" ] && [ "$REDIS_ENDPOINT" != "None" ]; then
    echo "✓ Redis disponível: $REDIS_ENDPOINT"
else
    echo "⚠️  Redis não encontrado. Crie manualmente ou use local Redis"
fi

# ============================================================================
# 4. Firebase Project
# ============================================================================
echo "🔥 Validando Firebase..."
FIREBASE_PROJECT=$(firebase projects:list --json 2>/dev/null | jq -r '.[] | select(.projectId == "imbobi-staging") | .projectId' || echo "")

if [ "$FIREBASE_PROJECT" = "imbobi-staging" ]; then
    echo "✓ Firebase project encontrado"
else
    echo "❌ Firebase project 'imbobi-staging' não encontrado"
fi

# ============================================================================
# 5. Validar SendGrid API
# ============================================================================
echo "📧 Validando SendGrid..."
if [ -z "${SENDGRID_API_KEY:-}" ]; then
    echo "❌ SENDGRID_API_KEY não configurado"
    exit 1
fi

SENDGRID_CHECK=$(curl -s https://api.sendgrid.com/v3/mail/validate \
    -X POST \
    -H "Authorization: Bearer $SENDGRID_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@imbobi.com"}' | jq -r '.is_valid_email' 2>/dev/null || echo "error")

if [ "$SENDGRID_CHECK" != "error" ]; then
    echo "✓ SendGrid API valid"
else
    echo "❌ SendGrid API key inválido"
    exit 1
fi

# ============================================================================
# 6. Secrets no GitHub / CI/CD
# ============================================================================
echo "🔐 Verificando secrets no GitHub..."
REQUIRED_SECRETS=(
    "STAGING_DATABASE_URL"
    "STAGING_REDIS_HOST"
    "STAGING_JWT_SECRET"
    "STAGING_ENCRYPTION_SECRET"
    "STAGING_AWS_ACCESS_KEY_ID"
    "STAGING_AWS_SECRET_ACCESS_KEY"
    "STAGING_SENDGRID_API_KEY"
    "STAGING_FIREBASE_PRIVATE_KEY"
)

MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! gh secret list --json name --jq '.[].name' 2>/dev/null | grep -q "^${secret}$"; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
    echo "✓ Todos os secrets configurados"
else
    echo "❌ Secrets faltando: ${MISSING_SECRETS[*]}"
    echo "Adicione com: gh secret set SECRET_NAME"
    exit 1
fi

echo ""
echo "✅ Setup validado com sucesso!"
echo ""
echo "Próximos passos:"
echo "  1. Adicionar secrets faltantes: gh secret set <name>"
echo "  2. Rodar: bash scripts/staging-deploy.sh"
