# imobi — E2E Testing & Quality Plan
**Last Updated**: 2026-06-03  
**Current Status**: Phase 5 (E2E Testing Ready for Implementation)  
**Test Coverage**: 409+ unit/integration tests passing

---

## Overview

This document outlines Phase 5 (E2E testing strategy) for imobi. The system has completed Phase 1-4 development and is ready for comprehensive end-to-end testing before production scaling.

---

## Phase 5: E2E Testing & Quality Assurance

### Testing Strategy

**Scope**: Complete user workflows + edge cases + load testing  
**Framework**: Playwright (recommended) + Jest (existing)  
**Timeline**: 2-3 weeks (parallel with Phase 2 AWS setup)  
**Success Criteria**: 95%+ pass rate, <p99 latency SLA met

---

## Test Categories

### 1. Happy Path E2E Tests

#### Test: User Registration & Login
```gherkin
Scenario: New user registers and logs in successfully
  Given user navigates to registration page
  When user fills form with valid data
    - Email: unique@test.com
    - Password: SecurePassword123
    - CPF: Valid CPF (modulo-11 check)
    - Phone: Valid phone number
  And user submits form
  Then system creates user in database
  And user receives verification email
  And user can login with new credentials
  And user is redirected to dashboard
```

**Test File**: `apps/web/tests/auth.e2e.test.ts`
**Endpoints Tested**:
- POST /api/v1/auth/registrar (201 created)
- POST /api/v1/auth/login (200 OK with token)
- GET /api/v1/usuarios/me (200 with user data)

#### Test: Credit Simulation Workflow
```gherkin
Scenario: User simulates construction credit
  Given logged-in user navigates to credit simulator
  When user enters construction parameters
    - Project value: R$ 100,000
    - Duration: 12 months
    - Down payment: 20%
  And user submits simulation
  Then system calculates interest rate
  And system displays loan schedule
  And system shows approval probability
  And user can save simulation for later
```

**Test File**: `apps/web/tests/credit.e2e.test.ts`
**Endpoints Tested**:
- POST /api/v1/credito/simular (200 with schedule)
- GET /api/v1/credito/simulacoes (200 list)

#### Test: Works (Obra) Creation & Management
```gherkin
Scenario: Manager creates work and assigns engineer
  Given logged-in gestor navigates to works page
  When gestor creates new work
    - Name: "Reforma Casa ABC"
    - Location: GPS coordinates (validated)
    - Budget: R$ 50,000
    - Timeline: 90 days
  And gestor uploads project photos
  And gestor assigns engineer
  And gestor submits work
  Then work appears in queue
  And engineer receives notification
  And gestor can track progress on map
```

**Test File**: `apps/web/tests/works.e2e.test.ts`
**Endpoints Tested**:
- POST /api/v1/obras (201 created with GPS validation)
- GET /api/v1/obras (200 filtered list)
- PATCH /api/v1/obras/:id (200 updated)
- POST /api/v1/obras/:id/fotos (201 uploaded to S3)

#### Test: Approval Workflow (Core Business Flow)
```gherkin
Scenario: Gestor approves work completion and releases parcela
  Given engineer submits work with GPS + photos
  And work passes PostGIS validation
  And gestor sees work in approval queue
  When gestor reviews evidence
    - Validates photo quality
    - Checks GPS accuracy (within 50m)
    - Confirms work completion
  And gestor clicks "Approve"
  Then system queues parcela approval (BullMQ)
  And worker processes async job
  And email notification sent to tomador
  And audit trail logs: {who, what, when, why}
  And parcela appears in tomador's account
```

**Test File**: `apps/web/tests/approval.e2e.test.ts`
**Endpoints Tested**:
- POST /api/v1/etapas/:id/aprovar (202 async)
- GET /api/v1/fila/jobs (monitoring)
- GET /api/v1/auditoria (audit trail)

#### Test: KYC Document Verification
```gherkin
Scenario: User submits KYC documents
  Given user navigates to KYC section
  When user uploads required documents
    - Government ID (JPG, <5MB)
    - Proof of address (PDF)
    - Self-portrait with document
  And system performs validation
    - File type check
    - Size validation
    - OCR extraction (Phase 3)
  And user submits verification
  Then documents stored in S3
  And KYC status: PENDENTE → EM_ANALISE
  And admin notified
  And user can track approval status
```

**Test File**: `apps/web/tests/kyc.e2e.test.ts`
**Endpoints Tested**:
- POST /api/v1/usuarios/:id/kyc (201 created)
- GET /api/v1/usuarios/:id/kyc-status (200)

---

### 2. Edge Cases & Error Handling

#### Test: IDOR (Insecure Direct Object Reference)
```gherkin
Scenario: User attempts to access another user's data
  Given user1 logged in with token
  When user1 attempts to access user2's work via direct ID
    - GET /api/v1/obras/user2-obra-id
  Then system returns 403 Forbidden
  And audit logs unauthorized access attempt
  And rate limit incremented for security

Scenario: Gestor attempts to approve another gestor's work
  Given gestor1 logged in
  When gestor1 attempts to approve work from gestor2's region
  Then system returns 403 Forbidden
```

**Implementation**: Request guards in NestJS
- `JwtAuthGuard`: Verify token
- `RoleGuard`: Verify user role
- `OwnershipGuard`: Verify resource ownership

#### Test: Rate Limiting
```gherkin
Scenario: User exceeds rate limit
  Given user making requests
  When user sends 101 requests in 1 minute
  Then system returns 429 Too Many Requests
  And user locked for 60 seconds
  And retry-after header: 60

Scenario: Email brute-force protection
  When attacker tries 10+ login attempts per IP
  Then IP blocked for 15 minutes
```

**Implementation**: ThrottlerModule (global)
- Login endpoint: 5 attempts/15min per IP
- API endpoints: 100 requests/min per user

#### Test: Invalid GPS Data
```gherkin
Scenario: Engineer submits invalid GPS coordinates
  Given engineer on jobsite
  When engineer submits GPS outside city boundary
    - GPS: Outside PostGIS validation zone
  Then system returns 400 Bad Request
  And message: "Localização fora da área permitida"

Scenario: Photo GPS differs from work GPS
  When photo GPS >50m away from work GPS
  Then system returns 422 Unprocessable Entity
  And message: "Foto fora de localização da obra"
```

**Implementation**: PostGIS validation
- ST_DWithin(photo_gps, work_gps, 50): True/False
- ST_Contains(city_boundary, work_gps): True/False

#### Test: Database Constraints
```gherkin
Scenario: Duplicate CPF registration
  When user attempts to register with existing CPF
  Then system returns 409 Conflict
  And message: "CPF já cadastrado"

Scenario: Invalid email format
  When user submits invalid email
  Then form validation prevents submission
  And API validation also rejects
```

#### Test: Token Expiration
```gherkin
Scenario: User's access token expires
  Given user with valid token
  When 15+ minutes pass
  And user attempts API request
  Then system returns 401 Unauthorized
  And user must refresh or re-login

Scenario: User attempts to refresh with expired refresh token
  When user's refresh token >7 days old
  Then system returns 403 Forbidden
  And user must login again
```

#### Test: Concurrent Operations
```gherkin
Scenario: Two gestores approve same work simultaneously
  When gestor1 and gestor2 both click approve
  Then first approval succeeds (200)
  And second approval returns 409 Conflict
  And message: "Trabalho já foi aprovado"
```

---

### 3. UI/UX Validation Tests

#### Test: Responsive Design
```
Devices to test:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)
- Mobile XL (414x896)

Test cases:
- Navigation menu responsive
- Form inputs accessible on mobile
- Tables scrollable horizontally
- Images scale proportionally
- Touch targets minimum 44x44px
```

**Tool**: Playwright device emulation
```typescript
test.use({ viewport: { width: 375, height: 667 } });
```

#### Test: Accessibility (WCAG 2.1 AA)
```
- Keyboard navigation (Tab, Enter, Esc)
- Screen reader compatibility
- Color contrast (4.5:1 for text)
- Form labels associated
- ARIA attributes present
- No keyboard traps
```

**Tool**: axe-core integration in Playwright
```typescript
const results = await injectAxe(page);
const violations = await checkA11y(page);
expect(violations).toBe(null);
```

#### Test: Performance
```gherkin
Scenario: Page load performance
  When user navigates to dashboard
  Then page loads in <1000ms
  And First Contentful Paint: <500ms
  And Largest Contentful Paint: <1000ms
  And Cumulative Layout Shift: <0.1
```

#### Test: Form Validation (Client + Server)
```
Client-side validation:
- Required fields marked
- Email format validation
- Password strength meter
- CPF format validation
- Phone format validation
- Real-time feedback

Server-side validation:
- Schemas from @imbobi/schemas
- Zod parse() enforced
- Custom validators (CPF modulo-11, GPS)
- Error messages clear
```

---

### 4. Load Testing

#### Baseline Scenario: 100 Concurrent Users

```gherkin
Scenario: 100 users browse dashboard simultaneously
  Setup:
    - 100 virtual users
    - Ramp-up: 10 seconds
    - Test duration: 300 seconds
    - Shared database (staging PostgreSQL)
  
  User behavior:
    - Login: 2 seconds each
    - View dashboard: 5 seconds
    - Filter works: 3 seconds
    - View work detail: 5 seconds
    - Logout: 1 second
  
  Success criteria:
    - Response time p99: <500ms
    - Error rate: <1%
    - Database connections: <50
    - CPU usage: <70%
    - Memory: <80%
```

**Tool**: k6 (Grafana Load Testing)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 100 },  // Ramp up
    { duration: '300s', target: 100 }, // Stay
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],
    http_req_failed: ['<0.01'],
  },
};

export default function() {
  // Test scenarios
  let response = http.post('https://api.imobi.render.com/api/v1/auth/login', {
    email: 'user@test.com',
    senha: 'password',
  });
  check(response, { 'login ok': (r) => r.status === 200 });
  sleep(1);
}
```

#### Advanced Scenario: Real-World Usage Pattern

```
User distribution:
- 40%: Tomadores (viewing dashboard, credit simulator)
- 30%: Engenheiros (uploading photos, GPS)
- 20%: Gestores (approving work)
- 10%: Admins (system admin tasks)

Expected throughput:
- 1000 requests/minute
- Peak: 2000 requests/minute

Success criteria:
- API response time p99: <500ms
- Database query time p95: <100ms
- Cache hit rate: >80%
- Error rate: <0.5%
- Uptime: 99.9% (allowing 4 sec downtime)
```

#### Stress Test: Find Breaking Point

```
Scenario: Gradually increase users until system breaks
  Ramp-up: 500 users over 10 minutes
  Target: Find breaking point
  Monitor: Response time, error rate, resource usage
  
  Expected breaking point: 1000+ concurrent users
  (Render staging is limited, Phase 2 AWS will scale higher)
```

---

### 5. Smoke Tests (Post-Deployment)

#### Daily Smoke Test Script

```bash
#!/bin/bash
# Run after each deployment

echo "Testing API health..."
curl -f https://api.imobi.render.com/api/v1/health || exit 1

echo "Testing web frontend..."
curl -f https://imobi.vercel.app || exit 1

echo "Testing database connectivity..."
psql $DATABASE_URL -c "SELECT 1" || exit 1

echo "Testing Redis connectivity..."
redis-cli -u $REDIS_URL PING || exit 1

echo "Testing S3 access..."
aws s3 ls s3://imobi-photos-prod || exit 1

echo "Running critical path tests..."
pnpm test:smoke || exit 1

echo "All smoke tests passed!"
```

#### Critical Path Tests (Playwright)

```typescript
// tests/smoke.e2e.ts
import { test, expect } from '@playwright/test';

test('critical path: user registration to approval', async ({ page }) => {
  // 1. Register
  await page.goto('https://imobi.vercel.app/auth/registrar');
  await page.fill('[name=email]', 'smoke@test.com');
  await page.fill('[name=senha]', 'SecurePass123');
  await page.click('[type=submit]');
  await expect(page).toHaveURL('**/dashboard');

  // 2. Create work
  await page.click('text=Nova Obra');
  await page.fill('[name=nome]', 'Test Work');
  await page.click('[type=submit]');
  await expect(page.locator('text=Obra criada')).toBeVisible();

  // 3. Upload photo
  await page.click('text=Enviar Fotos');
  const fileInput = await page.locator('[type=file]');
  await fileInput.setInputFiles('test-photo.jpg');
  await page.click('[type=submit]');
  await expect(page.locator('text=Foto enviada')).toBeVisible();
});
```

---

## Test Execution Plan

### Week 1: Unit & Integration Tests (Already Done ✅)
- ✅ 409+ tests passing
- ✅ Zero critical bugs
- ✅ Code review complete

### Week 2: Playwright E2E Setup
- [ ] Install Playwright & dependencies
- [ ] Create test fixtures (test users, data)
- [ ] Write happy path tests (5-10 core workflows)
- [ ] Configure CI/CD pipeline integration
- [ ] Run tests locally and debug

### Week 3: Edge Cases & Load Testing
- [ ] Write edge case tests (IDOR, rate limiting, etc)
- [ ] Set up k6 load testing framework
- [ ] Run baseline load test (100 concurrent users)
- [ ] Identify & fix performance bottlenecks
- [ ] Document performance baselines

### Week 4: Final Validation & Phase 2 Prep
- [ ] Run full test suite (all tests)
- [ ] Fix remaining edge cases
- [ ] Prepare Phase 2 AWS deployment
- [ ] Train team on Phase 2 infrastructure
- [ ] Finalize go-live checklist

---

## Test Data Management

### Test User Accounts
```
Username | Email | Password | Role | Status
---------|-------|----------|------|--------
smoke1 | smoke1@test.com | Test123456 | TOMADOR | ATIVO
smoke2 | smoke2@test.com | Test123456 | GESTOR_OBRA | ATIVO
smoke3 | smoke3@test.com | Test123456 | ENGENHEIRO | ATIVO
smoke4 | smoke4@test.com | Test123456 | ADMIN | ATIVO
```

### Test Data Seeding
```bash
# Seed database with test data
pnpm db:seed

# Creates:
- 10 test users
- 5 test works
- 20 test photos
- 10 test approvalsready
- Fixture GPS coordinates (validated)
```

### Data Cleanup
```bash
# After tests complete
pnpm db:reset  # Dev only
# Or in production:
DELETE FROM test_data WHERE created_at > NOW() - INTERVAL 1 DAY
```

---

## Success Criteria

### Test Coverage
- [ ] Happy path: 100% coverage
- [ ] Edge cases: 90%+ coverage
- [ ] Error handling: 100% critical paths
- [ ] Performance: All SLAs met

### Quality Metrics
- [ ] Test pass rate: >95%
- [ ] Critical bugs: 0
- [ ] High bugs: 0
- [ ] Medium bugs: <5
- [ ] Known issues: Documented & prioritized

### Performance Targets
- [ ] API response p99: <500ms
- [ ] Web page load: <1000ms
- [ ] Database query p95: <100ms
- [ ] Cache hit rate: >80%
- [ ] Uptime: 99.9%+

### User Acceptance
- [ ] Happy path workflows smooth
- [ ] No blocking UX issues
- [ ] Responsive on all devices
- [ ] Accessible (WCAG AA)

---

## Continuous Integration Setup

### GitHub Actions Workflow

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm type-check
      - run: pnpm test
      
      - name: Run E2E tests
        run: pnpm playwright test
        
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Monitoring & Observability

### Performance Dashboard
- API response time (p50, p95, p99)
- Error rate by endpoint
- Database query performance
- Cache hit rate
- User session count
- Job queue depth

### Alerts
```
IF http_error_rate > 1% FOR 5min THEN alert
IF response_time_p99 > 1000ms FOR 10min THEN alert
IF database_connections > 50 THEN alert
IF redis_memory > 80% THEN alert
IF job_queue_depth > 1000 THEN alert
```

---

## Blockers & Dependencies

### Blocker 1: Production Database Access
- **Issue**: Testing against staging Render DB
- **Resolution**: Phase 2 will use AWS RDS for production testing

### Blocker 2: Load Test Environment
- **Issue**: Render free tier may throttle
- **Resolution**: Use local staging or dedicated load test instance

### Blocker 3: Photo Upload Testing
- **Issue**: Large file uploads slow in CI/CD
- **Resolution**: Use smaller test files (1KB) or mock S3

---

## Document Links

- **Project Context**: `PROJECT_CONTEXT.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **Infrastructure**: `INFRASTRUCTURE_STATUS.md`
- **Security**: `SECURITY_CHECKLIST.md`

---

**Last Updated**: 2026-06-03  
**Next Review**: 2026-06-10  
**Owned By**: contato.vinicaetano93@gmail.com
