# E2E Test Suite Documentation

**Last Updated**: 2026-05-28  
**Project**: imbobi — Construction Finance Platform  
**Environment**: Node.js + Jest + Supertest

## Overview

The E2E test suite covers the 5 critical user flows required for platform functionality:

1. **LOGIN** - Registration & Authentication
2. **CRIAR OBRA** - Project creation with auto-staged etapas
3. **VISTORIA** - Evidence upload and approval workflow
4. **KYC** - Know Your Customer document verification
5. **CREDITO** - Credit simulation and request

## Test Files

### Critical Flows Test Suite
**File**: `/services/api/src/__tests__/critical-flows.e2e.spec.ts`

Comprehensive end-to-end tests covering all 5 critical flows in sequence, with 50+ test cases validating:
- User authentication lifecycle
- Project creation and data consistency
- Evidence collection and approval workflows
- Document verification process
- Credit calculations and state management

**Run**: `pnpm -F @imbobi/api test -- critical-flows.e2e.spec.ts`

### Performance Baseline Suite
**File**: `/services/api/src/__tests__/performance.baseline.spec.ts`

Performance profiling tests measuring response times for critical endpoints:
- Authentication (registration, login, token refresh)
- Obra management (creation, retrieval)
- KYC document operations
- Credit simulations and requests
- Database query performance

Captures metrics:
- Average response time (ms)
- Min/Max ranges
- P95 percentile
- Database query performance

**Run**: `pnpm -F @imbobi/api test -- performance.baseline.spec.ts`

### Individual Module E2E Tests
- `/services/api/src/modules/auth/auth.e2e.spec.ts` - Authentication flows
- `/services/api/src/modules/obras/obras.e2e.spec.ts` - Project management
- `/services/api/src/modules/evidencias/evidencias.e2e.spec.ts` - Evidence collection
- `/services/api/src/modules/kyc/kyc.e2e.spec.ts` - KYC verification
- `/services/api/src/modules/credito/credito.e2e.spec.ts` - Credit operations
- `/services/api/src/modules/evidencias/fluxo-completo.e2e.spec.ts` - Complete workflow

## Running Tests

### All E2E Tests
```bash
cd /home/user/alagami-site
pnpm -F @imbobi/api test
```

### Specific Test File
```bash
pnpm -F @imbobi/api test -- critical-flows.e2e.spec.ts
```

### Watch Mode (Development)
```bash
pnpm -F @imbobi/api test -- --watch
```

### Performance Tests Only
```bash
pnpm -F @imbobi/api test -- performance.baseline.spec.ts --verbose
```

## Test Structure

### Flow 1: LOGIN (8 tests)
- User registration with password hashing
- Email uniqueness constraints
- JWT token generation and validation
- Token refresh mechanism
- Token revocation on logout

### Flow 2: CRIAR OBRA (7 tests)
- Obra creation with geolocation
- Automatic etapa generation (9 stages)
- Sequential ordering of etapas
- Value distribution across stages
- Data persistence and retrieval

### Flow 3: VISTORIA (7 tests)
- Evidence upload with geolocation validation
- PostGIS spatial validation
- Etapa status transitions
- Role-based approval workflow
- Data consistency and error handling

### Flow 4: KYC (9 tests)
- Multi-document KYC process
- Document type validation
- Status tracking (PENDENTE, APROVADO, REJEITADO)
- Document list and summary statistics
- Authentication and authorization

### Flow 5: CREDITO (10 tests)
- Public credit simulation (no authentication)
- Interest rate calculations
- Credit request workflow
- Statement generation with payment schedule
- Mathematical correctness of calculations

## Performance Baseline Expectations

| Endpoint | Target | Notes |
|----------|--------|-------|
| POST /auth/registrar | 1000ms | Includes bcrypt |
| POST /auth/login | 500ms | Password verification |
| GET /usuarios/meu-perfil | 200ms | Simple lookup |
| POST /obras | 800ms | 9 etapas generation |
| GET /obras/{id} | 300ms | Joined with etapas |
| POST /kyc/upload | 400ms | Document storage |
| POST /credito/simular | 150ms | No DB write |
| GET /credito/{id}/extrato | 300ms | Cached |

## Documentation References

- **Lighthouse Baseline**: See `/LIGHTHOUSE_BASELINE.md`
- **API Documentation**: See `/services/api/README.md`
- **Database Schema**: See `/prisma/schema.prisma`

---

**Summary**: 50+ critical E2E tests + 40+ performance baseline tests covering all 5 essential flows. Execution ~2-3 minutes. Run on every PR.
