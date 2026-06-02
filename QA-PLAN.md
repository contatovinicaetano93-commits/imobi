# QA Plan & Testing Implementation Roadmap

**Date**: 2026-06-02  
**Project**: imbobi (Monorepo - Web, Mobile, API)  
**Status**: In Progress

## Executive Summary

The imbobi project currently has:
- ✅ **Type Checking**: Full TypeScript validation across all 7 workspaces (PASSING)
- ✅ **Production Builds**: All packages building successfully (PASSING)
- ✅ **Linting**: ESLint configured and passing
- ⚠️ **API Tests**: Unit/integration test framework (Jest) configured, but needs implementation
- ⚠️ **Web E2E Tests**: Playwright configured with 1 test suite (auth flow), needs expansion
- ❌ **Mobile E2E Tests**: No automated tests configured
- 🔴 **Security**: 47 vulnerabilities detected (3 low, 21 moderate, 22 high, 1 critical)

---

## Part 1: Current State Analysis

### 1.1 Quality Metrics - PASSING

```
Type Check Status:    ✅ PASS (6 cached, 6 total)
Build Status:         ✅ PASS (3 cached, 5 total)
Linting:              ✅ PASS (configured)
```

### 1.2 Existing Tests

#### Web E2E Tests
- **Location**: `apps/web/e2e/auth.spec.ts`
- **Framework**: Playwright v1.60.0
- **Current Coverage**: 7 test cases
  - Sign up flow
  - Login flow
  - Simulator access (authenticated)
  - Logout
  - API error handling
  - API health check
  - Session management across navigation

#### API Test Infrastructure
- **Location**: `services/api/test/`
- **Framework**: Jest v29.7.0 + Supertest v7.2.2
- **Setup Scripts**: Database reset and teardown hooks available
- **Status**: Infrastructure ready, tests need to be written

#### Mobile Tests
- **Status**: None configured

### 1.3 Security Audit Results

**Summary**: 47 vulnerabilities found
- 3 Low severity
- 21 Moderate severity
- 22 High severity
- 1 Critical severity

**Critical Issues** (must fix):
1. `@fastify/middie@8.3.3` - Middleware authentication bypass (CRITICAL)
   - Upgrade path: @fastify/middie >= 9.3.2
   - Impact: NestJS Fastify platform dependency

**High Priority Issues**:
1. `@nestjs/platform-fastify@10.4.22` - Multiple middleware/path bypass vulnerabilities
2. `fastify@4.28.1` - Content-Type header tab character body validation bypass
3. `multer@2.0.2` - Denial of Service via incomplete cleanup
4. `next@14.2.35` - HTTP request deserialization DoS, cache poisoning
5. `lodash@4.17.21` - Code injection via template imports

---

## Part 2: Testing Implementation Roadmap

### Phase 1: Critical Path (Week 1)

#### 1.1 Web E2E Test Expansion
**Objective**: Expand Playwright test coverage from 7 to 25+ test cases

**Test Scenarios to Add**:
- Dashboard role-based access control (Construtor, Engenheiro, Gestor, Comercial)
- KYC form submission and validation
- Obra (work site) creation and management
- Etapa (stage) management and vistoria (inspection)
- Credit simulator: various input scenarios
- Error handling and validation messages
- Mobile responsiveness (if applicable)

**Implementation**:
```bash
# Create modular test structure
apps/web/e2e/
├── auth.spec.ts (existing)
├── dashboard.spec.ts (new)
├── kyc.spec.ts (new)
├── obras.spec.ts (new)
├── etapas.spec.ts (new)
├── simulator.spec.ts (new)
└── fixtures/ (reusable test data)
```

**Effort**: 12-16 hours
**Owner**: QA Engineer
**Acceptance**: 25+ passing E2E tests, >80% UI coverage

---

#### 1.2 API Unit Tests (Phase 1)
**Objective**: Implement core API test suites for critical modules

**Priority Modules**:
1. **Auth Module** (authentication, JWT, password reset)
   - Login validation
   - Token generation and refresh
   - Password hashing verification
   - Estimated: 8-10 tests

2. **KYC Module** (know-your-customer validation)
   - Form validation against schemas
   - Document upload/verification
   - Status transitions
   - Estimated: 12-15 tests

3. **Obras Module** (work site management)
   - CRUD operations
   - GPS validation (server-side enforcement)
   - Owner verification
   - Estimated: 10-12 tests

**Implementation**:
```bash
# Test file structure
services/api/test/
├── fixtures/ (mock data, factories)
├── auth.e2e.spec.ts
├── kyc.e2e.spec.ts
└── obras.e2e.spec.ts
```

**Effort**: 16-20 hours
**Owner**: Backend Engineer + QA
**Acceptance**: 30+ passing API tests, >70% critical path coverage

---

### Phase 2: Coverage Expansion (Week 2)

#### 2.1 Mobile E2E Tests (Expo/EAS)
**Framework**: Detox or Playwright Mobile
**Test Scenarios**:
- Mobile authentication flow
- On-device image capture and upload
- GPS location capture
- Offline mode (if implemented)
- Geolocation accuracy validation

**Effort**: 24-32 hours
**Owner**: Mobile QA Engineer
**Acceptance**: Mobile test suite configured, 15+ passing tests

---

#### 2.2 Integration Tests
**Objective**: Test cross-module flows
- Auth → Dashboard → Obra creation → KYC submission
- Credit simulation with real calculation engine
- Document upload pipeline (validation → storage → verification)

**Effort**: 12-16 hours
**Owner**: QA Engineer

---

#### 2.3 Performance Testing
**Tools**: k6 or Artillery
**Test Scenarios**:
- Simulator calculation response time
- Dashboard data loading (<3s)
- Image upload handling (>10MB files)
- Concurrent user load (100+ simultaneous requests)

**Effort**: 8-12 hours

---

### Phase 3: Specialized Testing (Week 3+)

#### 3.1 Security Testing
- SQL injection tests (Prisma ORM coverage)
- XSS vulnerability scans
- CSRF token validation
- API rate limiting (throttler module)
- Authentication bypass attempts

#### 3.2 Accessibility Testing
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation

#### 3.3 Data Validation & Edge Cases
- GPS coordinate validation (PostGIS)
- Large file uploads (AWS S3)
- Concurrent partial payment scenarios
- Database constraint violations

---

## Part 3: Security Remediation Plan

### Critical Priority (Action Required Before Merge)

1. **Upgrade @nestjs/platform-fastify**
   ```bash
   pnpm up @nestjs/platform-fastify@11.1.16 --filter @imbobi/api
   ```
   - Fixes: HEAD request middleware bypass, child plugin scope auth bypass
   - Risk: Minor breaking changes (review migration guide)

2. **Upgrade fastify**
   ```bash
   pnpm up fastify@5.7.2 --filter @imbobi/api
   ```
   - Fixes: Content-Type header validation bypass
   - Risk: Low (patch version)

3. **Upgrade @fastify/middie**
   ```bash
   pnpm up @fastify/middie@9.3.2 --filter @imbobi/api
   ```
   - Fixes: Middleware authentication bypass
   - Risk: Low (transitive through NestJS)

### High Priority (Within 2 weeks)

4. **Upgrade Next.js**
   ```bash
   pnpm up next@15.5.16 --filter @imbobi/web
   ```
   - Fixes: HTTP deserialization DoS, cache poisoning, other RSC vulnerabilities
   - Risk: May require code updates (App Router compatibility)
   - Estimate: 2-4 hours testing

5. **Update lodash**
   ```bash
   pnpm up lodash@4.18.0 --filter @imbobi/api
   ```
   - Fixes: Code injection via template
   - Risk: Very low (dependency of @nestjs/config)

6. **Update multer**
   ```bash
   pnpm up multer@2.1.0+ --filter @imbobi/api
   ```
   - Fixes: Incomplete cleanup DoS vulnerability
   - Risk: Low (transitive)

### Validation After Upgrades
```bash
# Verify security fix
pnpm audit --prod

# Run full test suite
pnpm type-check
pnpm build
pnpm test
```

---

## Part 4: Test Configuration

### Playwright Configuration
**File**: `apps/web/playwright.config.ts` (if needed)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Jest Configuration for API
**File**: `services/api/jest.config.js` (validate existing)

Should include:
- Module name mapping for TypeScript paths
- Coverage thresholds
- Test environment setup (database cleanup)
- Timeout configuration for integration tests

---

## Part 5: CI/CD Integration (Already Configured)

### Current Workflow Status
✅ **Existing CI Pipeline** (`.github/workflows/ci.yml`):
- Type checking across all workspaces
- Linting with ESLint
- Multi-workspace build
- Security audit with OWASP Dependency Check
- Automated notifications on failure

### Recommended Additions
Add to CI pipeline:
1. **Web E2E Test Step**
   ```yaml
   - name: Run Playwright tests
     run: pnpm --filter @imbobi/web test:e2e
   ```

2. **API Test Step**
   ```yaml
   - name: Run API tests
     run: pnpm --filter @imbobi/api test
   ```

3. **Coverage Report**
   ```yaml
   - name: Upload coverage
     uses: codecov/codecov-action@v3
   ```

4. **Test Report Artifact**
   - Store Playwright HTML reports
   - Store Jest coverage reports
   - Store API test results as JSON

---

## Part 6: Success Criteria

### Week 1 Milestones
- [ ] All security vulnerabilities assessed and remediation plan approved
- [ ] Web E2E test suite expanded to 25+ tests
- [ ] API unit tests (auth, kyc, obras) implemented (30+ tests)
- [ ] CI pipeline validates all tests on every push

### Week 2 Milestones
- [ ] Mobile test framework selected and configured
- [ ] Integration test scenarios defined and 50% implemented
- [ ] Code coverage dashboard set up (target: >70% API, >60% Web)
- [ ] Critical security patches deployed and verified

### Week 3 Milestones
- [ ] Mobile E2E tests (15+ scenarios) passing
- [ ] Performance baselines established
- [ ] Security testing automated (OWASP ZAP or similar)
- [ ] All vulnerabilities remediated or documented with risk acceptance

---

## Part 7: Maintenance & Ongoing

### Test Maintenance Schedule
- **Daily**: CI runs on every push (automated)
- **Weekly**: Review failing tests, update selectors, maintain fixtures
- **Monthly**: Upgrade dependencies, review security advisories
- **Quarterly**: Performance benchmarking, coverage analysis

### Test Data Management
- Use factories/fixtures for consistent test data
- Automated cleanup after each test run
- Separate test database (already configured)
- Seed data for readonly scenarios

### Metrics to Track
- Test pass rate (target: >95%)
- Code coverage (target: >70% API, >60% Web)
- Test execution time (target: <15 min for full suite)
- Critical bug escape rate (tracked in incident reports)

---

## Appendix: File References

### Test-Related Files
- `/home/user/imobi/apps/web/e2e/auth.spec.ts` - Playwright tests
- `/home/user/imobi/services/api/test/setup.ts` - API test setup
- `/home/user/imobi/.github/workflows/ci.yml` - CI/CD pipeline
- `/home/user/imobi/apps/web/package.json` - Web test scripts
- `/home/user/imobi/services/api/package.json` - API test scripts

### Key Commands
```bash
# Run tests
pnpm test                              # All unit tests
pnpm --filter @imbobi/web test:e2e    # Web E2E tests
pnpm --filter @imbobi/api test:e2e    # API E2E tests

# Type checking & linting
pnpm type-check
pnpm lint

# Security
pnpm audit --prod

# Full validation
pnpm build && pnpm test && pnpm type-check
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-02  
**Next Review**: 2026-06-09
