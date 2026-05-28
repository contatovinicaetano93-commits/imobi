# PRODUCTION DEPLOYMENT CHECKLIST — imbobi

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Approver:** _______________  
**Rollback Contact:** _______________

---

## PRE-DEPLOYMENT (7 Days Before)

### Code Review & Quality

- [ ] **Code Review Complete**
  - [ ] All commits reviewed by minimum 2 engineers
  - [ ] All PR comments resolved
  - [ ] No security concerns flagged
  - [ ] No performance regressions identified
  - [ ] Link to PR: _______________

- [ ] **Test Coverage**
  - [ ] Unit tests passing: `pnpm test`
  - [ ] Integration tests passing: `pnpm test:integration`
  - [ ] E2E tests passing: `pnpm test:e2e`
  - [ ] Type checking passing: `pnpm type-check`
  - [ ] No console.log statements in production code
  - [ ] No debugger statements left

- [ ] **Lint & Format**
  - [ ] ESLint passing: `pnpm lint`
  - [ ] Code formatted: `pnpm format`
  - [ ] No uncommitted changes after formatting

### Security Audit

- [ ] **Secrets & Keys Verification**
  - [ ] All hardcoded secrets removed
  - [ ] Verify `.env.example` does NOT contain real values
  - [ ] All production secrets in secure storage (AWS Secrets Manager, Vault)
  - [ ] No API keys in code comments
  - [ ] No personal/test data in codebase

- [ ] **CORS Configuration**
  - [ ] CORS_ORIGIN contains only production domains (no wildcards)
  - [ ] No `localhost` or `*` in production config
  - [ ] Verify CORS headers in DEPLOYMENT.md match actual config
  - [ ] Test CORS with curl: `curl -H "Origin: https://app.imbobi.com" https://api.imbobi.com/api/v1/health -v`

- [ ] **CSRF Protection**
  - [ ] CSRF endpoint accessible: `GET /api/v1/auth/csrf-token`
  - [ ] CSRF tokens validate correctly
  - [ ] CSRF token rotation working
  - [ ] All POST/PUT/DELETE endpoints require CSRF token
  - [ ] CSRF token validation cannot be bypassed

- [ ] **Database Security**
  - [ ] DATABASE_URL uses SSL: `?sslmode=require`
  - [ ] Database password meets complexity requirements (16+ chars, mixed case, numbers, symbols)
  - [ ] Connection pooling configured: DATABASE_POOL_SIZE=20
  - [ ] No direct SSH access without 2FA
  - [ ] Database user has minimal required permissions (no SUPERUSER)

- [ ] **API Security**
  - [ ] Rate limiting endpoints configured (see DEPLOYMENT.md § 8)
  - [ ] Rate limits tested and tuned for production load
  - [ ] Authentication required on all protected endpoints
  - [ ] Authorization checks in place for all user-specific data
  - [ ] No sensitive data logged or cached unencrypted

- [ ] **External Service Integration**
  - [ ] SendGrid API key rotated (if older than 90 days)
  - [ ] AWS IAM credentials follow least-privilege principle
  - [ ] Firebase service account has minimal permissions
  - [ ] S3 bucket has public access blocked
  - [ ] S3 bucket versioning enabled

### Performance & Load Testing

- [ ] **Performance Baseline**
  - [ ] API response time < 500ms (p95) on baseline endpoints
  - [ ] Database query time < 100ms (p95) for common queries
  - [ ] Redis latency < 10ms
  - [ ] Memory usage stable under typical load
  - [ ] CPU usage < 70% at peak load

- [ ] **Load Testing Executed**
  - [ ] Tool used: _______________
  - [ ] Concurrent users tested: _______________
  - [ ] Results document: _______________
  - [ ] No errors above 0.1% error rate
  - [ ] No cascading failures observed
  - [ ] Database connection pool adequate

- [ ] **Database Performance**
  - [ ] All critical indexes in place
  - [ ] EXPLAIN ANALYZE on slow queries shows good plans
  - [ ] No N+1 queries in critical paths
  - [ ] Query timeout set appropriately
  - [ ] Autovacuum tuned for production load

### Infrastructure & Backups

- [ ] **Database Backup Strategy**
  - [ ] Daily snapshots configured: _______________
  - [ ] Backup retention policy: _______________
  - [ ] Backup tested and restorable (restore test document: _______________)
  - [ ] Backup location geographically diverse
  - [ ] Backup encryption enabled
  - [ ] Estimated RTO (Recovery Time Objective): _______________
  - [ ] Estimated RPO (Recovery Point Objective): _______________

- [ ] **Disaster Recovery Plan**
  - [ ] Documented: PRODUCTION_ROLLBACK_PLAN.md (location: _______________)
  - [ ] Disaster recovery team identified
  - [ ] On-call rotation established
  - [ ] Incident response procedures documented
  - [ ] Communication plan for incidents

- [ ] **Monitoring Infrastructure**
  - [ ] Sentry configured and tested
  - [ ] Alerting configured for critical errors
  - [ ] CloudWatch/Datadog setup verified
  - [ ] Monitoring dashboards created
  - [ ] Log aggregation configured
  - [ ] Log retention set to 30+ days

### Stakeholder Communication

- [ ] **Communication to Stakeholders**
  - [ ] Product team notified of deployment window
  - [ ] Customer support briefed on changes
  - [ ] Finance/Legal review completed (if applicable)
  - [ ] Marketing approved messaging for customer communication
  - [ ] All stakeholders have runbook access
  - [ ] Scheduled maintenance announcement sent (if needed)

---

## 24 HOURS BEFORE DEPLOYMENT

### Staging Validation

- [ ] **Staging Environment Tests**
  - [ ] Deployed successfully to staging
  - [ ] All smoke tests passing on staging
  - [ ] Production data subset mirrored to staging
  - [ ] User flows validated end-to-end
  - [ ] Mobile app connected to staging API works
  - [ ] Web app connected to staging API works

- [ ] **Staging Test Scenarios**
  - [ ] User signup flow complete and validated
  - [ ] User login/logout working
  - [ ] JWT token refresh working
  - [ ] Rate limiting not triggering for valid users
  - [ ] File uploads to S3 working
  - [ ] Email sending via SendGrid working
  - [ ] Database transactions working correctly

### Service Dependency Verification

- [ ] **Database (PostgreSQL)**
  - [ ] Connection test: `psql $DATABASE_URL -c "SELECT version();"`
  - [ ] Migrations preview run successfully
  - [ ] Backup test completed and verified
  - [ ] Replication lag < 1 second (if replicated)
  - [ ] Disk space available > 20% of DB size

- [ ] **Cache (Redis)**
  - [ ] Connection test: `redis-cli -h $REDIS_HOST ping`
  - [ ] Memory available > 2GB
  - [ ] Persistence (AOF/RDB) verified
  - [ ] Cluster mode (if applicable) working

- [ ] **Queue (BullMQ)**
  - [ ] Queue depth < 100 pending jobs
  - [ ] Worker processes will auto-start after deploy
  - [ ] Queue monitoring dashboard set up

- [ ] **External Services**
  - [ ] SendGrid connectivity test successful
  - [ ] AWS S3 write/read test successful
  - [ ] Firebase Cloud Messaging test successful
  - [ ] Third-party API connectivity working

### Configuration Verification

- [ ] **Environment Variables**
  - [ ] All required env vars set in production
  - [ ] No test/staging values in production
  - [ ] JWT secrets > 64 characters and random
  - [ ] ENCRYPTION_SECRET > 32 characters and random
  - [ ] All secrets use production values (not staging)

- [ ] **Security Headers**
  - [ ] Helmet.js config in place
  - [ ] CSP headers set correctly
  - [ ] HSTS enabled
  - [ ] X-Frame-Options set to DENY
  - [ ] X-Content-Type-Options set to nosniff

- [ ] **API Configuration**
  - [ ] API_VERSION correct in code and docs
  - [ ] CORS_ORIGIN verified
  - [ ] Rate limiting thresholds correct
  - [ ] CSRF token generation working

### Deployment Readiness

- [ ] **Deployment Package**
  - [ ] Docker image built and tested: `docker build -t imbobi-api:v1.x.x .`
  - [ ] Image pushed to registry: `docker push ...`
  - [ ] Git tag created: `git tag -a v1.x.x -m "Production release v1.x.x"`
  - [ ] Deployment manifest reviewed and ready
  - [ ] All deployment scripts tested

- [ ] **Team Readiness**
  - [ ] Deployment team assembled and briefed
  - [ ] On-call engineer assigned
  - [ ] Rollback team identified
  - [ ] Communication channel open (Slack/Discord)
  - [ ] All team members have necessary access

- [ ] **Monitoring Setup**
  - [ ] Sentry dashboards ready
  - [ ] CloudWatch/Datadog dashboards ready
  - [ ] Alert rules configured and tested
  - [ ] Log aggregation tested
  - [ ] Health check endpoints verified

---

## DEPLOYMENT DAY (1-2 Hour Window)

### Pre-Deployment Checklist (30 Minutes Before)

- [ ] **Final Verification**
  - [ ] No critical bugs in staging tests in last 24 hours
  - [ ] All team members available
  - [ ] Rollback plan reviewed and ready
  - [ ] Communication channels active
  - [ ] Database backup completed

- [ ] **Communication**
  - [ ] Status page updated (if applicable): "Maintenance in 30 minutes"
  - [ ] Customer notification sent (if scheduled downtime)
  - [ ] Internal team notified
  - [ ] Stakeholders on standby

### Database Migration Phase (Start of window)

- [ ] **Pre-Migration Backup**
  - [ ] Database snapshot created: `pg_dump -h ... -U ... imbobi_prod > backup_$(date +%Y%m%d_%H%M%S).sql`
  - [ ] Backup verified: `ls -lh backup_*.sql`
  - [ ] Backup copied to safe location

- [ ] **Migration Execution**
  - [ ] API service temporarily stopped/scaled to 0
  - [ ] Run migrations: `DATABASE_URL="..." pnpm db:migrate:deploy`
  - [ ] Migration logs reviewed for errors
  - [ ] Migration completed successfully
  - [ ] Database state verified: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"`

- [ ] **Post-Migration Validation**
  - [ ] All tables exist: `psql $DATABASE_URL -c "\dt"`
  - [ ] All indexes exist: `psql $DATABASE_URL -c "\di"`
  - [ ] Migration down-time: _____ seconds
  - [ ] No orphaned rows or data corruption detected

### API Deployment Phase

- [ ] **Deploy API Service**
  - [ ] Docker image pulled: `docker pull gcr.io/PROJECT_ID/imbobi-api:v1.x.x`
  - [ ] Container started: `docker run -d -p 4000:4000 ...`
  - [ ] Or Cloud Run deploy: `gcloud run deploy imbobi-api --image ...`
  - [ ] Deployment method: _______________
  - [ ] Deployment start time: _______________

- [ ] **Health Check**
  - [ ] Health endpoint responding: `curl https://api.imbobi.com/api/v1/health`
  - [ ] Response includes: database: connected, redis: connected
  - [ ] API accepts requests (test with simple endpoint)
  - [ ] Error rate < 1%
  - [ ] Response time < 1000ms (may be elevated during startup)

- [ ] **API Readiness**
  - [ ] Pod/container healthy (if Kubernetes: `kubectl get pods`)
  - [ ] No error spikes in Sentry
  - [ ] No database connection errors in logs
  - [ ] Queue workers started

### Web Application Deployment Phase

- [ ] **Deploy Next.js Web App**
  - [ ] Build completed: `cd apps/web && pnpm build`
  - [ ] Deployed to Vercel or hosting: `vercel --prod`
  - [ ] Or manual deployment: `pnpm start`
  - [ ] Deployment method: _______________
  - [ ] Deployment start time: _______________

- [ ] **Web App Verification**
  - [ ] Landing page loads: `curl https://app.imbobi.com`
  - [ ] API connectivity test: check browser console for errors
  - [ ] Static assets loading (images, CSS, JS)
  - [ ] No 404 errors for critical resources
  - [ ] CDN cache warmed (if applicable)

### Mobile Application Notification

- [ ] **Mobile App Update Notification**
  - [ ] Firebase Cloud Messaging configured
  - [ ] In-app update prompt works (if applicable)
  - [ ] App Store/Play Store updated (if new version):
    - [ ] iOS: https://apps.apple.com/...
    - [ ] Android: https://play.google.com/store/apps/...
  - [ ] Release notes published
  - [ ] Users notified of optional update (if not critical)

### Smoke Tests (Post-Deployment)

- [ ] **Critical User Flows**
  - [ ] User can sign up: Fill form → Verify email → Login
  - [ ] User can login: Email + password → JWT token received
  - [ ] User can access dashboard: GET `/api/v1/usuario/me` returns 200
  - [ ] User can upload files: POST to `/api/v1/evidencias/upload` works
  - [ ] User can logout: Clears session and JWT tokens

- [ ] **API Endpoints**
  - [ ] CSRF endpoint: `curl https://api.imbobi.com/api/v1/auth/csrf-token`
  - [ ] Health endpoint: `curl https://api.imbobi.com/api/v1/health`
  - [ ] Protected endpoint (with token): Verify authorization
  - [ ] Public endpoint: Verify rate limiting works

- [ ] **Security Validation**
  - [ ] HTTPS enforced (curl -I shows 301 to https)
  - [ ] Security headers present: `curl -I | grep -E "Content-Security-Policy|X-Frame-Options"`
  - [ ] CORS working correctly
  - [ ] CSRF protection active
  - [ ] Rate limiting active (test with loop: `for i in {1..10}; do curl ...; done`)

- [ ] **Database Verification**
  - [ ] Can read users: `curl -H "Authorization: Bearer $TOKEN" https://api.imbobi.com/api/v1/usuario`
  - [ ] Can write data: Create new record and verify
  - [ ] Transaction support verified
  - [ ] Constraints enforced

- [ ] **Cache Verification**
  - [ ] Redis cache working: Monitor `KEYS *` in Redis
  - [ ] Cache hit rate > 50% on repeated requests
  - [ ] BullMQ queue processing jobs successfully

---

## POST-DEPLOYMENT (1 Hour After)

### Error Monitoring

- [ ] **Sentry Error Rate**
  - [ ] Error rate < 1% of requests
  - [ ] No spike in 5XX errors
  - [ ] No spike in authentication errors
  - [ ] All errors review and classified:
    - [ ] Expected errors (validation, user mistakes)
    - [ ] Unexpected errors (bugs requiring hotfix)

- [ ] **Log Analysis**
  - [ ] No database connection errors
  - [ ] No Redis connection errors
  - [ ] No rate limit false positives
  - [ ] No CSRF token validation failures
  - [ ] Error logs reviewed: `grep -i "error\|fatal" /var/log/api/*.log`

### Performance Monitoring

- [ ] **API Performance**
  - [ ] P95 response time: _____ ms (baseline: < 500ms)
  - [ ] P99 response time: _____ ms (baseline: < 1000ms)
  - [ ] Throughput: _____ req/sec
  - [ ] No memory leaks detected (memory usage stable)
  - [ ] CPU usage normal (< 70%)

- [ ] **Database Performance**
  - [ ] Query latency p95: _____ ms (baseline: < 100ms)
  - [ ] Slow query log reviewed and normal
  - [ ] Connection pool utilization: _____ % (baseline: < 80%)
  - [ ] Replication lag (if applicable): _____ ms (baseline: < 100ms)

- [ ] **Cache Performance**
  - [ ] Redis latency: _____ ms (baseline: < 10ms)
  - [ ] Cache hit rate: _____ % (baseline: > 50%)
  - [ ] Memory usage: _____ MB (baseline: stable)

### User Activity Monitoring

- [ ] **User Engagement**
  - [ ] New user signups: _____ in first hour (baseline: ______)
  - [ ] Active users: _____ (baseline: ______)
  - [ ] API requests/sec: _____ (baseline: ______)
  - [ ] User geographic distribution: Check analytics dashboard

- [ ] **Critical User Flows**
  - [ ] Signup success rate: _____ % (baseline: > 95%)
  - [ ] Login success rate: _____ % (baseline: > 99%)
  - [ ] File upload success rate: _____ % (baseline: > 98%)
  - [ ] Payment/transaction processing (if applicable): _____ %

### Infrastructure Health

- [ ] **Service Health**
  - [ ] All pods/containers running: `kubectl get pods` or `docker ps`
  - [ ] CPU utilization: _____ % (healthy: < 70%)
  - [ ] Memory utilization: _____ % (healthy: < 80%)
  - [ ] Network latency: _____ ms
  - [ ] No unexpected restarts

- [ ] **Database Health**
  - [ ] Connection count: _____ (normal: < 50)
  - [ ] Disk usage: _____ % (warning: > 80%)
  - [ ] Write latency: _____ ms
  - [ ] Replication status (if applicable): In sync

- [ ] **External Services**
  - [ ] SendGrid queue depth: _____ (normal: < 100)
  - [ ] S3 operations: All successful
  - [ ] Firebase messaging: Working
  - [ ] Third-party APIs: Responding normally

### Alert Verification

- [ ] **Monitoring Alerts**
  - [ ] Sentry alerts configured and active
  - [ ] PagerDuty/Opsgenie integration working
  - [ ] Slack notifications enabled
  - [ ] On-call engineer receiving alerts
  - [ ] Alert thresholds reasonable (not too noisy)

- [ ] **Critical Alerts**
  - [ ] High error rate alert: configured at > 5%
  - [ ] High latency alert: configured at p95 > 2s
  - [ ] Database connection pool alert: configured at > 90%
  - [ ] Disk space alert: configured at > 85%

### Team Sign-Off

- [ ] **Deployment Complete**
  - [ ] Deployment engineer sign-off: _______________
  - [ ] QA engineer sign-off: _______________
  - [ ] On-call engineer accepting ownership: _______________
  - [ ] Product team sign-off: _______________

- [ ] **Deployment Summary**
  - [ ] Total deployment time: _____ minutes
  - [ ] Downtime duration: _____ minutes
  - [ ] Errors encountered: _______________
  - [ ] Rollback needed: [ ] Yes [ ] No
  - [ ] Notes: _______________________________________________

---

## ROLLBACK PLAN (If Needed)

### Decision Criteria

Roll back immediately if:
- [ ] API completely down (health check failing for > 5 minutes)
- [ ] Error rate > 10% sustained for > 10 minutes
- [ ] Database unavailable or corrupted
- [ ] Critical user flows failing (login, payments)
- [ ] Data loss suspected

### Rollback Procedure

**Step 1: Stop Current Deployment (< 2 minutes)**
```bash
# Option A: Cloud Run
gcloud run deploy imbobi-api --no-traffic

# Option B: Kubernetes
kubectl set image deployment/imbobi-api imbobi-api=imbobi-api:v1.x.x-previous

# Option C: Docker/Manual
docker stop imbobi-api
docker rm imbobi-api
```

**Step 2: Restore Database (if migrations caused issues)**
```bash
# Stop API to prevent writes
# Restore from backup
pg_restore --no-owner -h production.db.internal \
  -U imbobi -d imbobi_prod \
  backup_$(date +%Y%m%d_%H%M%S).sql

# Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"
```

**Step 3: Re-enable API with Previous Version**
```bash
# Option A: Cloud Run
gcloud run deploy imbobi-api \
  --image gcr.io/PROJECT_ID/imbobi-api:v1.x.x-previous

# Option B: Kubernetes
kubectl rollout undo deployment/imbobi-api
```

**Step 4: Verify Health**
```bash
curl https://api.imbobi.com/api/v1/health
# Should return 200 with database: connected, redis: connected
```

**Step 5: Web Rollback (if needed)**
```bash
# Vercel
vercel rollback

# Or manual
git checkout v1.x.x-previous
vercel --prod
```

**Step 6: Notify Stakeholders**
- [ ] Send incident notification to #incidents channel
- [ ] Post status page update
- [ ] Email customers if affected
- [ ] Schedule incident postmortem

### Rollback Checklist

- [ ] [ ] API reverted to previous version
- [ ] [ ] Database restored (if needed)
- [ ] [ ] Health check passing
- [ ] [ ] Error rate normalized
- [ ] [ ] User flows working
- [ ] [ ] Stakeholders notified
- [ ] [ ] Post-incident review scheduled

---

## POST-DEPLOYMENT VALIDATION (24 Hours After)

### 24-Hour Health Check

- [ ] **Error Rates**
  - [ ] 24-hour error rate: _____ % (healthy: < 1%)
  - [ ] No sustained error spikes
  - [ ] No repeating error patterns

- [ ] **Performance**
  - [ ] API P95 response time stable: _____ ms
  - [ ] No memory leaks detected (memory usage constant)
  - [ ] No CPU spikes
  - [ ] Database query performance normal

- [ ] **User Activity**
  - [ ] 24-hour signups: _____ (healthy: baseline ±10%)
  - [ ] User retention normal
  - [ ] No spike in support tickets
  - [ ] Analytics show expected usage patterns

- [ ] **Database**
  - [ ] Database size growth: _____ MB (expected: ______)
  - [ ] Replication lag (if applicable): _____ ms
  - [ ] Backup completed successfully: _______________
  - [ ] No data corruption detected

---

## Sign-Off

**Deployment Completed By:**  
Name: _______________  
Title: _______________  
Date: _______________  
Time: _______________  

**Approved By:**  
Name: _______________  
Title: _______________  
Date: _______________  

---

**Next Steps:**
1. Archive this checklist for compliance/audit
2. Update LATEST_DEPLOYMENT.md with results
3. Schedule postmortem (if any issues)
4. Update runbooks with any lessons learned
5. Plan next monitoring review
