# imbobi — Setup Guide

Complete setup instructions for the monorepo project.

## Prerequisites

- Node.js 18+ with pnpm
- PostgreSQL 14+ with PostGIS extension
- Redis 7+
- Docker (optional, for PostgreSQL/Redis)

## Quick Start

### 1. Install dependencies
```bash
pnpm install
```

### 2. Database setup

#### Option A: Docker (Recommended for local development)
```bash
docker-compose up -d
```

This starts PostgreSQL with PostGIS and Redis.

#### Option B: Manual installation
```bash
# Create database and enable PostGIS
createdb imbobi_dev
psql imbobi_dev -c "CREATE EXTENSION postgis;"

# Start Redis
redis-server
```

### 3. Environment configuration
```bash
# Copy template (already exists)
# Edit .env with your values (especially for AWS S3 and API keys)
```

### 4. Database migration
```bash
# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate
```

### 5. Start development servers
```bash
# All services in parallel (web + api)
pnpm dev
```

Individual services:
```bash
# Web only
cd apps/web && pnpm dev

# API only
cd services/api && pnpm start:dev

# Mobile only
cd apps/mobile && pnpm start
```

## Verification Checklist

### API Endpoints (http://localhost:4000)
- [ ] POST `/api/v1/auth/registrar` — Create account
- [ ] POST `/api/v1/auth/login` — Login
- [ ] GET `/api/v1/usuarios/meu-perfil` — User profile
- [ ] POST `/api/v1/credito/simular` — Credit simulation
- [ ] GET `/api/v1/obras` — List obras
- [ ] GET `/api/v1/score/atual` — Current score

### Web (http://localhost:3000)
- [ ] `/` — Landing page
- [ ] `/login` — Login form
- [ ] `/cadastro` — Registration form
- [ ] `/dashboard` — Main dashboard
- [ ] `/dashboard/obras` — Works list
- [ ] `/dashboard/credito` — Credit statements
- [ ] `/dashboard/score` — Score display
- [ ] `/dashboard/simulador` — Credit simulator
- [ ] `/dashboard/perfil` — User profile

## Project Structure

```
services/
├── api/                    # NestJS + Fastify backend
│   ├── src/modules/
│   │   ├── auth/           # Authentication & JWT
│   │   ├── usuarios/       # User management
│   │   ├── credito/        # Credit simulation & tracking
│   │   ├── obras/          # Construction projects
│   │   ├── etapas/         # Project stages
│   │   ├── evidencias/     # Geovalidated photos
│   │   ├── score/          # Construtibilidade scoring
│   │   ├── storage/        # AWS S3 integration
│   │   ├── prisma/         # Database
│   │   └── common/         # Guards, decorators, pipes
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # SQL migrations
│   └── src/app.module.ts   # Module imports
│
├── workers/                # BullMQ background jobs
│   └── liberacao-parcela.worker.ts
│
apps/
├── web/                    # Next.js 14 (App Router)
│   ├── app/
│   │   ├── (marketing)/    # Landing pages
│   │   ├── (auth)/         # Login/signup
│   │   ├── (dashboard)/    # Authenticated pages
│   │   └── api/            # Route handlers
│   ├── lib/api.ts          # API client
│   └── middleware.ts       # Auth protection
│
├── mobile/                 # Expo 51 + Expo Router
│   ├── app/
│   │   ├── (auth)/         # Login
│   │   └── (tabs)/         # Authenticated tabs
│   └── app.config.ts       # Expo config
│
packages/
├── schemas/                # Zod validation
├── core/                   # Shared utilities & hooks
│   ├── haversine.ts        # GPS distance calculation
│   ├── credito.ts          # Credit simulation
│   ├── useGeoValidation.ts # GPS validation hook
│   └── useSimuladorCredito.ts
└── ui/                     # Design system components
```

## Key Technologies

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS + Fastify + Prisma |
| **Database** | PostgreSQL + PostGIS |
| **Cache/Jobs** | Redis + BullMQ |
| **Web** | Next.js 14 (App Router) |
| **Mobile** | Expo 51 + Expo Router |
| **Storage** | AWS S3 / Cloudflare R2 |
| **Validation** | Zod (source of truth) |
| **Forms** | React Hook Form |

## Database Schema

### Key Entities

1. **Usuario** — User accounts with KYC validation
2. **Credito** — Credit agreements with interest calculation
3. **Obra** — Construction projects with GPS coordinates
4. **EtapaObra** — Project stages with delivery milestones
5. **EvidenciaEtapa** — Geovalidated progress photos (dual-layer GPS validation)
6. **LiberacaoParcela** — Async installment releases via BullMQ
7. **ScoreHistorico** — Construtibilidade scoring (0-1000)

## Critical Architecture Decisions

### GPS Validation (Dual-Layer)
- **Client-side** — Immediate feedback on accuracy/radius (UX)
- **Server-side** — PostGIS ST_DWithin cannot be bypassed (Security)

### Session Management
- **HttpOnly Cookies** — Prevents XSS token theft
- **JWT with Refresh** — 15min access token, 7d refresh token
- **Immediate Revocation** — Logout invalidates refresh token

### Credit Simulation
- **Shared Hook** — Works identically on web and mobile
- **Zod Validation** — Single source of truth for rules
- **No Decimal Precision Issues** — Using Float64 properly

### Score Algorithm
- Base: 600 pts (new customer)
- Completion on time: +200
- Completion rate: +300
- Payment history: +200
- Time as customer: +100
- KYC approved: +200
- **Max: 1000 pts**

## Running Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:e2e

# Type checking
pnpm type-check

# Build
pnpm build
```

## Troubleshooting

### Port conflicts
```bash
# Kill process on port 3000 (web)
lsof -ti:3000 | xargs kill -9

# Kill process on port 4000 (api)
lsof -ti:4000 | xargs kill -9

# Kill process on port 5432 (postgres)
lsof -ti:5432 | xargs kill -9
```

### Database connection issues
```bash
# Check PostgreSQL is running
psql -U imbobi -d imbobi_dev -c "SELECT 1;"

# Regenerate Prisma client
pnpm db:generate

# Reset database (development only!)
pnpm db:reset
```

### Redis connection issues
```bash
# Check Redis is running
redis-cli ping

# Clear all keys (development only!)
redis-cli FLUSHALL
```

## Deployment

See CI/CD configuration in `.github/workflows/` for automated deployment to staging/production.

## Support

For issues or questions, open an issue in the repository.
