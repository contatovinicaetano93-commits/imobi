# QUICK REFERENCE — Production Monitoring

**Cutover**: 2026-05-30 03:15 - 07:15 UTC  
**Last Update**: _____________ UTC

---

## HEALTHY INDICATORS

| Component | HEALTHY | WARNING | CRITICAL |
|-----------|---------|---------|----------|
| **Error Rate** | < 0.1% | 0.5-1% | > 2% |
| **P95 Latency** | < 1s | 1-2s | > 5s |
| **DB Connections** | < 50% | 60-80% | > 90% |
| **Redis Memory** | < 50% | 60-70% | > 80% |
| **Sentry Errors** | 0-2/5m | 3-5/5m | > 5/5m |

---

## CURRENT METRICS LOG

### T+30 MIN (03:45 UTC)
- API Health: [ ] ok [ ] degraded [ ] error
- Error Rate: ____% | P95: ____ms | DB: __% | Redis: __%
- Status: [ ] GREEN [ ] YELLOW [ ] RED

### T+1h (04:15 UTC)
- API Health: [ ] ok [ ] degraded [ ] error
- Error Rate: ____% | P95: ____ms | DB: __% | Redis: __%
- Status: [ ] GREEN [ ] YELLOW [ ] RED

### T+2h (05:15 UTC)
- API Health: [ ] ok [ ] degraded [ ] error
- Error Rate: ____% | P95: ____ms | DB: __% | Redis: __%
- Status: [ ] GREEN [ ] YELLOW [ ] RED

### T+3h (06:15 UTC)
- API Health: [ ] ok [ ] degraded [ ] error
- Error Rate: ____% | P95: ____ms | DB: __% | Redis: __%
- Status: [ ] GREEN [ ] YELLOW [ ] RED

### T+4h FINAL (07:15 UTC)
- API Health: [ ] ok [ ] degraded [ ] error
- Error Rate: ____% | P95: ____ms | DB: __% | Redis: __%
- Status: [ ] GREEN [ ] YELLOW [ ] RED

---

## ONE-LINER COMMANDS

```bash
# Health check
echo "API:" && curl -s https://api.imbobi.com.br/health | jq .status && \
echo "WEB:" && curl -s https://app.imbobi.com.br/api/health | jq .status

# Database
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Redis
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human

# Errors
tail -20 /var/log/imbobi/api.log | grep ERROR | wc -l

# Full check
bash scripts/cutover-health-check.sh
```

---

## IMMEDIATE ACTIONS

### IF ERROR RATE > 2%
- [ ] Post to #cutover-alerts
- [ ] Check Sentry for error patterns
- [ ] Run smoke tests: bash SMOKE_TESTS.sh
- [ ] Call CTO if error rate still rising

### IF P95 LATENCY > 5s
- [ ] Check database connections: SELECT count(*) FROM pg_stat_activity;
- [ ] Check Redis: redis-cli -u $REDIS_URL DBSIZE
- [ ] Review slow queries
- [ ] TRIGGER ROLLBACK if sustained

### IF DB CONNECTIONS > 90%
- [ ] Kill idle connections if safe
- [ ] Monitor for cascading failures
- [ ] TRIGGER ROLLBACK if > 95%

### IF REDIS MEMORY > 85%
- [ ] Check BullMQ queues
- [ ] Monitor for evicted_keys
- [ ] TRIGGER ROLLBACK if sustained

---

## ESCALATION

Issue → [Slack] → [5 min] QA → [10 min] DevOps → [15 min] CTO → [20 min] ROLLBACK

---

**Monitor**: _____________  
**Next Check**: _____________
