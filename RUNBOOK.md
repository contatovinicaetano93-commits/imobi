# imobi — Operations Runbook

**Version:** 1.0  
**Last Updated:** 2026-05-29  
**Status:** Staging Ready  

---

## 🚨 Critical Incidents

### Database Down

**Symptom:** API returns 500 errors; logs show `PrismaClientInitializationError`

```bash
# 1. Check database connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -d imobi -c "SELECT 1"

# 2. Restart database service (if on managed infra)
# AWS RDS: Use AWS Console to reboot instance
# Self-hosted: systemctl restart postgresql

# 3. Verify migrations
pnpm db:migrate

# 4. Monitor logs
tail -f services/api/logs/app.log | grep -E "ERROR|Prisma"
```

**Recovery Time:** 2-5 minutes

---

### Redis Cache Down

**Symptom:** API works but slow; cache.hit_rate near 0%

```bash
# 1. Check Redis connectivity
redis-cli -h $REDIS_HOST ping

# 2. Restart Redis
systemctl restart redis-server

# 3. Clear stale data
redis-cli FLUSHDB  # ⚠️ Use with caution in production

# 4. Verify workers still running
pnpm --filter @imbobi/workers status
```

**Recovery Time:** 1-2 minutes  
**Impact:** None (graceful degradation; API works without cache)

---

### API Service Crash

**Symptom:** Port 4000 not responding; 502 errors from load balancer

```bash
# 1. Check process status
ps aux | grep "node.*api"

# 2. Check logs for crash reason
tail -100 services/api/logs/error.log

# 3. Restart API service
pnpm --filter @imbobi/api start:prod

# 4. If restart fails, check:
# - Is database up? (see Database Down above)
# - Are environment variables correct? (source .env.prod)
# - Check disk space: df -h
# - Check memory: free -h
```

**Recovery Time:** 30 seconds - 2 minutes

---

### High API Latency (p99 > 5s)

**Symptom:** Slow response times; users report timeouts

```bash
# 1. Check database query performance
# Enable slow query log in PostgreSQL
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

# 2. Monitor active connections
psql -h $DATABASE_HOST -U $DATABASE_USER -d imobi -c \
  "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 3. Check API metrics
curl http://localhost:4000/api/v1/health

# 4. Analyze Redis cache hits
redis-cli INFO stats | grep hit_rate

# 5. If latency continues:
# - Scale database replicas
# - Clear Redis cache and let it rebuild
# - Review recent deployments for query changes
```

**Root Causes:** Slow queries, cache miss, connection limits  
**Prevention:** Database indexes, Redis warming, connection pooling

---

### High Error Rate (>5%)

**Symptom:** Error rate spike visible in monitoring dashboard

```bash
# 1. Check error rate by endpoint
curl http://localhost:4000/api/v1/metrics | grep error_rate

# 2. Identify problematic endpoints
tail -100 services/api/logs/error.log | grep -o "POST /api/v1/[^[:space:]]*" | sort | uniq -c

# 3. Check database constraints
# Most common: Foreign key violations, unique constraint violations
pnpm db:diagnose

# 4. Monitor for specific errors
# - 401: Auth token issues
# - 403: Permission/IDOR issues
# - 422: Validation errors
# - 500: Server errors (check error.log)

# 5. Rollback if recent deployment
git log --oneline -5
# If error started after last deployment:
# docker rollback <previous-version>
```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# API Health
curl http://localhost:4000/api/v1/health

# Expected response (200 OK):
# {
#   "status": "ok",
#   "timestamp": "2026-05-29T10:00:00Z",
#   "database": "connected",
#   "redis": "connected",
#   "uptime_seconds": 3600
# }

# Web Health (Next.js)
curl http://localhost:3000/api/health

# Mobile Health (check API connectivity from app)
# Navigate to Settings > System Info > API Status
```

### Metrics to Monitor

```
API Response Time (p50, p95, p99)
  Target: p99 < 5s
  Alert threshold: > 3s (warning), > 5s (critical)

Error Rate
  Target: < 0.1%
  Alert threshold: > 1%

Cache Hit Rate
  Target: > 85%
  Alert threshold: < 70%

Database Connections
  Target: < 80% of max_connections
  Alert threshold: > 90%

Worker Queue Depth
  Target: < 100 jobs
  Alert threshold: > 500

Disk Usage
  Target: < 80%
  Alert threshold: > 90%
```

---

## 🔄 Deployments

### Blue-Green Deployment (Recommended)

```bash
# 1. Build production artifacts
pnpm build

# 2. Deploy to GREEN environment (staging)
./scripts/deploy-green.sh

# 3. Run smoke tests against GREEN
./scripts/smoke-test.sh http://green.imobi.api

# 4. Switch traffic from BLUE to GREEN
./scripts/switch-traffic.sh blue green

# 5. Monitor for 30 minutes
# If issues detected, rollback:
./scripts/switch-traffic.sh green blue
```

**Rollback Time:** < 2 minutes

---

### Canary Deployment (10% traffic)

```bash
# 1. Deploy new version to canary environment
./scripts/deploy-canary.sh

# 2. Route 10% of traffic to canary
./scripts/set-traffic-split.sh 90-10

# 3. Monitor canary metrics for 10 minutes
# Look for increased errors, latency spikes

# 4. If stable, gradually increase:
./scripts/set-traffic-split.sh 50-50  # 50% to canary
./scripts/set-traffic-split.sh 0-100  # 100% to canary

# 5. Complete deployment
./scripts/complete-deployment.sh
```

**Risk:** Low (only 10% of users affected initially)

---

## 🔐 Security Incidents

### Suspected Account Compromise

```bash
# 1. Immediate action: Invalidate all tokens for user
pnpm --filter @imbobi/api revoke-user-tokens <userId>

# 2. Force password reset
psql -h $DATABASE_HOST -U $DATABASE_USER -d imobi -c \
  "UPDATE users SET password_reset_required = true WHERE id = '<userId>';"

# 3. Audit user activity
tail -1000 services/api/logs/audit.log | grep "<userId>"

# 4. Notify user
# Send email: "Your account was accessed from unusual location. Please reset password."

# 5. Review and close issues
# - Change JWT_SECRET if token was leaked
# - Review CORS origin whitelist
# - Check if password was compromised (pwd breach database)
```

---

### Data Breach Detected

```bash
# 1. Immediate: Enable enhanced logging
export LOG_LEVEL=debug
systemctl restart api

# 2. Identify affected data
# - Which tables were accessed?
# - How many records?
# - What was exported?

# 3. Preserve evidence
# - Keep logs for 90 days
# - Database transaction logs
# - Access logs

# 4. Notify users (if required by law)
# - LGPD/GDPR compliance
# - Breach notification letter

# 5. Post-incident review
# - How did breach happen?
# - What preventive measures?
# - Updated security policy

# 6. Change critical secrets
export JWT_SECRET=$(openssl rand -hex 32)
export ENCRYPTION_KEY=$(openssl rand -hex 32)
# Restart all services with new secrets
```

---

## 💾 Backup & Recovery

### Backup Procedures

```bash
# Daily automated backup (should be configured)
# Run at 02:00 UTC (low-traffic period)

# Manual backup if needed
pg_dump -h $DATABASE_HOST -U $DATABASE_USER imobi > backup-$(date +%Y%m%d).sql

# Verify backup integrity
gunzip -c backup-20260529.sql.gz | psql -h localhost test_db > /dev/null && echo "OK"

# Test restore in staging before restoring to production
# psql -h staging-db < backup-20260529.sql
```

**Retention:** 30 days minimum  
**Storage:** 3 copies (primary, secondary, offsite)

---

### Point-in-Time Recovery

```bash
# PostgreSQL WAL-based recovery
# 1. Stop API service
systemctl stop api

# 2. Restore to specific point in time
# (assumes WAL archiving configured)
pg_basebackup -D /var/lib/postgresql/backup
# Edit recovery.conf with:
# recovery_target_timeline = 'latest'
# recovery_target_time = '2026-05-29 09:30:00'

# 3. Start PostgreSQL
systemctl start postgresql

# 4. Verify recovery
psql -c "SELECT COUNT(*) FROM users;"

# 5. Restart API
systemctl start api
```

**Recovery Window:** Up to 7 days (depends on WAL retention)

---

## 📱 Mobile App Incidents

### App Crash on Startup

**User reports:** App crashes immediately after opening

```bash
# 1. Check API connectivity from mobile
# In app: Settings > Diagnostics > Test API

# 2. If API unreachable:
# - Check API is running: curl http://api.imobi.com/health
# - Check DNS resolution: nslookup api.imobi.com
# - Check firewall rules

# 3. If API reachable, issue is app code
# - Request user's app version: Settings > About
# - If < latest version: Request user update from App Store
# - If latest version: File bug report with reproduction steps
```

### Location Permission Denied

**User reports:** Camera/location validation fails

```bash
# On mobile, check:
# iOS: Settings > imobi > Permissions > Location > "While Using"
# Android: Settings > Apps > imobi > Permissions > Location

# If permissions granted but still not working:
# - Restart app
# - Restart phone
# - Reinstall app

# If still fails, check API logs for GPS validation errors
tail -100 services/api/logs/app.log | grep -i "gps\|location"
```

---

## 🧪 Testing & Validation

### Pre-Deployment Checklist

- [ ] All tests passing: `pnpm test`
- [ ] Type check: `pnpm type-check`
- [ ] Security audit: `pnpm audit`
- [ ] No hardcoded secrets: `./scripts/check-secrets.sh`
- [ ] Database migrations tested
- [ ] API health check: `curl http://localhost:4000/api/v1/health`
- [ ] Web loads: `curl http://localhost:3000`
- [ ] Mobile builds without errors

### Smoke Tests (Post-Deployment)

```bash
# Run basic functionality tests
./scripts/smoke-test.sh https://api.imobi.com

# Expected passing tests:
# ✓ Health check responds
# ✓ Signup endpoint available
# ✓ Login endpoint available
# ✓ Database queries work
# ✓ Redis cache responding
```

---

## 📞 Escalation

### Support Channels

**SEV-1 (Critical, >1000 users affected):**
- Slack: #incident-sev1
- On-call: Page via PagerDuty
- Action: Incident commander + engineering team

**SEV-2 (Major, 100-1000 users affected):**
- Slack: #incidents
- On-call: Notify next day
- Action: Engineering team investigation

**SEV-3 (Minor, <100 users affected):**
- Slack: #support
- On-call: No immediate page
- Action: Triage next business day

### On-Call Rotation

- **Monday-Friday:** Primary on-call engineer
- **Weekends:** Secondary on-call (major issues only)
- **Holidays:** Escalation to team lead

---

## 📚 Additional Resources

- [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) — Security architecture & fixes
- [STAGING_DEPLOYMENT.md](./STAGING_DEPLOYMENT.md) — Full deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Common errors & solutions
- [API Documentation](./services/api/README.md)

---

**Last Review:** 2026-05-29  
**Next Review:** 2026-06-29
