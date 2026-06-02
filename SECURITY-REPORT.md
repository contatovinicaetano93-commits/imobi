# Security Vulnerability Report

**Date**: 2026-06-02  
**Project**: imbobi  
**Audit Tool**: pnpm audit  
**Total Vulnerabilities**: 47 (3 low, 21 moderate, 22 high, 1 critical)

---

## Critical Issues (Immediate Action Required)

### 1. @fastify/middie - Middleware Authentication Bypass

**Severity**: CRITICAL  
**Package**: `@fastify/middie@8.3.3`  
**Affected Module**: `services/api` → `@nestjs/platform-fastify@10.4.22`  
**CVE**: GHSA-72c6-fx6q-fr5w

**Description**: The Fastify middie plugin contains a critical vulnerability that allows authentication bypass in child plugin scopes when using path-scoped middleware.

**Impact**: Authentication controls can be bypassed, potentially allowing unauthorized access to protected API endpoints.

**Fix**:
```bash
cd services/api
pnpm up @fastify/middie@9.3.2
```

**Verification**:
```bash
pnpm audit --prod  # Should show 0 critical vulnerabilities
```

**Risk Level**: MUST FIX before any production deployment  
**Estimated Effort**: 30 minutes (includes testing)

---

## High Severity Issues (Fix Within 2 Weeks)

### 2. @nestjs/platform-fastify - Multiple Middleware Vulnerabilities

**Severity**: HIGH  
**Package**: `@nestjs/platform-fastify@10.4.22`  
**Affected Modules**: `services/api`  
**Related CVEs**: 
- GHSA-8p85-9qpw-fwgw (Improper Path Normalization)
- GHSA-wf42-42fg-fg84 (HEAD Request Middleware Bypass)

**Description**: Multiple vulnerabilities in the Fastify platform adapter:
1. Path normalization bypass in scoped middleware
2. HEAD request can bypass middleware authentication checks

**Impact**: Attackers could bypass path-based access controls or authentication by using HEAD requests instead of GET/POST.

**Fix**:
```bash
cd services/api
pnpm up @nestjs/platform-fastify@11.1.16 --filter @imbobi/api
```

**Changes Needed**: Review migration guide for breaking changes between v10.4.22 and v11.1.16

**Risk Level**: HIGH - Deploy immediately  
**Estimated Effort**: 2-4 hours (includes code review and testing)

---

### 3. fastify - Content-Type Header Validation Bypass

**Severity**: HIGH  
**Package**: `fastify@4.28.1`  
**Affected Module**: `services/api` → `@nestjs/platform-fastify@10.4.22`  
**CVE**: GHSA-jx2c-rxcm-jvmq

**Description**: Fastify allows tab characters in Content-Type headers, which can bypass body validation schemas.

**Impact**: Attackers can send malformed requests with modified Content-Type headers to bypass request validation, potentially leading to injection attacks.

**Fix**:
```bash
cd services/api
pnpm up fastify@5.7.2 --filter @imbobi/api
```

**Risk Level**: HIGH  
**Estimated Effort**: 1 hour (patch version, minimal breaking changes)

---

### 4. Next.js - Multiple Framework Vulnerabilities

**Severity**: HIGH  
**Package**: `next@14.2.35`  
**Affected Module**: `apps/web`  
**Related CVEs**:
- GHSA-h25m-26qc-wcjf (HTTP Request Deserialization DoS)
- GHSA-4rgg-fxwf-4v62 (Denial of Service with Server Components)
- GHSA-vfv6-92ff-j949 (Cache Poisoning via RSC)
- GHSA-3g8h-86w9-wvmq (Middleware Cache Poisoning)

**Description**: Multiple vulnerabilities in React Server Components and middleware caching:
1. HTTP deserialization can cause DoS with insecure RSC
2. Cache poisoning in RSC cache-busting
3. Middleware redirects can be cache-poisoned

**Impact**: Denial of service attacks, cache poisoning leading to serving incorrect content to users, RSC deserialization attacks.

**Fix**:
```bash
cd apps/web
pnpm up next@15.5.16 --filter @imbobi/web
```

**Breaking Changes**: Review Next.js 15 migration guide:
- App Router changes
- API route modifications
- Middleware updates

**Risk Level**: HIGH  
**Estimated Effort**: 4-8 hours (includes code updates and testing)

**Testing Strategy**:
```bash
pnpm --filter @imbobi/web build
pnpm --filter @imbobi/web test:e2e
```

---

### 5. multer - Denial of Service (Incomplete Cleanup)

**Severity**: HIGH  
**Package**: `multer@2.0.2`  
**Affected Module**: `services/api` → `@nestjs/platform-express` → `@nestjs/core`  
**CVE**: GHSA-5528-5vmv-3xc2

**Description**: The file upload middleware (multer) fails to properly clean up temporary files in certain error conditions, leading to disk space exhaustion.

**Impact**: Attackers can upload files and trigger error conditions to exhaust server disk space, causing DoS.

**Fix**:
```bash
cd services/api
# Update transitive dependency through @nestjs/platform-express
pnpm up @nestjs/platform-express@10.4.23 --filter @imbobi/api
```

**Risk Level**: HIGH (if file upload is exposed to untrusted users)  
**Estimated Effort**: 1-2 hours

**Workaround**: Implement file size limits and quotas:
```typescript
// services/api/src/main.ts
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));
```

---

### 6. lodash - Code Injection via Template

**Severity**: HIGH  
**Package**: `lodash@4.17.21`  
**Affected Module**: `services/api` → `@nestjs/config@3.3.0`  
**CVE**: GHSA-r5fr-rjxr-66jc

**Description**: The lodash `_.template` function can be exploited for code injection when processing untrusted input containing import statements.

**Impact**: Remote code execution if untrusted configuration or templates are processed.

**Fix**:
```bash
cd services/api
pnpm up lodash@4.18.0 --filter @imbobi/api
```

**Risk Level**: HIGH (only if dynamic templates are used)  
**Estimated Effort**: 1 hour

**Mitigation**: Even if not directly used, keeping dependency updated is critical for defense-in-depth.

---

## Moderate Severity Issues (Fix Within 1 Month)

### Affected Packages
- Various Express/Fastify middleware
- Dependency check findings (17 total)

**Action**: Include these in regular dependency update cycles. Prioritize:
1. Authentication-related packages
2. Request parsing packages
3. File handling packages

**Recommended Cadence**: 
- Monthly dependency audit
- Patch-level updates automatically
- Minor-version updates with QA testing
- Major-version upgrades with integration testing

---

## Low Severity Issues

**Count**: 3 vulnerabilities  
**Action**: Include in next maintenance release (no rush)

---

## Remediation Timeline

### Phase 1: Immediate (Before Next Merge)
```
MUST FIX - 1 Critical + 6 High severity issues
Estimated effort: 8-10 hours
Target completion: Today (2026-06-02)

1. @fastify/middie@9.3.2         (30 min)
2. @nestjs/platform-fastify@11.1.16 (2-4 hours)
3. fastify@5.7.2                 (1 hour)
4. multer fix                    (1-2 hours)
5. lodash@4.18.0                 (1 hour)
6. Testing & validation          (2-3 hours)
```

### Phase 2: Short-term (This Week)
```
Next.js upgrade
Estimated effort: 4-8 hours
Target completion: 2026-06-05

1. next@15.5.16 upgrade          (1 hour)
2. Code compatibility review      (2-3 hours)
3. Full test suite run            (1-2 hours)
4. E2E testing in staging         (2 hours)
```

### Phase 3: Ongoing (Monthly)
```
- Automated dependency scanning in CI
- Regular pnpm audit runs
- Dependency update automation (Dependabot)
- Security advisory monitoring
```

---

## Verification Commands

### After Each Fix
```bash
# 1. Verify specific vulnerability is fixed
pnpm audit --prod | grep "PACKAGE_NAME"

# 2. Full audit check
pnpm audit --prod

# 3. Run full test suite
pnpm type-check
pnpm build
pnpm test

# 4. Check build size didn't increase significantly
pnpm --filter @imbobi/api build
pnpm --filter @imbobi/web build
```

### Full Validation Checklist
```bash
#!/bin/bash
set -e

echo "Running security validation..."

# Type checking
echo "✓ Type checking..."
pnpm type-check

# Building
echo "✓ Building all packages..."
pnpm build

# Linting
echo "✓ Linting..."
pnpm lint

# Tests
echo "✓ Running tests..."
pnpm test

# Security audit
echo "✓ Security audit..."
CRITICAL=$(pnpm audit --prod 2>&1 | grep -c "critical" || echo "0")
if [ "$CRITICAL" -gt 0 ]; then
  echo "❌ CRITICAL vulnerabilities found!"
  exit 1
fi

echo "✅ All validation checks passed!"
```

---

## Dependency Management Best Practices

### 1. Automated Dependency Updates
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    security-updates-only: true
    ignore:
      - dependency-name: "major-breaking-package"
```

### 2. Regular Audit Schedule
```bash
# Weekly
pnpm audit --prod

# Monthly
pnpm audit --depth 5  # Check transitive dependencies

# Before releases
pnpm audit --fix
```

### 3. Dependency Update Policy
- **Security patches**: Deploy immediately
- **Bug fixes**: Deploy within 1 week
- **Minor updates**: Deploy within 1 month
- **Major updates**: Full QA cycle (2+ weeks)

---

## Risk Assessment Summary

| Severity | Count | Risk Level | Action |
|----------|-------|-----------|--------|
| Critical | 1 | CRITICAL | Fix today |
| High | 6 | HIGH | Fix this week |
| Moderate | 21 | MEDIUM | Fix this month |
| Low | 3 | LOW | Include in next release |

**Overall Project Risk**: MEDIUM → LOW (after Phase 1 remediation)

---

## References

### Security Advisory Links
- GHSA-72c6-fx6q-fr5w: https://github.com/advisories/GHSA-72c6-fx6q-fr5w
- GHSA-8p85-9qpw-fwgw: https://github.com/advisories/GHSA-8p85-9qpw-fwgw
- GHSA-wf42-42fg-fg84: https://github.com/advisories/GHSA-wf42-42fg-fg84
- GHSA-jx2c-rxcm-jvmq: https://github.com/advisories/GHSA-jx2c-rxcm-jvmq
- GHSA-r5fr-rjxr-66jc: https://github.com/advisories/GHSA-r5fr-rjxr-66jc

### Migration Guides
- NestJS Platform Fastify: https://docs.nestjs.com/techniques/performance
- Next.js 15 Upgrade: https://nextjs.org/docs/upgrading
- Fastify 5.x: https://www.fastify.io/docs/latest/

---

**Report Generated**: 2026-06-02 02:30 UTC  
**Next Review Date**: 2026-06-09  
**Owner**: QA Engineer / Security Team
