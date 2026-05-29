# Quick Start Guide - imobi Development

## Prerequisites
- Node.js 22+
- pnpm 9.0.0+
- PostgreSQL 14+
- Redis 7+
- Docker (optional, for containers)

## Development Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
# Copy example to .env
cp .env.example .env

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))" >> .env
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))" >> .env
```

### 3. Database Setup
```bash
# Run migrations
pnpm db:migrate:dev

# Seed test data (optional)
pnpm seed
```

### 4. Start Development Server
```bash
# Start all services (Web, API, Mobile)
pnpm dev

# Or start individual services
pnpm --filter @imbobi/web dev      # Web on http://localhost:3000
pnpm --filter @imbobi/api dev       # API on http://localhost:4000
pnpm --filter @imbobi/mobile dev    # Mobile (requires Expo account)
```

## Testing Web Flows

### Test Signup
```bash
# 1. Navigate to http://localhost:3000/cadastro
# 2. Fill in test data:
#    - Email: test@example.com
#    - Password: SecurePass123!@#
#    - Name: Test User
#    - CPF: 11144477735 (valid test CPF)
#    - Phone: 11999999999

# Expected: Redirects to dashboard after successful signup
```

### Test KYC Profile
```bash
# 1. After signup, navigate to http://localhost:3000/dashboard/kyc
# 2. Click "Upload Document"
# 3. Select image for document front and back
# 4. Click "Submit"

# Expected: Document uploaded and status shown
```

### Test Credit Simulator
```bash
# 1. Navigate to http://localhost:3000/dashboard/simulador
# 2. Adjust sliders:
#    - Amount: R$100,000
#    - Term: 36 months
# 3. View calculated monthly installment

# Expected: Real-time calculations with interest and CET
```

## Running Tests

### Unit & Integration Tests
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test auth.e2e-spec

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

### Type Checking
```bash
# Check TypeScript across all packages
pnpm type-check
```

### Linting
```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint -- --fix
```

## Building for Production

### Build All Packages
```bash
pnpm build
```

### Build Specific Package
```bash
pnpm --filter @imbobi/api build
pnpm --filter @imbobi/web build
pnpm --filter @imbobi/mobile build
```

## Database Operations

### Prisma Studio
```bash
# Open Prisma UI to browse/edit data
pnpm db:studio
```

### Generate Prisma Client
```bash
# Regenerate Prisma client after schema changes
pnpm db:generate
```

### Create Migration
```bash
# Create a new migration after schema changes
pnpm db:migrate:dev --name meaningful_name
```

## Common Commands Reference

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all dev servers
pnpm build                # Production build
pnpm type-check           # TypeScript type checking
pnpm lint                 # ESLint linting
pnpm test                 # Run tests
pnpm db:migrate:dev       # Run database migrations
pnpm db:generate          # Regenerate Prisma client
pnpm db:studio            # Open Prisma Studio
pnpm seed                 # Seed test data
./security-audit.sh       # Run security audit
./rotate-secrets.sh       # Rotate application secrets
```

## API Documentation

### Health Check
```bash
curl http://localhost:4000/api/v1/health
```

### Signup
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#",
    "nome": "Test User",
    "cpf": "11144477735",
    "celular": "11999999999"
  }'
```

### Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#"
  }'
```

### Credit Simulation
```bash
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "valor": 100000,
    "prazo": 36
  }'
```

## Project Structure

```
imobi/
├── apps/
│   ├── web/           # Next.js web application
│   └── mobile/        # Expo React Native app
├── services/
│   └── api/           # NestJS API server
├── packages/
│   ├── schemas/       # Zod validation schemas
│   ├── core/          # Shared utilities and hooks
│   ├── ui/            # Component library
│   └── api-client/    # TypeScript API client
├── k8s/               # Kubernetes manifests
├── docker-compose.yml # Development environment
└── docker-compose.prod.yml # Production environment
```

## Debugging

### Enable Debug Logging
```bash
# Set log level
export LOG_LEVEL=debug
pnpm dev
```

### Check Database Connection
```bash
psql postgresql://user:password@localhost:5432/imobi
```

### Check Redis Connection
```bash
redis-cli ping
# Should return: PONG
```

### View API Logs
```bash
# API runs on :4000
curl http://localhost:4000/api/v1/health -v
```

## Performance Testing

### k6 Load Testing
```bash
# Install k6: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run load-test.js

# Run heavy load test (500 concurrent users)
k6 run load-test-heavy.js
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres -d postgres

# Check environment variables
cat .env | grep DATABASE
```

### Node Modules Issues
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Next Steps

1. ✅ Run `pnpm install` to install dependencies
2. ✅ Set up `.env` file with credentials
3. ✅ Run `pnpm db:migrate:dev` to initialize database
4. ✅ Run `pnpm dev` to start development servers
5. ✅ Open http://localhost:3000 in your browser
6. ✅ Test signup at http://localhost:3000/cadastro
7. ✅ Run tests with `pnpm test`
8. ✅ Build for production with `pnpm build`

## Getting Help

- Check `.env.example` for all required environment variables
- Review `IMPLEMENTATION_GUIDE.md` for detailed setup
- Check `SECURITY_SUMMARY.md` for security implementation
- Run `pnpm lint` to check code quality
- Run `pnpm type-check` to verify TypeScript

---

**Ready to develop?** Start with `pnpm install && pnpm dev` 🚀
