# PRODUCTION CUTOVER PLAN — imobi MVP Phase 4
**Official Deployment Window: 2026-06-02 | 02:00 BRT (04:00 UTC)**  
**Duration: 2 hours (04:00-06:00 UTC / 02:00-04:00 BRT)**  
**Status: DRAFT | Last Updated: 2026-05-29**

---

## CRITICAL CONTACTS & ESCALATION

| Role | Name | Slack | Phone | Email |
|------|------|-------|-------|-------|
| **CTO** (Decision Authority) | — | @cto | +55 _______ | contato.vinicaetano93@gmail.com |
| **DevOps Lead** (Execution) | — | @devops | +55 _______ | — |
| **DevOps Backup** (Support) | — | @devops-backup | +55 _______ | — |
| **Tech Lead On-Call** (Hotfix) | — | @tech-lead | +55 _______ | — |
| **PO Notifications** | — | @product | +55 _______ | — |
| **Support Lead** | — | @support | +55 _______ | — |

**Backup Communication**: Phone bridge open throughout window  
**Escalation**: Any YES to "Is this critical?" = escalate to CTO in 30 seconds

---

## INFRASTRUCTURE SUMMARY

| Component | Provider | Status | Backup Plan |
|-----------|----------|--------|------------|
| **Web App** | Vercel (Edge CDN) | Production | Git revert + auto-deploy |
| **API** | Vercel (NestJS + Fastify) | Production | Database rollback + git revert |
| **Database** | Render PostgreSQL + PostGIS | Production | AWS S3 snapshot + point-in-time restore |
| **Cache/Queue** | AWS ElastiCache Redis | Production | Manual queue restart + cache clear |
| **Storage** | AWS S3 (Evidence photos) | Production | Read-only (no changes during cutover) |
| **Monitoring** | Sentry + CloudWatch | Active 24/7 | Real-time alerts to #critical-issues |
| **Status Page** | Vercel or custom | Manual updates | Slack #announcements |

---

## PRE-CUTOVER CHECKLIST (2026-06-01)

### ✓ Day Before: Code Freeze (ALL ITEMS MUST BE CHECKED)

**Lead: Engineering**
- [ ] No new commits to `main` after **17:00 BRT (19:00 UTC)**
- [ ] Final git tag created: `release/phase4-2026-06-02`
- [ ] All tests passing: `pnpm type-check && pnpm build && pnpm test`
- [ ] No security vulnerabilities: `npm audit` = 0 issues
- [ ] Vercel preview URL tested manually (login, dashboard, approval flow)

**Lead: DevOps**
- [ ] **Database Backup Completed**
  - Full PostgreSQL dump to AWS S3: `s3://imobi-backups/2026-06-02/postgres-snapshot.sql.gz`
  - Backup size verified: > 50MB (indicates actual data)
  - Restore test successful in staging environment
  - Point-in-time recovery window enabled (7 days minimum)
  
- [ ] **Redis Snapshot Saved**
  - RDB dump from AWS ElastiCache exported: `s3://imobi-backups/2026-06-02/redis-snapshot.rdb`
  - Queue system state captured (BullMQ job queue empty or documented)
  - Test restore successful on development Redis
  
- [ ] **Monitoring Stack Active**
  - [ ] Sentry projects configured (2: API + Web)
  - [ ] Sentry alerts enabled for error rate > 1%
  - [ ] CloudWatch dashboards created and pinned
  - [ ] Grafana connected to Prometheus (if available)
  - [ ] PagerDuty on-call schedule verified
  
- [ ] **Vercel Configuration**
  - [ ] All env vars present in Vercel project settings (see checklist below)
  - [ ] Deployment preview tested
  - [ ] Build cache cleared (recommended for cleaner build)
  - [ ] Auto-deploy enabled only on `main` branch
  - [ ] Rollback image available (previous stable version)

**Lead: Security & Compliance**
- [ ] CORS configuration reviewed: `https://imobi.vercel.app,https://imobi.com.br,https://api.imobi.com`
- [ ] JWT expiry validated: 15 minutes (not longer)
- [ ] Database credentials rotated if applicable
- [ ] AWS S3 access keys verified (no overprivileged keys)
- [ ] Redis password reset scheduled for post-launch

**Lead: Product**
- [ ] Communication templates drafted (see below)
- [ ] Customer support team briefed on new features
- [ ] Known issues documented for support team
- [ ] Analytics tracking tested (if applicable)
- [ ] Hotline prepared for critical bugs

**Lead: QA**
- [ ] SIMPLIFIED_TEST_CHECKLIST.md completed (ALL PASS)
- [ ] Critical flows tested 3x minimum:
  - Manager login → Dashboard → Approve Etapa → Queue triggered
  - Engineer GPS submission → Validation → Photo upload
  - Payment pipeline end-to-end
- [ ] Browser compatibility tested: Chrome, Firefox, Safari, Mobile Chrome
- [ ] API response times profiled (p95, p99 baselines recorded)
- [ ] Database query performance validated (no N+1 queries)

---

## GO/NO-GO DECISION GATE (2026-06-01 17:00 BRT / 19:00 UTC)

**Timing**: 2 hours before cutover prep ends  
**Owner**: CTO (final sign-off)  
**Input**: All checklist items above + SIMPLIFIED_TEST_CHECKLIST.md

### GO Decision Criteria (ALL must be YES)
```
[ ] TypeScript compilation: 0 errors
[ ] Production build: < 90 seconds
[ ] All tests: PASS (50+ test cases)
[ ] Database accessible, backups verified
[ ] Redis operational, queue system ready
[ ] Sentry projects configured
[ ] Vercel deployment ready (no pending builds)
[ ] No critical security vulnerabilities
[ ] CTO, Eng Lead, QA Lead all approve
```

### NO-GO Triggers (ANY ONE = STOP)
```
[ ] Build fails or > 90 sec
[ ] Any critical test case fails
[ ] Database backup failed or untested restore
[ ] Sentry not configured
[ ] Security vulnerability (CVSS > 7.0)
[ ] Missing approvals from key personnel
```

**Decision**: `[ ] GO → PROCEED    [ ] NO-GO → RESCHEDULE`

**If NO-GO**: 
1. Document blocker clearly
2. Notify team in #critical-issues
3. Assign owner + deadline to fix
4. Reschedule cutover (suggest 2026-06-09)
5. CTO approves remediation plan

---

## FINAL PREP WINDOW (2026-06-01 17:00-20:00 BRT / 19:00-22:00 UTC)

**Once GO decision approved**, execute:

### 1. On-Call Rotation Confirmed
- [ ] CTO available 48 hours post-launch
- [ ] Eng Lead available 24 hours post-launch
- [ ] Support Lead confirmed on-call
- [ ] DevOps backup on standby (sleep schedule)
- [ ] Customer escalation path established

### 2. Runbooks Reviewed
- [ ] Rollback procedure (5 min expected)
- [ ] Hotfix process (15 min expected)
- [ ] Database recovery steps
- [ ] Redis restart procedure
- [ ] Communication escalation chain

### 3. Monitoring Dashboards Prepared
- [ ] Sentry dashboard open + bookmarked
- [ ] CloudWatch metrics dashboard visible
- [ ] Grafana (if available) displaying real-time metrics
- [ ] Custom dashboard showing: error rate, response time, DB connections
- [ ] Alert thresholds configured (see MONITORING THRESHOLDS section)

### 4. Communication Drafted
- [ ] Pre-cutover message to #cutover-live (ready to send)
- [ ] Status page update (ready to publish)
- [ ] Customer notification (if external facing)
- [ ] Slack bot integration tested (auto-post updates)

### 5. Team Standby Mode
- [ ] All key personnel confirmed in #cutover-live Slack channel by **21:00 BRT**
- [ ] Phone bridge: [BRIDGE_NUMBER] PIN: [PIN] — tested
- [ ] Backup communication: Signal/WhatsApp group created
- [ ] VPN/network stability checked (no degraded connections)
- [ ] Build laptop charged, internet cable ready
- [ ] 1-hour rest period before cutover (power naps okay)

---

# CUTOVER TIMELINE (Minute-by-Minute)

## 04:00 UTC (02:00 BRT): START → LOCK-IN (4 hours)

**All times in UTC. Convert to BRT: UTC time - 2 hours**

```
═══════════════════════════════════════════════════════════════════════════════
         IMOBI PRODUCTION CUTOVER — 2026-06-02 04:00 UTC
═══════════════════════════════════════════════════════════════════════════════
```

---

### ⏱ 04:00:00 UTC (02:00 BRT) — CUTOVER START

**Owner**: DevOps Lead  
**Duration**: 1 minute  
**Validation**: Slack message posted confirming start

#### Actions:
1. **CTO posts** in #cutover-live: "🔴 CUTOVER START 04:00 UTC"
2. **DevOps** confirms all team members online
3. **Monitoring**: Verify Sentry dashboard shows 0 errors baseline
4. **Checkpoint**: All monitoring dashboards showing live data

#### Go/No-Go:
- ✅ YES: All team online + dashboards live → Proceed
- ❌ NO: Missing person or dashboard offline → ABORT + reschedule

```
✓ Slack: #cutover-live "CUTOVER START | T-0"
✓ Sentry: Baseline errors captured
✓ All dashboards: LIVE
```

---

### ⏱ 04:01:00 UTC (02:01 BRT) — DATABASE MIGRATION

**Owner**: DevOps  
**Duration**: 2 minutes  
**Command**: Prisma database migration

#### Actions:
1. **Execute final migration** on production database:
   ```bash
   pnpm --filter @imbobi/api prisma migrate deploy --prod
   ```
   - This applies all pending migrations
   - Timeout: 60 seconds max
   - If timeout, kill and rollback

2. **Verify migration success**:
   ```bash
   pnpm --filter @imbobi/api prisma db seed
   ```
   - Seed test data (idempotent if applicable)
   - Verify table structure with: `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`

3. **Database health check**:
   - Query: `SELECT COUNT(*) FROM etapas` → Should return positive integer
   - Query: `SELECT COUNT(*) FROM users` → Should return positive integer
   - PostGIS check: `SELECT ST_IsValid(geom) FROM etapas LIMIT 1` → Should return true

#### Go/No-Go:
- ✅ YES: Migration complete + health checks pass → Proceed
- ❌ NO: Migration timeout/error → ROLLBACK immediately:
  ```bash
  pnpm --filter @imbobi/api prisma migrate resolve --rolled-back migration_name
  ```

```
✓ Migration: APPLIED
✓ Seed: SUCCESSFUL (if applicable)
✓ Table COUNT: ✅ PASS
✓ PostGIS: ✅ VALID
```

**Slack Update**: `✅ 04:01 | Database migration complete`

---

### ⏱ 04:03:00 UTC (02:03 BRT) — CODE DEPLOYMENT

**Owner**: DevOps Lead  
**Duration**: 3 minutes  
**Method**: Vercel automatic or manual push

#### Actions:
1. **Verify latest commit** is on `main`:
   ```bash
   git log --oneline -3
   ```
   - Should show v2.0.0 or Phase 4 tag at top

2. **Trigger Vercel deployment** (if not auto):
   ```bash
   # Option A: Auto-deploy (if main is already pushed)
   # Vercel will detect and deploy automatically
   
   # Option B: Manual via Vercel CLI
   vercel --prod
   
   # Option C: Via Vercel Dashboard: Click "Deploy"
   ```

3. **Monitor Vercel build log**:
   ```bash
   scripts/monitor-vercel-build.sh
   ```
   - Watch for: "Build started", "Compiling", "Optimizing", "Ready [...]"
   - Expected build time: 45-60 seconds
   - Timeout: 90 seconds (kill if longer)

4. **Build progress checkpoints**:
   - 0-20 sec: Dependencies install
   - 20-50 sec: TypeScript compilation
   - 50-75 sec: Next.js optimization
   - 75-90 sec: Edge function deployment

#### Go/No-Go:
- ✅ YES: Build completes in < 90 sec + status "Ready" → Proceed
- ❌ NO: Build fails or > 90 sec → ROLLBACK:
  ```bash
  git revert HEAD --no-edit
  git push origin main
  # Vercel auto-redeploys previous version
  ```

```
✓ Build: STARTED (04:03:00)
✓ Dependencies: OK (45 sec)
✓ Compilation: OK (70 sec)
✓ Optimization: OK (85 sec)
✓ Status: READY (04:04:00)
```

**Slack Update**: `✅ 04:03 | Deployment started | ETA 04:04 UTC`

---

### ⏱ 04:05:00 UTC (02:05 BRT) — BUILD VERIFICATION

**Owner**: Tech Lead On-Call  
**Duration**: 2 minutes  
**Verification**: Smoke test health endpoints

#### Actions:
1. **API Health Check**:
   ```bash
   curl -s https://api.imobi.com/api/v1/health | jq .
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-06-02T04:05:00Z",
     "database": "connected",
     "redis": "connected"
   }
   ```
   - Must return HTTP 200
   - Database status: "connected"
   - Redis status: "connected"
   - If any fails: ROLLBACK immediately

2. **Web App Frontend Check**:
   ```bash
   curl -s -w "\nHTTP %{http_code}\n" https://imobi.vercel.app/ | head -20
   ```
   - Must return HTTP 200
   - Check for "<!DOCTYPE html>" or "<html>"
   - If 404/500: ROLLBACK immediately

3. **Sentry Baseline**:
   - Visit Sentry dashboard
   - Note current error count (should be 0-2)
   - Enable error rate alert > 1%

#### Go/No-Go:
- ✅ YES: Both endpoints healthy + HTTP 200 → Proceed
- ❌ NO: Any endpoint down (non-200) → ROLLBACK immediately:
  ```bash
  git revert HEAD --no-edit && git push origin main
  # Monitor for 5 minutes until previous version is live
  ```

```
✓ API Health: ✅ 200 | database: connected | redis: connected
✓ Web App: ✅ 200 | HTML content verified
✓ Sentry: Baseline recorded (0 errors)
```

**Slack Update**: `✅ 04:05 | Health checks passed | Proceeding`

---

### ⏱ 04:07:00 UTC (02:07 BRT) — CACHE WARMING

**Owner**: DevOps  
**Duration**: 2 minutes  
**Purpose**: Pre-populate Redis with common queries (optional but recommended)

#### Actions:
1. **Execute cache warming** (if script exists):
   ```bash
   scripts/warm-cache.sh 2>&1 | tee warm-cache-$(date +%s).log
   ```
   - Populate common user sessions
   - Pre-load etapa list queries
   - Populate manager dashboard data
   - Timeout: Kill after 120 seconds if stalled

2. **Verify Redis connectivity**:
   ```bash
   redis-cli -h <redis-endpoint> PING
   ```
   Expected: `PONG`
   
   ```bash
   redis-cli -h <redis-endpoint> DBSIZE
   ```
   Expected: > 0 (indicates keys exist)

3. **Check BullMQ queue system**:
   ```bash
   redis-cli -h <redis-endpoint> LLEN bull:liberacao-parcela:
   ```
   Expected: 0 (clean queue at start)

#### Go/No-Go:
- ✅ YES: Redis PING/DBSIZE OK → Proceed (even if warm-cache timed out)
- ❌ NO: Redis unreachable → ESCALATE to CTO:
  - Check AWS ElastiCache status
  - If cluster failed: Promote read-replica (may require manual AWS intervention)
  - Escalation time: 5-10 minutes

```
✓ Cache Warming: SKIPPED (optional, not blocking)
✓ Redis: ✅ PING | DBSIZE: 150 keys
✓ BullMQ Queue: ✅ Empty (ready for jobs)
```

**Slack Update**: `✅ 04:07 | Redis operational | Queue system ready`

---

### ⏱ 04:09:00 UTC (02:09 BRT) — EDGE CACHE INVALIDATION

**Owner**: DevOps  
**Duration**: 1 minute  
**Purpose**: Clear Vercel edge cache to serve fresh content

#### Actions:
1. **Clear Vercel edge cache** (if available in Vercel CLI):
   ```bash
   vercel env pull --prod
   vercel dev --prod --clear-cache
   ```
   OR via Vercel Dashboard:
   - Project Settings → Deployments → Latest
   - Click "More" → "Clear CDN Cache"

2. **Verify cache cleared**:
   ```bash
   curl -I https://imobi.vercel.app/ | grep -E "(cache-control|etag|x-vercel)"
   ```
   Expected: Fresh headers (no old etags)

3. **Optional: Purge Cloudflare** (if in front of Vercel):
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
     -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
     -d '{"purge_everything":true}'
   ```

#### Go/No-Go:
- ✅ YES: Cache cleared or not applicable → Proceed
- ❌ NO: Cache invalidation failed → Proceed anyway (non-blocking)

```
✓ Vercel Cache: CLEARED
✓ CDN Edge: Fresh content ready
```

**Slack Update**: `✅ 04:09 | Edge cache cleared`

---

### ⏱ 04:11:00 UTC (02:11 BRT) — CANARY HEALTH CHECK

**Owner**: Tech Lead On-Call  
**Duration**: 2 minutes  
**Purpose**: Deep health check on all critical systems

#### Actions:
1. **Full System Health Check**:
   ```bash
   # Check API
   curl -s https://api.imobi.com/api/v1/health | jq .
   
   # Check Database
   curl -s https://api.imobi.com/api/v1/db-health | jq .
   
   # Check Redis
   curl -s https://api.imobi.com/api/v1/cache-health | jq .
   ```

2. **Critical Endpoint Tests**:
   - **Authentication**: `curl -X POST https://api.imobi.com/auth/login -d '{...}'`
     - Expected: 401 (unauthorized) or 200 (with token)
   - **Manager Dashboard**: `GET /dashboard/gestor/etapas` with auth token
     - Expected: 200 + valid JSON array
   - **Engineer Portal**: `GET /portal/engenheiro/submissions` with auth token
     - Expected: 200 + valid data

3. **Database Replication Lag** (if applicable):
   ```bash
   # Check on Render dashboard or via:
   SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;
   ```
   - Expected: < 1 second lag

4. **Memory & Connection Checks**:
   ```bash
   # Database connections
   SELECT count(*) FROM pg_stat_activity;  # Expected: < 20
   
   # Redis memory
   redis-cli -h <redis-endpoint> INFO memory | grep used_memory_human
   # Expected: < 500MB
   ```

#### Go/No-Go:
- ✅ YES: All endpoints 200 + lag < 1s + connections < 20 → Proceed to traffic
- ❌ NO: Any critical endpoint fails → STOP and ROLLBACK:
  - Document failure in #cutover-live
  - Execute rollback procedure
  - Post-mortem within 1 hour

```
✓ API Health: ✅ 200 (database + redis connected)
✓ Authentication: ✅ 200
✓ Dashboard: ✅ 200 + valid data
✓ DB Replication Lag: 0.2 seconds
✓ DB Connections: 12 (< 20 threshold)
✓ Redis Memory: 145MB (< 500MB threshold)
```

**Slack Update**: `✅ 04:11 | Canary checks all GREEN | Ready for traffic`

---

### ⏱ 04:13:00 UTC (02:13 BRT) — TRAFFIC ENABLEMENT

**Owner**: DevOps Lead  
**Duration**: 1 minute  
**Action**: Enable production traffic to new deployment

#### Actions:
1. **Verify Vercel deployment is live**:
   ```bash
   # Check deployment status
   vercel ls --prod
   # Should show latest deployment with status "READY"
   ```

2. **Update DNS/Load Balancer** (if applicable):
   - Verify `imobi.vercel.app` points to latest deployment
   - Verify custom domain `imobi.com.br` resolves correctly
   - Check: `nslookup imobi.com.br` or `dig imobi.com.br`

3. **Enable traffic on Vercel**:
   - If using canary deployments: Increase traffic from 0% → 100%
   - If using A/B testing: Switch all traffic to new version
   - If auto-deployed: Traffic already enabled

4. **Verify traffic flowing**:
   ```bash
   curl -w "@curl-format.txt" https://imobi.vercel.app/
   # Should show response time and HTTP 200
   ```

#### Go/No-Go:
- ✅ YES: Deployment live + traffic enabled → Move to monitoring
- ❌ NO: Deployment not ready → Wait up to 30 more seconds, then ROLLBACK

```
✓ Vercel Deployment: READY
✓ Traffic: 100% to new version
✓ DNS: ✅ Resolves correctly
✓ First request: ✅ 200 | Response time: 234ms
```

**Slack Update**: `🟢 04:13 | TRAFFIC ENABLED | Production live | Monitoring begins`

---

## PHASE 2: CONTINUOUS MONITORING (04:15-08:00 UTC / 02:15-06:00 BRT)

**Owner**: Tech Lead On-Call (primary) + DevOps (secondary)  
**Duration**: 3h 45m  
**Frequency**: Check every 5 minutes + immediate alert if threshold exceeded

---

### ⏱ 04:15:00 UTC (02:15 BRT) — FIRST CRITICAL VALIDATION

**Owner**: QA Lead + Tech Lead  
**Duration**: 5 minutes  
**Purpose**: Verify core user flows work end-to-end

#### Actions:
1. **Manager Login Flow**:
   - [ ] Open https://imobi.vercel.app/login in browser
   - [ ] Login with test manager account (username: `manager.test@imobi.com`)
   - [ ] Verify redirect to dashboard
   - [ ] Check browser console for errors (Ctrl+Shift+J)
   - Expected: No red errors, page loads < 2 seconds

2. **Manager Dashboard**:
   - [ ] Verify etapa list loads
   - [ ] Click on one etapa row
   - [ ] Verify detail modal opens with data
   - [ ] Verify "Approve" button is clickable
   - Expected: No errors in browser console, data visible

3. **Engineer Portal** (test on mobile or responsive):
   - [ ] Login with test engineer account
   - [ ] Verify GPS location submitter works
   - [ ] Submit test location with GPS (even invalid, just test form)
   - [ ] Verify form validation works
   - Expected: Form loads, geolocation request shows, no crashes

4. **API Response Times**:
   ```bash
   # Test typical API calls and record response times
   time curl https://api.imobi.com/api/v1/etapas -H "Authorization: Bearer $TOKEN"
   ```
   - Expected: < 500ms response time

#### Recording:
```
✓ Manager Login: ✅ 1.2 seconds
✓ Dashboard Load: ✅ 1.8 seconds | Etapas count: 45
✓ Etapa Detail: ✅ 0.8 seconds
✓ Engineer Portal: ✅ 2.1 seconds (mobile)
✓ API Response: ✅ 234ms average
✓ Browser Console: ✅ No errors
```

**Go/No-Go**:
- ✅ YES: All flows work, no console errors → Continue
- ❌ NO: Any flow broken → Escalate to CTO + document issue:
  - If trivial (UI only): Create hotfix branch
  - If critical (auth/data broken): ROLLBACK immediately

**Slack Update**: `✅ 04:15 | Critical user flows validated | All GREEN`

---

### ⏱ 04:20:00 UTC (02:20 BRT) — PERFORMANCE CHECK #1

**Owner**: DevOps  
**Duration**: 3 minutes  
**Dashboard**: Sentry + CloudWatch

#### Thresholds (All must be GREEN):

| Metric | Green | Yellow | Red | Action |
|--------|-------|--------|-----|--------|
| **Error Rate** | < 0.1% | 0.1-0.5% | > 0.5% | Alert CTO |
| **Response Time (p95)** | < 300ms | 300-500ms | > 500ms | Investigate |
| **Response Time (p99)** | < 800ms | 800-1500ms | > 1500ms | Investigate |
| **CPU Usage** | < 40% | 40-60% | > 60% | Scale/Investigate |
| **Database Connections** | < 15 | 15-25 | > 25 | Investigate |
| **Redis Memory** | < 300MB | 300-500MB | > 500MB | Clear/Investigate |
| **Failed Logins** | 0 | 1-3 | > 3 | Hotfix/Rollback |

#### Checks:
1. **Sentry Dashboard**:
   ```
   - Total errors: [COUNT]
   - Error rate: [%]
   - Most common error: [TYPE]
   - New errors: [Y/N]
   ```

2. **CloudWatch Metrics**:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace "AWS/ApplicationELB" \
     --metric-name "TargetResponseTime" \
     --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 60 \
     --statistics Average,Maximum
   ```

3. **Database Health**:
   ```bash
   # Check connection count
   SELECT count(*) FROM pg_stat_activity;
   ```

#### Recording:
```
✓ Error Rate: 0.02% (✅ GREEN)
✓ Response Time p95: 245ms (✅ GREEN)
✓ Response Time p99: 678ms (✅ GREEN)
✓ CPU: 28% (✅ GREEN)
✓ DB Connections: 11 (✅ GREEN)
✓ Redis Memory: 167MB (✅ GREEN)
✓ Failed Logins: 0 (✅ GREEN)
```

**Status**: All GREEN — No action needed  

**Slack Update**: `📊 04:20 | Perf check: All metrics GREEN | Continuing`

---

### ⏱ 04:25:00 UTC (02:25 BRT) — DATABASE VALIDATION

**Owner**: DevOps  
**Duration**: 2 minutes  
**Purpose**: Verify data integrity + no locks

#### Checks:
1. **Data Integrity** (run on production DB):
   ```sql
   -- Check for orphaned records
   SELECT COUNT(*) FROM etapas WHERE manager_id NOT IN (SELECT id FROM users);
   -- Expected: 0
   
   -- Check GPS data validity
   SELECT COUNT(*) FROM etapas WHERE ST_IsValid(geom) = false;
   -- Expected: 0
   
   -- Check recent approvals
   SELECT COUNT(*) FROM etapas 
   WHERE status = 'APROVADA' AND updated_at > NOW() - INTERVAL '10 minutes';
   -- Expected: >= 0 (depends on live data)
   ```

2. **Lock Status**:
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   -- Expected: Empty result set (no locks waiting)
   ```

3. **Connection Pool**:
   ```sql
   SELECT datname, count(*) as connections 
   FROM pg_stat_activity 
   GROUP BY datname 
   ORDER BY connections DESC;
   -- Expected: Main DB < 20 connections, no growth trend
   ```

4. **Replication Status** (if primary-replica):
   ```bash
   # On Render dashboard: Check replication lag
   # Expected: < 1 second
   ```

#### Recording:
```
✓ Orphaned Records: 0 (✅ OK)
✓ Invalid GPS Data: 0 (✅ OK)
✓ Recent Approvals: 2 (✅ Normal)
✓ Waiting Locks: 0 (✅ OK)
✓ Total Connections: 13 (✅ < 20)
✓ Replication Lag: 0.3s (✅ < 1s)
```

**Status**: All checks passed

**Slack Update**: `✅ 04:25 | Database validation complete | Data integrity OK`

---

### ⏱ 04:30:00 UTC (02:30 BRT) — CHECKPOINT: CONTINUE OR ESCALATE?

**Owner**: CTO (decision) + Tech Lead (data)  
**Duration**: 2 minutes  
**Decision Rule**:

```
Check: "Are we GREEN on all metrics (error rate, response time, DB, Redis)?"

YES → Continue to next monitoring cycle
NO  → Decide: Hotfix (minor issue) or Rollback (critical)
```

#### Decision Tree:

**SCENARIO A: All metrics GREEN**
```
→ Status: CONTINUE
→ Post in #cutover-live: "✅ 04:30 Checkpoint PASS | All metrics GREEN"
→ Next check: 04:35 (5 minutes)
```

**SCENARIO B: 1-2 metrics YELLOW, others GREEN**
```
→ Status: INVESTIGATE (not blocking)
→ Action: 
   1. Identify metric (e.g., response time 450ms)
   2. Check if trending up or stable
   3. If stable: OK, may be normal load
   4. If trending UP: Alert to CTO, may need hotfix
→ Post: "⚠️ 04:30 Checkpoint: 1 metric YELLOW, investigating"
→ Deadline: Fix or accept by 04:35
```

**SCENARIO C: Any metric RED or multiple YELLOW**
```
→ Status: ESCALATE TO CTO
→ Actions:
   1. CTO decides immediately: Hotfix or Rollback?
   2. If HOTFIX: Create emergency branch, 10-min turnaround
   3. If ROLLBACK: Execute immediate revert (< 5 min)
→ Post: "🔴 04:30 CRITICAL: Escalating to CTO"
```

**Slack Update**: `📋 04:30 | Checkpoint decision: [CONTINUE / ESCALATE]`

---

### ⏱ 04:35-07:55 UTC (02:35-05:55 BRT) — CONTINUOUS MONITORING LOOP

**Owner**: Tech Lead On-Call  
**Duration**: 3h 20m  
**Frequency**: Every 5 minutes

#### Automated Check:
Create a loop script to run every 5 minutes:

```bash
#!/bin/bash
# File: scripts/cutover-monitor.sh

INTERVAL=300  # 5 minutes in seconds
DURATION=12000  # 3h 20m in seconds (after 04:15 until 08:00)
THRESHOLD_ERROR_RATE=0.005  # 0.5%
THRESHOLD_RESPONSE_P95=500  # ms
THRESHOLD_RESPONSE_P99=1500  # ms

end_time=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $end_time ]; do
  timestamp=$(date -u '+%H:%M:%S UTC')
  
  # Get metrics from Sentry
  error_rate=$(curl -s https://sentry.io/api/0/projects/[ORG]/[PROJECT]/stats/ \
    -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.data[-1][1]')
  
  # Get metrics from CloudWatch
  response_p95=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/ApplicationELB" \
    --metric-name "TargetResponseTime" \
    --statistics Average \
    --period 60 --query 'Datapoints[0].Average' | jq -r .)
  
  # Database health
  db_connections=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
    -c "SELECT count(*) FROM pg_stat_activity;" | tail -1)
  
  # Log results
  echo "$timestamp | Error: ${error_rate}% | P95: ${response_p95}ms | DB: ${db_connections} conn"
  
  # Check thresholds and alert if needed
  if (( $(echo "$error_rate > $THRESHOLD_ERROR_RATE" | bc -l) )); then
    echo "🔴 ALERT: Error rate exceeded threshold!"
    # Post to Slack
    curl -X POST $SLACK_WEBHOOK -d "text=🔴 Error rate critical: ${error_rate}%"
  fi
  
  sleep $INTERVAL
done
```

#### Manual Checks (if script not available):
Every 5 minutes, manually verify:

1. **Sentry**: Visit https://sentry.io/dashboard
   - Check error count and rate
   - Look for new error types
   - Verify no spikes

2. **CloudWatch**: Check metrics
   ```bash
   aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB ...
   ```

3. **Database**: Quick health check
   ```bash
   SELECT count(*) FROM pg_stat_activity;  # Should be stable
   ```

4. **Slack**: Post status every 15 minutes minimum
   ```
   04:35 ✅ All metrics GREEN
   04:40 ✅ Error rate: 0.1% | P95: 280ms
   04:45 ✅ Continuous monitoring active
   ...continue until 08:00
   ```

#### Alert Actions:
- **YELLOW** (1-2 metrics): Monitor closely, CTO reviews in 5 min
- **RED** (any metric): CTO decides hotfix or rollback within 1 minute
- **Multiple Alerts**: Immediate escalation

---

### ⏱ 08:00 UTC (06:00 BRT) — END OF ACTIVE CUTOVER WINDOW

**Owner**: DevOps Lead  
**Duration**: 1 minute  
**Status**: Declare success or ongoing incident

#### Actions:
1. **Final Status Check**:
   - Verify all metrics still GREEN
   - Confirm zero critical errors
   - Check database is stable

2. **Transition to Normal Operations**:
   - Stop cutover-specific monitoring
   - Hand off to standard on-call rotation
   - CTO remains on-call for 48 hours (available but not actively monitoring)

3. **Documentation**:
   - Record final status in #cutover-live
   - Document any issues encountered
   - Start incident post-mortem if issues occurred

#### Slack Update:
```
✅ 08:00 UTC | CUTOVER COMPLETE
   ✓ Production deployment successful
   ✓ All metrics GREEN
   ✓ Zero critical errors
   ✓ Database healthy
   ✓ User flows validated
   
→ CTO remains on-call 48 hours
→ Normal operations resume
```

---

## HOTFIX PROCEDURE (If minor issues detected)

**Trigger**: Issue discovered during monitoring that's non-critical  
**Timeline**: Must complete in < 15 minutes  
**Max Hotfixes**: 2 during 04:00-08:00 window

### Step 1: Issue Identification (2 min)
```
- Issue: [describe problem]
- Severity: [Critical/Major/Minor]
- Affected Users: [percentage or count]
- Root Cause: [hypothesis]
```

### Step 2: Hotfix Development (5 min)
```bash
# Create hotfix branch
git checkout -b hotfix/cutover-$(date +%s)

# Make fix (< 10 lines code change)
# Edit file(s)
vim apps/web/src/components/...

# Test locally
pnpm build  # Must succeed in < 30 sec

# Commit
git commit -m "hotfix: [brief description]"
```

### Step 3: Review & Approval (3 min)
```
- Create PR with title: "HOTFIX: [description]"
- Tag @CTO for review
- CTO approval required (2 min max)
```

### Step 4: Deploy (3 min)
```bash
# Merge to main
git checkout main
git merge hotfix/cutover-... --ff

# Push (triggers Vercel auto-deploy)
git push origin main

# Monitor deployment
watch 'curl https://imobi.vercel.app/'

# Verify fix
# Test affected flow manually in browser
```

### Step 5: Validation (2 min)
```
- Verify issue is fixed
- Check Sentry for no new errors
- Post result in #cutover-live
- Close issue/PR
```

**Total Time**: ~15 minutes  
**Slack Update**: `🔧 HOTFIX DEPLOYED | Issue: [X] | Status: [FIXED/INVESTIGATING]`

---

## ROLLBACK PROCEDURE (If critical failure)

**Trigger**: ANY of:
- Vercel build fails (> 90 sec)
- Health check returns non-200
- Critical user flow broken
- Error rate > 1% for 2+ minutes
- Database migration failed
- CTO decision (no explanation needed)

**Timeline**: Must complete in < 5 minutes

### Step 1: STOP TRAFFIC (1 min)
```bash
# Option 1: Git revert
git revert HEAD --no-edit
git push origin main
# Vercel auto-detects and redeployes

# Option 2: Vercel rollback
vercel rollback  # If available

# Option 3: Manual Vercel dashboard
# → Deployments → Previous successful version → Promote
```

### Step 2: DATABASE ROLLBACK (if migration failed) (2 min)
```bash
# Reverse migrations
pnpm --filter @imbobi/api prisma migrate resolve --rolled-back [migration_name]

# Verify data integrity
SELECT COUNT(*) FROM etapas;  # Should return to pre-cutover count
```

### Step 3: VERIFY PREVIOUS VERSION (1 min)
```bash
# Health check
curl https://api.imobi.com/api/v1/health

# Expected: 200 OK with previous version data

# Test login flow
# Expected: Works as before
```

### Step 4: COMMUNICATION (1 min)
```
Post in #cutover-live:
🔴 ROLLBACK COMPLETE
   → Reverted to previous version
   → Time to rollback: [X] minutes
   → Data integrity: ✅ OK
   → User impact: [estimated recovery]
   
Post-mortem scheduled: [date/time]
```

### Step 5: INVESTIGATION (async)
```
1. Document root cause
2. Schedule post-mortem with full team
3. Create ticket for fix
4. Plan next cutover (suggest 48h delay)
```

**Expected Rollback Time**: < 5 minutes  
**Service Recovery**: < 10 minutes total

---

## MONITORING THRESHOLDS & ALERT MATRIX

### Real-Time Thresholds (check every 5 minutes)

| Metric | GREEN | YELLOW | RED | Escalation |
|--------|-------|--------|-----|------------|
| **Error Rate** | < 0.1% | 0.1%-1% | > 1% | CTO immediate |
| **Response p95** | < 300ms | 300-700ms | > 700ms | Investigate root |
| **Response p99** | < 800ms | 800-1500ms | > 1500ms | Investigate root |
| **DB Connections** | < 15 | 15-25 | > 25 | Scale/Investigate |
| **Redis Memory** | < 300MB | 300-500MB | > 500MB | Clear/Hotfix |
| **Redis CPU** | < 30% | 30-60% | > 60% | Scale/Investigate |
| **API CPU** | < 40% | 40-70% | > 70% | Scale/Investigate |
| **Failed Logins** | 0 | 1-3 | > 3 | Hotfix/Rollback |
| **Payment Queue Lag** | 0 | 1-5 sec | > 5 sec | Restart workers |
| **API Availability** | 100% | 99-100% | < 99% | Escalate/Rollback |

### Alert Routing:
- **1 YELLOW metric**: Log + monitor (no action needed)
- **2+ YELLOW metrics**: Alert CTO, review within 5 min
- **1 RED metric**: Immediate CTO escalation, decide hotfix vs rollback
- **2+ RED metrics**: Automatic Slack alert to @cto + page on-call

---

## COMMUNICATION TEMPLATES

### Pre-Cutover (2026-06-01 20:00 BRT / 22:00 UTC)
```
📢 PRODUCTION CUTOVER NOTIFICATION — Phase 4

🔴 CUTOVER WINDOW: 2026-06-02 02:00-04:00 BRT (04:00-06:00 UTC)

Impact:
  → imobi.com may be briefly unavailable (expected max 5 minutes)
  → All users will be temporarily disconnected
  → Managers: Resume dashboard use after 02:05 BRT
  → Engineers: Resume app use after 02:05 BRT

New Features (live after cutover):
  → [List main Phase 4 features]
  → GPS validation improvements
  → Payment pipeline optimization

Questions? Contact: support@imobi.com

#product #announcements
```

### During Cutover — Start (04:00 UTC / 02:00 BRT)
```
🔴 CUTOVER STARTED — imobi Phase 4 Production Deployment

Timeline:
  04:00 UTC: Database migration
  04:03 UTC: Code deployment
  04:13 UTC: Traffic enabled
  04:15 UTC: User validation

Status: IN PROGRESS
Estimated completion: 06:00 UTC (04:00 BRT)

Monitor: #cutover-live (engineering) | #announcements (public)

#critical #ops
```

### During Cutover — Build Complete (04:05 UTC / 02:05 BRT)
```
✅ BUILD COMPLETE — Health checks passed

  ✓ Database migration successful
  ✓ API health: ONLINE
  ✓ Web app health: ONLINE
  ✓ Cache system: READY

Status: Monitoring performance metrics
Next: User validation at 04:15 UTC

#cutover-live
```

### During Cutover — Traffic Enabled (04:13 UTC / 02:13 BRT)
```
🟢 PRODUCTION TRAFFIC ENABLED

  ✓ All systems GO
  ✓ Users can now access imobi.com.br
  ✓ Monitoring: Continuous every 5 minutes

Current metrics:
  • Error rate: 0.02%
  • Response time (p95): 245ms
  • Database: Healthy
  • Redis: Healthy

We will post updates every 5 minutes.

#announcements
```

### During Cutover — Critical Check (04:30 UTC / 02:30 BRT)
```
✅ CHECKPOINT PASSED — 30 minutes into cutover

All metrics GREEN:
  ✓ Error rate: 0.05% (threshold: < 1%)
  ✓ Response time: 267ms (threshold: < 700ms)
  ✓ Database connections: 14 (threshold: < 25)
  ✓ Redis memory: 198MB (threshold: < 500MB)
  ✓ User flows: All working

No critical issues. Continuing production monitoring.

Next update: 04:50 UTC

#cutover-live #announcements
```

### Post-Cutover — Success (08:00 UTC / 06:00 BRT)
```
✅ PRODUCTION DEPLOYMENT SUCCESSFUL

Phase 4 features are now LIVE:
  ✓ Enhanced GPS validation
  ✓ Improved payment pipeline
  ✓ Manager dashboard optimizations
  ✓ Engineer mobile improvements

Statistics:
  • Cutover duration: 4 hours (within window)
  • Zero user-facing errors
  • All validations passed
  • Database integrity: ✅ OK
  
CTO remains on-call 48 hours. Standard operations resume.

Thank you for your patience!

#announcements #product
```

### Post-Cutover — Incident (if applicable)
```
🔴 INCIDENT: Rollback in progress

Issue detected: [brief description]
Action: Reverting to previous stable version

Timeline:
  06:15 UTC: Issue detected
  06:18 UTC: Rollback initiated
  06:22 UTC: Previous version live
  
User Impact: [X] minutes of service degradation
Status: Recovering, users can access system again

Post-mortem: Tomorrow at [date/time]

#critical #announcements
```

---

## SIGN-OFF & APPROVAL CHECKLIST

**This plan requires signatures from:**

### 1. CTO — Deployment Authority
```
Name: ____________________________
Signature: ________________________
Date: ____________________________
Phone (during cutover): ____________
```

### 2. DevOps Lead — Infrastructure Execution
```
Name: ____________________________
Signature: ________________________
Date: ____________________________
Phone (during cutover): ____________
```

### 3. Tech Lead On-Call — Hotfix Authority
```
Name: ____________________________
Signature: ________________________
Date: ____________________________
Phone (during cutover): ____________
```

### 4. QA Lead — Testing Validation
```
Name: ____________________________
Signature: ________________________
Date: ____________________________
Test completion date: _______________
```

### 5. Product Lead — Go/No-Go
```
Name: ____________________________
Signature: ________________________
Date: ____________________________
```

---

## APPENDIX A: CUTOVER CHECKLIST (Print & Check Off)

### T-2 Hours (06/01 20:00 BRT / 22:00 UTC)
- [ ] All team members online in #cutover-live
- [ ] Monitoring dashboards open
- [ ] Vercel deployment pipeline ready
- [ ] Database backup verified (S3 confirmed)
- [ ] Redis snapshot verified (S3 confirmed)
- [ ] Sentry projects active
- [ ] Phone bridge open + tested
- [ ] Rollback procedure reviewed by 2+ engineers

### T-1 Hour (06/02 01:00 BRT / 03:00 UTC)
- [ ] Final git log verified (tag v2.0.0 visible)
- [ ] Latest build artifact ready in Vercel
- [ ] All pre-flight checks passed
- [ ] CTO online + confirmed ready
- [ ] Team energy good (hydrated, not tired)

### T-0 (Cutover Start 06/02 02:00 BRT / 04:00 UTC)
- [ ] Slack message posted "CUTOVER START"
- [ ] Monitoring dashboards showing live data
- [ ] All team members ready
- [ ] Database migration command ready to execute
- [ ] Vercel deploy button ready to click

### During Cutover
- [ ] Each checkpoint timestamp recorded
- [ ] Status updates posted every 5 minutes
- [ ] All tests pass (health checks, critical flows)
- [ ] No blocking issues encountered
- [ ] Team communication clear

### Post-Cutover (After 08:00 UTC / 06:00 BRT)
- [ ] Success message posted
- [ ] Metrics confirmed stable
- [ ] Post-mortem scheduled
- [ ] Team debriefed
- [ ] CTO on-call status confirmed (48 hours)

---

## APPENDIX B: EMERGENCY CONTACTS

```
PRIMARY TEAM:
CTO:                +55 _______ | @cto | contato.vinicaetano93@gmail.com
DevOps Lead:        +55 _______ | @devops
Tech Lead:          +55 _______ | @tech-lead
Support Lead:       +55 _______ | @support

SECONDARY CONTACTS:
AWS Account Owner:  +55 _______ | [email]
Database Admin:     +55 _______ | [email]
Security Lead:      +55 _______ | [email]

CRITICAL ESCALATION:
If all primary contacts unreachable → Escalate to [company leadership]
```

---

## APPENDIX C: VERCEL ENVIRONMENT VARIABLES (Required)

**Must be set in Vercel Project Settings before cutover:**

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.imobi.com
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[sentry-endpoint]/[project-id]
NEXT_PUBLIC_SENTRY_RELEASE=phase4-2026-06-02

# Database (API service)
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://[password]@[endpoint]:6379

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=[key]

# Firebase
FIREBASE_PROJECT_ID=[id]
FIREBASE_PRIVATE_KEY=[key]
FIREBASE_CLIENT_EMAIL=[email]

# AWS S3
AWS_S3_BUCKET=imobi-prod-evidence
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=[key]
AWS_SECRET_ACCESS_KEY=[key]

# CORS
CORS_ORIGIN=https://imobi.vercel.app,https://imobi.com.br,https://api.imobi.com

# Monitoring
SENTRY_DSN=https://[key]@[sentry-endpoint]/[api-project-id]
SENTRY_RELEASE=phase4-2026-06-02
```

---

## APPENDIX D: QUICK ROLLBACK COMMAND

**If disaster → execute this immediately:**

```bash
#!/bin/bash
# Emergency rollback script — DO NOT USE without CTO approval

echo "⚠️  INITIATING EMERGENCY ROLLBACK"
echo "If you did not intend this, press Ctrl+C now!"
sleep 5

# Revert latest commit
git revert HEAD --no-edit
git push origin main

echo "✅ Rollback initiated"
echo "Vercel will auto-redeploy within 30 seconds"
echo "Monitor: https://vercel.com/dashboard"
```

---

## APPENDIX E: POST-MORTEM TEMPLATE (If Issues Occur)

```
# Post-Mortem: Phase 4 Production Cutover — 2026-06-02

## Timeline
- **04:00 UTC**: Cutover started
- **[TIME]**: Issue detected
- **[TIME]**: Rollback initiated
- **[TIME]**: Service restored

## Issue Summary
**What happened**: [describe incident]
**Impact**: [# users affected, duration, data loss if any]
**Root cause**: [analysis]

## Contributing Factors
1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

## Immediate Actions Taken
- [ ] Service restored
- [ ] Data integrity verified
- [ ] Customer communication sent

## Follow-Up Actions
1. Fix root cause (PR + merged by [date])
2. Add automated test to prevent recurrence
3. Update runbooks based on lessons learned

## Lessons Learned
1. [What went well]
2. [What could improve]
3. [Tooling/process changes needed]

## Next Steps
- Schedule next cutover attempt: [date/time]
- Assign owner for each action item
- Review with full team: [date]
```

---

## FINAL NOTES

1. **This is a PRODUCTION document** — No speculation, every number is exact
2. **Print this before cutover** — Have hardcopy + PDF backup
3. **Designate a Scribe** — Someone documents every action in real-time
4. **No Changes During Cutover** — Follow plan exactly, escalate deviations to CTO
5. **Communication is Key** — Post status every 5 minutes minimum
6. **CTO has Final Say** — All decisions above CTO approval level must be escalated
7. **Success ≠ Complete** — Monitor 48 hours post-launch for edge cases

---

**Document Owner**: Engineering Lead  
**Last Reviewed**: 2026-05-29  
**Next Review**: 2026-06-01 (Pre-cutover final check)  
**Approved By**: [CTO Signature]  
**Date Approved**: [Date]

---

**CUTOVER GO/NO-GO DECISION REQUIRED BY 2026-06-01 17:00 BRT**  
**Refer to: GO_NO_GO_DECISION.md for gate criteria**
