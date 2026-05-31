# 🚀 Fase 1 - Starter Kit (Testes & Segurança)

**Objetivo**: Setup testes + security audit em 1-2 semanas

---

## ✅ Checklist Rápido - O que Fazer Hoje

### 1. **Testes - Setup Inicial** (1-2 horas)

```bash
# Verificar se Jest/Testing Library estão instalados
pnpm list jest
pnpm list @testing-library/react

# Se não estiverem:
cd apps/web
pnpm add -D jest @testing-library/react @testing-library/dom @testing-library/user-event
pnpm add -D @testing-library/jest-dom jest-environment-jsdom

cd ../../services/api
pnpm add -D jest @types/jest ts-jest
```

**Criar arquivo de config**: `jest.config.js` em cada package

---

### 2. **Security Audit - Quick Scan** (30 min)

```bash
# Run npm audit
npm audit --audit-level=moderate

# List all vulnerabilities
npm audit --json > audit-report.json

# Check for secrets (if you have gitleaks installed)
gitleaks detect --verbose

# Or manually check:
grep -r "password" apps/web/lib/api.ts
grep -r "API_KEY" .env.example
grep -r "secret" services/api/src/
```

---

### 3. **First Test - Simple Example** (30 min)

Create `apps/web/components/__tests__/button.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Button Component', () => {
  it('renders and responds to click', async () => {
    const handleClick = jest.fn();
    render(<button onClick={handleClick}>Click me</button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

Run:
```bash
cd apps/web
pnpm test button.test.tsx
```

---

## 📋 Detailed Phase 1 Checklist

### Week 1: Foundation

#### Day 1-2: Test Setup
- [ ] Install Jest + React Testing Library (web)
- [ ] Install Jest + ts-jest (api)
- [ ] Create jest.config.js files
- [ ] Setup test scripts in package.json
- [ ] Create test utilities (render with providers, etc)
- [ ] Run first test

#### Day 3-4: Security Audit
- [ ] Run npm audit on all packages
- [ ] Document any CVE exceptions
- [ ] Review .env.example (no secrets)
- [ ] Run linter for hardcoded secrets
- [ ] Create SECURITY.md with audit results

#### Day 5: Database Verification
- [ ] Test fresh DB setup (pnpm db:migrate)
- [ ] Verify all migrations apply
- [ ] Check schema vs Prisma
- [ ] Create seed script for test data
- [ ] Test constraints (FK, unique, etc)

---

### Week 2: Auth Tests + Critical Paths

#### Day 1-2: Auth Tests
- [ ] Test LoginPage component
  - [ ] Form submission
  - [ ] Error handling
  - [ ] Redirect on success
- [ ] Test API client
  - [ ] Token attachment
  - [ ] Error response parsing
  - [ ] Retry logic
- [ ] Test middleware
  - [ ] Protected routes block unauthorized
  - [ ] Public routes allow access

#### Day 3-4: API Endpoint Tests
- [ ] Auth endpoints
  - [ ] POST /auth/login
  - [ ] POST /auth/logout (verify logging added)
  - [ ] GET /auth/me
- [ ] Manager endpoints
  - [ ] GET /manager/etapas-pendentes (test priority filter)
  - [ ] POST /manager/etapas/batch-aprovar (new endpoint)
  - [ ] POST /manager/etapas/batch-rejeitar (new endpoint)

#### Day 5: Coverage & Documentation
- [ ] Generate coverage report
- [ ] Target: >70% coverage on critical paths
- [ ] Document test patterns for team
- [ ] Setup CI/CD test automation

---

## 🔍 Security Audit Checklist

### Critical
- [ ] No hardcoded API keys or secrets
- [ ] CORS properly configured
- [ ] Rate limiting in place
- [ ] JWT expiration enforced
- [ ] SQL injection protected (Prisma ORM)

### High
- [ ] Input validation (Zod schemas applied)
- [ ] File upload validation (S3)
- [ ] Password requirements enforced
- [ ] Session timeout configured
- [ ] Audit logging for sensitive operations

### Medium
- [ ] Error messages don't leak info
- [ ] HTTPS enforced in production
- [ ] Security headers set (CSP, X-Frame-Options, etc)
- [ ] Dependencies up to date
- [ ] Secrets in env vars, not code

---

## 📚 Key Files to Test First

**Priority Order** (most critical → least):

1. **apps/web/contexts/auth-context.tsx**
   - Login/logout flow
   - Token refresh
   - Error handling

2. **apps/web/app/api/auth/\*.ts**
   - Session management
   - Cookie handling
   - Logout error logging (just fixed!)

3. **services/api/src/modules/manager/manager.service.ts**
   - Priority filter (just fixed!)
   - Batch operations
   - Caching

4. **apps/web/lib/api.ts**
   - API client initialization
   - Error handling
   - Token attachment

5. **apps/web/app/(auth)/login/page.tsx**
   - Form submission
   - Search params handling
   - Error display

---

## 🎯 Success Criteria - Phase 1

After 1-2 weeks, you should have:

✅ **Tests**
- [ ] Jest configured in all packages
- [ ] >50 test cases written
- [ ] >70% coverage on auth + critical paths
- [ ] CI automatically runs tests on PR

✅ **Security**
- [ ] npm audit clean (or documented exceptions)
- [ ] SECURITY.md audit report created
- [ ] All secrets moved to env vars
- [ ] No hardcoded API keys

✅ **Database**
- [ ] All migrations apply cleanly
- [ ] Seed data loads successfully
- [ ] Schema matches Prisma
- [ ] Test data setup documented

✅ **Documentation**
- [ ] Test patterns documented
- [ ] How to run tests explained
- [ ] Security audit findings listed
- [ ] Remediation plan if needed

---

## 🚀 After Phase 1 - What's Next?

Once foundation is solid, prioritize:

1. **Performance Baseline** (Lighthouse, bundle size)
2. **Mobile Build Verification** (Expo build status)
3. **API Documentation** (Swagger setup)
4. **Monitoring Setup** (Sentry verification)

---

## 📞 Quick Reference - Commands

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Watch mode
pnpm test --watch

# Type check everything
pnpm type-check

# Lint everything
pnpm lint

# Security audit
npm audit

# Database migrate
pnpm db:migrate

# Database seed
pnpm db:seed

# Full build
pnpm build

# Dev mode
pnpm dev
```

---

## ⚠️ Common Pitfalls

1. **Test database**: Make sure tests use separate DB (not production)
2. **Async handling**: Remember `async`/`await` in tests
3. **Mocks**: Mock external APIs (email, S3) in tests
4. **Flaky tests**: Fix timing issues (don't use fixed delays)
5. **Coverage false sense**: 70% coverage != all bugs caught

---

## 💡 Tips & Tricks

- Use `screen.debug()` to see what's rendered
- `userEvent` is better than `fireEvent` for user interactions
- Mock API calls with MSW (Mock Service Worker)
- Test user behavior, not implementation details
- Keep tests small and focused (one thing per test)

---

**Ready to start?** Pick a file from "Key Files to Test First" and create your first test case. Use the examples above as templates.

**Need help?** Reference [Testing Library Docs](https://testing-library.com/) or let me know which file you want to test first.
