# 🚀 Quick Start - Local Development

Get Imobi running locally in 5 minutes.

---

## 📋 Prerequisites

- Node.js 20+
- pnpm 9.0+
- PostgreSQL 15+
- Redis 7.0+
- Git

---

## 🏃 5-Minute Setup

### Step 1: Install & Setup (2 min)

```bash
# Clone (if not already done)
git clone <repo>
cd imobi

# Install dependencies
pnpm install

# Setup database
createdb imobi
createuser imobi_user -P  # Password: imobi_password

# Run migrations
pnpm db:migrate

# Generate Prisma types
pnpm db:generate
```

### Step 2: Start Services (1 min)

```bash
# Terminal 1: Backend API (default port 4000)
cd services/api
pnpm dev
# API running at http://localhost:4000

# Terminal 2: Frontend (default port 3000)
cd apps/web
pnpm dev
# Web running at http://localhost:3000
```

### Step 3: Verify Everything Works (2 min)

```bash
# Test API health
curl http://localhost:4000/api/v1/health
# Expected: {"status":"ok",...}

# Test frontend loads
open http://localhost:3000
# Should see login page

# Run integration tests
pnpm test --testPathPattern=integration.test
```

---

## 🔧 Environment Setup

### Backend (.env.local)

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://imobi_user:imobi_password@localhost:5432/imobi
DATABASE_POOL_SIZE=10
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-key-min-32-chars-long-enough-here
ENCRYPTION_KEY=dev-encryption-key-32-chars-min-here
LOG_LEVEL=debug
STRUCTURED_LOGGING=true
SENTRY_ENABLED=false
PROMETHEUS_ENABLED=true
SWAGGER_ENABLED=true
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_SENTRY_ENABLED=false
```

---

## 📊 Common Commands

```bash
# Database
pnpm db:migrate          # Run migrations
pnpm db:reset           # Reset (⚠️ deletes data)
pnpm db:seed            # Seed test data
pnpm db:generate        # Generate Prisma types

# Development
pnpm type-check         # Type check all packages
pnpm lint               # Run linter
pnpm build              # Build for production
pnpm dev:api            # Start backend only
pnpm dev:web            # Start frontend only

# Testing
pnpm test               # Run all tests
pnpm test:e2e          # Run E2E tests
```

---

## 🧪 Quick Auth Test

```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "cpf": "12345678900",
    "email": "test@localhost.test",
    "telefone": "11999999999",
    "senha": "TestPassword123!",
    "consentidoTermos": true,
    "consentidoPrivacy": true,
    "consentidoKyc": true,
    "consentidoMarketing": false
  }'

# Login (save accessToken from response)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@localhost.test",
    "senha": "TestPassword123!"
  }'

# Call protected endpoint
curl http://localhost:4000/api/v1/credito \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚨 Troubleshooting

```bash
# Database connection issues
psql postgres -c "SELECT 1;"
createdb imobi
createuser imobi_user -P

# Redis issues
redis-cli ping          # Should return PONG
brew services start redis  # macOS

# Port already in use (API: 4000, Web: 3000)
lsof -i :4000          # Find API process
lsof -i :3000          # Find web process
kill -9 <PID>          # Kill it
```

---

**Status**: Ready for local development  
**Time**: 5-10 minutes setup  
**Next**: Start frontend feature implementation
