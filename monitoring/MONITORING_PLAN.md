# Plano de Monitoramento e Alerting - Imbobi Production

**Data**: 2026-05-27  
**Status**: Production Ready  
**Mantido por**: DevOps Team  

---

## 1. Visão Geral

Este documento define a estratégia completa de monitoramento, alerting e observabilidade para a plataforma imbobi em produção. Inclui métricas críticas, alertas, dashboards, SLA targets e procedimentos operacionais.

**Stack**: Datadog (principal) + Prometheus/Grafana (fallback) + Fluent Bit (logs)

---

## 2. Métricas Críticas a Monitorar

### 2.1 Performance & Latência

| Métrica | Target | Alerta | Window | Prioridade |
|---------|--------|--------|--------|-----------|
| HTTP Latency P95 | <200ms | >500ms | 5 min | P1 |
| HTTP Latency P99 | <400ms | >1000ms | 5 min | P2 |
| DB Query P95 | <100ms | >300ms | 5 min | P1 |
| Cache Op Duration | <10ms | >50ms | 5 min | P2 |
| S3 Upload Duration | <2000ms | >5000ms | 5 min | P2 |
| Queue Job Duration | <5000ms | >10000ms | 5 min | P2 |

### 2.2 Taxa de Erro e Confiabilidade

| Métrica | Target | Alerta | Window | Prioridade |
|---------|--------|--------|--------|-----------|
| HTTP Error Rate | <0.5% | >5% | 5 min | P1 |
| DB Connection Errors | 0 | >0 | 1 min | P0 |
| Queue Failure Rate | <1% | >1% | 5 min | P2 |
| Dead Letter Queue | 0 | >0 | 1 min | P1 |
| S3 Upload Failures | <0.1% | >3 | 5 min | P1 |
| Auth Failures (401/403) | <0.2% | >20 events | 5 min | P2 |

### 2.3 Cache & Throughput

| Métrica | Target | Alerta | Window | Prioridade |
|---------|--------|--------|--------|-----------|
| Cache Hit Rate | >80% | <50% | 10 min | P2 |
| Redis Memory % | <70% | >80% | 5 min | P2 |
| Request Rate | - | Spike >2x | 5 min | P2 |
| Cache Operations/sec | - | Drop >50% | 5 min | P2 |

### 2.4 Recursos & Infraestrutura

| Métrica | Target | Alerta | Window | Prioridade |
|---------|--------|--------|--------|-----------|
| Memory Usage % | <75% | >85% | 5 min | P2 |
| Disk Usage % | <80% | >90% | 5 min | P1 |
| Disk Available | >10% | <10% | 5 min | P1 |
| Connection Pool (Available) | >20% | <10% | 1 min | P1 |
| Connection Pool (Queued) | 0 | >10 | 1 min | P0 |
| CPU Load Avg | <2.0 | >3.0 | 5 min | P2 |

### 2.5 Banco de Dados

| Métrica | Target | Alerta | Window | Prioridade |
|---------|--------|--------|--------|-----------|
| DB Slow Queries | <5 | >5 | 5 min | P2 |
| DB Replication Lag | <100ms | >1000ms | 1 min | P1 |
| DB Connection Pool Size | - | Fully consumed | 1 min | P0 |
| DB Availability | 100% | Connection fail | 30 sec | P0 |

### 2.6 Business Metrics

| Métrica | Tipo | Frequência | Alerta |
|---------|------|-----------|--------|
| Obras Criadas | Count | 24h | N/A |
| Parcelas Liberadas | Count | 24h | Spike >2x |
| Valor Liberado | Sum | 24h | N/A |
| Fotos Enviadas | Count | 24h | N/A |
| Payment Success Rate | % | 24h | <95% |

---

## 3. Alertas Obrigatórios (P0 + P1)

### P0 - CRÍTICO (Escala pagerduty + Slack + Email)
1. **DB Connection Pool Exhausted** - Queued connections > 10
2. **Database Connection Failures** - Qualquer erro de conexão
3. **Disk Space Critical** - <10% disponível
4. **Dead Letter Queue Has Messages** - >0 mensagens
5. **Connection Pool Exhausted** - Zero conexões disponíveis
6. **Uptime SLA Breach** - Downtime > 21.6 min/mês

### P1 - ALTO (Slack + Email + Pagerduty)
1. **HTTP Error Rate > 5%** - 5 minutos acima do threshold
2. **HTTP Latency P95 > 500ms** - Degradação de performance
3. **Disco < 10%** - Espaço crítico
4. **S3 Upload Failures** - >3 falhas em 5 minutos
5. **Dead Letter Queue** - Jobs não processáveis
6. **DB Replication Lag > 1s** - Inconsistência de dados

### P2 - AVISO (Slack)
1. **Memory Usage > 85%** - Resource exhaustion
2. **Cache Hit Rate < 50%** - Degradação de cache
3. **Queue Job Failure Rate > 1%** - Background job issues
4. **Redis Memory > 80%** - Cache capacity issue
5. **Auth Failures Spike** - >20 em 5 min
6. **Slow Queries > 5** - Database performance

---

## 4. Dashboards Sugeridos

### 4.1 Overview (SLA) Dashboard
**Objetivo**: Status geral de saúde e cumprimento de SLA (99.5%)

Widgets principais:
- Uptime vs Target (99.5%)
- Current Uptime %
- Error Rate %
- Request Rate (req/s)
- Avg Latency (ms)
- Latency P95 vs Target (200ms)
- Incident Timeline

**Refresh**: 60 segundos
**Período**: 24h, 7d, 30d

### 4.2 Performance Dashboard
**Objetivo**: Análise detalhada de latência, throughput e resource utilization

Widgets principais:
- HTTP Latency Distribution (p50, p75, p95, p99)
- Request Latency Heatmap
- Database Query Duration
- Cache Hit Rate %
- S3 Upload Duration
- Memory Usage %
- CPU Usage %
- Disk Usage %

**Refresh**: 30 segundos
**Período**: 1h, 6h, 24h

### 4.3 Database Health Dashboard
**Objetivo**: Monitoramento de conexões, queries lentas e replicação

Widgets principais:
- Connection Pool Status (size, available, queued)
- Slow Queries Timeline
- DB Connection Errors
- Top 10 Slowest Queries (tabela)
- Replication Lag
- Query Latency by Table

**Refresh**: 30 segundos

### 4.4 Cache & Redis Dashboard
**Objetivo**: Health check de cache e Redis

Widgets principais:
- Redis Memory Usage %
- Redis Connected Clients
- Cache Operations/sec (hits vs misses)
- Cache Operation Duration (GET, SET, DELETE)
- Cache Eviction Rate
- Hit/Miss Ratio Timeline

**Refresh**: 30 segundos

### 4.5 Queue & Jobs Dashboard
**Objetivo**: Monitoramento de BullMQ e background jobs

Widgets principais:
- Job Processing Time
- Failed Jobs Count
- Dead Letter Queue Count
- Job Success Rate %
- Job Latency Distribution
- Queue Depth Timeline

**Refresh**: 30 segundos

### 4.6 Business Metrics Dashboard
**Objetivo**: KPIs de negócio

Widgets principais:
- Obras Criadas (24h, 7d)
- Parcelas Liberadas (24h, 7d)
- Valor Liberado Total (R$)
- Fotos Enviadas (24h, 7d)
- Payment Success Rate
- Revenue Timeline
- Top Endpoints by Business Impact

**Refresh**: 60 segundos

### 4.7 Security & Errors Dashboard
**Objetivo**: Monitoramento de segurança, autenticação e erros

Widgets principais:
- Auth Failures (401/403)
- All HTTP Errors by Status Code
- Error Rate by Endpoint
- Top 10 Error Endpoints (tabela)
- Suspicious Activity Timeline
- Rate Limiting Events

**Refresh**: 30 segundos

### 4.8 Trace Analysis (APM) Dashboard
**Objetivo**: Análise de traces distribuídos e bottlenecks

Widgets principais:
- Service Dependencies (Service Map)
- Slowest Traces (p99)
- Trace Error Rate
- Span Duration Heatmap
- Service-to-Service Latency

**Refresh**: 30 segundos

---

## 5. Setup Datadog (Recomendado para Produção)

### 5.1 Credenciais Necessárias
```bash
DATADOG_API_KEY=xxxxx                    # Obter em: https://app.datadoghq.com/organization/settings/api-keys
DATADOG_APP_KEY=xxxxx                    # Obter em: https://app.datadoghq.com/organization/settings/application-keys
SLACK_WEBHOOK_URL=https://hooks.slack... # Para notificações Slack
PAGERDUTY_API_KEY=xxxxx                  # Para escalonamento P0
PAGERDUTY_SERVICE_ID=xxxxx               # ID do serviço em PagerDuty
```

### 5.2 Instalação e Deploy

**1. Inicializar tracer na API**
```typescript
// services/api/src/main.ts - ANTES de qualquer outro import
import { initializeDatadogTracer } from '@imbobi/monitoring/instrumentation';
initializeDatadogTracer();
```

**2. Deploy com Datadog Agent**
```bash
# Usar docker-compose com overlay
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d datadog-agent

# Verificar conectividade
curl http://localhost:5000/health
```

**3. Criar alertas no Datadog**
```bash
# Via API (Ver alerting-datadog.json para payload)
curl -X POST https://api.datadoghq.com/api/v1/monitor \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}" \
  -d @monitoring/alerts-datadog.json
```

### 5.3 Verificação Pós-Deploy

- [ ] Tracer enviando traces → https://app.datadoghq.com/apm
- [ ] Métricas chegando → https://app.datadoghq.com/metric/explorer
- [ ] Logs sendo coletados → https://app.datadoghq.com/logs
- [ ] Dashboards carregados → Criar dashboards JSON
- [ ] Alertas configurados → Testar com synthetic test

---

## 6. Log Aggregation Strategy

### 6.1 Camadas de Log

| Camada | Ferramenta | Formato | Retention | Análise |
|--------|-----------|---------|-----------|---------|
| Application | Winston/Pino | JSON | 30 dias | Datadog |
| Container | Docker | JSON | 7 dias | Fluent Bit |
| System | Syslog | JSON | 30 dias | Fluent Bit |
| Audit | Custom | JSON | 90 dias | S3 Backup |

### 6.2 Fluent Bit Pipeline

```
Input (Docker) 
  → Filters (Parser, Record Modifier, Multiline)
  → Output (Datadog + S3 Backup)
```

### 6.3 Indexação e Parsing

**Tags obrigatórias em todo log**:
- `env:production`
- `service:imbobi`
- `version:${APP_VERSION}`

**Campos chave parseados**:
- `timestamp` (ISO 8601)
- `level` (ERROR, WARN, INFO, DEBUG)
- `message`
- `endpoint` (para HTTP logs)
- `duration_ms` (latência)
- `user_id` (se aplicável)
- `error_code` (se erro)
- `request_id` (trace)

### 6.4 Retention & Compliance

- **Logs de aplicação**: 30 dias hot, 90 dias cold (S3)
- **Logs de auditoria**: 90 dias hot (compliance)
- **Logs de sistema**: 15 dias hot
- **Cleanup automático**: Via lifecycle policies

### 6.5 Busca e Alertas

**Queries frequentes pré-configuradas**:
- Todos erros em última 1h
- Latência P95 por endpoint
- Taxa de erro por service
- Failed jobs por tipo
- Auth failures por IP

---

## 7. SLA Targets e Cálculos

### 7.1 Uptime SLA

**Target**: 99.5% em janela de 30 dias

```
Downtime permitido = 30 dias × 24 horas × 60 minutos × (1 - 0.995)
                  = 43,200 minutos × 0.005
                  = 216 minutos
                  ≈ 3.6 horas/mês ou 21.6 minutos/semana
```

**Medição**: HTTP error rate < 0.5%
**Janela**: Rolling 24h, agregado mensal

### 7.2 Latência SLA

**Target P95**: <200ms
**Medição**: p95:http.request.duration
**Exclusões**: Health checks, synthetic tests
**Janela**: 24h rolling

### 7.3 Error Rate SLA

**Target**: <0.5%
**Medição**: (requests_4xx + requests_5xx) / total_requests
**Exclusões**: Erros 4xx intencionais (validação), health checks
**Janela**: 24h rolling

### 7.4 Cálculo de Disponibilidade

```python
def calculate_sla_breach(uptime_percent):
    target = 99.5
    if uptime_percent < target:
        downtime_percent = 100 - uptime_percent
        return f"SLA BREACHED: {downtime_percent:.2f}% downtime"
    return "SLA MET"
```

### 7.5 Relatório Mensal

Gerar automaticamente:
1. Uptime % (target vs actual)
2. Latency P95 (target vs actual)
3. Error Rate (target vs actual)
4. Incidents > P0 (count + mttr)
5. Failed alertas (false positives)

---

## 8. Procedimentos Operacionais

### 8.1 On-Call Runbooks

**P0 Alert - DB Connection Pool Exhausted**
1. Checklist imediato (30s)
   - Verificar conexões ativas
   - Revisar queries lentas
   - Check replication lag
2. Ações corretivas (5min)
   - Scale horizontally (adicionar réplicas de read)
   - Encerrar sessões idle
   - Rollback de deploy recente se correlacionado
3. Escalação (15min+)
   - Contactar DBA
   - Considerar failover

**P0 Alert - Disk < 10%**
1. Checklist imediato
   - Verificar tamanho de logs
   - Check database size
2. Ações corretivas
   - Rotacionar logs
   - Limpar cache temporário
   - Scale EBS volume
3. Escalação
   - Contactar infrastructure team

### 8.2 Escalation Policy

```
P0 -> PagerDuty (immediate) + Slack #critical
P1 -> Slack #alerts + Email to team
P2 -> Slack #alerts
```

### 8.3 Post-Incident Review

Após qualquer P0/P1:
1. RCA (Root Cause Analysis)
2. Timeline de resposta
3. Lições aprendidas
4. Preventive measures
5. Update runbooks

---

## 9. Configurações Prontas

### Arquivos de Setup
- `datadog-config.yaml` - Configuração principal Datadog
- `alerts-datadog.json` - Definição de alertas
- `dashboards.json` - Dashboards JSON
- `instrumentation.ts` - SDK de instrumentação
- `docker-compose.monitoring.yml` - Stack de monitoramento
- `fluent-bit.conf` - Log aggregation
- `prometheus.yml` - Prometheus (fallback)
- `alertmanager.yml` - AlertManager (fallback)

### Quick Start

```bash
# 1. Setup credenciais
cp .env.example .env
# Editar com DATADOG_API_KEY, SLACK_WEBHOOK_URL, etc

# 2. Deploy monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# 3. Verificar saúde
docker-compose exec datadog-agent curl http://localhost:5000/health
docker-compose logs datadog-agent | grep -i "initialized"

# 4. Setup alertas via API
./scripts/setup-datadog-alerts.sh

# 5. Verificar dashboards
# Abrir: https://app.datadoghq.com/dashboard
```

---

## 10. Troubleshooting

### Tracer não conectando
```
Error: "Unable to connect to localhost:8126"
Solução:
1. docker ps | grep datadog
2. docker-compose logs datadog-agent
3. Verificar DATADOG_API_KEY
4. Reiniciar: docker-compose restart datadog-agent
```

### Métricas não chegando
```
Error: "Metrics not appearing in Datadog"
Solução:
1. Verificar DogStatsD na porta 8125
2. netstat -an | grep 8125
3. Verificar tags nos metrics
4. Check rate limiting (Datadog)
```

### Logs duplicados/perdidos
```
Error: "Missing logs ou duplicatas em Datadog"
Solução:
1. Verificar Fluent Bit config
2. docker-compose logs fluent-bit
3. Ajustar Mem_Buf_Limit
4. Verificar output buffer
```

---

## Referências

- [Datadog Docs](https://docs.datadoghq.com)
- [dd-trace SDK](https://github.com/DataDogHQ/dd-trace-js)
- [Fluent Bit Output Plugin](https://docs.fluentbit.io/manual/pipeline/outputs/datadog)
- [SLA Calculator](https://uptime.is/)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)

---

**Versão**: 1.0  
**Última atualização**: 2026-05-27  
**Próxima revisão**: 2026-08-27 (3 meses)
