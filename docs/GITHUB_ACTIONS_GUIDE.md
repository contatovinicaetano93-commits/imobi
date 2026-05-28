# GitHub Actions CI/CD Workflow Guide

## Overview
The CI/CD pipeline is defined in `.github/workflows/ci.yml` and runs automated checks on every push and pull request to ensure code quality and consistency.

## Workflow Triggers

### On Push
- **Branches**: `main`, `develop`
- **Action**: All jobs run automatically

### On Pull Request
- **Branches**: Against `main` or `develop`
- **Action**: All jobs run automatically to validate changes before merge

## Jobs

### 1. Type Check Job
**Name**: `type-check`  
**Runs on**: `ubuntu-latest`

**Purpose**: Validate TypeScript types across all packages in the monorepo

**Steps**:
1. Checkout code with full history (`fetch-depth: 0`)
2. Install pnpm v9.0.0
3. Install Node.js v20 with pnpm cache
4. Install dependencies with frozen lockfile
5. Run `pnpm type-check` to validate all TypeScript

**Failure Impact**: PR cannot merge if types don't pass

---

### 2. Test Job
**Name**: `test`  
**Runs on**: `ubuntu-latest`  
**Dependencies**: None (runs in parallel with type-check)

**Purpose**: Run critical flow E2E tests against a test database and cache

**Services**:
- **PostgreSQL 16 with PostGIS**
  - Image: `postgis/postgis:16-3.4`
  - Credentials: `test` / `test`
  - Database: `imbobi_test`
  - Health check: pg_isready every 10s
  - Port: `5432:5432`

- **Redis 7**
  - Image: `redis:7-alpine`
  - Health check: redis-cli ping every 10s
  - Port: `6379:6379`

**Steps**:
1. Checkout code with full history
2. Install pnpm v9.0.0
3. Install Node.js v20 with cache
4. Install dependencies with frozen lockfile
5. Generate Prisma client (`pnpm db:generate`)
6. Run critical flow tests: `pnpm -F @imbobi/api test -- critical-flows.e2e.spec.ts`

**Environment Variables**:
- `DATABASE_URL`: Points to test PostgreSQL instance
- `REDIS_URL`: Points to test Redis instance

**Failure Impact**: PR cannot merge if critical flows fail

---

### 3. Build Job
**Name**: `build`  
**Runs on**: `ubuntu-latest`  
**Depends on**: `type-check` (waits for type validation to pass)

**Purpose**: Build all packages to verify production bundle integrity

**Steps**:
1. Checkout code with full history
2. Install pnpm v9.0.0
3. Install Node.js v20 with cache
4. Install dependencies with frozen lockfile
5. Build all apps: `pnpm build`
6. Upload build artifacts for 1 day retention

**Artifacts**:
- `apps/web/.next` (Next.js build)
- `apps/mobile/dist` (Expo/mobile build)
- `services/api/dist` (NestJS API build)

**Failure Impact**: PR cannot merge if production build fails

---

## Workflow Execution Order

```
Pull Request / Push to main/develop
    ↓
┌───────────────────────────────────┐
│ Parallel Execution:               │
│ • type-check (5-10 min)           │
│ • test (10-15 min)                │
└───────────────────────────────────┘
    ↓
Build (depends on type-check ✓)
    5-10 min
    ↓
All checks passed → PR ready to merge
```

## Common Issues & Troubleshooting

### Type Check Fails
- **Cause**: TypeScript compilation errors in any package
- **Fix**: Run locally `pnpm type-check`, fix errors, commit
- **Details**: Check workflow output for specific file and line

### Test Fails
- **Cause**: Database or Redis connection issues, or critical flow regression
- **Fix**:
  1. Ensure test data fixtures are valid
  2. Check `critical-flows.e2e.spec.ts` for new assertions
  3. Run locally with `pnpm db:generate && pnpm -F @imbobi/api test`
- **Database**: Migrations must be compatible with test environment

### Build Fails
- **Cause**: Missing dependencies, circular imports, or build script errors
- **Fix**:
  1. Run `pnpm install` locally
  2. Run `pnpm build` to reproduce
  3. Check for missing TypeScript declarations
  4. Verify all monorepo package references are correct

### Timeout Issues
- **Services not starting**: Increase health check retries (currently 5)
- **Dependencies installing too slow**: May indicate large dependency tree

## Monitoring & Alerts

### Viewing Workflow Runs
1. Go to **Actions** tab in GitHub repository
2. Click on a workflow run to see details
3. Expand each job to see logs

### Notifications
- **PR Reviews Blocked**: GitHub notifies PR author when checks fail
- **Branch Protection**: Can't merge to `main`/`develop` without passing checks
- **Email Notifications**: Configure in GitHub user Settings → Notifications

### Common Metrics
- **Type Check**: 5-10 minutes
- **Test Suite**: 10-15 minutes (includes DB setup, migrations, tests)
- **Build**: 5-10 minutes
- **Total**: 15-25 minutes for full workflow

## Skipping Workflows

To skip the workflow on a specific commit, include in commit message:
```bash
git commit -m "docs: update readme [skip ci]"
```

Not recommended for code changes. Use only for documentation-only commits.

## Best Practices

1. **Keep Tests Fast**: Critical flows should complete in < 15 min
2. **Avoid Secrets in Tests**: Use test credentials only
3. **Pin Versions**: pnpm (9.0.0), Node (20), PostgreSQL (16-3.4), Redis (7)
4. **Monitor Artifacts**: Build artifacts retained 1 day for debugging
5. **Parallel Execution**: Type-check and test run in parallel to save time

## Future Enhancements

Potential additions to the workflow:
- E2E tests on actual app (web + mobile)
- Performance benchmarking
- Security scanning (SAST/DAST)
- Dependency vulnerability checks
- Code coverage reports
- Integration test suite
