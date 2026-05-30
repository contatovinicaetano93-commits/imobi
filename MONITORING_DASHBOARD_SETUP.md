# MONITORING_DASHBOARD_SETUP — imobi Cutover 2026-06-02

**Documento de configuração e operação de monitoramento em tempo real para o cutover de produção do imobi.**

**Data de cutover**: 2026-06-02 (00:00 UTC)  
**Owner**: DevOps/CTO  
**Atualizado**: 2026-05-29  
**Documento crítico** — Deve estar 100% configurado ANTES das 23:00 UTC do dia 01/06.

---

## Índice

1. [Visão Geral e Objetivos](#visão-geral-e-objetivos)
2. [Dashboards a Configurar](#dashboards-a-configurar)
3. [Setup Detalhado por Plataforma](#setup-detalhado-por-plataforma)
4. [Scripts de Health Check](#scripts-de-health-check)
5. [Alertas e Escalação](#alertas-e-escalação)
6. [Timeline de Operação](#timeline-de-operação)
7. [Checklist Pré-Cutover](#checklist-pré-cutover)
8. [Troubleshooting Rápido](#troubleshooting-rápido)

---

## Visão Geral e Objetivos

### O que monitorar durante o cutover?

Durante o cutover, você NÃO quer descobrir problemas por:
- Usuários reclamando no Slack/WhatsApp
- Support team abrindo tickets
- Demora de carregamento perceptível
- Erros aleatórios em produção

### Objetivos críticos

| Objetivo | Métrica | Target |
|----------|---------|--------|
| **Detectar erros cedo** | Error rate | < 1% nos primeiros 60 min |
| **Performance aceitável** | Latency p95 | < 150ms |
| **Cache efetivo** | Cache hit ratio | > 80% |
| **Sem 5xx errors** | HTTP 500+ | 0 durante primeira hora |
| **Health checks passando** | All endpoints `/health` | 200 OK em < 100ms |
| **Infraestrutura OK** | CPU/Memory/Connections | CPU < 70%, Mem < 80% |

### O que você vai fazer

```
23:00 UTC 01/06  → Todos os dashboards ligados, operadores prontos
00:00 UTC 02/06  → CUTOVER! Build deploy, tráfego começa
00:15 UTC        → Olhar para Sentry + CloudWatch (canary metrics)
00:30 UTC        → Health check sweep completo
00:45 UTC        → Load test validation
01:00 UTC        → Avaliação: sucesso ou rollback?
02:00 UTC        → Estável. Ramp up gradual se houver
03:00 UTC        → Check final. Declare "Mission Accomplished"
04:00 UTC        → Handoff para on-call team
```

---

## Dashboards a Configurar

### 1. Sentry Error Tracking Dashboard

**Propósito**: Detectar erros em TEMPO REAL, não horas depois.

**O que monitorar**:
- Error rate (% de requests que resultam em erro)
- Transaction duration (latência por endpoint)
- Browser performance (FCP, LCP, CLS)
- Top errors by frequency
- Error trend (está piorando ou melhorando?)

**Dashboards padrão Sentry**:
1. **Issues** — Lista de erros agrupados
   - URL: `https://sentry.io/organizations/[ORG]/issues/`
   - Filter: `is:unresolved environment:production`
   - Sort by: Frequency (últimas 24h)

2. **Performance** — Latência por rota
   - URL: `https://sentry.io/organizations/[ORG]/performance/`
   - Filter: `environment:production`
   - Show: p50, p95, p99 latency
   - Breakdown by: endpoint

3. **Custom Dashboard** (recomendado para cutover)
   - Criar via: `https://sentry.io/organizations/[ORG]/dashboards/new/`
   - Widgets:
     - [x] Error rate (time series, últimas 2 horas)
     - [x] Top 5 errors (table)
     - [x] Transaction duration (histogram)
     - [x] Browser errors (bar chart)
     - [x] Release comparison (se houver versão anterior)

**Alertas Sentry** (CRÍTICO):
- P1: Error rate > 5% em 5 min → Slack #ops-critical + PagerDuty
- P2: Latency p95 > 200ms em 10 min → Slack #ops-critical
- P2: New error type detected → Slack #ops-critical

### 2. Vercel Deployment Dashboard

**Propósito**: Watch build deploy ao vivo, detect early issues.

**O que monitorar**:
- Build progress (está compilando?)
- Build status (passou nas checks?)
- Deployment status (está live?)
- Edge cache hit ratio
- Core Web Vitals (FCP, LCP, CLS)
- Function execution time

**Checklist Vercel**:
- [ ] Ter link para deployments aberto: `https://vercel.com/[TEAM]/imobi/deployments`
- [ ] Anotar SHA do commit da versão atual (antes do deploy)
- [ ] Ter rollback link pronto: `https://vercel.com/[TEAM]/imobi/settings/git`
- [ ] Monitorar build logs em tempo real (auto-refresh activado)
- [ ] Verificar Core Web Vitals ANTES vs DEPOIS do deploy

**Métricas importantes**:
- Build time: < 5 min (alerta se > 10 min)
- Deployment latency: < 2 min após build
- Edge cache hit ratio: > 80%
- Core Web Vitals:
  - FCP (First Contentful Paint): < 1.8s
  - LCP (Largest Contentful Paint): < 2.5s
  - CLS (Cumulative Layout Shift): < 0.1

### 3. CloudWatch Metrics Dashboard

**Propósito**: Infraestrutura (RDS, ElastiCache, Lambda) em um painel.

**Criar dashboard AWS CloudWatch**:

Acessar: `https://console.aws.amazon.com/cloudwatch/home`

Nome: `imobi-production-cutover`

**Widgets essenciais**:

#### RDS (PostgreSQL + PostGIS)
- **CPU Utilization**: Target < 70%
  - Alerta: > 80% → Scale up
- **Database Connections**: Target < 95/100
  - Alerta: > 95 → Investigate connection leak
- **Memory Utilization**: Target < 80%
- **Read/Write Latency**: Target < 10ms
- **Storage**: Monitor for space (target > 20% free)

#### ElastiCache (Redis)
- **Memory Usage**: Target < 80%
  - Alerta: > 90% → Clear old cache keys
- **Evictions/sec**: Target 0
  - Alerta: > 100/sec → Increase memory
- **Hit Ratio**: Target > 80%
  - Low hit ratio → Adjust TTL ou cache strategy
- **Network bytes in/out**: Monitor for spikes

#### Lambda (se usar serverless functions)
- **Invocations**: Monitor for sudden spikes
- **Duration**: p95 < 1s
- **Errors**: 0 during cutover
- **Throttles**: 0 (alerta se > 0)

#### Application Logs (CloudWatch Logs)
- **Error count/min** (grep: `ERROR`, `FATAL`): Target 0
- **Warning count/min**: Monitor for spikes
- **Latency percentiles** (p50, p95, p99)

**Configurar auto-refresh**: 1 minuto (refresh a cada 60s)

**Exemplo JSON (CloudWatch Dashboard)**:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", {"stat": "Average", "period": 60}],
          ["AWS/RDS", "DatabaseConnections", {"stat": "Sum", "period": 60}],
          ["AWS/ElastiCache", "EngineCPUUtilization", {"stat": "Average"}],
          ["AWS/ElastiCache", "Evictions", {"stat": "Sum"}],
          ["AWS/ElastiCache", "CacheHits", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Infrastructure Health"
      }
    }
  ]
}
```

### 4. Custom Health Check Dashboard

**Propósito**: Verificação de liveness de componentes críticos a cada 5 segundos.

**Checks implementados**:

1. **API /health endpoint**
   - URL: `https://api.imobi.com.br/health`
   - Expected: HTTP 200 + JSON
   - Timeout: 5s

2. **Database connectivity**
   - Via: `https://api.imobi.com.br/health` (inclui database)
   - Expected: `"database": { "configured": true }`
   - Latency: < 100ms

3. **Redis connectivity**
   - Via: `https://api.imobi.com.br/health` (inclui redis)
   - Expected: `"redis": { "status": "connected" }`
   - Latency: < 10ms

4. **S3 bucket access**
   - Command: `aws s3api head-bucket --bucket imbobi-evidencias-prod`
   - Expected: Success (no error)

5. **DNS resolution**
   - Command: `nslookup api.imobi.com.br`
   - Expected: Returns IP (< 100ms)

6. **Vercel web deployment**
   - URL: `https://imobi.com.br` (or canary URL)
   - Expected: HTTP 200, page loads < 3s

7. **Push notifications**
   - Via: `https://api.imobi.com.br/health`
   - Expected: `"firebase": { "configured": true }`

**Dashboard simples (terminal)**:

```
╔════════════════════════════════════════════════════════════════╗
║             IMOBI CUTOVER HEALTH CHECK DASHBOARD               ║
║                                                                ║
║  Time: 2026-06-02 01:30:45 UTC                               ║
║  Uptime: 1h 30m                                               ║
║                                                                ║
║  API Health                        ✅ 200 OK (45ms)           ║
║  Database                          ✅ Connected (12ms)        ║
║  Redis Cache                       ✅ Connected (3ms)         ║
║  S3 Evidências Bucket              ✅ Accessible              ║
║  DNS Resolution                    ✅ Resolved (8ms)          ║
║  Web Frontend                      ✅ 200 OK (542ms)          ║
║  Firebase Messaging                ✅ Configured              ║
║                                                                ║
║  Overall Status: 🟢 ALL SYSTEMS OPERATIONAL                   ║
║                                                                ║
║  Last check: 2026-06-02 01:30:45 UTC                          ║
║  Next check: 2026-06-02 01:30:50 UTC (in 5s)                 ║
╚════════════════════════════════════════════════════════════════╝
```

### 5. Load Testing Dashboard (Pré-Cutover)

**Propósito**: Validar que infraestrutura aguenta carga esperada ANTES do cutover.

**Executar**: 24h antes do cutover (2026-06-01 00:00 UTC)

**Load profile**:
- Duration: 10 minutos
- Target: 1000 concurrent users
- Ramp up: 100 users/min (leva 10 min para 1000)
- Ramp down: 10 min
- Think time: 2-5s between requests
- Endpoints: Mix realista (60% GET, 30% POST, 10% PUT/DELETE)

**Ferramentas suportadas**:
- k6 (recomendado, open-source)
- Apache JMeter
- Artillery
- Locust

**Success criteria**:
- p95 latency < 200ms
- p99 latency < 500ms
- Error rate < 1%
- No timeouts
- No 5xx errors
- Cache hit ratio > 80%

**Relatório esperado**:
```
Load Test Results (2026-06-01 00:00 UTC)
========================================
Duration:        10 min
Target RPS:      ~1500 (1000 concurrent users)
Actual RPS:      1480 (98% of target)
Errors:          0.8% (within tolerance)

Latency (ms):
  p50:    45
  p95:    125
  p99:    310
  max:    1250

Database:
  Connections:   87 / 100
  CPU:           52%
  Memory:        65%

Cache:
  Hit ratio:     84%
  Evictions:     0

Verdict:        ✅ READY FOR CUTOVER
```

---

## Setup Detalhado por Plataforma

### Sentry Setup

#### 1. Criar organização (se ainda não existe)

```bash
# Acessar https://sentry.io
# Login ou Sign Up
# Create organization: "imobi"
# Accept email verification
```

#### 2. Criar project Sentry

```
https://sentry.io/organizations/imobi/projects/new/
```

- **Name**: `imobi-api`
- **Platform**: `Node.js`
- **Alert Rule**: Yes
- **Default alert rule**: Yes

#### 3. Obter DSN

```
Copiar DSN da página:
https://sentry.io/organizations/imobi/projects/imobi-api/keys/
```

Exemplo DSN:
```
https://examplePublicKey@o123456.ingest.sentry.io/1234567
```

Adicionar a `.env.production`:
```bash
SENTRY_DSN=https://examplePublicKey@o123456.ingest.sentry.io/1234567
SENTRY_RELEASE=$(git rev-parse --short HEAD)
SENTRY_ENVIRONMENT=production
```

#### 4. Configurar Alertas Sentry

**Alert Rule 1: Error Rate > 5%**

```
https://sentry.io/organizations/imobi/alerts/new/issue/
```

```
IF: An issue is seen 50+ times
    in 5 minutes

THEN: Send a Slack notification to #ops-critical
      Trigger a PagerDuty incident (if active)
      Email: devops@imobi.com.br
```

**Alert Rule 2: Latency > 200ms**

```
IF: transaction.duration
    p95 > 200ms
    for 10 minutes

THEN: Send a Slack notification to #ops-critical
```

**Alert Rule 3: New Error Type**

```
IF: A new error is reported
    in production environment

THEN: Send a Slack notification to #ops-critical
```

#### 5. Criar Custom Dashboard

```
https://sentry.io/organizations/imobi/dashboards/new/
```

**Nome**: `Cutover Live 2026-06-02`

**Widgets**:

1. **Error Count (Time Series)**
   - Query: `event.type:error`
   - Interval: 1 minute
   - Time range: Last 2 hours

2. **Top 5 Errors (Table)**
   - Query: `event.type:error`
   - Group by: `issue`
   - Limit: 5
   - Sort by: `count`

3. **Transaction Duration (Histogram)**
   - Query: `type:transaction`
   - Metric: `transaction.duration`
   - Breakdown: By endpoint

4. **Browser Performance**
   - Metric: Core Web Vitals (FCP, LCP, CLS)
   - Break down by: Browser

5. **Release Comparison** (opcional, se houver rollback anterior)
   - Compare: Versão atual vs. anterior
   - Metric: Error rate, latency

#### 6. Integração Slack

```
https://sentry.io/organizations/imobi/integrations/slack/
```

1. Click "Install"
2. Authorize Sentry no workspace Slack
3. Create channel `#ops-critical` (se não existir)
4. Config default channel para alerts: `#ops-critical`

**Teste integração**:
```bash
# Na página de integração, click "Test Connection"
# Você deve ver uma mensagem no Slack #ops-critical
```

---

### Vercel Setup

#### 1. Acessar Vercel Dashboard

```
https://vercel.com/[TEAM]/imobi/deployments
```

#### 2. Anotar Commit SHA Atual (ANTES do cutover)

```bash
cd /home/user/imobi
git rev-parse HEAD > /tmp/current_production_sha.txt

# Output exemplo: abc1234def5678...
# Guardar esse SHA para rollback se necessário
```

#### 3. Monitorar Build em Tempo Real

Na página `https://vercel.com/[TEAM]/imobi/deployments`:

- [ ] Auto-refresh ativado (canto superior direito)
- [ ] Visualizar logs do build em tempo real
- [ ] Buscar erros (Ctrl+F: "error", "fail")
- [ ] Verificar que todos os checks passaram (verde)

#### 4. Ter Rollback Link Pronto

```
https://vercel.com/[TEAM]/imobi/settings/git
```

Se houver problema:

1. Click em "Deployments" na menu esquerda
2. Encontrar deployment anterior OK
3. Click em "..." → "Promote to Production"

#### 5. Web Vitals Monitoring

Depois do deploy, acessar:

```
https://vercel.com/[TEAM]/imobi/analytics
```

Verificar:
- [ ] FCP: < 1.8s
- [ ] LCP: < 2.5s
- [ ] CLS: < 0.1
- [ ] Nenhuma regressão comparado com deploy anterior

---

### CloudWatch Setup

#### 1. Acessar AWS CloudWatch

```
https://console.aws.amazon.com/cloudwatch/
```

Região: `us-east-1` (ou região sua)

#### 2. Criar Dashboard

```
CloudWatch → Dashboards → Create Dashboard
```

Nome: `imobi-production-cutover`

#### 3. Adicionar Widgets

**Widget 1: RDS Metrics**

```
Metric Type: Line chart
Metrics:
  - AWS/RDS → CPUUtilization (target < 70%)
  - AWS/RDS → DatabaseConnections (target < 95)
  - AWS/RDS → DatabaseMemoryUsage (target < 80%)
Period: 60 seconds
Statistic: Average
Alarm threshold: CPUUtilization > 80
```

**Widget 2: ElastiCache Metrics**

```
Metric Type: Line chart
Metrics:
  - AWS/ElastiCache → EngineCPUUtilization
  - AWS/ElastiCache → DatabaseMemoryUsagePercentage
  - AWS/ElastiCache → Evictions (target 0, alerta > 100/sec)
  - AWS/ElastiCache → CacheHits vs CacheMisses
Period: 60 seconds
Statistic: Average
```

**Widget 3: Application Logs**

```
Metric Type: Log Insights query
Query:
fields @timestamp, @message, @level
| filter @level = "ERROR" or @level = "FATAL"
| stats count() as error_count by bin(5m)
```

**Widget 4: Lambda (opcional)**

```
Metric Type: Number
Metrics:
  - AWS/Lambda → Invocations
  - AWS/Lambda → Duration (p95, p99)
  - AWS/Lambda → Errors (target 0)
  - AWS/Lambda → Throttles (target 0)
```

#### 4. Configurar Auto-Refresh

Dashboard → Refresh rate → 1 minute

#### 5. Criar Alarmes CloudWatch

**Alarme 1: RDS CPU > 80%**

```
CloudWatch → Alarms → Create Alarm
Metric: AWS/RDS CPUUtilization
Condition: > 80%
Duration: 5 minutes
Action: SNS → Topic "imobi-ops-critical" → Slack
```

**Alarme 2: ElastiCache Evictions > 100/sec**

```
CloudWatch → Alarms → Create Alarm
Metric: AWS/ElastiCache Evictions
Condition: > 100 (per minute)
Action: SNS → Topic "imobi-ops-critical" → Slack
```

**Alarme 3: RDS Connections > 95**

```
CloudWatch → Alarms → Create Alarm
Metric: AWS/RDS DatabaseConnections
Condition: > 95
Duration: 2 minutes
Action: SNS → Topic "imobi-ops-critical" → Slack
```

#### 6. Integração SNS → Slack

```
AWS SNS → Topics → Imobi-ops-critical
Subscribe → Slack channel #ops-critical
```

---

## Scripts de Health Check

### Script 1: Health Check Simples (Loop a cada 5s)

**Arquivo**: `/home/user/imobi/scripts/cutover-health-check.sh`

```bash
#!/bin/bash

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuração
API_URL="${API_URL:-https://api.imobi.com.br}"
CHECK_INTERVAL="${CHECK_INTERVAL:-5}"
S3_BUCKET="${S3_BUCKET:-imbobi-evidencias-prod}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}" # Slack webhook (opcional)

# Estado anterior (para detectar mudanças)
PREV_STATUS=""

log_header() {
  echo -e "\n${GREEN}=== Health Check $(date '+%Y-%m-%d %H:%M:%S %Z') ===${NC}"
}

check_api_health() {
  echo -n "API Health ($API_URL/health): "
  if response=$(curl -s -m 5 "$API_URL/health" 2>/dev/null); then
    if echo "$response" | jq -e '.status == "ok" or .status == "degraded"' > /dev/null 2>&1; then
      latency=$(echo "$response" | jq -r '.timestamp' 2>/dev/null || echo "unknown")
      echo -e "${GREEN}✅ OK${NC}"
      return 0
    else
      echo -e "${RED}❌ FAIL (invalid response)${NC}"
      echo "Response: $response"
      return 1
    fi
  else
    echo -e "${RED}❌ FAIL (timeout/connection error)${NC}"
    return 1
  fi
}

check_database() {
  echo -n "Database connectivity: "
  if response=$(curl -s -m 5 "$API_URL/health" 2>/dev/null); then
    if echo "$response" | jq -e '.database.configured == true' > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Connected${NC}"
      return 0
    else
      echo -e "${RED}❌ Not configured${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ FAIL${NC}"
    return 1
  fi
}

check_redis() {
  echo -n "Redis cache: "
  if response=$(curl -s -m 5 "$API_URL/health" 2>/dev/null); then
    redis_status=$(echo "$response" | jq -r '.redis.status' 2>/dev/null || echo "unknown")
    if [ "$redis_status" = "connected" ]; then
      echo -e "${GREEN}✅ Connected${NC}"
      return 0
    else
      redis_error=$(echo "$response" | jq -r '.redis.error // "unknown error"' 2>/dev/null)
      echo -e "${RED}❌ $redis_error${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ FAIL${NC}"
    return 1
  fi
}

check_s3() {
  echo -n "S3 bucket ($S3_BUCKET): "
  if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo -e "${GREEN}✅ Accessible${NC}"
    return 0
  else
    echo -e "${RED}❌ Not accessible${NC}"
    return 1
  fi
}

check_dns() {
  echo -n "DNS resolution (api.imobi.com.br): "
  if nslookup api.imobi.com.br > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Resolved${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed${NC}"
    return 1
  fi
}

check_web() {
  echo -n "Web frontend (https://imobi.com.br): "
  if curl -s -m 5 -o /dev/null -w "%{http_code}" "https://imobi.com.br" | grep -q "200"; then
    echo -e "${GREEN}✅ 200 OK${NC}"
    return 0
  else
    echo -e "${RED}❌ Not responding${NC}"
    return 1
  fi
}

determine_status() {
  local api=0 db=0 redis=0 s3=0 dns=0 web=0
  
  check_api_health && api=1 || api=0
  check_database && db=1 || db=0
  check_redis && redis=1 || redis=0
  check_s3 && s3=1 || s3=0
  check_dns && dns=1 || dns=0
  check_web && web=1 || web=0
  
  local total=$((api + db + redis + s3 + dns + web))
  
  if [ $total -eq 6 ]; then
    echo -e "\n${GREEN}🟢 ALL SYSTEMS OPERATIONAL${NC}"
    return 0
  elif [ $total -ge 4 ]; then
    echo -e "\n${YELLOW}🟡 DEGRADED ($total/6 checks passing)${NC}"
    return 1
  else
    echo -e "\n${RED}🔴 CRITICAL ($total/6 checks passing)${NC}"
    return 2
  fi
}

send_slack_alert() {
  local status=$1
  local message=$2
  
  if [ -n "$ALERT_WEBHOOK" ]; then
    local color="warning"
    [ "$status" = "ok" ] && color="good"
    [ "$status" = "critical" ] && color="danger"
    
    curl -s -X POST "$ALERT_WEBHOOK" \
      -H 'Content-type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"imobi Health Check\",
          \"text\": \"$message\",
          \"ts\": $(date +%s)
        }]
      }" > /dev/null
  fi
}

main() {
  echo -e "${GREEN}Starting health check loop (interval: ${CHECK_INTERVAL}s)${NC}"
  echo "Press Ctrl+C to stop"
  
  while true; do
    clear
    log_header
    
    determine_status
    status_code=$?
    
    # Map status code to string
    case $status_code in
      0) current_status="ok" ;;
      1) current_status="degraded" ;;
      2) current_status="critical" ;;
    esac
    
    # Alert only on state change
    if [ "$PREV_STATUS" != "$current_status" ] && [ -n "$ALERT_WEBHOOK" ]; then
      send_slack_alert "$current_status" "Status changed from $PREV_STATUS to $current_status"
    fi
    
    PREV_STATUS="$current_status"
    
    echo -e "\nNext check in ${CHECK_INTERVAL}s ($(date -u -d "+${CHECK_INTERVAL} seconds" '+%H:%M:%S UTC'))"
    sleep "$CHECK_INTERVAL"
  done
}

# Executar
main "$@"
```

**Como usar**:

```bash
# Sem alertas (apenas terminal)
chmod +x /home/user/imobi/scripts/cutover-health-check.sh
./scripts/cutover-health-check.sh

# Com alertas Slack (optional)
export ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR_TEAM/YOUR_CHANNEL
./scripts/cutover-health-check.sh

# Customizar intervalo
CHECK_INTERVAL=10 ./scripts/cutover-health-check.sh
```

### Script 2: Health Check Dashboard (Fancy)

**Arquivo**: `/home/user/imobi/scripts/cutover-dashboard.sh`

```bash
#!/bin/bash

# Versão simplificada com display melhorado
# Requer: jq, curl, figlet (opcional)

API_URL="${API_URL:-https://api.imobi.com.br}"
CHECK_INTERVAL="${CHECK_INTERVAL:-5}"

# ANSI colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Função para desenhar caixa
draw_box() {
  local title="$1"
  local width=60
  
  printf "┌─── ${BLUE}${title}${NC} "
  printf '%0.s─' $(( width - ${#title} - 8 ))
  printf "┐\n"
}

draw_close_box() {
  printf "└──────────────────────────────────────────────────────────┘\n"
}

status_check() {
  local name="$1"
  local check_fn="$2"
  
  echo -n "  │ $name: "
  if $check_fn; then
    echo -e "${GREEN}✅${NC}"
  else
    echo -e "${RED}❌${NC}"
  fi
}

api_check() {
  curl -s -m 3 "$API_URL/health" > /dev/null 2>&1
}

db_check() {
  curl -s -m 3 "$API_URL/health" | jq -e '.database.configured' > /dev/null 2>&1
}

redis_check() {
  curl -s -m 3 "$API_URL/health" | jq -e '.redis.status == "connected"' > /dev/null 2>&1
}

s3_check() {
  aws s3api head-bucket --bucket imbobi-evidencias-prod 2>/dev/null
}

web_check() {
  curl -s -m 3 -o /dev/null -w "%{http_code}" "https://imobi.com.br" | grep -q "200"
}

main() {
  while true; do
    clear
    
    draw_box "IMOBI CUTOVER HEALTH DASHBOARD"
    echo "  │"
    echo "  │  Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo "  │  API URL: $API_URL"
    echo "  │"
    
    status_check "API Health" api_check
    status_check "Database" db_check
    status_check "Redis Cache" redis_check
    status_check "S3 Storage" s3_check
    status_check "Web Frontend" web_check
    
    echo "  │"
    echo "  │  Next update: $(date -u -d "+${CHECK_INTERVAL} seconds" '+%H:%M:%S %Z')"
    draw_close_box
    
    sleep "$CHECK_INTERVAL"
  done
}

main
```

### Script 3: Load Testing com k6

**Arquivo**: `/home/user/imobi/scripts/cutover-load-test.js`

```javascript
import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  // Configuração para 1000 concurrent users
  stages: [
    { duration: '2m', target: 100 },   // Ramp up 100 users em 2 min
    { duration: '3m', target: 500 },   // Ramp up para 500 em 3 min
    { duration: '5m', target: 1000 },  // Ramp up para 1000 em 5 min
    { duration: '5m', target: 1000 },  // Manter 1000 por 5 min
    { duration: '3m', target: 500 },   // Ramp down para 500 em 3 min
    { duration: '2m', target: 0 },     // Ramp down para 0 em 2 min
  ],
  
  thresholds: {
    // Thresholds de sucesso
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],  // < 1% errors
  },
  
  setupTimeout: '10s',
  teardownTimeout: '10s',
};

const API_BASE = __ENV.API_URL || 'https://api.imobi.com.br';

export function setup() {
  // Validar conexão com API antes do load test
  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'setup: API is up': (r) => r.status === 200,
  });
}

export default function () {
  // Health check
  group('Health', () => {
    const res = http.get(`${API_BASE}/health`);
    check(res, {
      'health status is ok or degraded': (r) => {
        const body = JSON.parse(r.body);
        return body.status === 'ok' || body.status === 'degraded';
      },
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
  });
  
  // Simular requests típicas
  group('API endpoints', () => {
    // GET exemplo
    http.get(`${API_BASE}/some-endpoint`);
    
    // POST exemplo
    http.post(`${API_BASE}/some-endpoint`, {
      data: 'test',
    });
  });
}

export function teardown(data) {
  // Validar que API ainda está up após load test
  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'teardown: API still up': (r) => r.status === 200,
  });
}
```

**Como executar**:

```bash
# Instalar k6 (se não tiver)
# https://k6.io/docs/getting-started/installation/

# Executar load test
k6 run \
  -e API_URL=https://api.imobi.com.br \
  scripts/cutover-load-test.js \
  --out json=cutover-load-test-results.json

# Visualizar resultados
cat cutover-load-test-results.json | jq '.metrics'
```

---

## Alertas e Escalação

### Slack Channels Essenciais

Criar canais (se não existirem):
- [ ] `#ops-critical` — Alertas CRÍTICOS (P1, P2)
- [ ] `#ops-monitoring` — Notificações gerais
- [ ] `#cutover-logs` — Log contínuo durante cutover
- [ ] `#incident-response` — Incident postmortem

### Thresholds de Escalação

| Métrica | Amarelo (Warning) | Vermelho (CRITICAL) | Ação |
|---------|-------------------|---------------------|------|
| **Error Rate** | > 1% | > 5% | Investigate / Rollback |
| **Latency p95** | > 150ms | > 500ms | Scale up / Rollback |
| **Latency p99** | > 300ms | > 1000ms | Scale up / Rollback |
| **CPU (RDS)** | > 70% | > 85% | Scale up |
| **Memory (RDS)** | > 80% | > 95% | Scale up / Clear cache |
| **DB Connections** | > 80 | > 95 | Investigate connection leak |
| **Cache Hit Ratio** | < 70% | < 50% | Review cache strategy |
| **Redis Evictions** | > 10/sec | > 100/sec | Clear cache / Increase memory |
| **5xx Errors** | 1+ | 5+ | Investigate / Rollback |
| **HTTP 429 (Rate limit)** | Any | Multiple users | Scale up / Check DDoS |

### Slack Message Templates

**Template 1: Status Update (Every 15 min)**

```
:green_circle: **CUTOVER STATUS UPDATE** — 2026-06-02 01:45 UTC

**Overall**: 🟢 All Systems Operational

**Metrics** (last 15 min):
  • Error Rate: 0.3% (✅ Target < 1%)
  • Latency p95: 125ms (✅ Target < 150ms)
  • Cache Hit: 82% (✅ Target > 80%)
  • Errors: 8 (✅ Target 0, acceptable)
  • Users Online: ~150

**Infrastructure**:
  • RDS CPU: 45% (✅ Target < 70%)
  • RDS Memory: 62% (✅ Target < 80%)
  • DB Connections: 47/100 (✅ Healthy)
  • Redis Evictions: 0 (✅ Healthy)

**Deployments**:
  • Vercel Build: ✅ Deployed (02:00 UTC)
  • Sentry: ✅ Tracking
  • CloudWatch: ✅ Monitoring

**Next Check**: 15:45 UTC

cc: @devops-team
```

**Template 2: Alert (Warning)**

```
:orange_circle: **ALERT (P2)** — 2026-06-02 01:30 UTC

**Issue**: Latency p95 increased to 180ms (threshold: 150ms)

**Context**:
  • Duration: Last 5 minutes
  • Affected: /api/obras endpoint
  • Error Rate: Still < 1% ✅

**Action**:
  1. Check CloudWatch for RDS CPU/memory
  2. Review Sentry for errors
  3. Consider gradual scale-up if trend continues

**Status**: INVESTIGATING

cc: @devops-team
```

**Template 3: Alert (Critical)**

```
:red_circle: **CRITICAL ALERT (P1)** — 2026-06-02 01:20 UTC

**Issue**: Error Rate exceeded 5% threshold! 🚨

**Metrics**:
  • Error Rate: 7.2% (threshold: > 5%)
  • Errors in last 5 min: 245
  • Top error: `Database connection timeout`
  • Latency p95: 850ms (↑ from 125ms)

**Action Required**:
  1. IMMEDIATE: Check RDS connections (likely exhausted)
  2. Verify database is responsive
  3. Consider ROLLBACK if trend continues

**Escalation**: Paging @cto

cc: @devops-team @backend-team
```

### Escalation Matrix

```
P1 (CRITICAL)
├─ Who: CTO + DevOps Lead
├─ Notify: Slack #ops-critical + PagerDuty
├─ Timeframe: < 5 min response
├─ Decision: Rollback if needed
└─ Actions: Drain traffic, investigate, execute rollback

P2 (WARNING)
├─ Who: DevOps Lead + SRE
├─ Notify: Slack #ops-critical
├─ Timeframe: < 15 min response
├─ Decision: Scale up, optimize, monitor
└─ Actions: Adjust resources, optimize queries

P3 (INFO)
├─ Who: Monitoring team
├─ Notify: Slack #ops-monitoring
├─ Timeframe: < 60 min response
├─ Decision: Observe trend
└─ Actions: Log for postmortem
```

---

## Timeline de Operação

### Pré-Cutover (24h antes)

**Data**: 2026-06-01 00:00 UTC

| Hora | Atividade | Owner | Check |
|------|-----------|-------|-------|
| 00:00 | Iniciar Load Test (10 min) | DevOps | ✓ Success? |
| 00:20 | Validar infra após load test | DevOps | ✓ CPU/Mem OK? |
| 00:30 | Revisar alertas Sentry | SRE | ✓ Configured? |
| 01:00 | Revisar dashboards CloudWatch | DevOps | ✓ Metrics visible? |
| 02:00 | Teste de rollback (dry-run) | DevOps | ✓ Procedure OK? |
| 12:00 | Sync com team (standup) | CTO | ✓ Everyone ready? |
| 18:00 | Final sanity checks | All | ✓ Everything go? |
| 23:00 | **FINAL CHECK COMPLETE** | CTO | ✓ READY |

### Durante Cutover (0:00-4:00 UTC 02/06)

| Hora UTC | Atividade | Owner | Duração | Check |
|----------|-----------|-------|---------|-------|
| 00:00 | **CUTOVER START** — Deploy iniciado | DevOps | — | ✓ All monitoring on |
| 00:05 | Monitorar build Vercel | DevOps | 2-5 min | ✓ Build OK? |
| 00:15 | **CANARY CHECK** — 1% tráfego | DevOps | — | ✓ Errors < 1%? |
| 00:30 | **HEALTH CHECK SWEEP** | Tech Lead | 10 min | ✓ All 6 checks pass? |
| 00:40 | Validar latência (p95 < 150ms) | SRE | — | ✓ Latency OK? |
| 00:45 | Validar cache hit ratio (> 80%) | SRE | — | ✓ Cache warm? |
| 01:00 | **RAMP TO 50% TRAFFIC** | DevOps | — | ✓ Metrics OK? |
| 01:15 | Revisar Sentry + CloudWatch | All | 10 min | ✓ No anomalies? |
| 01:30 | **RAMP TO 100% TRAFFIC** | DevOps | — | ✓ Ready? |
| 01:45 | **STABILITY CHECK** (10 min) | Tech Lead | 10 min | ✓ All metrics stable? |
| 02:00 | **POST-DEPLOY VALIDATION** | All | 15 min | ✓ User tests OK? |
| 02:15 | Monitor for 5xx errors spike | SRE | ongoing | ✓ 0 5xx errors? |
| 02:30 | CPU/Memory trend analysis | DevOps | — | ✓ Scaling needed? |
| 03:00 | **FINAL VALIDATION** — Declare Success | CTO | — | ✓ ALL OK? |
| 03:30 | Handoff para on-call team | DevOps | — | ✓ Documented? |
| 04:00 | **MISSION ACCOMPLISHED** 🎉 | All | — | ✓ Post-mortem scheduled? |

### Decisão Callouts (se houver problema)

```
IF error_rate > 5% FOR 5 minutes THEN
  → Slack: @cto "Error rate critical, investigating"
  → Check: RDS CPU, Redis memory, query performance
  → Decision: Fix or ROLLBACK within 10 min

IF latency_p95 > 500ms FOR 5 minutes THEN
  → Slack: @devops "Latency critical, investigating"
  → Check: RDS load, query plans, cache effectiveness
  → Decision: Scale up or ROLLBACK within 10 min

IF db_connections > 95 FOR 2 minutes THEN
  → Slack: @backend "Connection leak detected"
  → Action: Kill stuck connections, check app logs
  → Decision: Fix or ROLLBACK

IF 5xx_errors > 10 THEN
  → Slack: @cto "Multiple 5xx errors"
  → Action: Check Sentry for details, identify pattern
  → Decision: ROLLBACK if >= 50 errors in 5 min
```

---

## Checklist Pré-Cutover

### 48h Antes (2026-05-31 00:00 UTC)

- [ ] Todos dashboards criados e testados
- [ ] Alertas Sentry configurados e integração Slack OK
- [ ] CloudWatch dashboard criado
- [ ] Health check scripts finalizados e testados
- [ ] Load test executado com sucesso
- [ ] Slack channels criados (`#ops-critical`, `#ops-monitoring`, `#cutover-logs`)
- [ ] Team comunicado e schedule confirmado
- [ ] Rollback plan documentado e testado (dry-run)
- [ ] S3 bucket access verificado (aws s3api head-bucket)
- [ ] DNS registros verificados (nslookup)

### 24h Antes (2026-06-01 00:00 UTC)

- [ ] Load test executado novamente
- [ ] Todos dashboards recarregados e vistos
- [ ] Credenciais testadas (Sentry, Vercel, AWS)
- [ ] Slack webhooks testados
- [ ] Email notificações confirmadas
- [ ] PagerDuty escalation policy OK (se aplicável)
- [ ] Commit SHA da produção atual anotado
- [ ] Vercel rollback procedure confirmado
- [ ] Team standup — Everyone ready?

### 1h Antes (2026-06-01 23:00 UTC)

- [ ] Todos dashboards abertos em browsers/terminals
- [ ] Equipe no Slack e chamada de vídeo (Zoom/Teams)
- [ ] Health check script rodando em terminal separado
- [ ] CloudWatch aberto em segundo monitor (se tiver)
- [ ] Vercel deployment page aberto (não fazer deploy ainda!)
- [ ] Sentry dashboard aberto
- [ ] Arquivo com rollback procedure impresso/visível
- [ ] Todos viram "Olá, vamos começar?" no Slack
- [ ] **DOOR LOCKED** — Ninguém mais commita para main!

### Deploy Time (2026-06-02 00:00 UTC)

- [ ] DevOps pessoa: Deploy initiado em Vercel
- [ ] SRE pessoa: Olhar Sentry, CloudWatch, Health checks
- [ ] Tech Lead pessoa: Revisar logs, investigar anomalias
- [ ] CTO pessoa: Decisão final (go/no-go)
- [ ] Documentar ALL decisions em `#cutover-logs` Slack

---

## Troubleshooting Rápido

### Problema: Error Rate > 5%

```
Diagnóstico rápido:
1. Abrir Sentry → Top Errors
2. Procurar padrão (todas mesma erro? ou diverse?)
3. Check Sentry Stack traces

Se erro é "Database connection timeout":
  → Check RDS: CPU, Memory, Connections
  → Kill stuck connections: SELECT * FROM pg_stat_activity;
  → Consider scale-up ou ROLLBACK

Se erro é "Redis ECONNREFUSED":
  → Check ElastiCache status
  → Verify security groups
  → Restart Redis (if needed)
  
Se erro é diverse (múltiplos tipos):
  → Likely infra issue (CPU, memory, network)
  → Check CloudWatch RDS/ElastiCache
  → If degraded: consider ROLLBACK
```

### Problema: Latency p95 > 200ms

```
Diagnóstico:
1. Abrir CloudWatch → RDS metrics
2. Check: CPU (target < 70%), Memory (target < 80%)
3. Check: Database connections trending up?

Se CPU > 70%:
  → RDS auto-scaling ativado?
  → Se não: Manualmente scale-up
  → Monitor por 5-10 min

Se Connections > 80:
  → App leak de connections?
  → Check application logs
  → Consider restarting app pods

Se Memory > 85%:
  → Scale up RDS instance
  → Or clear application cache
```

### Problema: Cache Hit Ratio < 70%

```
Diagnóstico:
1. Abrir CloudWatch → ElastiCache metrics
2. Checar: Cache size, evictions/sec

Se Evictions > 10/sec:
  → Redis is full, kicking out keys
  → Aumentar Redis memory
  → Or optimize cache strategy (TTL)

Se Hit ratio baixo mas não tem evictions:
  → Cache strategy problema
  → Revisar: Quais dados estão sendo cached?
  → Cache TTL muito curta?
```

### Problema: Database Connection Exhausted

```
Diagnóstico imediato:
1. SSH para RDS (via bastian/VPN)
2. Run: SELECT * FROM pg_stat_activity;
3. Look for "idle in transaction" ou "idle" connections

Ações:
1. Kill stuck connections:
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' AND query_start < now() - interval '10 min';

2. Check application logs:
   - Are connections being returned to pool?
   - Any "connection pool exhausted" errors?

3. Scale up RDS:
   - Aumentar max_connections parameter
   - Or upgrade instance type

4. If problem persists: ROLLBACK
```

### Problema: S3 Upload Fails

```
Diagnóstico:
1. Check S3 bucket exists:
   aws s3api head-bucket --bucket imbobi-evidencias-prod

2. Check IAM permissions:
   - Lambda/App role has s3:PutObject, s3:GetObject?
   - Check IAM policy

3. Check bucket policy:
   - Is it blocking requests?
   - Check CORS if cross-origin

4. Check network:
   - VPC endpoint for S3 configured?
   - Security groups allow HTTPS 443?
```

### Problema: DNS Resolution Fails

```
Diagnóstico:
1. nslookup api.imobi.com.br
2. nslookup imobi.com.br
3. dig @8.8.8.8 api.imobi.com.br (test external)

Se resolve OK locally mas falha externally:
  → DNS propagation issue
  → Check Route53 TTL
  → Esperar propagação (< 5 min usually)

Se falha em tudo:
  → Route53 record issue
  → Check record type (A, CNAME, etc)
  → Verify endpoint is correct
```

### Problema: Vercel Build Fails

```
Diagnóstico:
1. Abrir Vercel deployments page
2. Clicar em build failure → View logs
3. Procurar error message (output fim do log)

Erros comuns:
- "pnpm install failed" → Dependencies issue
  → Check pnpm-lock.yaml
  → May need to rebuild lock file
  
- "Build command failed" → Compilation error
  → Check TypeScript errors
  → pnpm type-check

- "Out of memory" → Build system issue
  → Split build ou upgrade instance
  
Se não conseguir fix rapidamente:
  → ROLLBACK para deployment anterior
  → Investigate issue offline
```

### Problema: ROLLBACK (Last Resort)

```
Procedure (5 min max):

1. ANUNCIAR:
   Slack #ops-critical: "INITIATING ROLLBACK - [reason]"

2. Vercel rollback:
   a) https://vercel.com/[TEAM]/imobi/deployments
   b) Find previous deployment (known good)
   c) Click "..." → "Promote to Production"
   d) Confirm

3. Database:
   a) No rollback needed (data written is OK)
   b) Revert any schema changes (if done in cutover)

4. Validate:
   a) Run health checks
   b) Monitor error rate (should drop to normal)
   c) Latency should normalize

5. Post-rollback:
   a) Post in Slack: "Rollback COMPLETE"
   b) Schedule postmortem meeting
   c) Document what went wrong
   d) Plan fixes
   e) Re-schedule cutover for next window
```

---

## Tabela de Referência Rápida

### URLs Importantes

| Serviço | URL |
|---------|-----|
| Sentry Dashboard | https://sentry.io/organizations/imobi/issues/ |
| Sentry Custom Dashboard | https://sentry.io/organizations/imobi/dashboards/ |
| Vercel Deployments | https://vercel.com/[TEAM]/imobi/deployments |
| Vercel Settings | https://vercel.com/[TEAM]/imobi/settings/git |
| CloudWatch Dashboards | https://console.aws.amazon.com/cloudwatch/ |
| AWS RDS | https://console.aws.amazon.com/rds/home |
| AWS ElastiCache | https://console.aws.amazon.com/elasticache/home |
| AWS S3 | https://console.aws.amazon.com/s3/buckets/imbobi-evidencias-prod |
| API Health | https://api.imobi.com.br/health |
| Web Frontend | https://imobi.com.br |

### Thresholds Reference

| Métrica | GREEN | YELLOW | RED |
|---------|-------|--------|-----|
| Error Rate | < 0.5% | 1-5% | > 5% |
| Latency p95 | < 100ms | 100-200ms | > 200ms |
| Latency p99 | < 300ms | 300-500ms | > 500ms |
| CPU RDS | < 60% | 60-80% | > 80% |
| Memory RDS | < 75% | 75-85% | > 85% |
| Cache Hit | > 85% | 70-85% | < 70% |
| DB Connections | < 80 | 80-95 | > 95 |
| 5xx Errors | 0 | 1-5 | > 5 |

### Emergency Contacts

```
CTO: [Name] — [Phone] — [Email]
DevOps Lead: [Name] — [Phone] — [Email]
SRE: [Name] — [Phone] — [Email]
Backend Lead: [Name] — [Phone] — [Email]
Frontend Lead: [Name] — [Phone] — [Email]
Database Admin: [Name] — [Phone] — [Email]

Escalation:
  Level 1: #ops-critical Slack
  Level 2: PagerDuty
  Level 3: Call CTO directly
```

---

## Conclusão & Next Steps

### Antes de começar cutover, garantir

✅ **Todos os dashboards funcionando**
✅ **Todos os alertas testados**
✅ **Health check script rodando**
✅ **Team no Slack e vídeo chamada**
✅ **Rollback procedure testado (dry-run)**
✅ **Documentação acessível (este arquivo)**

### Durante cutover

✅ **Monitorar ATIVAMENTE** — não deixar desatendido
✅ **Comunicar no Slack** — status updates a cada 15 min
✅ **Documentar tudo** — decisions, issues, resolutions
✅ **Escalate rápido** — não tentar resolver P1 sozinho

### Depois de cutover

✅ **Postmortem meeting** — 24-48h após
✅ **Update runbooks** — com o que aprendemos
✅ **Melhorar alertas** — baseado em falsos positivos/negativos
✅ **Celebrate!** — team merece 🎉

---

**Documento preparado**: 2026-05-29  
**Próxima revisão**: 2026-06-02 04:00 UTC (após cutover)  
**Dúvidas?** Slack: @devops-team or email: devops@imobi.com.br

