# Infrastructure Setup Guide - Imobi API

**Status**: Infrastructure connectivity investigation  
**Date**: June 23, 2026  
**Environment**: Isolated network with Docker, PostgreSQL-specific schema  
**Current Blockers**: Cloud database unreachable, Redis cloud unreachable  

---

## Executive Summary

The Imobi backend API (NestJS + Fastify) requires:
- **PostgreSQL 15** (uses PostGIS, advanced features)
- **Redis** (BullMQ job queues, caching, rate limiting)

Current environment has:
- ✅ Docker daemon available
- ✅ psql client installed
- ✅ pnpm/npm dependencies resolved
- ❌ Network isolation: Cloud database hostname unresolvable
- ❌ Network isolation: Upstash Redis unreachable
- ❌ systemd unavailable (containerd/cgroup limitation)

---

## Problem Analysis

### Why Cloud Services Failed

**Database Connection Attempt:**
```bash
$ psql "postgresql://imobi_postgres_staging_user:...@dpg-d8bmmtmk1jcs73diih60-a/imobi_postgres_staging" -c "SELECT 1;"
psql: error: could not translate host name "dpg-d8bmmtmk1jcs73diih60-a" to address: Name or service not known
```

**Root Cause:** DNS resolution failure - Render/Aiven hostnames cannot be resolved from this network.

**Redis Connection Attempt:**
```bash
$ redis-cli -u "redis://default:...@funky-dane-137714.upstash.io:6379" ping
# Timeout - no response
```

**Root Cause:** Upstash cloud Redis is unreachable (likely firewall/network policy).

---

## Solution Paths

### Path 1: Docker-Based Local Stack (RECOMMENDED)

**Advantage:** Mirrors production exactly, all features work, clean isolation  
**Limitation:** Requires Docker image pull (currently failing due to network restrictions)  
**Status:** Blocked by registry access

```bash
# What we attempted:
docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15-alpine
# Failed: 403 Forbidden from Docker registry
```

**Workaround:** If Docker registry becomes available:
```bash
# PostgreSQL
docker run -d \
  --name imobi-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=imobi \
  -p 5432:5432 \
  postgres:15-alpine

# Redis
docker run -d \
  --name imobi-redis \
  -p 6379:6379 \
  redis:7-alpine

# Update .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imobi
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Then run migrations
cd services/api
pnpm db:migrate
pnpm db:seed

# Start API
pnpm dev
```

### Path 2: Pre-Installed PostgreSQL Server

**Status:** Not available - pg_ctl not found, only psql client available  
**Note:** Would require:
```bash
apt-get install postgresql-15-server
initdb /var/lib/postgresql/15/main
pg_ctl -D /var/lib/postgresql/15/main start
```

### Path 3: Remote SSH Tunnel to Cloud Database

**Advantage:** Works with existing cloud infrastructure  
**Requirement:** SSH access to jump host with outbound network access  

```bash
# Requires SSH key to intermediate server
ssh -L 5432:dpg-d8bmmtmk1jcs73diih60-a:5432 user@jumphost -N &
ssh -L 6379:funky-dane-137714.upstash.io:6379 user@jumphost -N &

# Then update .env.local
DATABASE_URL=postgresql://imobi_postgres_staging_user:...@localhost:5432/imobi_postgres_staging
REDIS_URL=redis://default:...@localhost:6379
```

**Status:** Requires external infrastructure - not available in current environment

---

## Current Environment Details

### System Information
```
Platform: Linux 6.18.5 (Kernel)
Container: CGroup-based (no systemd)
Docker: 29.3.1 (daemon not running initially, now started)
Architecture: x86_64
Shell: bash/zsh capable
```

### Available Tools
```
✅ psql (PostgreSQL client)
✅ redis-cli (Redis client)
✅ docker (Docker daemon via sudo)
✅ pnpm (Node package manager)
✅ TypeScript/Node.js 18+
✅ Git (version control)

❌ pg_ctl (PostgreSQL server control)
❌ systemd (service manager)
❌ DNS tools (nslookup, dig)
❌ Network tools (ping, nc, traceroute)
❌ Docker registry access (firewall/policies)
```

### Prisma Configuration
```typescript
// schema.prisma
datasource db {
  provider = "postgresql"  // PostgreSQL ONLY
  url      = env("DATABASE_URL")
}
```

**Why PostgreSQL is mandatory:**
- PostGIS extension for geographic queries (obra coordinates)
- Advanced JSON operators (evidências.payload, dueDiligence.payload)
- UUID generation with `@default(uuid())`
- Enum types native support
- Cannot use SQLite/MySQL alternatives

---

## Configuration Files Status

### .env.local (Current - Cloud URLs)
```bash
DATABASE_URL=postgresql://imobi_postgres_staging_user:...@dpg-d8bmmtmk1jcs73diih60-a/...
REDIS_URL=redis://default:...@funky-dane-137714.upstash.io:6379
```

**Status:** ❌ Unreachable from this environment

### .env.test (Expected - Local URLs)
```bash
DATABASE_URL=postgresql://imbobi:senha@localhost:5432/imbobi_dev
REDIS_URL=redis://localhost:6379
```

**Status:** ⏳ Waiting for PostgreSQL/Redis on localhost

---

## Recommended Next Steps

### Immediate (Today)

1. **Verify Docker Registry Access**
   ```bash
   # Check if Docker can pull images
   docker pull alpine:latest
   ```
   
   If successful → Proceed with **Path 1 (Docker Stack)**
   
   If fails with 403 → Check network policies/firewall rules

2. **Check for Offline Images**
   ```bash
   docker images | grep postgres
   docker images | grep redis
   ```
   
   If images exist → Use directly with docker run

3. **Document Current Limitations**
   - Network isolation prevents cloud connectivity
   - System doesn't support traditional package installation
   - No SSH jump host available for tunneling

### Short-term (This Week)

**Option A: Approve Docker Image Pull**
- Contact infrastructure team
- Allow Docker registry (production.cloudfront.docker.com)
- Whitelist Postgres/Redis image registries
- Deploy local stack

**Option B: Setup CI/CD Testing**
- Pushes trigger GitHub Actions
- Actions have full network access
- Run integration tests there
- Local development uses mock services

**Option C: Provision Staging Database Access**
- Add current network/IP to Render database firewall
- Create SSH tunnels for development
- Use cloud database from this environment

---

## Database Schema Overview

**Critical Features Using PostgreSQL-Specific Syntax:**

### 1. Geo Queries (PostGIS)
```sql
-- Obra model uses geoLatitude, geoLongitude
-- Evidência.distanciaObra calculation requires PostGIS ST_Distance
SELECT ST_Distance(
  ST_Point(evidencia.lng, evidencia.lat),
  ST_Point(obra.geo_long, obra.geo_lat)
) AS distance_meters
```

### 2. Advanced JSON Operations
```sql
-- DueDiligence.payload (complex JSON)
-- Notificacao.preferenciasNotificacao (JSON preferences)
SELECT payload->'incorporadora'->>'nome' FROM due_diligences
```

### 3. UUID Generation
```sql
-- Native PostgreSQL UUID generation via @default(uuid())
SELECT uuid_generate_v4()
```

### 4. Cascading Deletes
```sql
-- Multiple CASCADE rules for data consistency
ALTER TABLE creditos CASCADE RESTRICT...
```

---

## Module Dependencies on Database/Redis

**24 NestJS Modules (All Require Database):**
1. `AuthModule` - User authentication, sessions
2. `UsuariosModule` - User CRUD, KYC status
3. `CreditoModule` - Credit products, approvals
4. `ObrasModule` - Construction projects
5. `EtapasModule` - Project stages/milestones
6. `EvidenciasModule` - Photo evidence, GPS validation
7. `ScoreModule` - Credit scoring engine
8. `KycModule` - Know-Your-Customer verification
9. `ManagerModule` - Fund/project managers
10. `EmailModule` - Transactional emails
11. `MarketplaceModule` - Secondary market
12. `ParceirosModule` - Partner integrations
13. `NotificacoesModule` - User notifications
14. `ComercialModule` - Sales pipeline
15. `EngenheirosModule` - Engineer workflows
16. `AdminModule` - Administrative functions
17. `PushNotificacoesModule` - Firebase push (uses Redis)
18. `VistoriaModule` - Site inspections
19. `SetupModule` - System setup/initialization
20. `DueDiligenceModule` - Due diligence reports
21. `DocumentosModule` - Document management
22. `ComiteModule` - Committee decisions
23. `BullModule` - Async job queues (Requires Redis)
24. `CacheModule` - Multi-tier caching (Requires Redis)

**API Cannot Start Without:**
- PostgreSQL connection (Prisma must initialize)
- Redis connection (BullModule, CacheModule, Throttler)

---

## Troubleshooting Decision Tree

```
┌─ Can Docker pull images?
│  ├─ YES → [Path 1] Docker Stack Setup
│  │  └─ docker run postgres:15-alpine
│  │  └─ docker run redis:7-alpine
│  │  └─ Run migrations
│  │  └─ pnpm dev
│  │
│  └─ NO (403 Forbidden) → Check:
│     ├─ Is Docker logged in? (docker login)
│     ├─ Is registry whitelisted? (check firewall)
│     ├─ Can any image pull succeed? (docker pull alpine)
│     └─ Contact: Infrastructure team for registry access
│
├─ Do offline images exist locally?
│  ├─ YES → Use docker run with local image
│  └─ NO → Build from Dockerfile
│
├─ Can psql connect to localhost:5432?
│  ├─ YES → PostgreSQL is running locally
│  └─ NO → Need to setup PostgreSQL
│
└─ Can redis-cli connect to localhost:6379?
   ├─ YES → Redis is running locally
   └─ NO → Need to setup Redis
```

---

## Monitoring & Validation

### Health Check Once API Starts
```bash
# Should return {"status":"ok"} within 5 seconds
curl http://localhost:4000/api/v1/health

# Check database connectivity
curl http://localhost:4000/api/v1/health/db

# Check Redis connectivity
curl http://localhost:4000/api/v1/health/redis

# Check all 24 modules loaded
curl http://localhost:4000/api/v1/health | jq '.modules'
```

### Database Migrations Status
```bash
cd services/api

# Show pending migrations
pnpm prisma migrate status

# Apply migrations
pnpm prisma migrate deploy

# Verify schema
pnpm prisma db push --skip-generate

# View with GUI
pnpm prisma studio
```

### Redis Queue Status
```bash
# Via BullBoard (if enabled)
curl http://localhost:4000/admin/queues

# Via redis-cli
redis-cli
  > KEYS "bull:*"
  > LLEN "bull:liberacao-parcela"
  > LLEN "bull:excluir-usuario"
```

---

## Development Workflow Once Infrastructure is Ready

### 1. Setup (First Time)
```bash
cd /home/user/imobi

# Install dependencies
pnpm install

# Setup database
cd services/api
pnpm db:migrate
pnpm db:seed

# Return to root
cd ../..
```

### 2. Development (Daily)
```bash
# Terminal 1: API
cd services/api
pnpm dev

# Terminal 2: Workers (optional)
cd services/workers
pnpm dev

# Terminal 3: Web Frontend
cd apps/web
pnpm dev

# Terminal 4: Mobile
cd apps/mobile
pnpm dev
```

### 3. Testing
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Specific module
pnpm test -- modules/credito
```

---

## Timeline & Dependencies

| Phase | Duration | Blocker | Outcome |
|-------|----------|---------|---------|
| **Phase 1: Docker Setup** | 15 min | Registry access | PostgreSQL + Redis running |
| **Phase 2: Database Init** | 5 min | None (if Phase 1 succeeds) | Schema created, migrations applied |
| **Phase 3: API Start** | 30 sec | None | All 24 modules load |
| **Phase 4: Integration Tests** | 10 min | None | 54+ E2E assertions pass |
| **Phase 5: Documentation** | 30 min | None | This document updated |

**Total Time (if Path 1 succeeds): ~1 hour**

---

## Emergency Contacts & Escalation

1. **Docker Registry Access Issues**
   - Check: Network Security policies
   - Escalate: Infrastructure/DevOps team
   - Action: Whitelist production.cloudfront.docker.com

2. **PostgreSQL Schema Issues**
   - Check: Prisma logs (`pnpm prisma:studio`)
   - Escalate: Backend team lead
   - Action: Review schema.prisma for compatibility

3. **Redis Queue Issues**
   - Check: BullBoard admin panel
   - Escalate: Infrastructure team
   - Action: Verify Redis persistence, eviction policies

4. **Persistent Network Isolation**
   - Option A: Request SSH tunnel to bastion host
   - Option B: Use GitHub Actions for testing
   - Option C: Deploy to staging (Render/Railway) for full testing

---

## Related Documentation

- `CLAUDE.md` - Project overview and commands
- `ARCHITECTURE_RESILIENCE_API_FIRST.md` - Architecture patterns
- `BACKEND_TEST_EXECUTION.md` - E2E testing guide
- `PRODUCTION_VALIDATION.md` - Production checklist
- `VERCEL_DEPLOYMENT_GUIDE.md` - Deployment procedures

---

**Last Updated:** June 23, 2026  
**Status:** Infrastructure Investigation Complete - Awaiting Docker Registry Access  
**Next Review:** After Docker registry access confirmed or alternative approved
