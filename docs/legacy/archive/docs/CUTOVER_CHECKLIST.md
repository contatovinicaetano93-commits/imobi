# CUTOVER CHECKLIST — imobi 2026-06-02

**Data de cutover**: 2026-06-02 00:00 UTC  
**Imprimir este documento e marcar conforme progride**

---

## PRÉ-CUTOVER (48h Antes — 2026-05-31)

### Setup de Dashboards

- [ ] Sentry dashboard criado: `https://sentry.io/organizations/imobi/dashboards/`
- [ ] Sentry alert rules configuradas (P1, P2, P3)
- [ ] Sentry integração Slack testada
- [ ] Vercel deployment page aberto
- [ ] CloudWatch dashboard criado: `imobi-production-cutover`
- [ ] CloudWatch alarmes configurados (RDS CPU, ElastiCache, Connections)
- [ ] Health check scripts testados
- [ ] Load test script k6 funcional

### Infraestrutura & Configurações

- [ ] Sentry DSN configurado em `.env.production`
- [ ] Sentry RELEASE configurado (git SHA)
- [ ] AWS credenciais OK (S3 access test)
- [ ] RDS security groups OK (app pode conectar)
- [ ] ElastiCache security groups OK (app pode conectar)
- [ ] DNS registros verificados (nslookup)
- [ ] S3 bucket permissions OK

### Team & Comunicação

- [ ] Slack canais criados: `#ops-critical`, `#ops-monitoring`, `#cutover-logs`
- [ ] Team no Slack (todos membros adicionados)
- [ ] Kontatos de emergência documentados
- [ ] PagerDuty escalation policy OK (se usar)
- [ ] Email notificações testadas

### Testes & Validações

- [ ] Load test executado (10 min, 1000 concurrent users)
- [ ] Load test passou todos thresholds
- [ ] Health check script rodando sem erros
- [ ] Rollback procedure testado (dry-run)
- [ ] Commit SHA da produção atual anotado: `________`
- [ ] Vercel rollback link pronto: `https://vercel.com/[TEAM]/imobi/settings/git`

### Documentação & Procedures

- [ ] Este checklist impresso
- [ ] MONITORING_DASHBOARD_SETUP.md acessível
- [ ] Rollback procedure documentado e visível
- [ ] Emergency contacts list visível
- [ ] Runbook de troubleshooting disponível

---

## 24h ANTES (2026-06-01 00:00 UTC)

### Final Validations

- [ ] Load test executado novamente ✓
- [ ] Todos dashboards recarregados e revistos
- [ ] Credenciais Sentry, Vercel, AWS testadas
- [ ] Slack webhooks testados (send test message)
- [ ] PagerDuty integração testada (se usar)
- [ ] Email notificações confirmadas

### Team Readiness

- [ ] Standup com toda team: "Everyone ready?"
- [ ] Definir owners por dashboard:
  - Sentry: `____________`
  - Vercel: `____________`
  - CloudWatch: `____________`
  - Health checks: `____________`
- [ ] Escalation contacts confirmados
- [ ] Todos têm link para Slack emergency channel
- [ ] CTO/Lead confirmou "GO" para cutover

### Last Minute Checks

- [ ] Zero commits para `main` branch após agora
- [ ] Production database backup verificado
- [ ] Disaster recovery plan acessível
- [ ] Support team notificado (será inativo durante cutover)

---

## 1h ANTES (2026-06-01 23:00 UTC)

### Dashboards Online

- [ ] Sentry dashboard aberto em browser
- [ ] Vercel deployments page aberto (NÃO fazer deploy ainda!)
- [ ] CloudWatch dashboard aberto
- [ ] Health check script pronto para rodar em terminal
- [ ] Slack channels visíveis (#ops-critical, #ops-monitoring)

### Team Ready

- [ ] Equipe no Slack (online)
- [ ] Equipe em call (Zoom/Teams, audio ligado)
- [ ] Cada pessoa sabe seu role:
  - DevOps: Deploy + infra monitoring
  - SRE: Sentry + health checks
  - Tech Lead: Logs + troubleshooting
  - CTO: Decisão final (go/no-go/rollback)
- [ ] Bathroom breaks feitos :)
- [ ] Café/água pronto

### Final Systems Check

- [ ] API endpoint respondendo (curl $API_URL/health)
- [ ] Database conectando (SELECT 1;)
- [ ] Redis conectando (redis-cli ping)
- [ ] S3 acessível (aws s3api head-bucket)
- [ ] DNS resolvendo (nslookup api.imobi.com.br)
- [ ] Web frontend carregando (https://imobi.com.br)

### Documents & Links

- [ ] MONITORING_DASHBOARD_SETUP.md impresso e visível
- [ ] Emergency contacts list visível
- [ ] Rollback procedure visível
- [ ] URLs importantes abertas:
  - Sentry: `_____`
  - Vercel: `_____`
  - CloudWatch: `_____`
  - Slack: `_____`

### FINAL GO/NO-GO

- [ ] DevOps: "Green light?"
- [ ] SRE: "Green light?"
- [ ] Tech Lead: "Green light?"
- [ ] CTO: **"GO FOR CUTOVER"** ✓

---

## DURANTE CUTOVER (2026-06-02 00:00-04:00 UTC)

### 00:00 UTC — CUTOVER START

```
⏱️ T+0 min: CUTOVER INITIATED
```

- [ ] Devops pessoa: Deploy iniciado em Vercel (click green button)
- [ ] SRE pessoa: Sentry dashboard aberto em segundo monitor
- [ ] Tech Lead pessoa: Terminal com health check script aberto
- [ ] CTO pessoa: Slack #ops-critical visível, call ligada
- [ ] Slack #cutover-logs: POST "🚀 CUTOVER STARTED at 2026-06-02 00:00 UTC"

### 00:05 UTC — Monitorar Build

```
⏱️ T+5 min: BUILD IN PROGRESS
```

- [ ] Vercel build iniciado (watch logs)
- [ ] Procurar por erros na build: Ctrl+F "error", "fail"
- [ ] Build deve terminar em < 5 min
- [ ] Se build > 10 min: Slack alert "Build taking longer than expected"

**Checklist**:
- [ ] Build não teve failures
- [ ] Todos checks passaram (verde)
- [ ] Deploy para production iniciado

### 00:15 UTC — CANARY CHECK (1% Traffic)

```
⏱️ T+15 min: CANARY DEPLOYMENT
```

- [ ] Vercel: Deployment 90% completo
- [ ] Sentry: Watch para primeiros erros
- [ ] Health check: Rodando (check output)
- [ ] Esperado: Latency p95 < 150ms, Error < 1%

**Slack #cutover-logs POST**:
```
:mag: T+15 min: Canary check (1% traffic)
  Error rate: [check Sentry]
  Latency p95: [check CloudWatch]
  Health checks: [check script output]
  Status: [GREEN/YELLOW/RED]
```

### 00:30 UTC — HEALTH CHECK SWEEP

```
⏱️ T+30 min: HEALTH VALIDATION
```

- [ ] API /health endpoint: ✅ 200 OK
- [ ] Database connectivity: ✅ Connected
- [ ] Redis connectivity: ✅ Connected
- [ ] S3 bucket: ✅ Accessible
- [ ] DNS resolution: ✅ Resolved
- [ ] Web frontend: ✅ Loads OK
- [ ] Firebase: ✅ Configured

**If any check fails**:
- [ ] Slack alert immediately: "❌ Health check failed: [check]"
- [ ] CTO evaluates: Fix or Rollback?

**Slack #cutover-logs POST**:
```
:white_check_mark: T+30 min: Health check sweep
  All 6 checks: ✅ PASSING
  No issues detected.
  Proceeding to 50% traffic ramp.
```

### 00:45 UTC — Load Test Validation

```
⏱️ T+45 min: VALIDATE UNDER LOAD
```

- [ ] Review CloudWatch RDS metrics:
  - [ ] CPU < 70%
  - [ ] Memory < 80%
  - [ ] Connections < 95
  - [ ] No sudden spikes

- [ ] Review CloudWatch ElastiCache:
  - [ ] Memory < 80%
  - [ ] Evictions ~0 or < 10/sec
  - [ ] Hit ratio > 80%

- [ ] Review Sentry:
  - [ ] Error rate still < 1%
  - [ ] Latency p95 < 150ms
  - [ ] No new error types

**Slack #cutover-logs POST**:
```
:chart_with_upwards_trend: T+45 min: Load metrics review
  RDS CPU: XX% (target < 70%)
  RDS Mem: XX% (target < 80%)
  Cache Hit: XX% (target > 80%)
  Error Rate: X.X% (target < 1%)
  Latency p95: XXms (target < 150ms)
  Assessment: [PROCEED/SCALE_UP/INVESTIGATE]
```

### 01:00 UTC — RAMP TO 50% TRAFFIC

```
⏱️ T+60 min: HALF TRAFFIC
```

- [ ] Vercel: 100% deployment completo (all users on new version)
- [ ] Iniciar ramp para 50% traffic (ou pode ser 100% direto se metrics OK)
- [ ] Monitor próximos 15 min intensamente

**Decision point**: 
- [ ] Metrics OK? → Proceed to 100%
- [ ] Issues detected? → Investigate or Rollback

**Slack #cutover-logs POST**:
```
:arrow_heading_up: T+60 min: Ramping to 50% traffic
  Current metrics: [GOOD/CONCERNING]
  RDS: [OK/WATCH]
  Cache: [OK/WATCH]
  Errors: [OK/WATCH]
  Decision: [PROCEED_TO_100/STAY_AT_50/ROLLBACK]
```

### 01:30 UTC — RAMP TO 100% TRAFFIC

```
⏱️ T+90 min: FULL TRAFFIC
```

- [ ] Traffic ramped to 100%
- [ ] Monitor error rate closely (next 15 min critical)
- [ ] Watch Sentry for anomalies
- [ ] Watch CloudWatch for load spikes

**Metrics checklist**:
- [ ] Error rate < 1% (or stable)
- [ ] Latency p95 < 200ms (allowing some headroom)
- [ ] No 5xx errors or < 5
- [ ] Database healthy (CPU < 80%, connections < 90)
- [ ] Cache hit ratio > 80%

### 01:45 UTC — STABILITY CHECK (10 min)

```
⏱️ T+105 min: STABILITY WINDOW
```

- [ ] Monitor all metrics for 10 min straight (no looking away!)
- [ ] Error rate steady? ✅
- [ ] Latency consistent? ✅
- [ ] No anomalies? ✅
- [ ] User feedback? ✅ (ask in support Slack)

**Slack #cutover-logs POST**:
```
:hourglass: T+105 min: Stability check window (10 min)
  Monitoring metrics closely...
  [Continuous updates every 2 min]
```

### 02:00 UTC — POST-DEPLOY VALIDATION

```
⏱️ T+120 min: SMOKE TESTS
```

- [ ] Run manual smoke tests:
  - [ ] Create test account → Success?
  - [ ] Login → Success?
  - [ ] Navigate main flows → Success?
  - [ ] API endpoints → Success?

- [ ] Check Sentry for critical errors:
  - [ ] Any new error types? NO ✅
  - [ ] Error rate trending down? YES ✅
  - [ ] Performance normal? YES ✅

**Slack #cutover-logs POST**:
```
:white_check_mark: T+120 min: Post-deploy validation
  Manual smoke tests: ✅ ALL PASSED
  Sentry metrics: ✅ NORMAL
  User feedback: ✅ NO ISSUES
  Assessment: ✅ STABLE
```

### 02:30 UTC — INFRASTRUCTURE HEALTH

```
⏱️ T+150 min: INFRA CHECK
```

- [ ] RDS CPU trend: Stable? Increasing? Decreasing?
- [ ] RDS Memory trend: Stable or growing?
- [ ] DB Connections: Stable?
- [ ] Redis Evictions: None or minimal?
- [ ] Cache hit ratio: > 80%?

**If trends look good**:
- [ ] Continue normal operations
- [ ] Reduce monitoring frequency (every 30 min instead of 5 min)

**Slack #cutover-logs POST**:
```
:computer: T+150 min: Infrastructure health review
  RDS: ✅ Healthy (CPU X%, Mem X%, Connections X)
  Redis: ✅ Healthy (Evictions ~0, Hit X%)
  Network: ✅ Normal
  Assessment: ✅ GOOD FOR HANDOFF
```

### 03:00 UTC — FINAL VALIDATION

```
⏱️ T+180 min: DECLARE SUCCESS
```

- [ ] All metrics normal for 60+ minutes? ✅
- [ ] Zero critical issues? ✅
- [ ] Error rate < 1%? ✅
- [ ] No user complaints? ✅
- [ ] Team confidence: Go/No-go?

**CTO Decision**:
- [ ] **GO: MISSION ACCOMPLISHED** 🎉
- [ ] Continue monitoring but reduce frequency
- [ ] Schedule postmortem for 48h later

**Slack #cutover-logs POST**:
```
:tada: T+180 min: MISSION ACCOMPLISHED!

🚀 IMOBI CUTOVER SUCCESSFUL 🚀

All systems operational:
  ✅ Error rate: < 1%
  ✅ Latency: < 150ms
  ✅ Cache hit: > 80%
  ✅ Infrastructure: Healthy
  ✅ User feedback: Positive

Handoff to on-call team at T+210 min (03:30 UTC).
Postmortem scheduled: 2026-06-03 10:00 UTC
```

### 03:30 UTC — Handoff to On-Call

```
⏱️ T+210 min: HANDOFF
```

- [ ] All dashboards left open for on-call team
- [ ] Slack channels monitored (continue hourly checks)
- [ ] Runbooks accessible (link in Slack pinned message)
- [ ] On-call engineer briefed on status
- [ ] Contacts for escalation clear

### 04:00 UTC — Stand Down (if all OK)

```
⏱️ T+240 min: END OF CUTOVER WINDOW
```

- [ ] Team can step away (rotating on-call takes over)
- [ ] Celebrate! 🎉 (deserved!)
- [ ] Schedule postmortem meeting
- [ ] Start documentation of lessons learned

---

## POST-CUTOVER (24-48h Depois)

### Postmortem (2026-06-03 10:00 UTC)

- [ ] Attend postmortem meeting
- [ ] Review what went well
- [ ] Identify issues and root causes
- [ ] Propose improvements for next cutover
- [ ] Update runbooks and procedures

### Documentation

- [ ] Update MONITORING_DASHBOARD_SETUP.md com learnings
- [ ] Update this checklist com what worked
- [ ] Document any config changes made during cutover
- [ ] Share postmortem with team

---

## TROUBLESHOOTING DURING CUTOVER

### Error Rate Spiking (> 5%)

```
IMMEDIATE ACTIONS:
1. [ ] Screenshot Sentry top errors
2. [ ] Check error type (all same? diverse?)
3. [ ] Check RDS status (CPU, memory, connections)
4. [ ] Slack alert to @cto
5. DECISION: Investigate 5 min or ROLLBACK?

If investigating:
6. [ ] Check application logs
7. [ ] Kill stuck connections if needed
8. [ ] Scale up RDS if CPU high

If error rate doesn't drop in 5 min:
9. [ ] ROLLBACK (follow procedure below)
```

### Latency Spiking (p95 > 200ms)

```
IMMEDIATE ACTIONS:
1. [ ] Check CloudWatch RDS metrics
2. [ ] Check if CPU > 70% or Memory > 80%
3. [ ] Review slow queries
4. DECISION: Scale up or investigate?

If RDS resources OK:
5. [ ] Check Redis for evictions
6. [ ] Check application code for bottlenecks
7. [ ] Monitor latency trend (improving or worsening?)

If latency > 500ms:
8. [ ] ROLLBACK (follow procedure below)
```

### Health Check Failing

```
IMMEDIATE ACTIONS:
1. [ ] Which check is failing? (API, DB, Redis, S3, DNS, Web)
2. [ ] Slack alert to #ops-critical
3. [ ] Check logs for specific error

By component:
- API /health: Check app is running, reachable
- Database: Check RDS is up, connections available
- Redis: Check ElastiCache is up, memory OK
- S3: Check IAM permissions, bucket exists
- DNS: Check Route53 record, TTL
- Web: Check Vercel deployment status

If fix not obvious:
4. [ ] ROLLBACK (follow procedure below)
```

### ROLLBACK Procedure (LAST RESORT)

```
⏱️ Rollback takes ~2-5 min

ANNOUNCE:
[ ] Slack #ops-critical: "INITIATING ROLLBACK: [reason]"

EXECUTE:
[ ] Open: https://vercel.com/[TEAM]/imobi/deployments
[ ] Find previous deployment (known good, usually 1 back)
[ ] Click "..." → "Promote to Production"
[ ] Confirm
[ ] Wait for redeploy (usually < 2 min)

VALIDATE:
[ ] Run health checks (should pass)
[ ] Check Sentry (error rate should drop)
[ ] Check Vercel (should show previous deploy)
[ ] Verify users can access (test web + mobile)

ANNOUNCE COMPLETE:
[ ] Slack #ops-critical: "ROLLBACK COMPLETE. Investigating issue."
[ ] Create incident postmortem issue
[ ] Email team: "Cutover rolled back. New date TBD."

INVESTIGATION:
[ ] Root cause analysis
[ ] Code review for fix
[ ] Re-plan cutover (48h min)
```

---

## NOTES & COMMENTS

Use this space to write observations during cutover:

```
[Leave blank for real-time notes]

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________

```

---

**Documento preparado**: 2026-05-29  
**Impresso por**: _______________  
**Impressão data**: _______________  
**CTO Assinatura**: _______________  

🚀 **Good luck! You got this!** 🚀
