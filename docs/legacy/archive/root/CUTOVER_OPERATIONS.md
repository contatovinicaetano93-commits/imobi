# CUTOVER OPERATIONS — imobi 2026-06-02

**Master Index para operações de cutover em produção**

---

## 📋 DOCUMENTOS ESSENCIAIS

### 1. 🎯 [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md)

**O GUIA COMPLETO** — Leia PRIMEIRO

Contém:
- Setup detalhado de cada dashboard (Sentry, Vercel, CloudWatch)
- Scripts de health check prontos para usar
- Configuração de alertas e escalação
- Timeline hora-a-hora durante o cutover
- Troubleshooting rápido para cada problema
- **Tamanho**: ~40 KB (documento extenso mas estruturado)

**Quando usar**: Referência durante todo o cutover

---

### 2. 🚀 [CUTOVER_EXECUTIVE_SUMMARY.md](./docs/CUTOVER_EXECUTIVE_SUMMARY.md)

**PARA O CTO** — Leia se você é o tomador de decisão

Contém:
- O plano em 1 página
- Critérios de sucesso
- Matriz de escalação
- Riscos e mitigações
- Procedimento de rollback
- Sign-off de aprovação

**Quando usar**: Antes do cutover, para entender risco/benefício

---

### 3. ✅ [CUTOVER_CHECKLIST.md](./docs/CUTOVER_CHECKLIST.md)

**PARA IMPRIMIR** — Marque conforme progride

Contém:
- Checklist 48h antes
- Checklist 24h antes
- Checklist 1h antes
- Checklist hora-a-hora durante cutover (T+0 a T+240 min)
- Troubleshooting durante cutover
- Espaço para anotações

**Quando usar**: Imprima e marque cada checkbox durante operação

---

### 4. ⚡ [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md)

**COLINHA RÁPIDA** — Cole na parede ou abra em abinha

Contém:
- URLs críticas
- Métricas (green/yellow/red)
- Escalation matrix
- Comandos rápidos
- Árvore de decisão
- Contatos de emergência
- Timestamps da timeline

**Quando usar**: Durante cutover, para referência rápida

---

### 5. 📊 [CUTOVER_SENTRY_ALERTS.json](./docs/CUTOVER_SENTRY_ALERTS.json)

**CONFIGURAÇÃO DE ALERTAS** — JSON para referência

Contém:
- 4 alert rules (P1, P2, P3, info)
- Dashboard widget configuration
- Slack integration setup
- Custom tags e filters

**Quando usar**: Ao configurar alertas no Sentry

---

## 📂 SCRIPTS PRONTOS

### [scripts/cutover-health-check.sh](./scripts/cutover-health-check.sh)

**Health check automatizado** — Terminal, 5s interval

Verifica:
- ✅ API /health endpoint
- ✅ Database connectivity
- ✅ Redis cache
- ✅ S3 bucket access
- ✅ DNS resolution
- ✅ Web frontend

**Como usar**:
```bash
chmod +x scripts/cutover-health-check.sh

# Sem alertas (apenas terminal)
./scripts/cutover-health-check.sh

# Com alertas Slack
export ALERT_WEBHOOK="https://hooks.slack.com/services/..."
./scripts/cutover-health-check.sh

# Customizar intervalo (default 5s)
CHECK_INTERVAL=10 ./scripts/cutover-health-check.sh
```

Output:
```
═══════════════════════════════════════════════════════════
IMOBI Cutover Health Check — 2026-06-02 01:30:45 UTC
═══════════════════════════════════════════════════════════

  API Health (https://api.imobi.com.br/health): ✅ ok
  Database connectivity: ✅ Connected
  Redis cache: ✅ Connected
  S3 bucket (imbobi-evidencias-prod): ✅ Accessible
  DNS resolution (api.imobi.com.br): ✅ Resolved
  Web frontend (https://imobi.com.br): ✅ 200 OK

🟢 ALL SYSTEMS OPERATIONAL (6/6)

Stats:
  Checks completed: 42
  Uptime: 3m 30s
  Next check in: 5s
```

---

### [scripts/cutover-load-test.js](./scripts/cutover-load-test.js)

**Load test com k6** — Validar infra ANTES do cutover

Simula:
- 1000 concurrent users
- 10 minutos total
- Ramp up gradual (0 → 1000 users)
- Validação de thresholds

**Como executar** (24h antes):
```bash
# Instalar k6 se ainda não tiver
# https://k6.io/docs/getting-started/installation/

k6 run \
  -e API_URL=https://api.imobi.com.br \
  scripts/cutover-load-test.js \
  --out json=cutover-load-test-results.json
```

**Esperado**:
```
  ✅ p95 latency: < 200ms
  ✅ Error rate: < 1%
  ✅ No 5xx errors
  ✅ Cache hit ratio: > 80%
```

---

## 🎯 COMO USAR ESTE ÍNDICE

### Situação 1: "Preciso entender o plano geral"

1. Leia: [CUTOVER_EXECUTIVE_SUMMARY.md](./docs/CUTOVER_EXECUTIVE_SUMMARY.md) (5 min)
2. Review: [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md) (3 min)

### Situação 2: "Quero configurar os dashboards"

1. Leia: [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) Seção "Setup Detalhado"
2. Use: [CUTOVER_SENTRY_ALERTS.json](./docs/CUTOVER_SENTRY_ALERTS.json) para config Sentry
3. Check: [CUTOVER_CHECKLIST.md](./docs/CUTOVER_CHECKLIST.md) "PRÉ-CUTOVER" (48h)

### Situação 3: "É dia do cutover, o que fazer?"

1. Print: [CUTOVER_CHECKLIST.md](./docs/CUTOVER_CHECKLIST.md)
2. Abra: [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md) em abinha
3. Rode: `./scripts/cutover-health-check.sh` em terminal
4. Marque checkboxes conforme progride
5. Consulte: [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) seção "Timeline"

### Situação 4: "Algo deu errado, o que fazer?"

1. Consulte: [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md) "DECISION TREE"
2. Se escalação: [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) seção "Troubleshooting"
3. Se rollback: [CUTOVER_EXECUTIVE_SUMMARY.md](./docs/CUTOVER_EXECUTIVE_SUMMARY.md) "Rollback Procedure"

---

## 📋 CHECKLIST PRÉ-CUTOVER (1 SEMANA ANTES)

- [ ] Todos os documentos revistos e aprovados
- [ ] [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) impresso (40 KB)
- [ ] [CUTOVER_CHECKLIST.md](./docs/CUTOVER_CHECKLIST.md) impresso para uso no dia
- [ ] [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md) copiado para parede/monito
- [ ] [CUTOVER_EXECUTIVE_SUMMARY.md](./docs/CUTOVER_EXECUTIVE_SUMMARY.md) lido pelo CTO
- [ ] Scripts `cutover-health-check.sh` e `cutover-load-test.js` testados
- [ ] Todos URLs links verificados
- [ ] Contatos de emergência atualizados
- [ ] CTO assinou sign-off em EXECUTIVE_SUMMARY.md

---

## 🔗 ESTRUTURA DE ARQUIVOS

```
/home/user/imobi/
├── CUTOVER_OPERATIONS.md                 ← Você está aqui
├── MONITORING_DASHBOARD_SETUP.md         ← Guia completo (LEIA PRIMEIRO)
├── scripts/
│   ├── cutover-health-check.sh          ← Health check script
│   └── cutover-load-test.js             ← Load test script
└── docs/
    ├── CUTOVER_EXECUTIVE_SUMMARY.md     ← Para CTO
    ├── CUTOVER_CHECKLIST.md             ← Para imprimir
    ├── CUTOVER_QUICK_REFERENCE.md       ← Colinha rápida
    └── CUTOVER_SENTRY_ALERTS.json       ← Config de alertas
```

---

## 📊 QUICK STATS

| Item | Valor |
|------|-------|
| Data de cutover | 2026-06-02 00:00 UTC |
| Duração esperada | 4 horas |
| Dashboards a monitorar | 5 |
| Health checks | 6 |
| Scripts prontos | 2 |
| Alert rules | 4 |
| Documentos | 6 |
| Team size | 4 pessoas |

---

## ⏰ TIMELINE (RESUMIDO)

```
2026-05-31 00:00 UTC  → PRÉ-CUTOVER CHECKS (48h antes)
2026-06-01 00:00 UTC  → FINAL VALIDATIONS (24h antes)
2026-06-01 23:00 UTC  → TEAM STANDBY (1h antes)
2026-06-02 00:00 UTC  → 🚀 CUTOVER START
2026-06-02 00:15 UTC  → Canary check (1% traffic)
2026-06-02 00:30 UTC  → Health check sweep
2026-06-02 01:00 UTC  → Ramp to 50% traffic
2026-06-02 01:30 UTC  → Ramp to 100% traffic
2026-06-02 02:00 UTC  → Post-deploy validation
2026-06-02 03:00 UTC  → DECLARE SUCCESS (se tudo OK)
2026-06-02 03:30 UTC  → Handoff to on-call
2026-06-02 04:00 UTC  → Team can step away
2026-06-03 10:00 UTC  → Postmortem meeting
```

---

## 🎓 TRAINING

### Para DevOps

1. Leia: [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) seção "Setup Detalhado" (Vercel + CloudWatch)
2. Estude: [CUTOVER_CHECKLIST.md](./docs/CUTOVER_CHECKLIST.md) role DevOps
3. Practice: Load test script + dry-run de deploy

### Para SRE

1. Leia: [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) seção "Sentry" + "Scripts"
2. Configure: Sentry alerts (usando CUTOVER_SENTRY_ALERTS.json)
3. Test: Health check script + Slack integration

### Para Tech Lead

1. Leia: [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) seção "Troubleshooting"
2. Entenda: Decision tree em [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md)
3. Prepare: Scripts para kill stuck connections, etc

### Para CTO

1. Leia: [CUTOVER_EXECUTIVE_SUMMARY.md](./docs/CUTOVER_EXECUTIVE_SUMMARY.md) (tudo)
2. Assine: Sign-off no final do documento
3. Revise: [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md) "Emergency Contacts"

---

## 🆘 SUPPORT

### Dúvidas sobre setup?

→ Veja [MONITORING_DASHBOARD_SETUP.md](./MONITORING_DASHBOARD_SETUP.md) "Setup Detalhado por Plataforma"

### Dúvidas durante cutover?

→ Veja [CUTOVER_QUICK_REFERENCE.md](./docs/CUTOVER_QUICK_REFERENCE.md) "Decision Tree"

### Precisa rollback?

→ Veja [CUTOVER_EXECUTIVE_SUMMARY.md](./docs/CUTOVER_EXECUTIVE_SUMMARY.md) "Rollback Procedure"

### Problema não mencionado?

→ Slack @cto ou email cto@imobi.com.br

---

## ✅ APPROVALS

```
CTO Approval:
Name: ____________________________
Signature: ________________________
Date: 2026-05-29

DevOps Lead Approval:
Name: ____________________________
Signature: ________________________
Date: 2026-05-29

SRE Lead Approval:
Name: ____________________________
Signature: ________________________
Date: 2026-05-29
```

---

## 📞 EMERGENCY CONTACTS

```
CTO:              [Name] — [Phone] — [Email]
DevOps Lead:      [Name] — [Phone] — [Email]
SRE On-Call:      [Name] — [Phone] — [Email]
Backend Lead:     [Name] — [Phone] — [Email]

Escalation:
Level 1: Slack #ops-critical (everyone)
Level 2: Call DevOps Lead (voice)
Level 3: Call CTO (if DevOps unavailable)
Level 4: Page on-call via PagerDuty
```

---

## 🎯 FINAL CHECKLIST (ANTES DE COMEÇAR)

- [ ] Todos os documentos lidos
- [ ] Todos os scripts testados
- [ ] Dashboards Sentry, Vercel, CloudWatch criados
- [ ] Health check script funcionando
- [ ] Load test passou
- [ ] Team treinado
- [ ] Slack channels prontos
- [ ] Escalation contacts confirmados
- [ ] Rollback procedure testada (dry-run)
- [ ] CTO deu sinal verde: ✅ GO

---

## 🚀 READY TO GO!

Se chegou aqui e tudo está checado:

**VOCÊ ESTÁ PRONTO PARA O CUTOVER** ✅

Boa sorte! 🍀

---

**Última atualização**: 2026-05-29  
**Próxima atualização**: Após postmortem de cutover  
**Versão**: 1.0 (Production)
