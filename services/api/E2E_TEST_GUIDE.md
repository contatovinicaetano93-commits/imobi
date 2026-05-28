# E2E Test Suite Guide

Comprehensive guide for running and extending E2E tests for the Imobi API.

## Current Test Coverage

### Existing E2E Tests
1. **auth.e2e.spec.ts** — User registration, login, password reset
2. **credito.e2e.spec.ts** — Credit application, approval, disbursement
3. **obras.e2e.spec.ts** — Project creation, updates, listing
4. **etapas.e2e.spec.ts** — Stage management and progression
5. **evidencias.e2e.spec.ts** — Photo uploads with GPS validation (client + server)
6. **kyc.e2e.spec.ts** — Document verification (KYC)
7. **score.e2e.spec.ts** — Credit score calculation
8. **fluxo-completo.e2e.spec.ts** — Complete user journey (obra → evidence → approval → release)

**Total Coverage**: ~70% of critical flows

### Coverage Gaps
- [ ] Push notifications integration
- [ ] Email notifications
- [ ] Payment release via BullMQ job
- [ ] Manager approval workflows
- [ ] Rate limiting under load
- [ ] Cache invalidation scenarios
- [ ] Error recovery paths
- [ ] Concurrent request handling

## Setting Up E2E Test Environment

### Prerequisites

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
cd services/api
npx prisma generate

# 3. Start services (PostgreSQL, Redis)
# Use Docker or local instances
docker run -d -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:15
docker run -d -p 6379:6379 redis:7
```

### Environment Variables for Testing

```bash
# services/api/.env.test
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-purposes
DATABASE_URL=postgresql://postgres:test@localhost:5432/imobi_test
REDIS_URL=redis://localhost:6379

# Email (optional in test mode)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025

# Firebase (optional in test mode - mocked)
# Not needed - uses defaults

# S3 (optional in test mode)
# Not needed - uses local defaults
```

### Running Tests

```bash
# Run all E2E tests
NODE_ENV=test npm test -- --testPathPattern="e2e"

# Run specific test suite
NODE_ENV=test npm test -- --testPathPattern="auth.e2e"

# Run with coverage
NODE_ENV=test npm test -- --testPathPattern="e2e" --coverage

# Watch mode (development)
NODE_ENV=test npm test -- --testPathPattern="e2e" --watch

# Show test names without running
NODE_ENV=test npm test -- --testPathPattern="e2e" --listTests
```

## Test Structure

Each E2E test follows this pattern:

```typescript
describe("Feature E2E - Description", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;

  beforeAll(async () => {
    // Setup: Create app instance
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix("api/v1");
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.usuario.deleteMany({...});
    await app.close();
  });

  it("should perform action X", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/endpoint")
      .set("Authorization", `Bearer ${userToken}`)
      .send({...})
      .expect(201);

    expect(res.body).toHaveProperty("id");
  });
});
```

## High-Priority Tests to Add

### 1. Notifications Integration (Priority: HIGH)
```
File: services/api/src/modules/push-notificacoes/notificacoes.e2e.spec.ts

Coverage:
- User receives push when etapa is approved
- Notification includes etapa details
- Multiple notifications queue correctly
- Firebase mocking in test environment
```

### 2. Payment Release Workflow (Priority: HIGH)
```
File: services/api/src/modules/credito/payment-release.e2e.spec.ts

Coverage:
- Manager approves etapa
- BullMQ job triggers payment release
- Funds transferred correctly
- Status updated to LIBERADA
- Notification sent to user
```

### 3. Manager Dashboard (Priority: MEDIUM)
```
File: services/api/src/modules/manager/manager-dashboard.e2e.spec.ts

Coverage:
- Manager login and authentication
- View pending etapas for approval
- Approve/reject etapas
- View payment history
- Generate reports
```

### 4. Rate Limiting Under Load (Priority: MEDIUM)
```
File: services/api/src/common/rate-limiting.e2e.spec.ts

Coverage:
- General limit: 100 req/min
- Auth limit: 10 req/min
- Upload limit: 5 req/min
- Manager limit: 20 req/min
- 429 response when exceeded
- Reset after time window
```

### 5. Error Recovery (Priority: MEDIUM)
```
File: services/api/src/common/error-recovery.e2e.spec.ts

Coverage:
- Database connection errors
- Redis unavailability
- External service failures
- Request retry logic
- Graceful degradation
```

### 6. Concurrent Operations (Priority: LOW)
```
File: services/api/src/common/concurrency.e2e.spec.ts

Coverage:
- Multiple users creating obras simultaneously
- Race conditions in etapa approval
- Concurrent evidence uploads
- Cache consistency
```

## Running Tests in CI/CD

### GitHub Actions (Example)
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm db:generate
      - run: NODE_ENV=test npm test -- --testPathPattern="e2e"
```

## Debugging Failed Tests

### Common Issues

**1. Database Connection Failed**
```bash
# Check PostgreSQL is running
psql postgresql://postgres:test@localhost:5432/postgres -c "SELECT 1"

# Check DATABASE_URL is correct
echo $DATABASE_URL
```

**2. Redis Connection Failed**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

**3. Tests Timeout**
```bash
# Increase timeout in jest config
jest.setTimeout(30000); // 30s in test file

// Or in jest.config.js
module.exports = {
  testTimeout: 30000,
};
```

**4. Prisma Client Not Generated**
```bash
cd services/api
npx prisma generate
```

### Enable Debug Logging

```bash
# Enable NestJS debug logging
DEBUG=* NODE_ENV=test npm test -- --testPathPattern="auth.e2e"

# Enable Prisma query logging
NODE_OPTIONS="--experimental-modules" NODE_ENV=test npm test
```

## Best Practices

1. **Isolation**: Each test should be independent
   - Use unique emails: `test-${Date.now()}@imbobi.com`
   - Clean up created data in afterAll()
   - Don't rely on test execution order

2. **Assertions**: Be specific
   - ✅ `expect(res.body.usuarioId).toBeDefined()`
   - ❌ `expect(res.body).toBeTruthy()`

3. **Error Messages**: Include context
   - ✅ `expect(res.status).toBe(201, "Failed to create obra"`
   - ❌ `expect(res.status).toBe(201)`

4. **Test Data**: Use realistic values
   - Locations: Valid Brazilian coordinates
   - Amounts: Realistic credit amounts
   - Passwords: Meet validation rules

5. **Async/Await**: Always await async operations
   ```typescript
   // Good
   const res = await request(app.getHttpServer()).get("/...");
   expect(res.status).toBe(200);

   // Bad
   request(app.getHttpServer()).get("/..."); // Missing await
   ```

## Continuous Improvement

### Metrics to Track
- Test execution time
- Coverage percentage
- Failed test rate
- Flaky tests (sometimes pass, sometimes fail)

### Monthly Review
- [ ] Add tests for new features
- [ ] Remove obsolete tests
- [ ] Optimize slow tests
- [ ] Review uncovered code paths
- [ ] Update documentation

## Related Documentation

- [PRODUCTION_VALIDATION.md](./PRODUCTION_VALIDATION.md) — Environment setup
- [MONITORING.md](./MONITORING.md) — Health checks and logging
- [../PRODUCTION_SETUP.md](../PRODUCTION_SETUP.md) — Deployment guide
