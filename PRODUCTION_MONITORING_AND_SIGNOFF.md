# iMobi MVP — Production Monitoring & Cutover Sign-Off

**Date**: 2026-05-30  
**Cutover Start**: 2026-05-30 03:15 UTC  
**Monitoring Period**: 4 hours (2026-05-30 03:15 - 07:15 UTC)  
**Final Sign-Off Target**: 2026-05-30 05:00 UTC  

---

## MONITORING CHECKLIST

### Sentry Error Tracking Setup
- [ ] Sentry dashboard opened: https://sentry.io (imobi project)
- [ ] Error rate baseline recorded (first 10 minutes)
- [ ] Alert configured: **Critical errors → Slack notification**
- [ ] Sentry Integration: API errors → Sentry automatically

**Sentry Baseline Metrics**:
- [ ] Error count at T+10min: _________ (should be 0-2)
- [ ] Error rate at T+30min: _________ % (target: <0.1%)

### CloudWatch Latency Alerts
- [ ] CloudWatch dashboard opened: https://console.aws.amazon.com/cloudwatch
- [ ] API latency metric configured
- [ ] Web latency metric configured
- [ ] P95 latency baseline recorded

**Target Thresholds**:
- **P95 API Response Time**: < 2000 ms (2 seconds)
- **P50 API Response Time**: < 500 ms
- **P99 API Response Time**: < 5000 ms (5 seconds)

**Latency Baseline Recording**:
- [ ] API P95 at T+5min: _________ ms (baseline)
- [ ] API P95 at T+1h: _________ ms
- [ ] API P95 at T+4h: _________ ms (final)

### Database Connection Pool Monitoring (<80%)
- [ ] PostgreSQL connection pool dashboard opened
- [ ] Max connections setting verified: _________ (typically 100-200)
- [ ] Current connections baseline: _________
- [ ] Alert configured: Pool usage > 80%

**Connection Pool Baseline**:
- [ ] Max connections: _________ (from RDS config)
- [ ] Current connections at T+5min: _________ / _________  (X / MAX)
- [ ] Current connections at T+1h: _________ / _________
- [ ] Current connections at T+4h: _________ / _________ (final)

### Redis Memory Monitoring (<70%)
- [ ] Redis memory dashboard opened
- [ ] Max memory setting verified: _________ GB
- [ ] Current memory usage baseline: _________
- [ ] Memory fragmentation ratio: _________ (target: < 1.5)
- [ ] Alert configured: Memory usage > 70%

**Memory Baseline**:
- [ ] Max memory: _________ GB (from Redis config)
- [ ] Used memory at T+5min: _________ MB (______% utilization)
- [ ] Used memory at T+1h: _________ MB (______% utilization)
- [ ] Used memory at T+4h: _________ MB (______% utilization)

---

## ALERT THRESHOLDS & METRICS

### Severity Levels

| Level | Trigger | Action | Escalation |
|-------|---------|--------|------------|
| 🟢 **GREEN** | All metrics normal | Continue monitoring | None |
| 🟡 **YELLOW** | Single metric > threshold for 5 min | Investigate, notify team | QA Lead |
| 🟠 **ORANGE** | Multiple metrics degraded | Page on-call engineer | DevOps |
| 🔴 **RED** | Critical system down | Prepare rollback | CTO + DevOps |

### Error Rate
| Metric | YELLOW | RED |
|--------|--------|-----|
| **Error Rate** | > 0.5% for 10 min | > 2% for 5 min |
| **Critical Errors** | > 2 in 5 min | > 5 in 5 min |

### Latency (CloudWatch)
| Metric | YELLOW | RED |
|--------|--------|-----|
| **P95 Latency** | > 2s for 5 min | > 5s for 2 min |
| **Database Query Time** | > 1s for 10 queries | > 2s average |

### Database Connection Pool
| Metric | YELLOW | RED |
|--------|--------|-----|
| **Pool Usage** | > 70% for 5 min | > 90% for 2 min |
| **Connection Timeouts** | > 1 per min | > 5 per min |

### Redis Memory
| Metric | YELLOW | RED |
|--------|--------|-----|
| **Memory Usage** | > 60% for 5 min | > 80% for 2 min |
| **Evicted Keys** | > 1 per min | > 10 per min |

---

## ROLLBACK TRIGGERS

### CRITICAL Rollback Triggers (IMMEDIATE)
- ❌ Error rate > 5% for > 5 minutes
- ❌ P95 response time > 5s for > 2 minutes
- ❌ Database connection pool exhausted (< 1 connection available)
- ❌ API returning 503 Service Unavailable
- ❌ Data corruption or constraint violations

### WARNING Rollback Triggers (WITHIN 10 MIN IF UNRESOLVED)
- ! Error rate 1-5% for > 10 minutes
- ! P95 latency 2-5s for > 5 minutes
- ! Database connections > 80% for > 5 minutes
- ! Redis memory > 70% for > 5 minutes
- ! GPS validation failures
- ! KYC approval emails not sending

---

## ROLLBACK PROCEDURES

### Procedure 1: Vercel Web Rollback (< 2 minutes)
1. Open: https://vercel.com/contatovinicaetano93-commits/imobi
2. Navigate to **Deployments** tab
3. Select previous stable deployment
4. Click **⋯** → **Rollback**
5. Verify: `curl https://app.imbobi.com.br/api/health`

### Procedure 2: API Rollback (< 5 minutes)
1. Get previous commit: `git log --oneline | head -2`
2. Force push: `git push origin PREVIOUS_SHA:main --force`
3. Monitor deployment
4. Verify: `curl https://api.imbobi.com.br/health`

### Procedure 3: Database Rollback (< 15 minutes)
1. Contact DevOps immediately
2. Restore from pre-deployment snapshot
3. Reapply migrations if needed
4. Verify data integrity

### Procedure 4: Full System Rollback (Coordinated)
1. Declare incident, notify team
2. Execute: Vercel → API → Database (in order)
3. Verify infrastructure between steps
4. Post-rollback briefing

---

## SIGN-OFF REQUIREMENTS

### DevOps Sign-Off (T+30 min)
- [ ] Vercel deployment successful (< 60s build)
- [ ] API health check passing
- [ ] Web health check passing
- [ ] Database verified (50+ migrations)
- [ ] Redis verified (BullMQ queues ready)
- [ ] S3 bucket accessible
- [ ] DNS resolving correctly

### QA Sign-Off (T+50 min)
- [ ] TC-020 (Approve without evidence) → 400 error ✅
- [ ] TC-033 (GPS validation) → 400 error ✅
- [ ] TC-028 (KYC email) → 200 OK + email sent ✅
- [ ] Dashboard loads in < 2 seconds
- [ ] No 500 errors in first 10 minutes

### CTO Sign-Off (T+1h)
- [ ] Code matches review approval
- [ ] No hardcoded secrets
- [ ] Type-check passed (5/5 packages)
- [ ] Security audit clean
- [ ] Monitoring configured
- [ ] Rollback plan tested

### CEO Sign-Off (T+1.5h)
- [ ] Go-live approved
- [ ] Business metrics enabled
- [ ] Support team on standby
- [ ] Rollback plan understood

---

## REAL-TIME MONITORING COMMANDS

```bash
# 1. Health checks
curl -s https://api.imbobi.com.br/health | jq .
curl -s https://app.imbobi.com.br/api/health | jq .

# 2. Database connections
psql $DATABASE_URL -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# 3. Redis memory
redis-cli -u $REDIS_URL INFO memory | grep -E "used_memory|maxmemory|evicted"

# 4. Error logs
tail -50 /var/log/imbobi/api.log | grep ERROR

# 5. Full health check
bash scripts/cutover-health-check.sh
```

---

## SUCCESS CRITERIA (T+4h)

- [ ] Error Rate: < 0.5% entire window (avg < 0.1%)
- [ ] Latency: P95 < 2s (no spikes > 3s)
- [ ] Database: Connections < 70%
- [ ] Redis: Memory < 60%
- [ ] Uptime: 100%
- [ ] Smoke Tests: 100% passing
- [ ] No Rollbacks: Required
- [ ] All Sign-Offs: Complete

---

**Document Version**: 1.0  
**Status**: OPERATIONAL GUIDE
