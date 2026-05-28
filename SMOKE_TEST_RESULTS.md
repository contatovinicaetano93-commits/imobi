# Smoke Test Results - Staging Deployment

**Generated:** [TIMESTAMP]  
**Environment:** staging  
**Branch:** [BRANCH]  
**Commit:** [COMMIT_SHA]

---

## Summary

| Metric | Status | Details |
|--------|--------|---------|
| **Total Tests** | - | 30 critical checks |
| **Passed** | 🟢 | - / 30 |
| **Failed** | 🔴 | - / 30 |
| **Skipped** | 🟡 | - / 30 |
| **Duration** | ⏱️ | - seconds |
| **Deployment Ready** | ❓ | Pending |

---

## Test Suites

### 1. Health & Connectivity (4 checks)

| Check | Status | Details |
|-------|--------|---------|
| API Health Endpoint | ⏳ | - |
| Database Connection | ⏳ | - |
| Redis Connection | ⏳ | - |
| S3 Connectivity | ⏳ | - |

**Notes:**
- Verify all infrastructure components are accessible
- Database must respond to queries within 5s
- Redis must have available slots for cache operations
- S3 credentials must be valid and accessible

---

### 2. User Registration & Login Flow (7 checks)

| Check | Status | Details |
|-------|--------|---------|
| User Registration | ⏳ | - |
| User Login | ⏳ | - |
| JWT Token Generation | ⏳ | - |
| Token Refresh | ⏳ | - |
| Reject Invalid Password | ⏳ | - |
| Reject Non-existent User | ⏳ | - |
| Auth Guard Working | ⏳ | - |

**Critical Issues:**
- [ ] Registration endpoint returns 201 status
- [ ] Access token is valid JWT (3 parts)
- [ ] Refresh token mechanism working
- [ ] Auth guard properly rejecting unauthorized requests

**Notes:**
- Test user data: `smoke-test-TIMESTAMP@imbobi.com`
- Password policy enforced correctly
- CORS headers present in responses

---

### 3. KYC Complete Flow (7 checks)

| Check | Status | Details |
|-------|--------|---------|
| Document Upload | ⏳ | - |
| Multiple Document Types | ⏳ | - |
| Status Retrieval | ⏳ | - |
| Document Listing | ⏳ | - |
| Auth Rejection | ⏳ | - |
| Document Types Validation | ⏳ | - |
| Admin Approval Endpoint | ⏳ | - |

**Critical Issues:**
- [ ] Upload endpoint accepting documents
- [ ] Status endpoint returns proper schema
- [ ] Document listing is paginated if needed
- [ ] Approval flow is properly guarded (403 for non-admins)

**Supported Document Types:**
- [ ] RG
- [ ] CPF
- [ ] CNH
- [ ] COMPROVANTE_ENDERECO

**Notes:**
- KYC status must be updatable only via admin endpoints
- Document URLs must be validated/stored securely
- Removal of test documents in cleanup phase

---

### 4. Credit Flow (6 checks)

| Check | Status | Details |
|-------|--------|---------|
| Credit Request | ⏳ | - |
| Credit Simulation | ⏳ | - |
| Credit Status | ⏳ | - |
| User Credits Listing | ⏳ | - |
| Auth Rejection | ⏳ | - |
| Interest Calculation | ⏳ | - |

**Critical Issues:**
- [ ] Credit request returns proper schema
- [ ] Simulation calculates interest correctly (must be > principal)
- [ ] Status endpoint accessible only to credit owner
- [ ] BullMQ worker can process liberacao-parcela jobs
- [ ] Async liberation process working

**Test Values:**
- Principal: R$ 50,000
- Term: 12 months
- Simulation: R$ 100,000 for 24 months

**Notes:**
- Credit liberation is always async via BullMQ
- Interest calculation must follow business rules
- CET (Custo Efetivo Total) must be calculated
- Tax rates must be configurable per business rules

---

### 5. Evidence Flow (6 checks)

| Check | Status | Details |
|-------|--------|---------|
| Obra Creation | ⏳ | - |
| Valid GPS Evidence Upload | ⏳ | - |
| Invalid GPS Rejection | ⏳ | - |
| Evidence Listing | ⏳ | - |
| Auth Rejection | ⏳ | - |
| GPS Validation (Server-side) | ⏳ | - |

**Critical Issues:**
- [ ] Obra creation requires authenticated user
- [ ] GPS accuracy validation enforced (5m minimum, 50m radius)
- [ ] Evidence upload returns proper schema
- [ ] Server-side PostGIS validation working
- [ ] Evidence cannot be tampered with (immutable after creation)

**GPS Validation Rules:**
- Minimum accuracy: 5 meters (excellent)
- Maximum accuracy: 50 meters (acceptable)
- Radius validation: 50m from obra location
- PostGIS validation: MANDATORY (client validation insufficient)

**Test Location:** São Paulo, Brazil (-23.55, -46.63)

**Notes:**
- Evidence photos require metadata (EXIF data validation)
- Evidence deletion should be logged
- GPS spoofing attempts must be detected server-side
- S3 upload required for evidence media

---

## Common Failures & Resolution

### Database Connection Failures
**Symptom:** `connect ECONNREFUSED 127.0.0.1:5432`
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify DATABASE_URL environment variable
- Ensure credentials match docker-compose setup

### Redis Connection Failures
**Symptom:** `connect ECONNREFUSED 127.0.0.1:6379`
- Check Redis is running: `docker ps | grep redis`
- Verify REDIS_HOST and REDIS_PORT
- Clear stale connections: `redis-cli FLUSHALL`

### S3 Access Failures
**Symptom:** `NoCredentialsError` or `AccessDenied`
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Check S3 bucket exists and is accessible
- Verify IAM permissions for the credentials
- Check CORS configuration on S3 bucket

### JWT Token Failures
**Symptom:** `401 Unauthorized`
- Verify JWT_SECRET environment variable is set
- Check token expiration (JWT_EXPIRES_IN)
- Ensure Authorization header format: `Bearer <token>`

### GPS Validation Failures
**Symptom:** Evidence upload returns 400
- Verify accuracyMetros is between 5-50
- Check latitude/longitude are within valid range
- Ensure PostGIS extension is installed: `CREATE EXTENSION postgis;`
- Test PostGIS: `SELECT ST_Distance(...)`

---

## Pre-Deployment Checklist

Before pushing to production:

### Environment Setup
- [ ] All `.env` variables are set correctly
- [ ] Database migrations completed: `pnpm db:migrate`
- [ ] Prisma client generated: `pnpm db:generate`
- [ ] Redis cluster is operational
- [ ] S3 bucket is configured with proper permissions
- [ ] AWS credentials are rotated and valid

### Application Setup
- [ ] All tests passing: `pnpm test:smoke`
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm type-check`
- [ ] Linting passes: `pnpm lint`
- [ ] Docker images built and pushed

### Security Checks
- [ ] CSRF tokens are being generated
- [ ] Rate limiting is active
- [ ] CORS headers are correct
- [ ] Helmet security headers present
- [ ] No hardcoded secrets in code
- [ ] API keys rotated in staging

### Monitoring & Logging
- [ ] Logs are being collected
- [ ] Error tracking (Sentry) is configured
- [ ] Health checks are accessible
- [ ] Metrics endpoints are working
- [ ] Alarms are set for critical failures

### Database & Cache
- [ ] Database backups are current
- [ ] Redis persistence is enabled
- [ ] BullMQ worker processes are running
- [ ] Queue monitoring is active
- [ ] Connection pools are sized correctly

### Data Integrity
- [ ] Test data cleanup successful
- [ ] No orphaned records in database
- [ ] Evidence media cleanup working
- [ ] Sensitive data is encrypted
- [ ] Audit logs are being created

---

## Failure Response Plan

### If Tests Fail

1. **Identify Failure Type**
   - Infrastructure: Database/Redis/S3 connectivity
   - Auth: JWT generation or validation
   - Business Logic: Core API functionality
   - Data: Database integrity issues

2. **Immediate Actions**
   - [ ] Document the exact error message
   - [ ] Reproduce locally
   - [ ] Check recent changes/deployments
   - [ ] Review logs and monitoring

3. **Escalation Path**
   - [ ] DEV: Fix the issue in code/config
   - [ ] QA: Re-run tests
   - [ ] INFRA: Verify infrastructure setup
   - [ ] RELEASE: Approve deployment after fix

4. **Do NOT Deploy If:**
   - [ ] Any "Health & Connectivity" test fails
   - [ ] Any "User Registration & Login" test fails
   - [ ] Any critical business flow is broken
   - [ ] Database/Redis/S3 connectivity is down

---

## Next Steps

### If All Tests Pass (✓)
1. Merge PR to main branch
2. Build Docker images with staging tag
3. Deploy to staging environment
4. Run full E2E test suite
5. Manual QA testing
6. Deploy to production

### If Tests Fail (✗)
1. Revert changes
2. Investigate root cause
3. Fix issue in feature branch
4. Re-run smoke tests
5. Once fixed, follow "All Pass" flow

---

## Contact & Support

**Test Suite Owner:** DevOps Team  
**Runbook:** [LINK_TO_RUNBOOK]  
**Escalation:** #devops-oncall  
**Staging Dashboard:** [LINK_TO_DASHBOARD]

---

*Last Updated: [DATE]*  
*Test Framework: Jest + Supertest + NestJS Testing Module*
