# SLA Targets e Cálculos - Imbobi Production

**Última atualização**: 2026-05-27  
**Status**: Active  
**Período de Medição**: Rolling 30 dias (mensal agregado)

---

## 1. SLA Uptime

### Target
**99.5% uptime** em janela de 30 dias

### Cálculo de Downtime Permitido

```
Dias em um mês: 30
Horas por dia: 24
Minutos por mês: 30 × 24 × 60 = 43,200 minutos

Downtime permitido = 43,200 minutos × (1 - 0.995)
                  = 43,200 minutos × 0.005
                  = 216 minutos
                  = 3.6 horas/mês
                  ≈ 21.6 minutos/semana
                  ≈ 4.3 minutos/dia
```

### Definição de "Uptime"

Uptime é medido pelo inverso da taxa de erro HTTP:

```
Uptime % = 100 - Error Rate %

Onde Error Rate = (HTTP 4xx + HTTP 5xx) / Total Requests
```

### Exclusões de Erro

Os seguintes erros **NÃO** são contabilizados na taxa de erro para SLA:

1. **HTTP 4xx válidos** (por desempenho)
   - 400 Bad Request (erro do cliente)
   - 401 Unauthorized (sem credenciais)
   - 403 Forbidden (acesso negado)
   - 404 Not Found (recurso não existe)
   - 429 Too Many Requests (rate limiting válido)

2. **Health Checks** e **Monitoring**
   - GET /health
   - GET /metrics
   - HEAD requests
   - Synthetic tests

3. **Erros causados pelo Cliente**
   - Timeout na rede do cliente
   - Cliente desligado durante request
   - Payload inválido (validação Zod)

### Inclusões de Erro (afetam SLA)

1. **HTTP 5xx (Server Errors)**
   - 500 Internal Server Error
   - 502 Bad Gateway
   - 503 Service Unavailable
   - 504 Gateway Timeout

2. **Erros de Infraestrutura**
   - Timeout do servidor (>30s sem resposta)
   - Connection reset
   - Service crash

### Janelas de Medição

```
Diário:    24 horas (para alertas)
Semanal:   7 dias (para relatórios)
Mensal:    30 dias (para créditos SLA)
Anual:     12 meses (para contrato)
```

### Calculation Example

**Cenário**: Mês de maio com 1 outage

```
Total requests: 10,000,000
Failed requests (500+): 45,000
Error rate: 45,000 / 10,000,000 = 0.45%

Uptime = 100 - 0.45 = 99.55%

Comparison:
- Target: 99.5%
- Actual: 99.55%
- Status: ✓ SLA MET (0.05% above target)

Downtime equivalent: 216 min - 19.44 min = 196.56 min remaining budget
```

---

## 2. SLA Latência (P95)

### Target
**<200ms P95** em janela de 24 horas

### Definição

P95 latência = 95º percentil do tempo de resposta (medido em millisegundos)

Significa: 95% de todos os requests completam em <200ms

### Medição

**Métrica Datadog/Prometheus**:
```
p95:http.request.duration{env:production}
```

**Janela**: Rolling 24h
**Atualização**: A cada 5 minutos

### Exclusões

- Health checks
- Synthetic tests
- Requests com erros (5xx)
- Uploads de arquivo > 10MB (S3)

### Breakdown por Endpoint (Targets)

| Endpoint | P95 Target | P99 Target | Criticality |
|----------|-----------|-----------|------------|
| GET /works | 100ms | 200ms | P0 |
| GET /works/:id | 150ms | 300ms | P0 |
| POST /works | 200ms | 500ms | P0 |
| POST /fotos | 5000ms | 10000ms | P2 (arquivo) |
| POST /auth/login | 300ms | 600ms | P1 |
| POST /parcelas/liberar | 1000ms | 2000ms | P1 |
| POST /parcelas/:id/payment | 2000ms | 5000ms | P2 |

### Calculation Example

**Cenário**: Dia típico

```
Sample window: 24 horas
Total requests: 1,000,000
Latency distribution:

p50 (50%): 45ms
p75 (75%): 85ms
p95 (95%): 180ms ✓ PASS
p99 (99%): 450ms

Status: SLA MET (180ms < 200ms target)
```

---

## 3. SLA Error Rate

### Target
**<0.5% error rate** em janela de 24 horas

### Definição

```
Error Rate % = (HTTP 5xx count) / (Total requests) × 100
```

Considerando apenas erros de servidor (5xx), não erros de cliente (4xx).

### Thresholds

```
0.0 - 0.3%  → GREEN (Healthy)
0.3 - 0.5%  → YELLOW (Warning)
0.5 - 1.0%  → ORANGE (Critical)
> 1.0%      → RED (SLA Breach)
```

### Monitoring

**Metric**:
```
avg:http.requests.error_rate{env:production}
```

**Alert thresholds**:
- Warning: >1%
- Critical: >5%

### Incident Classification

| Error Rate | Duration | Incident Level |
|-----------|----------|----------------|
| <0.5% | - | No incident |
| 0.5-2% | <30min | Informational |
| 0.5-2% | 30min-2h | P2 |
| 2-5% | Any | P1 |
| >5% | Any | P0 |

---

## 4. Database Availability SLA

### Target
**99.9% availability** (database connection success rate)

### Metrics

```
DB Success Rate = Successful connections / Total connection attempts × 100
DB Availability = 100 - (Failed connections / Total attempts × 100)
```

### Downtime Budget

```
99.9% in 30 days = 43,200 min × 0.001 = 43.2 minutes
```

### Failure Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|-----------|
| Primary DB crash | Full unavailability | Automatic failover to replica |
| Connection pool exhausted | New requests rejected | Scale pool, terminate idle |
| Replication lag >1s | Stale reads | Alert, manual intervention |
| Slow queries | Latency increase | Query optimization |

---

## 5. Cache Availability SLA

### Target
**Cache hit rate >80%** (non-blocking requirement)

Notar: Cache misses não degradam uptime, apenas latência.

### Metrics

```
Hit Rate = Cache hits / (Cache hits + Cache misses) × 100
```

### SLA Levels

```
>85%  → Excellent
80-85% → Good
70-80% → Acceptable
<70%  → Poor (investigate)
```

### Budget Calculation

**Target**: 80% hit rate significa 1 miss a cada 5 requests

```
10,000 requests/sec × 24 hours = 864,000,000 requests/day

If hit rate = 80%:
- Hits: 691,200,000
- Misses: 172,800,000 (expected)

If hit rate drops to 60%:
- Miss increase: 86,400,000 extra (20%)
- Action: Scale Redis or investigate
```

---

## 6. Dashboard Targets Summary

### Overview Dashboard SLA Widget

```json
{
  "name": "SLA Compliance",
  "widgets": [
    {
      "title": "Uptime vs Target (99.5%)",
      "metric": "system.uptime.percent",
      "target": 99.5,
      "comparison": "actual vs target"
    },
    {
      "title": "Latency P95 vs Target (200ms)",
      "metric": "http.request.duration.p95",
      "target": 200,
      "comparison": "actual vs target"
    },
    {
      "title": "Error Rate vs Target (0.5%)",
      "metric": "http.requests.error_rate",
      "target": 0.5,
      "comparison": "actual vs target"
    },
    {
      "title": "Monthly SLA Summary",
      "type": "table",
      "data": [
        "Uptime: 99.55% (Target: 99.5%) ✓",
        "Latency P95: 185ms (Target: 200ms) ✓",
        "Error Rate: 0.45% (Target: 0.5%) ✓",
        "Downtime used: 196.56 min / 216 min"
      ]
    }
  ]
}
```

---

## 7. SLA Breach Procedures

### Detection

Alertas automáticos disparam em:
- Uptime cai abaixo de 99.5% por 1 hora
- P95 latência > 500ms por 5 minutos sustentados
- Error rate > 5% por 5 minutos

### Notification

1. **Imediato** (0-5 min)
   - PagerDuty escalation (P0)
   - Slack #critical-alerts
   - Email para on-call

2. **Dentro de 1 hora**
   - Incidente criado
   - Status page atualizado
   - Engineering team alerted

3. **Dentro de 4 horas**
   - Comunicação com clientes (se necessário)
   - Análise de causa raiz iniciada

### Resolution

1. **Immediate Actions**
   - Rollback de deploy recente (se aplicável)
   - Scale resources (CPU, RAM, DB)
   - Direcionar tráfego para fallback

2. **Post-Incident**
   - RCA (Root Cause Analysis)
   - Preventive measures
   - Update runbooks
   - Customer communication

### SLA Credits

Para contratos SLA com créditos:

```
Uptime      Credit
99.0-99.4%  10% de 1 mês
98.0-99.0%  25% de 1 mês
<98.0%      50% de 1 mês
```

---

## 8. Relatório Mensal de SLA

Gerar automaticamente até o 5º dia útil do mês seguinte:

### Conteúdo

1. **Executive Summary**
   - Overall SLA compliance %
   - Incidents > P0 (count)
   - MTTR (Mean Time To Resolution)

2. **Detailed Metrics**
   - Uptime % (daily breakdown)
   - Latency P95/P99 (daily trend)
   - Error rate (daily trend)
   - Peak traffic time
   - Slowest operations

3. **Incidents**
   - Timeline of each incident
   - Duration
   - Impact (users affected, requests impacted)
   - Root cause (short description)
   - Resolution

4. **Performance Comparison**
   - This month vs last month
   - This month vs annual average
   - Trend analysis

5. **Recommendations**
   - Areas for improvement
   - Capacity planning needs
   - Process improvements

### Distribution

- Engineering leads
- Product team
- Customers (if SLA contract exists)
- Management

---

## 9. Tools & Queries

### Datadog Queries

```javascript
// Uptime % (last 30 days)
100 - avg:http.requests.error_rate{env:production}

// Latency P95
p95:http.request.duration{env:production}

// Error Rate %
avg:http.requests.error_rate{env:production}

// Database availability
100 * (1 - (sum:db.connection.errors / rate(sum:http.requests.total)))

// Cache hit rate
cache.hit_rate{cache_name:redis}
```

### Prometheus Queries

```promql
# Uptime % (1 hour)
(1 - (increase(http_requests_errors_total[1h]) / increase(http_requests_total[1h]))) * 100

# Latency P95
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

# Error rate %
(increase(http_requests_errors_total[5m]) / increase(http_requests_total[5m])) * 100

# SLA compliance (monthly)
(1 - (sum(increase(http_requests_errors_total[30d])) / sum(increase(http_requests_total[30d])))) * 100
```

---

## 10. Contatos e Escalation

### On-Call Contacts

| Priority | Contact | Response Time |
|----------|---------|----------------|
| P0 | PagerDuty on-call | < 5 min |
| P1 | Engineering team | < 15 min |
| P2 | Slack #alerts | < 1 hour |

### Management Escalation

- SLA breach → Engineering Lead
- Multiple P0 in week → CTO
- Pattern of failures → Architecture review

---

## Referências

- [SLA 101](https://uptime.is/)
- [Measuring Uptime](https://www.datadoghq.com/blog/how-to-measure-uptime/)
- [P95 Latency Targets](https://www.hyperisland.se/what-is-p95-latency/)
- [Error Budget Concept](https://landing.google.com/sre/sre-book/chapters/motivating-policy-and-process/)

---

**Versão**: 1.0  
**Próxima revisão**: 2026-08-27
