# MONITORING_DASHBOARD_SETUP — Cutover imobi 2026-06-02

**Data de Go-Live:** 2026-06-02  
**Horário Estimado:** 01:00 UTC (22:00 BRT 01 de junho)  
**Documento Atualizado:** 2026-05-29  
**Owner:** DevOps + Tech Lead  

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Dashboards a Configurar](#dashboards-a-configurar)
3. [Setup por Plataforma](#setup-por-plataforma)
4. [Health Checks Customizados](#health-checks-customizados)
5. [Integrações Slack](#integrações-slack)
6. [Timeline de Monitoramento](#timeline-de-monitoramento)
7. [Escalation Matrix](#escalation-matrix)
8. [Checklist Pré-Cutover](#checklist-pré-cutover)
9. [Checklist Pós-Cutover](#checklist-pós-cutover)
10. [Runbook de Rollback](#runbook-de-rollback)

---

## Visão Geral

Durante o cutover do imobi, precisamos monitorar em tempo real:
- **Erros & Performance** (Sentry)
- **Build & Deployment** (Vercel)
- **Infraestrutura** (CloudWatch + RDS + ElastiCache)
- **Health das Dependências** (Custom health checks)
- **Carga & Latência** (Load testing pré-cutover)

**Objetivo:** Detectar e escalar problemas antes que afetem usuários.

---

## Dashboards a Configurar

### 1. Sentry Error Tracking Dashboard

**Propósito:** Monitorar erros, performance e comportamento de browsers em tempo real.

**Métricas Principais:**
- Error rate (alvo: < 1%)
- Transaction duration (alvo p95: < 150ms)
- Browser performance (FCP, LCP, CLS)
- Top errors by type
- Affected users count

**Configuração:**
```
URL: https://sentry.io/organizations/[ORG]/issues/
Environment: production
Time range: Last 1 hour (configurado como padrão)
Custom tags: deployment_stage=production, version=cutover-2026-06-02
```

**Alert Rule - P1 (Critical):**
```
Condition: Error rate > 5% em qualquer 5-minute window
Action: Slack #ops-critical + PagerDuty (if configured)
Threshold: IMEDIATO
```

**Alert Rule - P2 (Warning):**
```
Condition: Transaction latency p95 > 200ms
Action: Slack #ops-warning
Threshold: 10 minutos sustentado
```

**Dashboard Customizado:**
1. Login em sentry.io
2. Acesse: Settings → Dashboards → New Dashboard
3. Nome: `imobi-cutover-2026-06-02`
4. Adicione widgets:
   - Error Rate (Last 1h)
   - Transaction Duration Distribution
   - Browser Performance (FCP, LCP, CLS)
   - Top 10 Errors
   - Affected Users
5. Defina refresh para 30 segundos
6. Salve e pin to team dashboards

---

### 2. Vercel Deployment Dashboard

**Propósito:** Monitorar deploy real-time, build progress, Core Web Vitals.

**Métricas Principais:**
- Build status (success/failed)
- Build duration (alvo: < 10 minutos)
- Function execution time (alvo: < 100ms p95)
- Edge cache hit ratio (alvo: > 80%)
- Core Web Vitals (FCP, LCP, CLS)

**Acesso:**
```
URL: https://vercel.com/[TEAM]/imobi/deployments
Settings: https://vercel.com/[TEAM]/imobi/settings
```

**Pre-Cutover Checklist:**
- [ ] Anote commit SHA atual em produção: `git rev-parse main`
- [ ] Verifique que `main` branch está selecionado em "Git"
- [ ] Confirme que auto-deployment está ATIVADO
- [ ] Teste rollback link: Vercel → Settings → Git → "Create Deployment from Git"

**Durante Cutover:**
1. Abra aba: https://vercel.com/[TEAM]/imobi/deployments
2. Assista logs em tempo real (auto-refresh a cada 5s)
3. Valide:
   - Build completou com sucesso
   - Não há warnings críticos
   - Deploy para production foi ativado
   - Core Web Vitals aparecem dentro de 2 minutos

**Rollback Rápido (< 1 min):**
```
1. Vercel Dashboard → Settings → Git
2. Clique "Create Deployment from Git"
3. Selecione commit SHA anterior
4. Confirme deploy
```

---

### 3. CloudWatch Metrics Dashboard (AWS)

**Propósito:** Visibilidade de saúde infraestrutural em tempo real.

**Componentes a Monitorar:**

#### RDS (PostgreSQL + PostGIS)
- CPU utilization (alvo: < 70%, warn > 80%)
- Database connections (alvo: < 80 de 100 max, warn > 95)
- Memory utilization (alvo: < 80%, warn > 85%)
- Read latency (alvo p95: < 20ms)
- Write latency (alvo p95: < 50ms)
- Replica lag (if read replicas exist, alvo: < 100ms)

#### ElastiCache (Redis)
- Memory used (alvo: < 80% of provisioned)
- Evictions/sec (alvo: 0, warn > 10)
- Cache hit ratio (alvo: > 80%)
- CPU utilization (alvo: < 70%)
- Network bytes in/out
- Swap usage (alvo: 0)

#### Lambda (if used)
- Invocations count
- Duration distribution (alvo p95: < 500ms)
- Errors count (alvo: 0)
- Throttles (alvo: 0)

#### Custom Metrics (via CloudWatch Logs)
- API error rate by endpoint
- API latency percentiles (p50, p95, p99)
- Job queue depth (BullMQ)
- Worker processing time

**Setup:**

```bash
# 1. Login AWS Console
# URL: https://console.aws.amazon.com/cloudwatch

# 2. Crie dashboard "imobi-production-cutover"
# Dashboards → Create dashboard → Name: imobi-production-cutover

# 3. Adicione widgets para RDS
# RDS → DB Instances → imbobi-prod-db
# - CPU Utilization
# - Database Connections
# - Free Storable Memory

# 4. Adicione widgets para ElastiCache
# ElastiCache → Replication Groups → imbobi-redis-prod
# - CacheHits
# - CacheMisses
# - EvictionsMM (Memcached mismatches)
# - Memory Usage
# - CPU Utilization

# 5. Configure Alarms
# Alarms → Create alarm
# Metric: RDS CPU > 80% OR ElastiCache Evictions > 100/sec
# State: ALARM
# Action: SNS topic → imbobi-ops-critical → Slack webhook
```

**Auto-Refresh:** Defina dashboard para refresh a cada 1 minuto.

---

### 4. Custom Health Check Dashboard

**Propósito:** Validar conectividade com todas as dependências críticas.

**Endpoints Health Check (implementados em `services/api/src/common/health.controller.ts`):**

```
GET https://api.imbobi.com.br/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T01:15:30Z",
  "redis": {
    "status": "connected",
    "host": "redis.imbobi.internal",
    "port": 6379
  },
  "email": {
    "provider": "sendgrid",
    "configured": true
  },
  "firebase": {
    "configured": true
  },
  "database": {
    "configured": true
  }
}
```

**Health Checks Adicionais:**

#### 4a. Database Connectivity
```bash
curl -s https://api.imbobi.com.br/db-health
# Esperado: { "status": "ok", "latency_ms": 5 }
```

**Implementação (adicione ao `health.controller.ts`):**
```typescript
@Get('db-health')
async getDbHealth() {
  const start = Date.now();
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
```

#### 4b. Redis Connectivity
```bash
curl -s https://api.imbobi.com.br/cache-health
# Esperado: { "status": "ok", "latency_ms": 2 }
```

**Implementação:**
```typescript
@Get('cache-health')
async getCacheHealth() {
  const start = Date.now();
  try {
    await this.cacheManager.get('_health_check');
    return {
      status: 'ok',
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
```

#### 4c. S3 Bucket Access
```bash
aws s3api head-bucket \
  --bucket imbobi-evidencias-prod \
  --region us-east-1
# Esperado: HTTP 200 (silenciosamente bem-sucedido)
```

#### 4d. DNS Resolution
```bash
nslookup api.imbobi.com.br
nslookup imbobi.com.br
# Esperado: IP resolve corretamente
```

---

## Setup por Plataforma

### A. Sentry Setup

**Pré-requisito:** Conta Sentry já configurada com DSN em `.env`

**Steps:**

#### 1. Criar Alert Rule - P1 (Error Rate > 5%)
```
1. Sentry Dashboard → Alerts
2. Create Alert Rule
3. Name: "imobi-p1-error-spike"
4. Condition:
   - Filter: Environment = production
   - Alert when: Event count > 5% of baseline in 5 minutes
5. Actions:
   - Send Slack notification to #ops-critical
   - (Optional) Send to PagerDuty
6. Save & Activate
```

#### 2. Criar Alert Rule - P2 (Latency > 200ms)
```
1. Create Alert Rule
2. Name: "imobi-p2-latency-spike"
3. Condition:
   - Filter: Event.transaction_duration > 200ms
   - Alert when: > 50% of transactions exceed threshold in 10min window
4. Actions:
   - Send Slack notification to #ops-warning
5. Save & Activate
```

#### 3. Criar Dashboard Customizado
```
1. Dashboards → Create Dashboard
2. Name: "imobi-cutover-monitoring"
3. Add widgets:
   - Error Rate (Line chart) - Last 1 hour
   - Transaction Duration (Heatmap) - Last 1 hour
   - Top Errors (Table) - Last 1 hour
   - Browser Performance (Stats) - Last 1 hour
   - Affected Users (Counter) - Last 1 hour
4. Set refresh to 30 seconds
5. Pin to team dashboards
```

**Teste:**
```bash
# Trigger test error para validar alerta
curl -X POST https://api.imbobi.com.br/test/error
# Aguarde 30s e valide que Sentry capturou + Slack notificou
```

---

### B. Vercel Setup

**Pré-requisito:** Projeto já configurado em Vercel com `main` branch linked

**Steps:**

#### 1. Verificar Git Integration
```
Vercel Dashboard → Settings → Git
- Confirm: Branch = main
- Confirm: Deploy on push = ON
- Confirm: Automatic deployments = ON
```

#### 2. Pre-Cutover Snapshot
```bash
# Anote o commit SHA atual em produção:
git log -1 --oneline

# Exemplo output:
# a1b2c3d fix: health check endpoints

# Salve este SHA em local seguro para possível rollback
```

#### 3. Validar Deployment Settings
```
Vercel Dashboard → Settings → Build & Deployment
- Framework: Next.js
- Build Command: pnpm install && pnpm build
- Output Directory: apps/web/.next
- Node Version: 20.x (or as configured)
```

#### 4. Pre-Cutover Test Deploy
```bash
# Faça um test deploy 30 min antes do cutover
git push origin main
# Monitore: https://vercel.com/[TEAM]/imobi/deployments
# Valide: Build succeeds, no errors, Core Web Vitals appear
```

**Rollback Procedure (< 1 min):**
```
1. Vercel Dashboard → Settings → Git
2. Scroll to "Deployment Settings"
3. Click "Create Deployment from Git"
4. Select branch = main, commit = [PREVIOUS_SHA]
5. Click "Deploy"
6. Monitor: Deploy completes in ~5 min
7. Validate: Production URL responds correctly
```

---

### C. CloudWatch Setup

**Pré-requisito:** AWS Account com acesso a RDS, ElastiCache, CloudWatch

**Steps:**

#### 1. Create Dashboard
```bash
# Via AWS Console:
https://console.aws.amazon.com/cloudwatch/home

# Dashboard → Create dashboard
# Name: imobi-production-cutover
# Widget type: Line, Number, Heatmap
```

#### 2. Add RDS Metrics
```
Widget: Line Chart
Metrics:
- RDS → imbobi-prod-db → CPU Utilization
  - Label: "RDS CPU %"
  - Y-axis: 0-100
  - Alarm threshold: 80%
  
- RDS → imbobi-prod-db → Database Connections
  - Label: "RDS Connections"
  - Y-axis: 0-100 (assuming max_connections=100)
  - Alarm threshold: 95
  
- RDS → imbobi-prod-db → Free Storable Memory
  - Label: "RDS Memory Available (GB)"
  - Alarm threshold: < 2GB
```

#### 3. Add ElastiCache Metrics
```
Widget: Line Chart
Metrics:
- ElastiCache → imbobi-redis-prod → CacheHits
  - Label: "Redis Hits"
  - Y-axis: log scale
  
- ElastiCache → imbobi-redis-prod → CacheMisses
  - Label: "Redis Misses"
  - Y-axis: log scale
  
- ElastiCache → imbobi-redis-prod → Evictions
  - Label: "Redis Evictions/sec"
  - Alarm threshold: > 10

- ElastiCache → imbobi-redis-prod → Memory Usage
  - Label: "Redis Memory Used (MB)"
  - Alarm threshold: > 80% of max
  
- ElastiCache → imbobi-redis-prod → CPU Utilization
  - Label: "Redis CPU %"
  - Alarm threshold: > 80%
```

#### 4. Add Custom Metrics (from CloudWatch Logs)
```
CloudWatch Logs → Log Groups → /aws/lambda/imbobi-api (or similar)
Insights Query:
  fields @timestamp, @duration, @error
  | stats count() as total_requests,
          pct(@duration, 50) as p50_latency,
          pct(@duration, 95) as p95_latency,
          pct(@duration, 99) as p99_latency,
          sum(if(@error=true, 1, 0)) as error_count
  by bin(5m)

Create metric from logs:
- Name: APILatencyPercentiles
- Namespace: imobi/api
```

#### 5. Configure Alarms → SNS → Slack
```bash
# 1. Create SNS Topic
aws sns create-topic --name imbobi-ops-critical
# Output: TopicArn: arn:aws:sns:us-east-1:ACCOUNT:imbobi-ops-critical

# 2. Create Slack Webhook Integration
# (Manual in Slack workspace)
# Slack → Your Workspace → Apps → Incoming Webhooks
# Create New Webhook
# Post to: #ops-critical
# Copy Webhook URL

# 3. Create SNS Topic Subscription
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:imbobi-ops-critical \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# 4. Create CloudWatch Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-rds-cpu-high \
  --alarm-description "Alert if RDS CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:imbobi-ops-critical
```

#### 6. Set Dashboard Refresh
```
Dashboard → Auto-refresh → 1 minute
```

**Validate:**
```bash
# Test alarm trigger
aws cloudwatch set-alarm-state \
  --alarm-name imobi-rds-cpu-high \
  --state-value ALARM \
  --state-reason "Test"
# Valide: Slack message aparece em #ops-critical em < 30s
```

---

## Health Checks Customizados

### Script de Monitoramento Contínuo

**Arquivo:** `scripts/health-check-monitor.sh`

```bash
#!/bin/bash

# ============================================================================
# imobi Continuous Health Check Monitor
# Purpose: Run every 5 seconds during cutover to validate all dependencies
# Usage: ./health-check-monitor.sh
# ============================================================================

set -e

API_URL="${API_URL:-https://api.imbobi.com.br}"
CHECK_INTERVAL=5
FAILED_CHECKS=0
PASSED_CHECKS=0
START_TIME=$(date +%s)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Function: Check API Health
# ============================================================================
check_api_health() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} Checking API health..."
  
  response=$(curl -s -w "\n%{http_code}" "${API_URL}/health" 2>/dev/null || echo -e "\n500")
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ API Health:${NC} HTTP 200"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    ((PASSED_CHECKS++))
  else
    echo -e "${RED}❌ API Health:${NC} HTTP $http_code"
    ((FAILED_CHECKS++))
  fi
}

# ============================================================================
# Function: Check Database Connectivity
# ============================================================================
check_database() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} Checking database connectivity..."
  
  response=$(curl -s -w "\n%{http_code}" "${API_URL}/db-health" 2>/dev/null || echo -e "\n500")
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "200" ]; then
    latency=$(echo "$body" | jq '.latency_ms' 2>/dev/null || echo "N/A")
    if [ "$latency" != "N/A" ] && [ "$latency" -lt 100 ]; then
      echo -e "${GREEN}✅ Database:${NC} Connected (${latency}ms)"
      ((PASSED_CHECKS++))
    else
      echo -e "${YELLOW}⚠️  Database:${NC} Slow response (${latency}ms)"
      ((PASSED_CHECKS++))
    fi
  else
    echo -e "${RED}❌ Database:${NC} HTTP $http_code"
    ((FAILED_CHECKS++))
  fi
}

# ============================================================================
# Function: Check Redis/Cache
# ============================================================================
check_cache() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} Checking Redis cache..."
  
  response=$(curl -s -w "\n%{http_code}" "${API_URL}/cache-health" 2>/dev/null || echo -e "\n500")
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$http_code" = "200" ]; then
    latency=$(echo "$body" | jq '.latency_ms' 2>/dev/null || echo "N/A")
    if [ "$latency" != "N/A" ] && [ "$latency" -lt 10 ]; then
      echo -e "${GREEN}✅ Redis Cache:${NC} Connected (${latency}ms)"
      ((PASSED_CHECKS++))
    else
      echo -e "${YELLOW}⚠️  Redis Cache:${NC} Slow response (${latency}ms)"
      ((PASSED_CHECKS++))
    fi
  else
    echo -e "${RED}❌ Redis Cache:${NC} HTTP $http_code"
    ((FAILED_CHECKS++))
  fi
}

# ============================================================================
# Function: Check S3 Bucket Access
# ============================================================================
check_s3() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} Checking S3 bucket access..."
  
  if aws s3api head-bucket --bucket imbobi-evidencias-prod --region us-east-1 2>/dev/null; then
    echo -e "${GREEN}✅ S3 Bucket:${NC} Accessible"
    ((PASSED_CHECKS++))
  else
    echo -e "${RED}❌ S3 Bucket:${NC} Not accessible"
    ((FAILED_CHECKS++))
  fi
}

# ============================================================================
# Function: Check DNS Resolution
# ============================================================================
check_dns() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} Checking DNS resolution..."
  
  api_ip=$(nslookup api.imbobi.com.br 2>/dev/null | grep "Address:" | tail -n 1 | awk '{print $2}')
  web_ip=$(nslookup imbobi.com.br 2>/dev/null | grep "Address:" | tail -n 1 | awk '{print $2}')
  
  if [ ! -z "$api_ip" ] && [ ! -z "$web_ip" ]; then
    echo -e "${GREEN}✅ DNS Resolution:${NC} api.imbobi.com.br → $api_ip, imbobi.com.br → $web_ip"
    ((PASSED_CHECKS++))
  else
    echo -e "${RED}❌ DNS Resolution:${NC} Failed"
    ((FAILED_CHECKS++))
  fi
}

# ============================================================================
# Function: Print Summary
# ============================================================================
print_summary() {
  elapsed=$(($(date +%s) - START_TIME))
  echo ""
  echo "════════════════════════════════════════════════════════════════════"
  echo "HEALTH CHECK SUMMARY"
  echo "════════════════════════════════════════════════════════════════════"
  echo -e "${GREEN}✅ Passed:${NC} $PASSED_CHECKS"
  echo -e "${RED}❌ Failed:${NC} $FAILED_CHECKS"
  echo "Elapsed: ${elapsed}s"
  echo "════════════════════════════════════════════════════════════════════"
  
  if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}⚠️  SOME CHECKS FAILED - ESCALATE TO #ops-critical${NC}"
    return 1
  else
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    return 0
  fi
}

# ============================================================================
# Main Loop
# ============================================================================
main() {
  echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}imobi Health Check Monitor${NC}"
  echo -e "${BLUE}API URL: $API_URL${NC}"
  echo -e "${BLUE}Interval: ${CHECK_INTERVAL}s${NC}"
  echo -e "${BLUE}Start: $(date)${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  # Run continuous checks until interrupted
  while true; do
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    check_api_health
    check_database
    check_cache
    check_s3
    check_dns
    
    print_summary || true
    
    echo -e "${BLUE}Next check in ${CHECK_INTERVAL}s...${NC}"
    sleep $CHECK_INTERVAL
  done
}

# Trap Ctrl+C for graceful exit
trap 'echo ""; print_summary; exit 0' INT

main "$@"
```

**Uso:**

```bash
# Setup
chmod +x scripts/health-check-monitor.sh

# Rodar durante o cutover
export API_URL="https://api.imbobi.com.br"
./scripts/health-check-monitor.sh

# Saída esperada:
# ════════════════════════════════════════════════════════════════════
# imobi Health Check Monitor
# API URL: https://api.imbobi.com.br
# Interval: 5s
# ════════════════════════════════════════════════════════════════════
#
# ✅ API Health: HTTP 200
# ✅ Database: Connected (5ms)
# ✅ Redis Cache: Connected (2ms)
# ✅ S3 Bucket: Accessible
# ✅ DNS Resolution: api.imbobi.com.br → 1.2.3.4
# ✅ ALL CHECKS PASSED
```

---

## Integrações Slack

### A. Sentry → Slack Webhook

**Setup:**

```
1. Slack Workspace → Workspace Settings → Manage apps → Build
2. Create New App → From scratch
3. Name: "Sentry Alerts", Workspace: your-workspace
4. Incoming Webhooks → Activate
5. Add New Webhook to Workspace → Select #ops-critical
6. Copy Webhook URL

Exemplo URL: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**Configurar em Sentry:**

```
Sentry → Settings → Integrations → Slack
OR
Sentry → Alerts → Alert Rule → Add Action → Slack notification
Select channel: #ops-critical
```

**Teste:**

```bash
# Teste manual do webhook
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚀 imobi cutover test message",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Test Alert from Monitoring Setup*\nIf you see this, Slack integration works!"
        }
      }
    ]
  }'
```

---

### B. CloudWatch → SNS → Slack Webhook

**Setup (via AWS CLI):**

```bash
# 1. Create SNS Topic
aws sns create-topic \
  --name imbobi-ops-critical \
  --region us-east-1

# Output: "TopicArn": "arn:aws:sns:us-east-1:123456789012:imbobi-ops-critical"

# 2. Subscribe to Slack
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:imbobi-ops-critical \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  --region us-east-1

# 3. Confirm subscription (Slack will receive confirmation message)
# Click link in Slack to confirm

# 4. Link CloudWatch Alarms to SNS topic
# (See CloudWatch section above for alarm configuration)
```

**Teste:**

```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:imbobi-ops-critical \
  --message "Test alert from CloudWatch monitoring setup" \
  --subject "imobi Cutover - Test Alert" \
  --region us-east-1
```

---

### C. Custom Health Check Script → Slack Alerts

**Integrar alerts automáticos:**

```bash
#!/bin/bash
# scripts/health-check-with-slack.sh

SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
FAILED_THRESHOLD=2  # Escalate after 2 consecutive failures

failed_count=0

while true; do
  # Run health checks
  if ! ./scripts/health-check-monitor.sh > /tmp/health-check.log 2>&1; then
    ((failed_count++))
    
    if [ $failed_count -ge $FAILED_THRESHOLD ]; then
      # Alert to Slack
      curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
          \"text\": \":warning: Health Check Failed ($failed_count times)\",
          \"blocks\": [
            {
              \"type\": \"section\",
              \"text\": {
                \"type\": \"mrkdwn\",
                \"text\": \"*:warning: Health Check Alert*\nFailed: $failed_count consecutive checks\nTime: $(date)\"
              }
            },
            {
              \"type\": \"section\",
              \"text\": {
                \"type\": \"mrkdwn\",
                \"text\": \"\`\`\`$(tail -20 /tmp/health-check.log)\`\`\`\"
              }
            }
          ]
        }"
      
      failed_count=0  # Reset counter after alert
    fi
  else
    failed_count=0
  fi
  
  sleep 5
done
```

---

## Timeline de Monitoramento

### Cutover Schedule: 2026-06-02 01:00 UTC

| Time (UTC) | Time (BRT) | Activity | Tool | Owner | Notes |
|---|---|---|---|---|---|
| 2026-06-02 00:30 | 01 Jun 21:30 | **PRE-CUTOVER PREP** | All | Tech Lead | Final validation |
| 2026-06-02 00:30 | 01 Jun 21:30 | Start monitoring dashboards | Sentry, CloudWatch, Vercel | DevOps | Leave tabs open |
| 2026-06-02 00:40 | 01 Jun 21:40 | Run load test (1000 concurrent users) | k6/Artillery | DevOps | Validate infrastructure |
| 2026-06-02 00:50 | 01 Jun 21:50 | Start health check monitor | Custom script | Tech Lead | `./health-check-monitor.sh` |
| 2026-06-02 00:55 | 01 Jun 21:55 | Final Slack integration test | Slack | DevOps | Confirm #ops-critical receiving messages |
| **2026-06-02 01:00** | **01 Jun 22:00** | **CUTOVER STARTS** | Deploy | DevOps | Deploy new version to production |
| 2026-06-02 01:05 | 01 Jun 22:05 | Monitor Vercel build | Vercel | DevOps | Watch build progress |
| 2026-06-02 01:10 | 01 Jun 22:10 | Vercel deploy complete | Vercel | DevOps | Validate Core Web Vitals appear |
| 2026-06-02 01:15 | 01 Jun 22:15 | Validate health checks | Custom script | Tech Lead | All checks should return 200/OK |
| 2026-06-02 01:20 | 01 Jun 22:20 | Canary metrics review | Sentry + CloudWatch | DevOps | Error rate < 1%, latency OK |
| 2026-06-02 01:30 | 01 Jun 22:30 | First traffic ramp-up (10%) | DNS/ALB | DevOps | Route 10% of traffic to new version |
| 2026-06-02 01:35 | 01 Jun 22:35 | Monitor error rate increase | Sentry | DevOps | Should still be < 1% |
| 2026-06-02 01:45 | 01 Jun 22:45 | Second traffic ramp-up (50%) | DNS/ALB | DevOps | Route 50% of traffic to new version |
| 2026-06-02 01:50 | 01 Jun 22:50 | Post-ramp validation | All dashboards | Tech Lead | Error rate, latency, cache hit ratio |
| 2026-06-02 02:00 | 02 Jun 23:00 | Full traffic cutover (100%) | DNS/ALB | DevOps | Route all traffic to new version |
| 2026-06-02 02:05 | 02 Jun 23:05 | Stability check (no errors for 5 min) | Sentry + CloudWatch | Tech Lead | Monitor closely |
| 2026-06-02 02:30 | 02 Jun 23:30 | Post-deploy validation | Custom script | Tech Lead | Re-run all health checks |
| 2026-06-02 03:00 | 02 Jun 00:00 | Declare cutover success | CTO + PO | All checks | If all green, declare victory |
| 2026-06-02 03:00+ | 02 Jun 00:00+ | Continue monitoring (1 hour) | All dashboards | DevOps | Watch for delayed issues |

---

## Escalation Matrix

### Alert Severity Levels

#### P0 (CRITICAL) — Immediate Action
```
Condition: Any of:
- Error rate > 5% for > 5 minutes
- API latency p95 > 500ms
- Database connection pool exhausted (> 95 of 100)
- Redis evictions > 100/sec
- Health check endpoint returns 5xx

Action:
1. Page on-call engineer immediately
2. Alert #ops-critical Slack channel
3. Investigate + implement emergency fix or rollback
4. Timeline: Respond within 5 minutes
```

#### P1 (HIGH) — Urgent Investigation
```
Condition: Any of:
- Error rate > 2% for > 10 minutes
- API latency p95 > 200ms
- RDS CPU > 80% for > 5 minutes
- Redis memory > 85% of max
- Cache hit ratio drops below 60%

Action:
1. Alert #ops-warning Slack channel
2. Assign on-call engineer to investigate
3. Consider scaling up infrastructure
4. Timeline: Respond within 15 minutes
```

#### P2 (MEDIUM) — Monitor & Log
```
Condition: Any of:
- Error rate 1-2% (but stable)
- API latency p95 150-200ms
- RDS CPU 70-80%
- Non-critical service degradation

Action:
1. Log in monitoring system
2. Monitor trend over 30 minutes
3. Alert team if trend worsens
4. No immediate action required
```

#### P3 (LOW) — Informational
```
Condition: Any of:
- Normal operational metrics
- Expected spikes during load test
- Minor service slowdowns (< 100ms)

Action:
1. Log in monitoring system
2. Review in post-cutover debrief
3. No immediate action required
```

### Escalation Contact List

```
On-Call Engineer:
- Slack: @oncall-eng (paged automatically)
- Phone: [TO BE FILLED]
- Email: [TO BE FILLED]

Tech Lead:
- Slack: @tech-lead
- Availability: 01:00 - 04:00 UTC

DevOps Lead:
- Slack: @devops-lead
- Availability: 01:00 - 04:00 UTC

CTO:
- Slack: @cto
- Availability: On standby (escalate if P0)

Product Owner:
- Slack: @product
- Availability: On standby (final decision on rollback)
```

---

## Checklist Pré-Cutover

### 72 Horas Antes (2026-05-30)

- [ ] Verificar que todas as dependências (DB, Redis, S3, etc.) estão saudáveis
- [ ] Confirmar credenciais AWS, Sentry, Vercel estão corretas
- [ ] Testar Slack webhook integrations
- [ ] Revisar e atualizar CLAUDE.md com instruções de cutover
- [ ] Confirmar que o branch `main` contém todas as mudanças para production

### 24 Horas Antes (2026-06-01)

- [ ] Deploy test para staging environment (simular full cutover)
- [ ] Validar que Sentry está capturando eventos corretamente
- [ ] Validar que Vercel build succeeds e Core Web Vitals aparecem
- [ ] Validar CloudWatch dashboards estão acessíveis
- [ ] Testar scripts de health check contra staging API
- [ ] Revisar escalation contact list (phone numbers, emails atualizados)
- [ ] Brief engineering team: cutover schedule, responsibilities, escalation
- [ ] Prepare rollback procedure documentation

### 2 Horas Antes (2026-06-01 22:00 UTC / 19:00 BRT)

- [ ] All team members online e prontos
- [ ] Open/pin all monitoring dashboards in tabs
- [ ] Start health check monitor script (test mode)
- [ ] Verify all Slack channels are accessible (#ops-critical, #ops-warning, etc.)
- [ ] Confirm database backups are current
- [ ] Verify that rollback commit SHA is documented and accessible
- [ ] Confirm deployment pipeline is ready (no builds in progress)

### 30 Minutes Before (2026-06-01 23:30 UTC)

- [ ] Final health check sweep (all systems green)
- [ ] Run load test against staging (validate infrastructure can handle expected load)
- [ ] Take snapshot of current production metrics (baseline for comparison)
- [ ] Confirm all team members have access to monitoring tools
- [ ] Do final Slack notification test
- [ ] Double-check that no critical tickets/bugs are pending
- [ ] Review commit log for any unexpected changes

### 15 Minutes Before (2026-06-01 23:45 UTC)

- [ ] All dashboards open and monitoring (Sentry, Vercel, CloudWatch, custom health checks)
- [ ] Custom health check monitor running in dedicated terminal
- [ ] Slack notifications enabled
- [ ] Team synchronized on Slack (final check-in)
- [ ] Deployment command ready to execute

### GO-LIVE (2026-06-02 01:00 UTC / 22:00 BRT)

- [ ] Deploy command executed: `git push origin main` (if using Vercel auto-deploy)
- [ ] OR manual deployment command: `vercel deploy --prod`
- [ ] Start timer: note exact deploy time
- [ ] Watch Vercel build progress (should complete in < 10 minutes)
- [ ] Monitor all dashboards simultaneously

---

## Checklist Pós-Cutover

### 0-15 Minutes Post-Deploy

- [ ] Vercel build completed successfully (no errors)
- [ ] Core Web Vitals metrics appear in dashboard
- [ ] Health check endpoint returns 200/OK
- [ ] Sentry shows 0 errors (or minimal, expected ones)
- [ ] API latency is stable (< 150ms p95)
- [ ] Database connections are healthy (< 50 of 100)
- [ ] Redis memory usage is normal (< 60%)
- [ ] No 5xx errors in logs
- [ ] Slack integration is receiving alerts correctly
- [ ] Post message to #ops-cutover: "Deploy completed, monitoring…"

### 15-30 Minutes Post-Deploy

- [ ] Error rate stable and < 1% (for at least 10 minutes)
- [ ] Latency metrics green (p95 < 150ms)
- [ ] No spike in error messages or types
- [ ] Database performance is normal
- [ ] Redis cache hit ratio > 80%
- [ ] S3 operations completing normally
- [ ] Email provider (SendGrid) successfully sending notifications
- [ ] Firebase Cloud Messaging push notifications working
- [ ] Health check sweep passes all checks
- [ ] Post status update to #ops-cutover

### 30-60 Minutes Post-Deploy

- [ ] Sustained 1 hour of stable operation with < 1% error rate
- [ ] Traffic metrics show normal usage patterns
- [ ] No performance degradation over time
- [ ] All infrastructure auto-scaling responding correctly
- [ ] Backup systems (snapshots, logs) capturing data normally
- [ ] User feedback channel monitored (no complaints in first 30 min)
- [ ] Post final success message to #ops-cutover
- [ ] Declare cutover SUCCESSFUL

### Post-Cutover Review (2026-06-02 04:00 UTC / 01:00 BRT)

- [ ] Archive all monitoring screenshots/logs
- [ ] Document any issues encountered
- [ ] Note any optimizations for next cutover
- [ ] Send post-mortem to engineering team
- [ ] Update runbooks with learnings
- [ ] Schedule retrospective meeting
- [ ] Celebrate successful launch! 🎉

---

## Runbook de Rollback

### Quando Fazer Rollback

Rollback é indicado se qualquer um dos seguintes ocorrer:

```
1. Error rate > 5% por > 10 minutos
2. Latency p95 > 300ms por > 10 minutos
3. Database connection pool exhausted
4. Critical service cascading failures
5. Data corruption or integrity issues
6. Security incident (unauthorized access, data leak)
7. Major revenue-impacting issue reported by users
```

### Rollback Procedure (< 5 minutes)

#### Step 1: Declare Rollback (1 min)

```bash
# Post to Slack immediately
# @ops-critical @cto — INITIATING ROLLBACK
# Reason: [specific error]
# Starting rollback procedure...
```

#### Step 2: Stop New Deployments (1 min)

```bash
# Vercel Dashboard → Settings → Git
# Temporarily disable automatic deployments
# (prevents accidental re-deploy)

# OR via CLI:
# (Contact Vercel support if needed for immediate lock)
```

#### Step 3: Revert to Previous Commit (2 min)

```bash
# Option A: Via Vercel Dashboard (< 1 min)
1. Go to: https://vercel.com/[TEAM]/imobi/deployments
2. Find previous deployment (before cutover)
3. Click "..." menu → "Promote to Production"
4. Confirm rollback

# Option B: Via Git + Push (< 1 min)
git revert HEAD
# or
git reset --hard [PREVIOUS_COMMIT_SHA]
git push origin main
# Vercel will automatically redeploy

# Option C: Direct Git Revert (if Push Blocked)
git checkout [PREVIOUS_COMMIT_SHA] -- .
git commit -m "ROLLBACK: Revert to pre-cutover state"
git push origin main
```

#### Step 4: Validate Rollback (1 min)

```bash
# Monitor Vercel deploy progress
# Expected: < 5 minutes for full deploy

# Once deployed:
curl -s https://api.imbobi.com.br/health | jq .
# Should show: "status": "ok"

# Check Sentry for error rate drop
# Should see: error rate returning to baseline
```

#### Step 5: Communicate Rollback (1 min)

```bash
# Post to Slack
# @channel ROLLBACK COMPLETE
# Reason: [specific issue]
# Time to rollback: [X minutes]
# Current status: [stable/monitoring]
# Next steps: [investigation/fix/retry]
```

### Post-Rollback Investigation

1. **Collect Evidence**
   - Export Sentry error logs (last 30 min)
   - Export CloudWatch logs (relevant time window)
   - Export Vercel build logs
   - Export database slow query logs

2. **Root Cause Analysis**
   - Identify exact error/issue
   - Determine if it's code or infrastructure
   - Check for incomplete migrations or config issues
   - Review any third-party service outages

3. **Create Fix**
   - Fix the identified issue
   - Write/update tests to catch the bug
   - Perform code review with team

4. **Re-Deploy**
   - Test in staging environment first
   - Run load test again
   - Schedule new cutover attempt

---

## Quick Reference Links

### Dashboards

| Service | URL | Purpose |
|---------|-----|---------|
| Sentry | https://sentry.io/organizations/[ORG]/issues/ | Error tracking |
| Vercel Deployments | https://vercel.com/[TEAM]/imobi/deployments | Build & deploy monitoring |
| Vercel Settings | https://vercel.com/[TEAM]/imobi/settings | Config & rollback |
| CloudWatch | https://console.aws.amazon.com/cloudwatch | Infrastructure metrics |
| RDS Dashboard | https://console.aws.amazon.com/rds | Database health |
| ElastiCache | https://console.aws.amazon.com/elasticache | Redis health |

### Important Commits & SHAs

```bash
# Pre-Cutover SHA (save this before deploying)
git log -1 --oneline

# Example:
# a1b2c3d fix: health check endpoints for monitoring

# Save in secure location for quick rollback reference
echo "a1b2c3d" > /tmp/pre-cutover-sha.txt
```

### Key Contacts

```
Tech Lead: @tech-lead (Slack)
DevOps Lead: @devops-lead (Slack)
CTO: @cto (Slack)
Product Owner: @product (Slack)
```

### Critical Files

- Monitoring guide: `/home/user/imobi/MONITORING_DASHBOARD_SETUP.md` (this file)
- Health check script: `/home/user/imobi/scripts/health-check-monitor.sh`
- API health endpoint: `/services/api/src/common/health.controller.ts`
- Deployment config: `/vercel.json`
- Environment config: `/.env.example`

---

## Success Criteria — Final Checklist

**After cutover goes live, validate:**

- [ ] **Error Rate:** < 1% for sustained 1 hour
- [ ] **Latency:** P95 < 150ms (consistent)
- [ ] **Cache Hit Ratio:** > 80%
- [ ] **Zero 5xx Errors:** No server errors in first 30 minutes
- [ ] **All Health Checks:** Return 200 OK
- [ ] **User Feedback:** No complaints in #support channel
- [ ] **Infrastructure:** RDS CPU < 70%, Memory < 80%
- [ ] **Database:** Connections < 80 of 100, no slow queries
- [ ] **Redis:** Memory < 80%, evictions = 0
- [ ] **DNS:** Both api.imbobi.com.br and imbobi.com.br resolve correctly
- [ ] **S3:** No access errors on evidence photo uploads
- [ ] **Email:** Notifications being sent successfully
- [ ] **Firebase:** Push notifications being delivered
- [ ] **Build:** Vercel deployment completed with no warnings

**If ALL above are green:**
```
✅ CUTOVER SUCCESSFUL ✅

- Declare success to stakeholders
- Continue monitoring for 24 hours
- Schedule post-launch debrief
- Update runbooks with learnings
```

---

## Appendix A: Load Testing Pre-Cutover

**Purpose:** Validate that infrastructure can handle expected concurrent load.

```bash
#!/bin/bash
# scripts/load-test-pre-cutover.sh

# Using k6 (open-source load testing tool)
# Install: https://k6.io/docs/getting-started/installation/

cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 1000,              // 1000 concurrent users
  duration: '10m',        // 10 minute test
  rampUp: '1m',           // Ramp up over 1 minute
  rampDown: '1m',         // Ramp down over 1 minute
  thresholds: {
    http_req_duration: ['p(95)<150'],    // P95 latency < 150ms
    http_req_failed: ['rate<0.01'],      // Error rate < 1%
  },
};

export default function () {
  let response = http.get('https://api.imbobi.com.br/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 150ms': (r) => r.timings.duration < 150,
  });
}
EOF

# Run test
k6 run load-test.js

# Expected output:
# http_reqs.........................: 600000 reqs  1000 req/sec
# http_req_duration.................: avg=45ms p(95)=120ms p(99)=180ms
# http_req_failed....................: 0.00%
```

**Run 30-60 minutes before cutover:**

```bash
# 30 min before cutover
export API_URL="https://api.imbobi.com.br"
./scripts/load-test-pre-cutover.sh

# Monitor during test:
# - CloudWatch dashboard: RDS CPU, connections, memory
# - CloudWatch dashboard: ElastiCache memory, evictions
# - Sentry: Error rate should stay < 0.1%
# - Custom health checks: All passing

# If test passes with < 1% error rate and P95 < 150ms:
# Infrastructure is ready for cutover
```

---

## Appendix B: Common Issues & Solutions

### Issue 1: High Error Rate Post-Deploy

**Symptom:** Error rate spikes to > 5% immediately after deploy

**Diagnosis:**
```bash
# Check Sentry for error patterns
curl -s https://sentry.io/api/0/projects/[ORG]/[PROJECT]/events/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | jq '.[] | .message'

# Check CloudWatch logs
aws logs tail /aws/lambda/imbobi-api --follow --since 5m

# Check database connectivity
curl https://api.imbobi.com.br/db-health
# If: "error": "connection refused" → DB migration issue
```

**Solution:**
```
1. Check if database migrations ran successfully
2. Verify environment variables are set correctly
3. Check for breaking changes in code
4. If unresolvable: INITIATE ROLLBACK (see runbook)
```

### Issue 2: Slow API Latency Post-Deploy

**Symptom:** Latency p95 > 200ms (was < 100ms before)

**Diagnosis:**
```bash
# Check CloudWatch logs for slow queries
aws logs insights query /aws/rds/imbobi-prod \
  --query 'fields @duration | stats avg(@duration) by @message'

# Check database connection pool
aws rds describe-db-instances --db-instance-identifier imbobi-prod-db \
  | jq '.DBInstances[0].DBParameterGroups'

# Check Redis latency
curl https://api.imbobi.com.br/cache-health
```

**Solution:**
```
1. If RDS: Check for slow queries, add indexes
2. If Redis: Check memory usage, clear old keys
3. If code: Profile with APM (Sentry transaction tracing)
4. Scale up: RDS instance type or read replica
```

### Issue 3: Database Connection Pool Exhaustion

**Symptom:** Error rate spikes, "too many connections" errors

**Diagnosis:**
```bash
# Check current connections
aws rds describe-db-instances --db-instance-identifier imbobi-prod-db \
  | jq '.DBInstances[0].DBInstanceStatus'

# Check application connection pool
# In health check:
curl https://api.imbobi.com.br/health
# Check: "database": { "connections": 98 } (out of 100 max)
```

**Solution:**
```
1. Restart application instances (recycles connection pools)
2. Increase max_connections in RDS parameter group
3. Check for connection leaks in code
4. Scale up: Add read replica or increase RDS instance size
```

### Issue 4: Redis Evictions Spike

**Symptom:** Cache hit ratio drops below 60%, high eviction rate

**Diagnosis:**
```bash
# Check Redis memory usage
aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --show-cache-node-info \
  | jq '.CacheClusters[0].CacheNodes[0].CacheNodeStatus'

# Check eviction rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name Evictions \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --dimensions Name=CacheClusterId,Value=imbobi-redis-prod
```

**Solution:**
```
1. Clear old cache keys: FLUSHDB (careful - will clear all data)
2. Increase Redis max memory: AWS console → Modify cluster
3. Review cache TTLs: Reduce for less critical data
4. Scale up: Move to larger Redis instance type
```

---

## Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-29 | v1.0 | Initial setup guide | DevOps Team |

---

**Last Updated:** 2026-05-29  
**Next Review:** Post-cutover (2026-06-02)  
**Document Owner:** DevOps Lead  
**Stakeholders:** CTO, Tech Lead, Product Owner
