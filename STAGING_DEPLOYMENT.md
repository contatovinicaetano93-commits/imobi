# Staging Deployment Guide - imbobi

This document outlines the process for deploying imbobi to the staging environment, including running smoke tests for validation.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Running Smoke Tests](#running-smoke-tests)
3. [Test Suites Overview](#test-suites-overview)
4. [Interpreting Results](#interpreting-results)
5. [Troubleshooting](#troubleshooting)
6. [Post-Deployment Validation](#post-deployment-validation)
7. [Production Deployment](#production-deployment)

---

## Pre-Deployment Checklist

Before running smoke tests, ensure all prerequisites are met:

### Environment Setup
```bash
# 1. Navigate to project root
cd /home/user/alagami-site

# 2. Install dependencies
pnpm install

# 3. Verify Node version (minimum 18.x)
node --version

# 4. Check all environment variables
cp .env.example .env
# Edit .env with correct staging values

# 5. Verify database connectivity
pnpm db:generate

# 6. Run database migrations
pnpm db:migrate

# 7. Build the project
pnpm build
```

### Service Setup
```bash
# Start all required services
# Option 1: Using Docker Compose
docker-compose -f docker-compose.staging.yml up -d

# Option 2: Manual startup
# Terminal 1: PostgreSQL
docker run --name postgres_staging -e POSTGRES_PASSWORD=password -p 5432:5432 postgres

# Terminal 2: Redis
docker run --name redis_staging -p 6379:6379 redis

# Terminal 3: API
cd services/api
pnpm dev

# Terminal 4: Web (optional for API tests)
cd apps/web
pnpm dev
```

### Infrastructure Verification
- [ ] PostgreSQL running and accessible on configured host:port
- [ ] Redis running and accessible on configured host:port
- [ ] AWS S3 bucket exists and credentials are valid
- [ ] API server is running and listening on configured port
- [ ] All required environment variables are set

---

## Running Smoke Tests

### Quick Start

```bash
# Option 1: Using the bash script (recommended)
./scripts/run-smoke-tests.sh

# Option 2: Using pnpm directly
cd services/api
pnpm test:smoke

# Option 3: Using Jest with custom options
cd services/api
pnpm test -- --config jest-e2e.config.js test/smoke/smoke.spec.ts --runInBand --forceExit
```

### Expected Output

Successful run:
```
PASS  test/smoke/smoke.spec.ts
  Smoke Tests - Critical Production Flows
    Health & Connectivity
      ✓ [SMOKE] Should have API health endpoint responding
      ✓ [SMOKE] Should have working database connection
      ✓ [SMOKE] Should have working Redis connection
      ✓ [SMOKE] Should verify S3 connectivity via presigned URLs
    User Registration & Login Flow
      ✓ [SMOKE] Should register user with valid data
      ✓ [SMOKE] Should login with correct credentials
      ...
```

Failed run example:
```
FAIL  test/smoke/smoke.spec.ts
  ✗ [SMOKE] Should have working Redis connection
    Error: connect ECONNREFUSED 127.0.0.1:6379
```

---

## Test Suites Overview

### 1. Health & Connectivity (4 checks)

Validates all infrastructure components are operational:
- API health endpoint
- Database connectivity
- Redis connection
- S3 presigned URL generation

**Failure impact:** CRITICAL

---

### 2. User Registration & Login Flow (7 checks)

Validates authentication system end-to-end:
- User registration
- Login with credentials
- JWT token generation
- Token refresh
- Invalid credential rejection

**Failure impact:** CRITICAL

---

### 3. KYC Complete Flow (7 checks)

Validates Know Your Customer process:
- Document upload
- Multiple document types (RG, CPF, COMPROVANTE_ENDERECO)
- Status retrieval
- Document listing
- Admin approval flow

**Failure impact:** HIGH

---

### 4. Credit Flow (6 checks)

Validates credit request and simulation:
- Credit request submission
- Simulation calculation
- Status retrieval
- Interest rate calculation

**Failure impact:** HIGH

---

### 5. Evidence Flow (6 checks)

Validates construction work evidence:
- Project creation
- Evidence upload with GPS
- GPS accuracy validation (5-50 meters)
- PostGIS server-side validation
- Evidence listing

**Failure impact:** HIGH

---

## Interpreting Results

### All Tests Passed (30/30)

**Ready for deployment!**

Next steps:
1. Review test output
2. Run full E2E suite: `pnpm test:e2e`
3. Deploy to staging
4. Perform manual QA
5. Deploy to production

### Some Tests Failed

**Troubleshooting steps:**

1. Check infrastructure:
   - `docker ps` (verify all containers running)
   - Check logs: `docker logs container_name`

2. Common failures:
   - Database: `Error: connect ECONNREFUSED 127.0.0.1:5432`
   - Redis: `Error: connect ECONNREFUSED 127.0.0.1:6379`
   - JWT: `JsonWebTokenError: invalid token`
   - GPS: `GPS accuracy must be between 5 and 50 meters`

3. Restart services:
   ```bash
   docker-compose restart
   pnpm dev  # Restart API
   ```

---

## Troubleshooting

### Database Issues
```bash
# Reset database (CAUTION: Deletes data)
pnpm db:reset

# Or run migrations
pnpm db:migrate

# Check connection
docker exec postgres_container psql -U postgres -c "SELECT 1;"
```

### Redis Issues
```bash
# Clear Redis
redis-cli FLUSHALL

# Check connection
redis-cli PING
```

### Port Conflicts
```bash
# Find what's using the port
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### Test Isolation
```bash
# Run tests serially
pnpm test:smoke -- --runInBand

# Run specific test
pnpm test:smoke -- --testNamePattern="Health & Connectivity"
```

---

## Post-Deployment Validation

After deploying to staging:

### Manual Functional Tests

1. **User Registration & Login**
   - Register new account
   - Login with credentials
   - Verify JWT tokens

2. **KYC Process**
   - Upload documents
   - Check status
   - Verify document types

3. **Credit Application**
   - Request credit
   - Simulate calculation
   - Check status

4. **Evidence Upload**
   - Create project
   - Upload evidence with GPS
   - Verify GPS validation

### Performance Checks

- [ ] API response time < 500ms (p95)
- [ ] Database queries < 100ms (p95)
- [ ] Memory usage stable
- [ ] CPU usage < 80% under load

### Security Validation

- [ ] CSRF tokens present
- [ ] Rate limiting active
- [ ] CORS headers correct
- [ ] No sensitive data in logs
- [ ] SSL/TLS valid

---

## Production Deployment

### Before Production

1. Run all tests:
   ```bash
   ./scripts/run-smoke-tests.sh
   pnpm test:e2e
   ```

2. Production setup:
   - Use production RDS database
   - Use production ElastiCache Redis
   - Use production S3 bucket
   - Use production AWS credentials

3. Deploy:
   ```bash
   docker build -t imbobi-api:v1.0.0 .
   docker push registry/imbobi-api:v1.0.0
   kubectl apply -f k8s/prod/api-deployment.yaml
   ```

4. Validate:
   ```bash
   API_HOST=api.imbobi.com ./scripts/run-smoke-tests.sh
   ```

### Rollback Procedure

If issues occur:

```bash
# Identify issue from logs
docker logs imbobi_api

# Rollback
docker pull registry/imbobi-api:v0.9.9
kubectl set image deployment/imbobi-api imbobi-api=registry/imbobi-api:v0.9.9

# Verify
./scripts/run-smoke-tests.sh
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Setup DB | `pnpm db:migrate` |
| Smoke tests | `./scripts/run-smoke-tests.sh` |
| E2E tests | `pnpm test:e2e` |
| Build | `pnpm build` |
| Dev server | `pnpm dev` |
| Type check | `pnpm type-check` |
| Lint | `pnpm lint` |

---

## Support

- DevOps Team: #devops-oncall
- Contact: contato.vinicaetano93@gmail.com
- Test Framework: Jest + Supertest + NestJS Testing Module

---

*Last Updated: 2026-05-28*
