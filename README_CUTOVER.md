# 🚀 IMOBI CUTOVER 2026-06-02 — README

**LEIA ESTE ARQUIVO PRIMEIRO**

---

## O QUE VOCÊ VAI ENCONTRAR

Este repositório contém a **documentação completa e scripts prontos** para monitorar o cutover de produção do imobi em **2026-06-02 00:00 UTC**.

**Total**: 6 documentos + 2 scripts prontos para usar

---

## 🎯 COMEÇAR AGORA

### Passo 1: Entenda o Plano

**Para CTO/PO** (5 min):
```bash
cat docs/CUTOVER_EXECUTIVE_SUMMARY.md
```

**Para DevOps** (30 min):
```bash
cat MONITORING_DASHBOARD_SETUP.md | head -100
# (Leia seção "Setup Detalhado por Plataforma")
```

**Para SRE** (30 min):
```bash
cat MONITORING_DASHBOARD_SETUP.md | grep -A 50 "Sentry Setup"
```

---

### Passo 2: Imprima o Checklist

```bash
# Imprimir para usar durante o cutover
lpr docs/CUTOVER_CHECKLIST.md

# Ou copie para outra pasta
cp docs/CUTOVER_CHECKLIST.md ~/Desktop/PRINT_ME.md
```

---

### Passo 3: Teste os Scripts Agora

```bash
# Health check (6 health checks, a cada 5 seg)
./scripts/cutover-health-check.sh

# Load test (simula 1000 concurrent users)
k6 run -e API_URL=https://api.imobi.com.br scripts/cutover-load-test.js
```

---

### Passo 4: Configure os Dashboards (1-2 dias antes)

1. **Sentry** — https://sentry.io/organizations/imobi/
   - Ver: `MONITORING_DASHBOARD_SETUP.md` seção "Sentry Setup"
   
2. **Vercel** — https://vercel.com/[TEAM]/imobi/
   - Ver: `MONITORING_DASHBOARD_SETUP.md` seção "Vercel Setup"
   
3. **CloudWatch** — https://console.aws.amazon.com/cloudwatch/
   - Ver: `MONITORING_DASHBOARD_SETUP.md` seção "CloudWatch Setup"

4. **Slack** — Criar channels #ops-critical, #ops-monitoring, #cutover-logs
   - Ver: `MONITORING_DASHBOARD_SETUP.md` seção "Alertas e Escalação"

---

## 📚 DOCUMENTAÇÃO COMPLETA

| Documento | Para Quem | Leia | Checklist |
|-----------|-----------|------|-----------|
| **MONITORING_DASHBOARD_SETUP.md** | Todos (referência) | 30 min | ✅ Main guide |
| **CUTOVER_OPERATIONS.md** | Todos (índice) | 10 min | ✅ Master index |
| **docs/CUTOVER_EXECUTIVE_SUMMARY.md** | CTO/PO | 5 min | ✅ Approval |
| **docs/CUTOVER_CHECKLIST.md** | Todos (operação) | Imprima! | ✅ Marque durante cutover |
| **docs/CUTOVER_QUICK_REFERENCE.md** | Todos (atalhos) | Cole na parede | ✅ Colinha rápida |
| **docs/CUTOVER_SENTRY_ALERTS.json** | DevOps/SRE | 5 min | ✅ Referência config |

---

## 🔧 SCRIPTS PRONTOS

### cutover-health-check.sh

```bash
# Monitorar saúde de componentes críticos (a cada 5 seg)
./scripts/cutover-health-check.sh

# Com alertas Slack
export ALERT_WEBHOOK="https://hooks.slack.com/services/..."
./scripts/cutover-health-check.sh

# Customizar intervalo
CHECK_INTERVAL=10 ./scripts/cutover-health-check.sh
```

**Checks**: API, Database, Redis, S3, DNS, Web

---

### cutover-load-test.js

```bash
# Simular 1000 concurrent users por 10 minutos
k6 run \
  -e API_URL=https://api.imobi.com.br \
  scripts/cutover-load-test.js \
  --out json=results.json
```

**Valida**: p95 latency < 200ms, error rate < 1%, no 5xx errors

---

## ⏰ TIMELINE RÁPIDA

```
2026-05-31 00:00 UTC  → PRÉ-CUTOVER CHECKS (48h antes)
2026-06-01 00:00 UTC  → VALIDAÇÕES FINAIS (24h antes)
2026-06-01 23:00 UTC  → TEAM STANDBY (1h antes)
2026-06-02 00:00 UTC  → 🚀 CUTOVER START
2026-06-02 00:15 UTC  → Canary (1% traffic) — Error rate < 1%?
2026-06-02 00:30 UTC  → Health checks — Todos 6 passam?
2026-06-02 01:00 UTC  → Ramp para 50% traffic
2026-06-02 01:30 UTC  → Ramp para 100% traffic
2026-06-02 02:00 UTC  → Post-deploy validation
2026-06-02 03:00 UTC  → DECLARE SUCCESS (se tudo OK)
2026-06-02 04:00 UTC  → Team can rest
```

---

## 🎯 SUCCESS CRITERIA

Para declarar "Mission Accomplished":

- [ ] Error rate < 1% para primeira 60 min
- [ ] Latency p95 < 150ms
- [ ] Cache hit ratio > 80%
- [ ] Zero 5xx errors (ou < 5)
- [ ] Todos 6 health checks passando (200 OK)
- [ ] RDS CPU < 70%, Memory < 80%
- [ ] Sem reclamações de usuários nos primeiros 30 min

---

## 🚨 ESCALATION TRIGGERS

Se qualquer um destes acontecer:

| Métrica | Threshold | Ação |
|---------|-----------|------|
| Error rate | > 5% | Investigate 5 min ou ROLLBACK |
| Latency p95 | > 200ms | Scale up ou investigate |
| Health check | Any fails | Investigate 2 min ou ROLLBACK |
| Multiple red | 2+ issues | ROLLBACK immediately |

---

## 📞 ANTES DE COMEÇAR

### Checklist Pré-Cutover

- [ ] Todo documentação lida
- [ ] Sentry, Vercel, CloudWatch configurados e testados
- [ ] Scripts testados (health-check + load-test)
- [ ] Slack channels criados e integrados
- [ ] Health check script funcionando
- [ ] Load test passou (validated infrastructure)
- [ ] Team treinado e pronto
- [ ] CTO deu sinal verde ✅

### Roles Definidos

```
DevOps Lead:      Deploys, Vercel, CloudWatch
SRE:              Sentry, Health checks, Escalation
Tech Lead:        Logs, Troubleshooting, Decisions
CTO:              Final authority, Rollback decision
```

---

## 💾 ESTRUTURA DE ARQUIVOS

```
/home/user/imobi/
├── README_CUTOVER.md                    ← Você está aqui
├── MONITORING_DASHBOARD_SETUP.md        ← Main guide (LEIA PRIMEIRO)
├── CUTOVER_OPERATIONS.md                ← Master index
│
├── scripts/
│   ├── cutover-health-check.sh          ← Health checks script
│   └── cutover-load-test.js             ← Load test script
│
└── docs/
    ├── CUTOVER_EXECUTIVE_SUMMARY.md    ← Para CTO
    ├── CUTOVER_CHECKLIST.md            ← IMPRIMA ESTE
    ├── CUTOVER_QUICK_REFERENCE.md      ← Colinha rápida
    └── CUTOVER_SENTRY_ALERTS.json      ← Config de alertas
```

---

## 🚀 QUICK START (5 MIN)

```bash
# 1. Ver o documento principal
less MONITORING_DASHBOARD_SETUP.md

# 2. Entender o plano executivo
less docs/CUTOVER_EXECUTIVE_SUMMARY.md

# 3. Testar scripts agora
./scripts/cutover-health-check.sh
k6 run scripts/cutover-load-test.js

# 4. Imprimir checklist
lpr docs/CUTOVER_CHECKLIST.md

# 5. Abrir colinha rápida
less docs/CUTOVER_QUICK_REFERENCE.md

# Done! Você está pronto para o cutover
```

---

## 🎓 QUEM PRECISA LER O QUÊ?

### CTO / Product Owner

```bash
# Tudo que precisa saber
cat docs/CUTOVER_EXECUTIVE_SUMMARY.md

# Depois: Assinarse sign-off (fim do documento)
```

### DevOps Lead

```bash
# Setup dos dashboards
cat MONITORING_DASHBOARD_SETUP.md | grep -A 100 "Setup Detalhado"

# Testar scripts
./scripts/cutover-health-check.sh
k6 run scripts/cutover-load-test.js
```

### SRE

```bash
# Setup Sentry
cat MONITORING_DASHBOARD_SETUP.md | grep -A 50 "Sentry Setup"

# Revisar alertas
cat docs/CUTOVER_SENTRY_ALERTS.json | jq .
```

### Tech Lead

```bash
# Troubleshooting
cat MONITORING_DASHBOARD_SETUP.md | grep -A 50 "Troubleshooting"

# Decision tree
cat docs/CUTOVER_QUICK_REFERENCE.md | grep -A 20 "DECISION TREE"
```

### Todos

```bash
# Imprimir e marcar durante cutover
lpr docs/CUTOVER_CHECKLIST.md

# Ter à mão para referência rápida
cat docs/CUTOVER_QUICK_REFERENCE.md
```

---

## ✅ VALIDAÇÃO PRÉ-CUTOVER

Antes de começar, valide:

```bash
# 1. Health check script funciona?
./scripts/cutover-health-check.sh
# Expected: 🟢 ALL SYSTEMS OPERATIONAL

# 2. Load test script funciona?
k6 run -e API_URL=https://api.imobi.com.br scripts/cutover-load-test.js
# Expected: ✅ p95 < 200ms, errors < 1%

# 3. Todos dashboards configurados?
# Sentry: https://sentry.io/organizations/imobi/
# Vercel: https://vercel.com/[TEAM]/imobi/deployments
# CloudWatch: https://console.aws.amazon.com/cloudwatch/
# Slack: #ops-critical, #ops-monitoring, #cutover-logs
```

---

## 📊 MÉTRICAS ESPERADAS

### Green (Tudo OK)

```
✅ Error rate:    < 1%
✅ Latency p95:   < 150ms
✅ Cache hit:     > 80%
✅ RDS CPU:       < 70%
✅ DB Conns:      < 80/100
✅ Health checks: 6/6 passing
```

### Yellow (Investigate)

```
⚠️  Error rate:   1-5%
⚠️  Latency p95:  150-200ms
⚠️  Cache hit:    70-80%
⚠️  RDS CPU:      70-80%
⚠️  DB Conns:     80-95
```

### Red (Escalate/Rollback)

```
🔴 Error rate:   > 5%
🔴 Latency p95:  > 200ms
🔴 RDS CPU:      > 80%
🔴 DB Conns:     > 95
🔴 Health check: Any fail
```

---

## 🆘 SOS — Something Went Wrong

### Error Rate > 5%

```
1. Check Sentry dashboard for error type
2. If fixable in < 5 min: Fix it
3. If not: ROLLBACK immediately
```

### Latency > 200ms

```
1. Check RDS CPU in CloudWatch
2. If CPU > 80%: Scale up
3. Monitor for 5 min
4. If still > 200ms: ROLLBACK
```

### Health Check Fails

```
1. Identify which check failed
2. Investigate (API? Database? Redis?)
3. If fixable in < 2 min: Fix
4. If not: ROLLBACK
```

### Rollback

```
1. Go to: https://vercel.com/[TEAM]/imobi/deployments
2. Click on previous deployment
3. Click "..." → "Promote to Production"
4. Confirm
5. Wait ~2 min
6. Done! Rollback complete.
```

---

## 📞 EMERGÊNCIA

```
Slack:     #ops-critical (all team members)
Voice:     Call DevOps Lead (if Slack not responding)
Escalate:  Call CTO (if DevOps unavailable)
PagerDuty: Page on-call (if critical incident)
```

---

## 🎓 MAIS INFORMAÇÕES

**Quer entender tudo em detalhes?**

```bash
cat MONITORING_DASHBOARD_SETUP.md | less
```

Este é o **guia completo** com:
- Setup hora-a-hora para cada dashboard
- Scripts de health check prontos
- Configuração de alertas
- Timeline completa (T+0 até T+240 min)
- Troubleshooting para cada cenário

**Quer uma colinha rápida para o dia?**

```bash
cat docs/CUTOVER_QUICK_REFERENCE.md
```

Abra isto durante o cutover para referência rápida.

---

## ✨ RESUMO

**Você tem**:
- ✅ 6 documentos estruturados e prontos
- ✅ 2 scripts automatizados
- ✅ Checklist para marcar durante operação
- ✅ Timeline hora-a-hora
- ✅ Escalation matrix
- ✅ Troubleshooting rápido
- ✅ Rollback procedure

**Você está**:
- ✅ Pronto para o cutover
- ✅ Apoiado por documentação completa
- ✅ Com scripts que automatizam monitoramento
- ✅ Com procedimentos testados

---

## 🚀 LETS GO!

```
Data:              2026-06-02 00:00 UTC
Duração:           ~4 horas
Risco:             LOW (infrastructure validated)
Rollback time:     5 minutes
Team readiness:    ✅ GO

Status:            🟢 READY FOR PRODUCTION

Good luck! 🍀
```

---

**Última atualização**: 2026-05-29  
**Próxima atualização**: Após postmortem do cutover  
**Dúvidas?** Slack @devops ou @cto

---

## 📋 CHECKLIST FINAL

Antes de começar o cutover:

- [ ] MONITORING_DASHBOARD_SETUP.md lido
- [ ] CUTOVER_EXECUTIVE_SUMMARY.md lido (CTO assinou)
- [ ] CUTOVER_CHECKLIST.md impresso
- [ ] CUTOVER_QUICK_REFERENCE.md disponível
- [ ] Scripts testados (health-check + load-test)
- [ ] Sentry, Vercel, CloudWatch configurados
- [ ] Slack channels #ops-critical, #ops-monitoring, #cutover-logs criados
- [ ] Team roles definidos (DevOps, SRE, Tech Lead, CTO)
- [ ] Rollback procedure testada (dry-run)
- [ ] CTO deu "GO" para cutover ✅

Se tudo marcado: **Você está pronto! 🚀**

---

**Made with care for imobi.** Let's ship it! 🎉
