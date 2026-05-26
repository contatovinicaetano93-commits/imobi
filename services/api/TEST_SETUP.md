# API Test Infrastructure Guide

## Unit Tests

Unit tests use Jest with mocked Prisma and services. They test business logic in isolation without database dependencies.

### Running Unit Tests

```bash
pnpm --filter api test
```

Run specific test file:
```bash
pnpm --filter api test admin.service.spec.ts
```

Watch mode:
```bash
pnpm --filter api test --watch
```

### Test Structure

- Tests are placed alongside source files with `.spec.ts` suffix
- Use `@nestjs/testing` `Test.createTestingModule()` to setup test modules
- Mock external dependencies (Prisma, Services) using Jest mocks
- Example: `src/modules/admin/admin.service.spec.ts`

## E2E Tests

E2E tests run against a real test database and test complete workflows.

### Prerequisites for E2E Tests

1. **Local PostgreSQL** running and accessible
2. **Redis** running (for BullMQ queues)
3. **Test environment variables** in `.env.test`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/imbobi_test
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-secret
```

### Running E2E Tests

```bash
# Create and seed test database
pnpm --filter api prisma:migrate:dev --schema prisma/schema.prisma

# Run E2E tests
pnpm --filter api test:e2e

# Run specific E2E test
pnpm --filter api test:e2e credito.e2e.spec.ts
```

### E2E Test Cleanup

Tests automatically cleanup data after completion. The test database schema is fresh for each test run.

## Mocking Patterns

### Prisma Service Mock

```typescript
const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

### Providing Mocks in Test Module

```typescript
const module = await Test.createTestingModule({
  providers: [
    AdminService,
    { provide: PrismaService, useValue: mockPrisma },
  ],
}).compile();
```

## Test Coverage

View coverage report:

```bash
pnpm --filter api test --coverage
```

Coverage is configured in `jest.config.js` with thresholds for:
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main/develop branches
- Pre-commit hooks (if configured)

Failed tests block merging until resolved.
