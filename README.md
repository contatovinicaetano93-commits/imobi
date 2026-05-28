# imbobi — Fintech Platform

Open-source fintech platform for construction financing with real-time work evidence and automated credit simulations.

**Latest Deployment**: May 28, 2026 | **Status**: Production-ready v1.0

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (for local development)
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone repository
git clone https://github.com/imbobi/imbobi-site.git
cd imbobi-site

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your local configuration

# Setup database
pnpm db:migrate
pnpm db:seed  # Optional: seed test data

# Start development servers
pnpm dev
```

**Access:**
- Web: http://localhost:3000
- API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

---

## Architecture

### Monorepo Structure

```
imbobi-site/
├── apps/
│   ├── web/               # Next.js 14 web application
│   └── mobile/            # Expo 51 mobile app
├── services/
│   ├── api/               # NestJS + Fastify backend
│   └── workers/           # BullMQ queue workers
├── packages/
│   ├── schemas/           # Zod validation schemas
│   ├── core/              # Shared utilities & hooks
│   ├── ui/                # UI components (web + mobile)
│   └── types/             # TypeScript types
└── docs/                  # Documentation
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 18, TailwindCSS | Web application |
| **Mobile** | Expo 51, React Native, Expo Router | iOS & Android |
| **Backend** | NestJS, Fastify, Prisma | REST API |
| **Database** | PostgreSQL 15, PostGIS | Data storage + geolocation |
| **Cache/Queue** | Redis 7, BullMQ | Caching & async jobs |
| **Storage** | AWS S3 | Evidence photos |
| **Auth** | JWT (access + refresh), bcryptjs | Authentication |
| **Communication** | SendGrid, Firebase | Email & push notifications |

---

## Security Features

imbobi implements production-grade security across all layers:

### 1. Authentication & Authorization

- **JWT Tokens** — Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **HttpOnly Cookies** — Tokens stored in secure, JavaScript-inaccessible cookies
- **Token Rotation** — Refresh tokens rotated on each use (prevents replay attacks)
- **Password Hashing** — bcryptjs with 10 rounds (OWASP approved)
- **Role-Based Access Control** — TOMADOR, GESTOR_OBRA, ADMIN roles

### 2. CSRF Protection

- **Token-Based Validation** — `GET /api/v1/auth/csrf-token` returns session-specific token
- **SameSite Cookies** — `SameSite=Strict` prevents cross-site cookie transmission
- **CORS Enforcement** — Whitelist of allowed origins only
- **All POST/PUT/DELETE Protected** — Require valid CSRF token in header or body

**Usage:**
```bash
# Get token
CSRF=$(curl https://api.imbobi.com/api/v1/auth/csrf-token | jq -r .csrfToken)

# Use in request
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email": "...", "senha": "..."}'
```

### 3. Rate Limiting

Tiered rate limiting prevents brute force, DoS, and abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Registration | 3 attempts | 1 hour |
| Token Refresh | 10 attempts | 1 hour |
| Credit Simulation | 20 requests | 1 hour |
| Evidence Upload | 30 uploads | 24 hours |
| Global | 100 requests | 60 seconds |

**Response on limit:**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 900 seconds."
}
```

### 4. Data Encryption

- **At-Rest** — Sensitive fields encrypted with AES-256-GCM
  - CPF (national ID)
  - Phone numbers
  - Refresh tokens
  - Personal data
  
- **In-Transit** — HTTPS/TLS 1.3 enforced everywhere
- **Database Security** — PostgreSQL with SSL/TLS required
- **Redis** — Password-protected with persistence enabled

### 5. Input Validation

- **Schema Validation** — Zod schemas validate all inputs before processing
- **SQL Injection Prevention** — Prisma ORM parameterizes all queries (no raw SQL)
- **Email Format** — RFC 5322 compliant
- **Password Strength** — Min 8 chars, uppercase, number, special char
- **Geolocation Validation** — Evidence location within 50m of work

### 6. Security Headers

All API responses include:

```http
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. CORS Configuration

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN.split(','),  // Whitelist only
  credentials: true,                             // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],    // Limited methods
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### 8. Environment Validation

Startup validation ensures all critical secrets are configured:

```bash
✓ JWT_SECRET (>64 chars)
✓ JWT_REFRESH_SECRET (>64 chars)
✓ ENCRYPTION_SECRET (>32 chars)
✓ DATABASE_URL (PostgreSQL)
✓ REDIS_HOST (Redis)
✓ CORS_ORIGIN (production domains)
✓ AWS credentials (S3 access)
✓ Firebase credentials (push notifications)
```

---

## API Documentation

Complete API documentation available in `/docs/API.md`

### Key Endpoints

```http
# Authentication
GET    /api/v1/auth/csrf-token      # Get CSRF token
POST   /api/v1/auth/registrar       # Register user
POST   /api/v1/auth/login           # Login
POST   /api/v1/auth/renovar         # Refresh token
POST   /api/v1/auth/logout          # Revoke token

# Works (Obras)
GET    /api/v1/obras                # List works (paginated)
POST   /api/v1/obras                # Create work
GET    /api/v1/obras/:id            # Get work details
PUT    /api/v1/obras/:id            # Update work

# Stages (Etapas)
GET    /api/v1/obras/:id/etapas     # List work stages
POST   /api/v1/obras/:id/etapas     # Create stage

# Evidence (Evidências)
POST   /api/v1/evidencias/upload    # Upload photo evidence
GET    /api/v1/obras/:id/evidencias # List evidence

# Credit
POST   /api/v1/credito/simular      # Simulate credit
GET    /api/v1/credito/renovar      # Get credit renewal status
```

All endpoints require `X-CSRF-Token` header (except GET requests and auth endpoints).

---

## Deployment

### Quick Deploy

**Staging (auto-deploy from main branch):**
```bash
git push origin main
# GitHub Actions automatically deploys to staging
# Monitor at: https://staging-api.imbobi.com/api/v1/health
```

**Production (manual approval):**
```bash
# Create release PR
gh release create v1.2.3 --title "Release v1.2.3"

# Deploy when ready
gcloud run deploy imbobi-api \
  --image gcr.io/imbobi-prod/imbobi-api:v1.2.3 \
  --region us-east1
```

### Complete Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Environment variables checklist
- Database setup & migrations
- Redis & BullMQ configuration
- Docker build & push
- Cloud Run / Kubernetes deployment
- Health checks & monitoring
- Rollback procedures
- Incident response playbooks

---

## Development

### Running Locally

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:web      # Next.js on port 3000
pnpm dev:api      # NestJS on port 4000
pnpm dev:mobile   # Expo on port 8081

# Watch & rebuild
pnpm build:watch
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific suite
pnpm test:auth
pnpm test:credito

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

### Type Checking

```bash
# Check all packages
pnpm type-check

# Watch mode
pnpm type-check:watch
```

### Linting

```bash
# Lint all packages
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix

# Check specific files
pnpm lint src/auth/
```

### Database Migrations

```bash
# Create new migration
pnpm db:migrate:new --name add_evidence_status

# Run migrations
pnpm db:migrate

# Rollback last migration
pnpm db:migrate:rollback

# View migration status
pnpm db:migrate:status

# Regenerate Prisma client
pnpm db:generate
```

---

## Environment Variables

### Required for Development

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/imbobi_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets (must be >64 chars in production)
JWT_SECRET=dev-secret-at-least-64-characters-long-for-production
JWT_REFRESH_SECRET=dev-secret-at-least-64-characters-long-for-production

# Encryption (must be >32 chars in production)
ENCRYPTION_SECRET=dev-secret-at-least-32-characters-long

# CORS
CORS_ORIGIN=http://localhost:3000

# External Services (optional for development)
SENDGRID_API_KEY=<optional>
AWS_ACCESS_KEY_ID=<optional>
AWS_SECRET_ACCESS_KEY=<optional>
S3_BUCKET=<optional>
FIREBASE_PROJECT_ID=<optional>
```

See `.env.example` for complete reference.

---

## Monitoring & Observability

### Health Checks

```bash
# API health
curl https://api.imbobi.com/api/v1/health

# Detailed metrics
curl https://api.imbobi.com/api/v1/metrics
```

### Logging

- **Application Logs** — Structured JSON logs in development, CloudWatch in production
- **Request Logs** — All requests logged with response time and status code
- **Error Tracking** — Sentry integration for exception tracking
- **Performance** — Request traces in CloudWatch, Datadog, or similar

### Alerts

Configure alerts for:
- Error rate > 1%
- Response time p95 > 1000ms
- Database connection errors
- Redis connection errors
- Rate limit violations (potential DDoS)

---

## Contributing

### Branch Naming

```
feature/short-description    # New features
fix/short-description        # Bug fixes
docs/short-description       # Documentation
chore/short-description      # Internal improvements
```

### Commit Messages

```
feat: add CSRF protection to login endpoint
fix: prevent JWT token leakage in logs
docs: update API documentation
chore: upgrade dependencies to latest versions

# If fixing issue:
fix: prevent infinite loop in token refresh (#123)
```

### Pull Request Process

1. Create feature branch from `main`
2. Commit changes with clear messages
3. Push and create PR with description
4. Pass all tests and type checks
5. Get code review approval
6. Squash and merge to `main`

---

## License

Copyright (c) 2026 imbobi. All rights reserved.

**Private Repository** — Please contact hello@imbobi.com for access information.

---

## Support & Documentation

- **API Docs**: [docs/API.md](./docs/API.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Security Details**: [docs/SECURITY.md](./docs/SECURITY.md)
- **Setup Guide**: [SETUP.md](./SETUP.md)

**Contact:**
- 🐛 **Report bugs**: backend@imbobi.com
- 🔒 **Security issues**: security@imbobi.com
- 📧 **General support**: hello@imbobi.com

---

**Last Updated**: May 28, 2026  
**Maintained by**: imbobi Engineering Team
