# Guia de Deploy - Monitoring & Alerting Imbobi

**Status**: Production Ready  
**Data**: 2026-05-27  
**Objetivo**: Deploy completo de monitoramento em produção em <30 minutos

---

## 1. Resumo Executivo

Este pacote contém um **plano de monitoramento enterprise-grade** para a plataforma Imbobi, incluindo:

✅ **16 alertas críticos** configurados para P0/P1  
✅ **8 dashboards** prontos para análise operacional  
✅ **SLA targets** detalhados (99.5% uptime, <200ms P95, <0.5% error rate)  
✅ **Log aggregation** via Fluent Bit → Datadog + S3  
✅ **Runbooks operacionais** para resposta em produção  
✅ **Instrumentation SDK** pronto para usar na API  
✅ **Stack de fallback** (Prometheus/Grafana) para redundância  

**Custo estimado**: ~$200-500/mês (Datadog standard + infra)

---

## 2. Arquivos Fornecidos

### 📋 Documentação (52KB)
```
MONITORING_PLAN.md          (14K)  - Estratégia completa
SLA_TARGETS.md              (10K)  - SLA definitions & cálculos
RUNBOOKS.md                 (15K)  - On-call procedures (P0-P2)
README.md                   (11K)  - Quick start & troubleshooting
DEPLOYMENT_GUIDE.md         (este) - Step-by-step deploy
```

### ⚙️ Configurações (78KB)
```
datadog-config.yaml         (10K)  - Datadog setup
alerts-datadog.json         (11K)  - 16 production alerts
dashboards.json             (13K)  - 8 pre-built dashboards
docker-compose.monitoring.yml (6K) - Stack composition
```

### 🔧 Instrumentation (38KB)
```
instrumentation.ts          (8K)   - SDK para API
fluent-bit.conf             (5K)   - Log aggregation
prometheus.yml              (2K)   - Prometheus scrape
alertmanager.yml            (9K)   - AlertManager routing
alerting-rules.yml          (12K)  - 35+ alert rules
```

### 🚀 Automation (12KB)
```
setup-monitoring.sh         (12K)  - Setup script automático
```

**Total**: 180KB de configuração, documentação e código pronto para produção

---

## 3. Pré-requisitos

### ✓ Infraestrutura

- [ ] AWS Account (ou GCP/Azure) com acesso
- [ ] EC2 instance (min 2vCPU, 4GB RAM para monitoring stack)
- [ ] RDS PostgreSQL (ou Docker Compose postgres)
- [ ] ElastiCache Redis (ou Docker Compose redis)
- [ ] Load Balancer (ALB ou NLB)
- [ ] VPC com security groups configurados

### ✓ Contas & Credenciais

- [ ] Datadog account (free tier OK para teste)
- [ ] Slack workspace + webhook URL
- [ ] PagerDuty account + API key (P0 escalation)
- [ ] AWS IAM credentials (para S3 logs)
- [ ] SMTP credentials (para email alerts)

### ✓ Ferramentas

```bash
# Verificar instalação
docker --version     # >= 20.10
docker-compose --version  # >= 1.29
curl --version       # Any version
git --version        # Any version

# Opcional mas recomendado
aws --version        # AWS CLI
jq --version         # JSON parser
psql --version       # PostgreSQL client
redis-cli --version  # Redis client
```

---

## 4. Deployment Step-by-Step

### Phase 1: Setup Datadog (5 minutos)

#### 1.1 Criar contas Datadog

```bash
# 1. Ir para https://www.datadoghq.com/free-trial/
# 2. Criar account (free tier OK para teste)
# 3. Select region: US (datadoghq.com) ou EU (datadoghq.eu)

# 4. Obter API keys
# https://app.datadoghq.com/organization/settings/api-keys
# Copiar: DATADOG_API_KEY

# 5. Obter APP keys
# https://app.datadoghq.com/organization/settings/application-keys
# Copiar: DATADOG_APP_KEY
```

#### 1.2 Configurar environment

```bash
# Na raiz do projeto
cp .env.example .env

# Editar .env com credenciais
DATADOG_API_KEY=xxx
DATADOG_APP_KEY=xxx
DATADOG_SITE=datadoghq.com  # ou datadoghq.eu

# Slack (opcional mas recomendado)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# PagerDuty (apenas para P0 escalation)
PAGERDUTY_API_KEY=xxx
PAGERDUTY_SERVICE_ID=xxx
```

#### 1.3 Validar credenciais

```bash
# Test Datadog API
curl -X GET "https://api.datadoghq.com/api/v1/validate" \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}"

# Response esperado:
# {"valid": true}

# Test Slack webhook
curl -X POST "${SLACK_WEBHOOK_URL}" \
  -H 'Content-Type: application/json' \
  -d '{"text":"✅ Monitoring setup test"}'
```

### Phase 2: Deploy Stack (10 minutos)

#### 2.1 Executar setup automático

```bash
# Dar permissão
chmod +x monitoring/setup-monitoring.sh

# Run setup
./monitoring/setup-monitoring.sh datadog

# Opções:
# ./monitoring/setup-monitoring.sh datadog     # Datadog only
# ./monitoring/setup-monitoring.sh prometheus  # Prometheus only
# ./monitoring/setup-monitoring.sh both        # Both (recommended)
```

#### 2.2 Verificar serviços

```bash
# Listar containers
docker-compose ps

# Esperado:
# datadog-agent      Up (3)
# fluent-bit         Up (1)
# prometheus         Up (1)
# alertmanager       Up (1)
# grafana            Up (1)
# jaeger             Up (1)

# Verificar logs
docker logs imbobi_datadog_agent | head -20
docker logs imbobi_fluent_bit | head -20

# Health checks
curl http://localhost:9090/-/healthy      # Prometheus
curl http://localhost:9093/-/healthy      # AlertManager
curl http://localhost:3000/api/health     # Grafana
```

### Phase 3: Instrumentar API (5 minutos)

#### 3.1 Adicionar instrumentation na API

```typescript
// services/api/src/main.ts - NO TOPO do arquivo
import { initializeDatadogTracer } from '@imbobi/monitoring/instrumentation';

// ANTES de qualquer outro código
if (process.env.NODE_ENV === 'production') {
  initializeDatadogTracer();
}

// Resto do código...
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ...
}
```

#### 3.2 Adicionar middleware de métricas

```typescript
// services/api/src/app.module.ts
import { DatadogMetrics } from '@imbobi/monitoring/instrumentation';

@Module({
  providers: [
    {
      provide: 'DATADOG_METRICS',
      useValue: DatadogMetrics,
    },
  ],
})
export class AppModule {}
```

#### 3.3 Rebuild e redeploy API

```bash
# Build docker image
docker build -t imbobi_api:latest services/api/

# Restart
docker-compose restart api

# Verificar
docker logs imbobi_api | grep -i "datadog\|tracer"
```

### Phase 4: Importar Alertas (5 minutos)

#### 4.1 Via Datadog UI (Manual)

```
1. Datadog → Monitors → New Monitor
2. Selecionar alertas de alerts-datadog.json
3. Para cada alerta:
   - Copiar query
   - Definir threshold
   - Configurar notificações
   - Salvar
```

#### 4.2 Via Terraform (Recomendado - Automático)

```bash
# Instalar Terraform
# https://www.terraform.io/downloads.html

# Usar DatadogProvider
# Exemplo:

# main.tf
terraform {
  required_providers {
    datadog = {
      source = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
}

# Importar alerts
resource "datadog_monitor" "error_rate_high" {
  name = "HTTP Error Rate > 5%"
  type = "metric alert"
  query = "avg:http.requests.error_rate{env:production}"
  # ... resto da config
}

# Deploy
terraform apply
```

#### 4.3 Via API Script

```bash
# Script helper (criar arquivo: create-alerts.sh)
#!/bin/bash

# Read alerts from JSON
for alert in $(jq -r '.[].name' monitoring/alerts-datadog.json); do
  # Create alert via API
  curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
    -H "DD-API-KEY: ${DATADOG_API_KEY}" \
    -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}" \
    -d "$alert_config"
done
```

### Phase 5: Importar Dashboards (5 minutos)

#### 5.1 Via Datadog UI

```
1. Datadog → Dashboards → New Dashboard
2. No canto superior → Import Dashboard
3. Copiar conteúdo de dashboards.json
4. Paste e confirmar
5. Dashboards aparecerão em: https://app.datadoghq.com/dashboard
```

#### 5.2 Configurar Datadog API para criar dashboards

```bash
# Usar JSON diretamente
curl -X POST "https://api.datadoghq.com/api/v1/dashboard" \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}" \
  -H "Content-Type: application/json" \
  -d @monitoring/dashboards.json
```

### Phase 6: Testar Alertas (5 minutos)

#### 6.1 Simular erro

```bash
# Trigger error rate spike
for i in {1..100}; do
  curl -s http://api.imbobi.local/force-error & 
done

# Observar no Datadog em 5 minutos
# Alerta "HTTP Error Rate > 5%" deve disparar
```

#### 6.2 Testar notificações

```bash
# Simular alerta no AlertManager
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "critical"
    },
    "annotations": {
      "summary": "Test alert for monitoring setup",
      "description": "If you see this, alerting is working"
    }
  }]'

# Verificar:
# 1. Slack message em #critical-alerts
# 2. Email recebido
# 3. PagerDuty incident criado (se P0)
```

#### 6.3 Verificar métricas fluindo

```bash
# Datadog Metric Explorer
# https://app.datadoghq.com/metric/explorer

# Procurar por:
# - http.request.duration
# - db.query.duration
# - cache.hit_rate
# - system.memory.percent

# Se métricas aparecerem, instrumentação está ok
```

---

## 5. Verificação Pós-Deploy

### ✅ Checklist

- [ ] Datadog Agent está rodando (`docker ps` mostra container)
- [ ] Métricas fluindo (Datadog Metric Explorer tem dados)
- [ ] Alertas criados (Datadog Monitors mostra 16 alertas)
- [ ] Dashboards importados (Datadog Dashboards mostra 8 dashboards)
- [ ] Logs chegando (Datadog Logs tem entries from imbobi-api)
- [ ] Slack notificações testadas
- [ ] PagerDuty integration testada
- [ ] API instrumentada (logs mostram "Datadog Tracer initialized")
- [ ] Prometheus scraping metrics (http://localhost:9090/targets)
- [ ] Grafana acessível (http://localhost:3000)

### 🧪 Teste Funcional

```bash
# 1. Criar request normal
curl http://api.imbobi.local/works

# 2. Aguardar 2 min para métricas fluírem
sleep 120

# 3. Verificar no Datadog
# - APM → Traces (verá chamadas)
# - Logs → imbobi-api (verá log entries)
# - Metrics → http.request.duration (verá latência)

# 4. Trigger alerta (teste de error rate)
for i in {1..200}; do curl -s http://api.imbobi.local/invalid & done

# 5. Aguardar 5 min
# - Alert "HTTP Error Rate > 5%" deve disparar
# - Slack message em #critical-alerts
# - PagerDuty incident (se configurado)
```

---

## 6. Troubleshooting

### ❌ Datadog Agent não conecta

```bash
# Verificar container
docker ps | grep datadog

# Se não aparece
docker logs imbobi_datadog_agent | grep -i "error\|fail"

# Solução
# 1. Verificar DATADOG_API_KEY em .env
# 2. Confirmar region (datadoghq.com vs datadoghq.eu)
# 3. Restart: docker-compose restart datadog-agent
```

### ❌ Métricas não aparecem

```bash
# Verificar se API está enviando
docker logs imbobi_api | grep -i "metric\|statsd"

# Verificar conexão para Datadog Agent
docker exec imbobi_api nc -zu datadog-agent 8125

# Solução
# 1. Confirmar instrumentation.ts importado em main.ts
# 2. Restartar API: docker-compose restart api
# 3. Aguardar 2-3 min para métricas fluírem
```

### ❌ Alertas não disparando

```bash
# Verificar alertas em Datadog
# https://app.datadoghq.com/monitors

# Testar manualmente
curl -X POST "https://api.datadoghq.com/api/v1/monitor/1234/test-alert" \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}"

# Verificar notificações
# Datadog Monitor → Edit → Notifications
# Slack webhook deve estar válida
```

### ❌ Logs não chegando

```bash
# Verificar Fluent Bit
docker logs imbobi_fluent_bit | head -20

# Teste manual de log
echo '{"message":"test","level":"ERROR"}' | \
  docker exec -i imbobi_api curl -X POST http://localhost:3000/logs

# Solução
# 1. Verificar fluent-bit.conf
# 2. Restart: docker-compose restart fluent-bit
# 3. Confirmar DATADOG_API_KEY em Fluent Bit config
```

---

## 7. Operações Contínuas

### Diário
- [ ] Monitorar #critical-alerts Slack
- [ ] Revisar SLA compliance (uptime %, latência P95)
- [ ] Checar se há alertas P1 ou acima

### Semanal
- [ ] Revisar relatório de performance
- [ ] Analisar slow queries
- [ ] Otimizar if necessário

### Mensal
- [ ] Gerar relatório SLA (uptime %, latência, error rate)
- [ ] Revisar alertas para ruído (false positives)
- [ ] Atualizar runbooks
- [ ] Capacity planning

### Trimestral
- [ ] Revisão de SLA targets
- [ ] Disaster recovery drill
- [ ] Otimização de custos Datadog

---

## 8. Custos Estimados

### Datadog (US pricing)

| Component | Volume | Cost/mês |
|-----------|--------|----------|
| Custom Metrics | 10 | $30 |
| APM (100k spans/day) | 100k | $100 |
| Logs | 50GB | $60 |
| Monitoring (16 alerts) | 16 | $50 |
| **Subtotal** | | **$240** |
| Discount (-10%) | | **-$24** |
| **Total Datadog** | | **~$216** |

### Infraestrutura (AWS)

| Resource | Type | Cost/mês |
|----------|------|----------|
| EC2 (Monitoring Agent) | t3.medium | $30 |
| S3 (Log Storage) | 500GB | $12 |
| Data Transfer | Out | $10 |
| **Total AWS** | | **~$52** |

### **Custo Total: ~$270/mês** (pode variar)

---

## 9. Próximos Passos

### Imediato (hoje)
1. [ ] Executar setup script
2. [ ] Validar alertas disparando
3. [ ] Testar notificações (Slack, Email, PagerDuty)
4. [ ] Documentar contatos on-call

### Curto prazo (próximos 7 dias)
1. [ ] Treinar time em runbooks (RUNBOOKS.md)
2. [ ] Setup on-call rotations em PagerDuty
3. [ ] Validar SLA targets em SLA_TARGETS.md
4. [ ] Ajustar threshold de alertas

### Médio prazo (próximos 30 dias)
1. [ ] Otimizar slow queries baseado em dados
2. [ ] Implementar caching strategies
3. [ ] Revisar e atualizar dashboards
4. [ ] Capacity planning baseado em trends

### Longo prazo (trimestral)
1. [ ] Disaster recovery testing
2. [ ] Custo optimization Datadog
3. [ ] Upgrade alerting (webhooks customizados, etc)
4. [ ] Machine learning anomaly detection

---

## 10. Suporte & Referências

### Documentação Interna
- `MONITORING_PLAN.md` - Estratégia completa
- `SLA_TARGETS.md` - SLA definitions
- `RUNBOOKS.md` - On-call procedures
- `README.md` - Quick reference

### Documentação Externa
- [Datadog Docs](https://docs.datadoghq.com)
- [dd-trace SDK](https://github.com/DataDogHQ/dd-trace-js)
- [Prometheus Docs](https://prometheus.io/docs)
- [Fluent Bit Docs](https://docs.fluentbit.io)

### Contatos
- **DevOps Lead**: devops@imbobi.com
- **On-Call**: Via PagerDuty
- **Issues**: GitHub issue tracker com label `monitoring`

---

## 11. Checklist Final

```
🚀 PRÉ-DEPLOY
  [ ] Datadog account criada
  [ ] Credenciais documentadas
  [ ] Slack webhook testada
  [ ] PagerDuty service criado
  [ ] AWS S3 bucket para logs

🔧 DURANTE DEPLOY
  [ ] Setup script executado
  [ ] Containers rodando
  [ ] API instrumentada
  [ ] Alertas criados
  [ ] Dashboards importados

✅ PÓS-DEPLOY
  [ ] Métricas fluindo
  [ ] Alertas disparando
  [ ] Notificações funcionando
  [ ] Testes passando
  [ ] Documentação atualizada

📚 OPERAÇÕES
  [ ] On-call treinado
  [ ] Runbooks documentados
  [ ] SLA targets confirmados
  [ ] Plano de capacidade definido
```

---

**Pronto para começar?** Execute `./monitoring/setup-monitoring.sh` e em 30 minutos você terá monitoramento enterprise em produção! 🎉

---

**Versão**: 1.0  
**Data**: 2026-05-27  
**Próxima revisão**: 2026-08-27
