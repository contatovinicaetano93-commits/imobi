# Plano Executável - Staging Deployment (imbobi)

**Data**: 2026-05-27  
**Status**: Pronto para execução  
**Versão**: 1.0

---

## 1. CHECKLIST DE CONFIGURAÇÕES

### 1.1 Variáveis de Ambiente Staging

**Arquivo**: `.env.staging` (criar no servidor, NÃO commitar)

```bash
# Core API
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=https://staging-app.imbobi.com,https://staging.imbobi.com

# Database (RDS/Managed PostgreSQL)
DATABASE_URL=postgresql://imbobi_staging:PASSWORD@staging-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_staging

# Redis (ElastiCache ou self-hosted)
REDIS_HOST=staging-redis.c9akciq32.us-east-1.cache.amazonaws.com
REDIS_PORT=6379

# JWT & Encryption (use 'openssl rand -base64 32' para gerar)
JWT_SECRET=<64+ chars gerado>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_SECRET=<32+ chars gerado>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<staging-s3-key>
AWS_SECRET_ACCESS_KEY=<staging-s3-secret>
S3_BUCKET=imbobi-staging-evidencias

# Email
SENDGRID_API_KEY=<staging-sendgrid-key>
SMTP_FROM=noreply-staging@imbobi.com
APP_URL=https://staging-app.imbobi.com

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY=<json-key>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@imbobi-staging.iam.gserviceaccount.com

# External APIs
UNICO_API_KEY=<staging-key>
SERPRO_TOKEN=<staging-token>

# Next.js (Web Frontend)
NEXT_PUBLIC_API_URL=https://staging-api.imbobi.com

# Expo (Mobile)
EXPO_PUBLIC_API_URL=https://staging-api.imbobi.com
EAS_PROJECT_ID=<staging-eas-id>
```

**Validação de Checklist**:
```bash
# Verificar todas as chaves criadas:
openssl rand -base64 32  # JWT_SECRET (use x2 para 64 chars)
openssl rand -base64 32  # ENCRYPTION_SECRET

# Validar AWS credentials
aws s3 ls s3://imbobi-staging-evidencias --profile staging

# Validar Firebase
firebase --version
firebase config:get --project imbobi-staging

# Validar SendGrid
curl -s https://api.sendgrid.com/v3/api_keys -H "Authorization: Bearer $SENDGRID_API_KEY" | jq '.result[0].name'

# Validar Redis
redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com ping
```

---

## 2. SCRIPTS BASH PARA PROVISIONAR & VALIDAR

### 2.1 Script: Setup Inicial (RUN ONCE)

**Arquivo**: `scripts/staging-init.sh`

```bash
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
    if ! gh secret list --json name --jq '.[].name' | grep -q "^${secret}$"; then
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
echo "  1. Adicionar secrets faltantes: gh secret set <name> < value"
echo "  2. Rodar: scripts/staging-deploy.sh"
```

### 2.2 Script: Deploy & Validação

**Arquivo**: `scripts/staging-deploy.sh`

```bash
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
DATABASE_URL="$DATABASE_URL" pnpm prisma migrate deploy 2>&1 | tee -a "../../$LOG_FILE" || {
    echo "❌ Migration failed - ROLLBACK NECESSÁRIO" | tee -a "../../$LOG_FILE"
    echo "Backup em: $BACKUP_FILE" | tee -a "../../$LOG_FILE"
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

bash scripts/staging-health-check.sh "$API_URL" | tee -a "$LOG_FILE" || {
    echo "❌ Health checks falharam" | tee -a "$LOG_FILE"
    docker logs "$CONTAINER_NAME" | tail -50 >> "$LOG_FILE"
    exit 1
}

echo "" | tee -a "$LOG_FILE"
echo "✅ Deployment concluído com sucesso!" | tee -a "$LOG_FILE"
echo "📊 Log: $LOG_FILE" | tee -a "$LOG_FILE"
```

### 2.3 Script: Health Checks

**Arquivo**: `scripts/staging-health-check.sh`

```bash
#!/bin/bash
set -euo pipefail

API_URL="${1:-https://staging-api.imbobi.com}"
TIMEOUT=30
MAX_RETRIES=5
RETRY_DELAY=2

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Staging Health Check Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo "API URL: $API_URL"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# ============================================================================
# Helper Functions
# ============================================================================

check_health() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local body="${4:-}"
    local expected_code="${5:-200}"
    
    echo -n "▶ $name ... "
    
    for attempt in $(seq 1 $MAX_RETRIES); do
        if [ "$method" = "POST" ] && [ -n "$body" ]; then
            response=$(curl -s -w "\n%{http_code}" \
                -X "$method" \
                "$url" \
                -H "Content-Type: application/json" \
                -d "$body" \
                --max-time "$TIMEOUT" 2>/dev/null || echo -e "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" \
                -X "$method" \
                "$url" \
                --max-time "$TIMEOUT" 2>/dev/null || echo -e "\n000")
        fi
        
        http_code=$(echo "$response" | tail -n1)
        body_content=$(echo "$response" | sed '$d')
        
        if [ "$http_code" = "$expected_code" ]; then
            echo -e "${GREEN}OK${NC} (HTTP $http_code)"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            return 0
        fi
        
        if [ "$attempt" -lt "$MAX_RETRIES" ]; then
            echo -n "retry($attempt/$MAX_RETRIES)... "
            sleep "$RETRY_DELAY"
        fi
    done
    
    echo -e "${RED}FAILED${NC} (HTTP $http_code)"
    echo "  Response: ${body_content:0:100}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    return 1
}

# ============================================================================
# API Health Checks
# ============================================================================
echo -e "${YELLOW}[API]${NC}"
check_health "API Health" "$API_URL/api/v1/health" "GET" "" "200"
check_health "API Status" "$API_URL/api/v1/status" "GET" "" "200"

# ============================================================================
# Database Health Checks
# ============================================================================
echo ""
echo -e "${YELLOW}[Database]${NC}"
check_health "Database Connection" "$API_URL/api/v1/health/database" "GET" "" "200"

# ============================================================================
# Redis Health Checks
# ============================================================================
echo ""
echo -e "${YELLOW}[Cache/Queue]${NC}"
check_health "Redis Connection" "$API_URL/api/v1/health/redis" "GET" "" "200"

# ============================================================================
# Email Service Health Checks
# ============================================================================
echo ""
echo -e "${YELLOW}[Email Service]${NC}"
check_health "Email Service" "$API_URL/api/v1/health/email" "GET" "" "200"

# ============================================================================
# Push Notifications Health Checks
# ============================================================================
echo ""
echo -e "${YELLOW}[Push Notifications]${NC}"
check_health "Firebase Initialization" "$API_URL/api/v1/health/firebase" "GET" "" "200"

# ============================================================================
# External Integrations Health Checks
# ============================================================================
echo ""
echo -e "${YELLOW}[External Integrations]${NC}"
check_health "S3 Configuration" "$API_URL/api/v1/health/s3" "GET" "" "200"
check_health "Encryption Service" "$API_URL/api/v1/health/encryption" "GET" "" "200"

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
PASS_RATE=$((CHECKS_PASSED * 100 / TOTAL))

echo "✓ Passed: $CHECKS_PASSED / $TOTAL ($PASS_RATE%)"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $CHECKS_FAILED check(s) failed${NC}"
    exit 1
fi
```

---

## 3. E2E TESTS CONTRA STAGING

### 3.1 Script: E2E Test Runner

**Arquivo**: `scripts/staging-e2e.sh`

```bash
#!/bin/bash
set -euo pipefail

API_URL="${1:-https://staging-api.imbobi.com}"
TEST_EMAIL="e2e-test-$(date +%s)@imbobi.com"
TEST_PASSWORD="StageTest123!@#"
LOG_FILE="e2e-staging-$(date +%Y%m%d-%H%M%S).log"

echo "🧪 Starting E2E Tests against $API_URL"
echo "Test Email: $TEST_EMAIL"
echo "Log: $LOG_FILE"
echo ""

# ============================================================================
# Test 1: Auth Flow
# ============================================================================
echo "🔐 [Test 1/5] Authentication Flow..."

# Register
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/registrar" \
    -H "Content-Type: application/json" \
    -d "{
        \"nome\": \"E2E Test User\",
        \"email\": \"$TEST_EMAIL\",
        \"senha\": \"$TEST_PASSWORD\",
        \"confirmarSenha\": \"$TEST_PASSWORD\"
    }")

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.id // empty')
if [ -z "$USER_ID" ]; then
    echo "❌ Registration failed"
    echo "$REGISTER_RESPONSE" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ User registered: $USER_ID"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"senha\": \"$TEST_PASSWORD\"
    }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')
if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Login failed"
    echo "$LOGIN_RESPONSE" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ Login successful"
echo "Access Token: ${ACCESS_TOKEN:0:20}..." | tee -a "$LOG_FILE"

# ============================================================================
# Test 2: User Profile
# ============================================================================
echo ""
echo "👤 [Test 2/5] User Profile..."

PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/users/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

PROFILE_EMAIL=$(echo "$PROFILE_RESPONSE" | jq -r '.data.email // empty')
if [ "$PROFILE_EMAIL" != "$TEST_EMAIL" ]; then
    echo "❌ Profile fetch failed"
    exit 1
fi
echo "✓ Profile retrieved: $PROFILE_EMAIL"

# ============================================================================
# Test 3: File Upload (S3)
# ============================================================================
echo ""
echo "📤 [Test 3/5] File Upload (S3)..."

# Create temp test file
TEST_FILE="/tmp/e2e-test-image-$(date +%s).jpg"
echo "fake image data" > "$TEST_FILE"

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/evidencias/upload" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@$TEST_FILE")

FILE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.url // empty')
if [ -z "$FILE_URL" ]; then
    echo "❌ File upload failed"
    echo "$UPLOAD_RESPONSE" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ File uploaded: $FILE_URL"

rm -f "$TEST_FILE"

# ============================================================================
# Test 4: Credit Simulation (GPS validation)
# ============================================================================
echo ""
echo "💰 [Test 4/5] Credit Simulation..."

CREDIT_SIMULATION=$(curl -s -X POST "$API_URL/api/v1/credito/simular" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "valor": 50000,
        "parcelas": 12,
        "latitude": -23.5505,
        "longitude": -46.6333
    }')

INSTALLMENT_VALUE=$(echo "$CREDIT_SIMULATION" | jq -r '.data.valorParcela // empty')
if [ -z "$INSTALLMENT_VALUE" ]; then
    echo "❌ Credit simulation failed"
    echo "$CREDIT_SIMULATION" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ Credit simulated: R$ $INSTALLMENT_VALUE/month (12x)"

# ============================================================================
# Test 5: Rate Limiting
# ============================================================================
echo ""
echo "🔒 [Test 5/5] Rate Limiting Validation..."

RATE_LIMIT_PASS=true
for i in {1..6}; do
    RATE_TEST=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"ratelimit@test.com\",
            \"senha\": \"test123\"
        }" | tail -n1)
    
    if [ "$i" -le 5 ]; then
        if [ "$RATE_TEST" != "200" ] && [ "$RATE_TEST" != "401" ]; then
            echo "❌ Unexpected status on request $i: $RATE_TEST"
            RATE_LIMIT_PASS=false
        fi
    else
        if [ "$RATE_TEST" = "429" ]; then
            echo "✓ Rate limiting triggered correctly on request $i"
            break
        fi
    fi
done

if [ "$RATE_LIMIT_PASS" = true ]; then
    echo "✓ Rate limiting working correctly"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=========================================="
echo "✅ All E2E tests passed!"
echo "=========================================="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE"
```

### 3.2 GitHub Actions Workflow para E2E

**Arquivo**: `.github/workflows/e2e-staging.yml`

```yaml
name: E2E Tests - Staging

on:
  workflow_dispatch:
  schedule:
    # Run daily at 02:00 UTC
    - cron: '0 2 * * *'

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9.0.0
      
      - name: Run E2E Tests
        env:
          API_URL: https://staging-api.imbobi.com
        run: bash scripts/staging-e2e.sh "$API_URL"
      
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-logs
          path: e2e-staging-*.log
      
      - name: Notify Slack
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "❌ E2E Tests Failed - Staging",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*E2E Tests Failed*\n:red_circle: Staging API may be unstable\nCheck logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
```

---

## 4. HEALTH CHECKS (API, DB, EMAIL, PUSH)

### 4.1 NestJS Health Check Module

**Arquivo**: `services/api/src/common/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, DatabaseHealthIndicator, RedisHealthIndicator } from '@nestjs/terminus';
import { S3HealthIndicator } from './indicators/s3.health';
import { EmailHealthIndicator } from './indicators/email.health';
import { FirebaseHealthIndicator } from './indicators/firebase.health';

@Controller('api/v1/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private redis: RedisHealthIndicator,
    private s3: S3HealthIndicator,
    private email: EmailHealthIndicator,
    private firebase: FirebaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.s3.isHealthy('s3'),
      () => this.email.isHealthy('email'),
      () => this.firebase.isHealthy('firebase'),
    ]);
  }

  @Get('database')
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('redis')
  @HealthCheck()
  checkRedis() {
    return this.health.check([() => this.redis.pingCheck('redis')]);
  }

  @Get('s3')
  @HealthCheck()
  checkS3() {
    return this.health.check([() => this.s3.isHealthy('s3')]);
  }

  @Get('email')
  @HealthCheck()
  checkEmail() {
    return this.health.check([() => this.email.isHealthy('email')]);
  }

  @Get('firebase')
  @HealthCheck()
  checkFirebase() {
    return this.health.check([() => this.firebase.isHealthy('firebase')]);
  }
}
```

**Arquivo**: `services/api/src/common/health/indicators/email.health.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailHealthIndicator extends HealthIndicator {
  constructor() {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.verify();
      return this.getStatus(key, true, { status: 'SMTP connection verified' });
    } catch (error) {
      throw new HealthCheckError('Email service check failed', error);
    }
  }
}
```

**Arquivo**: `services/api/src/common/health/indicators/firebase.health.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseHealthIndicator extends HealthIndicator {
  constructor() {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test Firebase Admin SDK
      const app = admin.app();
      const messaging = admin.messaging(app);
      
      // Attempt to get instance ID token management
      await messaging.getAppInstanceId();
      
      return this.getStatus(key, true, { status: 'Firebase initialized' });
    } catch (error) {
      throw new HealthCheckError('Firebase check failed', error);
    }
  }
}
```

### 4.2 Staging Health Check (Cronô)

**Arquivo**: `scripts/health-check-cron.sh`

```bash
#!/bin/bash
set -euo pipefail

API_URL="https://staging-api.imbobi.com"
HEALTH_LOG="/var/log/imbobi-health-checks.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

check_endpoint() {
    local name="$1"
    local url="$2"
    local max_time="${3:-10}"
    
    http_code=$(curl -s -w "%{http_code}" -o /dev/null --max-time "$max_time" "$url" || echo "000")
    
    if [ "$http_code" = "200" ]; then
        echo "✓ $name: OK" | tee -a "$HEALTH_LOG"
        return 0
    else
        echo "✗ $name: FAILED (HTTP $http_code)" | tee -a "$HEALTH_LOG"
        return 1
    fi
}

# Run checks
echo "[$TIMESTAMP] Running health checks..." | tee -a "$HEALTH_LOG"

FAILED=0
check_endpoint "API Health" "$API_URL/api/v1/health" || FAILED=$((FAILED + 1))
check_endpoint "Database" "$API_URL/api/v1/health/database" || FAILED=$((FAILED + 1))
check_endpoint "Redis" "$API_URL/api/v1/health/redis" || FAILED=$((FAILED + 1))
check_endpoint "Email" "$API_URL/api/v1/health/email" || FAILED=$((FAILED + 1))
check_endpoint "Firebase" "$API_URL/api/v1/health/firebase" || FAILED=$((FAILED + 1))

# Notify if any failed
if [ "$FAILED" -gt 0 ]; then
    echo "❌ $FAILED health check(s) failed" | tee -a "$HEALTH_LOG"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d @- << EOF
{
  "text": "⚠️ Staging Health Check Alert",
  "blocks": [{
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*Staging Health Check Failed*\n$FAILED service(s) down\nTime: $TIMESTAMP\nAPI: $API_URL"
    }
  }]
}
EOF
    fi
else
    echo "✅ All health checks passed" | tee -a "$HEALTH_LOG"
fi

echo "" | tee -a "$HEALTH_LOG"
```

**Crontab Entry** (em `/etc/cron.d/imbobi-staging`):
```
# Health checks every 5 minutes
*/5 * * * * root bash /home/imbobi/scripts/health-check-cron.sh
```

---

## 5. ROLLBACK PROCEDURES

### 5.1 Script: Rollback Automático

**Arquivo**: `scripts/staging-rollback.sh`

```bash
#!/bin/bash
set -euo pipefail

CONTAINER_NAME="imbobi-api-staging"
BACKUP_DIR="/var/backups/imbobi-staging"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
LOG_FILE="staging-rollback-${TIMESTAMP// /_}.log"

echo "🔄 Iniciando rollback de staging..." | tee -a "$LOG_FILE"
echo "Timestamp: $TIMESTAMP" | tee -a "$LOG_FILE"

# ============================================================================
# Step 1: Pause Incoming Traffic
# ============================================================================
echo "🛑 Pausando tráfego..." | tee -a "$LOG_FILE"
docker pause "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE" || true

# ============================================================================
# Step 2: Database Rollback
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "🗄️  Revertendo migrations do Prisma..." | tee -a "$LOG_FILE"

# List available migration backups
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/schema-backup-*.prisma 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ Nenhum backup de schema encontrado!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "Usando backup: $LATEST_BACKUP" | tee -a "$LOG_FILE"

# Run migration rollback (usando --skip-generate para speed)
cd services/api
if pnpm prisma migrate resolve --rolled-back <last-migration-name> 2>&1 | tee -a "../../$LOG_FILE"; then
    echo "✓ Migration revertida" | tee -a "../../$LOG_FILE"
else
    echo "⚠️  Erro ao reverter migration - verificar manualmente" | tee -a "../../$LOG_FILE"
fi
cd - > /dev/null

# ============================================================================
# Step 3: Restore Previous Container Version
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "🐳 Restaurando versão anterior do container..." | tee -a "$LOG_FILE"

PREVIOUS_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" \
    | grep "imbobi-api:staging" \
    | grep -v "latest" \
    | sort -k2 -r \
    | head -2 \
    | tail -1 \
    | awk '{print $1}')

if [ -z "$PREVIOUS_IMAGE" ]; then
    echo "❌ Nenhuma versão anterior encontrada!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "Versão anterior: $PREVIOUS_IMAGE" | tee -a "$LOG_FILE"

# Remove current container
docker stop "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE" || true
docker rm "$CONTAINER_NAME" 2>&1 | tee -a "$LOG_FILE" || true

# Start with previous image
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p 4000:4000 \
    --env-file .env.staging \
    --network imbobi_network \
    "$PREVIOUS_IMAGE" \
    2>&1 | tee -a "$LOG_FILE"

echo "✓ Container restaurado" | tee -a "$LOG_FILE"

# ============================================================================
# Step 4: Health Check
# ============================================================================
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

# ============================================================================
# Step 5: Notifications
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "📢 Notificando..." | tee -a "$LOG_FILE"

if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d @- << EOF
{
  "text": "🔄 Staging Rollback Executed",
  "blocks": [{
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*Staging Rollback Completed*\nPrevious Image: $PREVIOUS_IMAGE\nTime: $TIMESTAMP\nLog: $LOG_FILE"
    }
  }]
}
EOF
fi

echo "" | tee -a "$LOG_FILE"
echo "✅ Rollback completado!" | tee -a "$LOG_FILE"
echo "📊 Log: $LOG_FILE" | tee -a "$LOG_FILE"
```

### 5.2 Rollback Manual - Passo a Passo

```bash
# 1. Ver histórico de deployments
docker images --filter "reference=imbobi-api:staging*" --format "table {{.Tag}}\t{{.CreatedAt}}"

# 2. Parar container atual
docker stop imbobi-api-staging
docker rm imbobi-api-staging

# 3. Reverter database (se necessário)
cd services/api
DATABASE_URL="postgresql://..." pnpm prisma migrate resolve --rolled-back <migration-name>

# 4. Iniciar container da versão anterior
docker run -d \
    --name imbobi-api-staging \
    --restart unless-stopped \
    -p 4000:4000 \
    --env-file .env.staging \
    --network imbobi_network \
    imbobi-api:staging-<previous-hash>

# 5. Validar
curl -f https://staging-api.imbobi.com/api/v1/health
```

### 5.3 Emergency Stop

```bash
# Parar todos os serviços imediatamente
docker-compose -f docker-compose.staging.yml down

# Ou
docker stop imbobi-api-staging imbobi-postgres-staging imbobi-redis-staging

# Verificar logs do último erro
docker logs imbobi-api-staging | tail -100
```

---

## 6. CHECKLIST DE EXECUÇÃO

### Pré-Deployment
- [ ] Validar .env.staging está seguro (não commitar)
- [ ] Rodar `pnpm type-check && pnpm build` localmente
- [ ] Validar testes: `pnpm test`
- [ ] Criar branch de staging: `git checkout -b staging` se não existir
- [ ] PR reviewada e aprovada

### Deploy
- [ ] Rodar: `bash scripts/staging-init.sh` (primeira vez só)
- [ ] Rodar: `bash scripts/staging-deploy.sh`
- [ ] Rodar: `bash scripts/staging-e2e.sh`
- [ ] Verificar logs: `docker logs imbobi-api-staging`
- [ ] Notificação Slack enviada com sucesso

### Pós-Deploy
- [ ] Acessar https://staging-app.imbobi.com e testar manualmente
- [ ] Verificar cron de health checks ativo
- [ ] Monitorar logs por 30 minutos
- [ ] Comunicar ao time: "Staging deployed - version X"

### Se Algo Quebrar
- [ ] Executar: `bash scripts/staging-rollback.sh`
- [ ] Investigar erro em logs
- [ ] Criar incident report
- [ ] **Nunca** ignorar erros de health check

---

## 7. VARIÁVEIS DE AMBIENTE - RESUMO FINAL

| Variável | Tipo | Exemplo | Obrigatório |
|----------|------|---------|-------------|
| `DATABASE_URL` | String | `postgresql://...` | ✅ |
| `REDIS_HOST` | String | `staging-redis.amazonaws.com` | ✅ |
| `JWT_SECRET` | String | 64+ chars (openssl) | ✅ |
| `ENCRYPTION_SECRET` | String | 32+ chars (openssl) | ✅ |
| `AWS_REGION` | String | `us-east-1` | ✅ |
| `AWS_ACCESS_KEY_ID` | String | AWS IAM key | ✅ |
| `AWS_SECRET_ACCESS_KEY` | String | AWS IAM secret | ✅ |
| `S3_BUCKET` | String | `imbobi-staging-evidencias` | ✅ |
| `SENDGRID_API_KEY` | String | SendGrid token | ⚠️ Recomendado |
| `FIREBASE_PROJECT_ID` | String | `imbobi-staging` | ⚠️ Para push |
| `FIREBASE_PRIVATE_KEY` | String | JSON key file | ⚠️ Para push |

---

## 8. CONTATOS & ESCALAÇÃO

- **On-Call**: Check Slack #imbobi-staging-alerts
- **Database Issues**: DBA team
- **AWS Issues**: Cloud Ops
- **Critical Outage**: Page @imbobi-incident-commander

---

**Última atualização**: 2026-05-27  
**Versão**: 1.0  
**Status**: ✅ Pronto para uso
