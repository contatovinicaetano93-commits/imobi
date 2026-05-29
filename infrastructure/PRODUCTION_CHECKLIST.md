# Production Deployment Checklist

Complete pre-launch checklist for deploying Imobi to production.

## Phase 1: Infrastructure & Backups

- [ ] **AWS Account Setup**
  - [ ] AWS account created and configured
  - [ ] VPC and security groups configured
  - [ ] RDS PostgreSQL instance created
  - [ ] ElastiCache Redis instance created
  - [ ] S3 buckets created (evidencias, backups)
  - [ ] IAM roles and policies configured

- [ ] **Database Setup**
  - [ ] PostgreSQL 15 with PostGIS extension
  - [ ] Database user created (imbobi)
  - [ ] Database created (imbobi_production)
  - [ ] Schemas and extensions initialized
  - [ ] Prisma migrations applied
  - [ ] Backups configured and tested

- [ ] **Redis Setup**
  - [ ] Redis 7 instance running
  - [ ] RDB persistence enabled
  - [ ] AOF persistence enabled (optional)
  - [ ] Password configured
  - [ ] Replication configured (if HA)
  - [ ] Backup scripts configured

- [ ] **Backup & Recovery**
  - [ ] PostgreSQL backup script deployed
  - [ ] Redis backup script deployed
  - [ ] Cron jobs configured (2:00 AM UTC, 2:30 AM UTC)
  - [ ] S3 backup buckets created with versioning
  - [ ] Backup integrity verified
  - [ ] Restore procedures tested
  - [ ] Disaster recovery runbook available

## Phase 2: Monitoring & Observability

- [ ] **Sentry Setup**
  - [ ] Sentry account created
  - [ ] API project created
  - [ ] Web app project created
  - [ ] DSN configured in API (.env.production)
  - [ ] DSN configured in web (.env.production)
  - [ ] Error tracking verified with test error
  - [ ] Performance monitoring enabled
  - [ ] Profiler enabled (10% sample rate)

- [ ] **Alert Rules**
  - [ ] High error rate alert configured (>5% for 5min)
  - [ ] Elevated error rate alert (>1% for 10min)
  - [ ] Database error alert configured
  - [ ] Slow response time alert (p95 > 1s)
  - [ ] All alerts routed to #incidents Slack channel
  - [ ] On-call escalation configured

- [ ] **Monitoring Setup**
  - [ ] Health check endpoint verified
  - [ ] Logging configured (JSON format)
  - [ ] Log rotation configured (7-day retention)
  - [ ] Core Web Vitals tracking enabled
  - [ ] Database slow query log enabled
  - [ ] Redis slow log configured

## Phase 3: Configuration & Secrets

- [ ] **Environment Variables**
  - [ ] DATABASE_URL configured
  - [ ] REDIS_URL configured
  - [ ] JWT_SECRET generated and secured
  - [ ] AWS credentials configured
  - [ ] S3 bucket name configured
  - [ ] SENDGRID_API_KEY configured
  - [ ] FIREBASE credentials configured
  - [ ] SENTRY_DSN configured
  - [ ] All secrets stored in secure vault (not .env file)

- [ ] **TLS/SSL Certificates**
  - [ ] Domain SSL certificate obtained
  - [ ] Certificate installed on load balancer
  - [ ] HTTPS enforced (redirect HTTP → HTTPS)
  - [ ] Certificate renewal automated (Let's Encrypt)
  - [ ] CORS_ORIGIN updated to production domain

- [ ] **Domain & DNS**
  - [ ] Domain registered
  - [ ] DNS records created:
    - [ ] A record → API endpoint
    - [ ] CNAME → CDN (for web/mobile)
  - [ ] DNS propagated globally
  - [ ] SPF record for email authentication
  - [ ] DKIM configured for SendGrid
  - [ ] DMARC policy configured

## Phase 4: API Deployment

- [ ] **API Service Setup**
  - [ ] API deployed to production environment
  - [ ] Environment: NODE_ENV=production
  - [ ] Port: 4000 exposed via load balancer
  - [ ] Health check endpoint tested: /api/v1/health
  - [ ] Database connection verified
  - [ ] Redis connection verified
  - [ ] All external services verified

- [ ] **API Validation**
  - [ ] Environment validation passed
  - [ ] Database schema up-to-date
  - [ ] PostGIS extension available
  - [ ] S3 bucket accessible
  - [ ] SendGrid API working
  - [ ] Firebase admin working
  - [ ] Sentry connection working
  - [ ] JWT signing working
  - [ ] Password hashing working

- [ ] **API Testing**
  - [ ] Health endpoint returns status: ok
  - [ ] Health check: database.configured = true
  - [ ] Health check: redis.status = connected
  - [ ] Health check: email.configured = true
  - [ ] Health check: firebase.configured = true
  - [ ] Test user creation (sign up flow)
  - [ ] Test JWT authentication
  - [ ] Test password reset flow
  - [ ] Test error reporting to Sentry

## Phase 5: Web App Deployment

- [ ] **Web App Setup**
  - [ ] Web app deployed (Vercel/similar)
  - [ ] Environment: NODE_ENV=production
  - [ ] NEXT_PUBLIC_API_URL → production API
  - [ ] NEXT_PUBLIC_SENTRY_DSN configured
  - [ ] Analytics configured
  - [ ] CDN cache configured

- [ ] **Web App Testing**
  - [ ] Home page loads in < 2.5s (LCP)
  - [ ] No layout shifts during load (CLS < 0.1)
  - [ ] First input responsive (FID < 100ms)
  - [ ] Sign-up page works
  - [ ] Login page works
  - [ ] Dashboard loads and displays correctly
  - [ ] Evidence upload works
  - [ ] Sentry captures errors correctly

## Phase 6: Mobile App Deployment

- [ ] **Mobile App Setup**
  - [ ] Expo app configured for production
  - [ ] EAS_PROJECT_ID configured
  - [ ] EXPO_PUBLIC_API_URL → production API
  - [ ] Build signed with release certificate
  - [ ] App Store submission prepared

- [ ] **Mobile App Testing**
  - [ ] Can create account
  - [ ] Can log in
  - [ ] Can view dashboard
  - [ ] Can upload evidence photos
  - [ ] Push notifications work
  - [ ] Offline mode functions
  - [ ] No console errors

## Phase 7: Security & Compliance

- [ ] **Security**
  - [ ] HTTPS enforced everywhere
  - [ ] CORS properly configured
  - [ ] Rate limiting enabled
  - [ ] Password hashing strong (bcrypt 12 rounds)
  - [ ] JWT secrets strong (64+ characters)
  - [ ] SQL injection prevention verified
  - [ ] No secrets in code or logs
  - [ ] Dependencies up-to-date
  - [ ] Security headers configured (HSTS, CSP, etc.)

- [ ] **Compliance**
  - [ ] Privacy policy deployed
  - [ ] Terms of service deployed
  - [ ] Data retention policy documented
  - [ ] LGPD compliance verified (Brazil)
  - [ ] User data encryption verified
  - [ ] Backup encryption verified
  - [ ] Audit logging enabled
  - [ ] Incident response plan documented

- [ ] **Authentication & Authorization**
  - [ ] OAuth providers configured (Google, etc.)
  - [ ] Email verification working
  - [ ] Password reset working
  - [ ] Session management verified
  - [ ] Token refresh working
  - [ ] Logout clears sessions
  - [ ] Role-based access control verified

## Phase 8: Performance & Load Testing

- [ ] **Performance Baseline**
  - [ ] API p50 latency baseline established
  - [ ] API p95 latency < 500ms
  - [ ] API p99 latency < 1000ms
  - [ ] Error rate < 0.1%
  - [ ] Database query times logged
  - [ ] Cache hit rates established
  - [ ] Memory usage profiled

- [ ] **Load Testing** (optional but recommended)
  - [ ] Load test tool configured (k6, JMeter)
  - [ ] Test scenario: 100 concurrent users
  - [ ] Test duration: 10 minutes
  - [ ] Error rate < 1% under load
  - [ ] p95 latency < 1s under load
  - [ ] Database connections stable
  - [ ] Memory usage acceptable
  - [ ] Results documented

## Phase 9: Documentation & Training

- [ ] **Documentation**
  - [ ] Disaster recovery runbook available
  - [ ] On-call runbook created
  - [ ] Monitoring dashboard documented
  - [ ] Alert escalation policy documented
  - [ ] Database schema documented
  - [ ] API endpoints documented
  - [ ] Environment variables documented

- [ ] **Team Training**
  - [ ] On-call engineer trained
  - [ ] Backup/restore procedures practiced
  - [ ] Incident response procedures practiced
  - [ ] Monitoring dashboard familiarized
  - [ ] Alert handling practiced
  - [ ] Rollback procedures reviewed

## Phase 10: Pre-Launch (48 hours before)

- [ ] **Final Infrastructure Check**
  - [ ] All services healthy
  - [ ] Database backups running
  - [ ] Redis backups running
  - [ ] Monitoring active (Sentry capturing events)
  - [ ] Alerts configured and tested
  - [ ] On-call engineer briefed and ready

- [ ] **Final API Check**
  - [ ] Health check: status = ok
  - [ ] Sample API calls successful
  - [ ] Error logging working
  - [ ] Performance metrics being captured
  - [ ] No unexpected errors in logs

- [ ] **Final Web/Mobile Check**
  - [ ] Sign-up flow works end-to-end
  - [ ] Login flow works
  - [ ] User creation in database verified
  - [ ] Email sending tested
  - [ ] Push notifications tested
  - [ ] All third-party integrations verified

## Phase 11: Launch Day

- [ ] **Pre-Launch (30 minutes before)**
  - [ ] On-call engineer at computer
  - [ ] Slack channel ready (#incidents)
  - [ ] Monitoring dashboard open (Sentry)
  - [ ] Health check running (auto-refresh)
  - [ ] Load balancer configured
  - [ ] DNS ready to switch

- [ ] **Go-Live**
  - [ ] DNS switched to production (gradual rollout recommended)
  - [ ] Monitor error rate (should be 0-0.1%)
  - [ ] Monitor response times (p95 < 500ms)
  - [ ] Monitor user signups (confirmation)
  - [ ] Verify email sending works
  - [ ] Verify auth flows work
  - [ ] Monitor memory/CPU usage
  - [ ] Check logs for unexpected errors

- [ ] **First Hour**
  - [ ] Error rate steady and low
  - [ ] No database connection errors
  - [ ] Cache is building up (hit rate improving)
  - [ ] User reports coming in (positive)
  - [ ] No performance degradation
  - [ ] All critical features working
  - [ ] Log review: no unexpected patterns

## Phase 12: Post-Launch Monitoring (24 hours)

- [ ] **Day 1: Active Monitoring**
  - [ ] Hourly health check (automated)
  - [ ] Error dashboard review (Sentry)
  - [ ] Performance dashboard review
  - [ ] User feedback collection
  - [ ] Log analysis (no critical errors)
  - [ ] Database performance OK
  - [ ] Cache hit rates good (>80%)

- [ ] **Day 1-7: Stability Check**
  - [ ] Daily performance review
  - [ ] No error spikes
  - [ ] User signups proceeding normally
  - [ ] Evidence upload working
  - [ ] Payment/credit flows working
  - [ ] Notifications sending
  - [ ] Backup running successfully

## Phase 13: Documentation Update

- [ ] **Post-Launch Documentation**
  - [ ] Document actual vs. planned setup
  - [ ] Update runbooks with real endpoints
  - [ ] Document any changes made during launch
  - [ ] Update contact information
  - [ ] Publish launch summary
  - [ ] Archive deployment logs
  - [ ] Schedule retrospective meeting

## Rollback Plan

If critical issues discovered, rollback within 15 minutes:

- [ ] **Rollback Trigger Criteria**
  - [ ] Error rate > 5% for 2 minutes
  - [ ] API completely unavailable
  - [ ] Data corruption detected
  - [ ] Major security breach

- [ ] **Rollback Steps**
  1. [ ] Notify team in #incidents
  2. [ ] Switch DNS back to previous version (or stale)
  3. [ ] Verify previous version is healthy
  4. [ ] Stop new sign-ups if needed (circuit breaker)
  5. [ ] Investigate root cause
  6. [ ] Document incident
  7. [ ] Schedule post-mortem

## Sign-Off

- [ ] **Infrastructure Lead**: _________________ Date: _______
- [ ] **Engineering Lead**: _________________ Date: _______
- [ ] **Security Lead**: _________________ Date: _______
- [ ] **Product Manager**: _________________ Date: _______

---

**Deployment Version:** 0.1.0-beta
**Deployment Date:** ________________
**Deployed By:** ________________
**Reviewed By:** ________________

