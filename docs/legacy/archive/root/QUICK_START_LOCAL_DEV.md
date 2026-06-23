# Quick Start - Local Development Setup

## Prerequisites Check
```bash
# Verify services are running
ps aux | grep postgres     # Should show PostgreSQL processes
ps aux | grep redis        # Should show Redis
redis-cli ping             # Should return PONG
psql -U imobi_user -h localhost -d imobi -c "SELECT 1;"  # Should return 1
```

## Start PostgreSQL (if not running)
```bash
export PGDATA="/tmp/imobi_postgres"
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -l /tmp/postgres.log start
# Verify: psql -U imobi_user -h localhost -d imobi -c "SELECT 1;"
```

## Start Redis (if not running)
```bash
sudo redis-server --daemonize yes --port 6379 --logfile /tmp/redis.log
# Verify: redis-cli ping  # Should return PONG
```

## Start API
```bash
cd /home/user/imobi/services/api

export DATABASE_URL="postgresql://imobi_user:imobi_dev_password@localhost:5432/imobi"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV=development
export PORT=4000
export SWAGGER_ENABLED=false

# Production build (faster startup)
node dist/main.js &

# OR Development with watch mode (slower startup)
pnpm dev

# Verify: curl http://localhost:4000/api/v1/health | jq
```

## Test User Credentials
```
Admin:      admin@imobi.com.br / Admin@123
Gestor:     gestor@imobi.com.br / Gestor@123
Engineer:   eng@imobi.com.br / Eng@123
Sales:      comercial@imobi.com.br / Comercial@123
Borrower:   tomador@imobi.com.br / Tomador@123
```

## Common Tasks

### Run Unit Tests
```bash
cd /home/user/imobi
pnpm test
```

### Run E2E Tests
```bash
cd /home/user/imobi
pnpm test:e2e
```

### View Database with Prisma Studio
```bash
cd /home/user/imobi/services/api
export DATABASE_URL="postgresql://imobi_user:imobi_dev_password@localhost:5432/imobi"
pnpm prisma studio
# Opens: http://localhost:5555
```

### Seed New Test Data
```bash
cd /home/user/imobi/services/api
pnpm seed:dev
```

### Reset Database (⚠️ Destructive)
```bash
cd /home/user/imobi/services/api
# Drop schema and recreate
psql -U imobi_user -h localhost -d imobi -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; CREATE EXTENSION postgis;"
# Reapply schema
npx prisma db push --skip-generate
# Re-seed
pnpm seed:dev
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 4000
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### Database Connection Error
```bash
# Test connection
psql -U imobi_user -h localhost -d imobi -c "SELECT 1;"

# If fails, check PostgreSQL is running
ps aux | grep postgres | grep -v grep

# If not running, start it
export PGDATA="/tmp/imobi_postgres"
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -l /tmp/postgres.log start
```

### Redis Connection Error
```bash
# Test connection
redis-cli ping

# If fails, start it
sudo redis-server --daemonize yes --port 6379 --logfile /tmp/redis.log
```

### API Won't Start (Fastify Error)
```bash
# Check if @fastify/static still exists
ls /home/user/imobi/node_modules/@fastify/static 2>&1

# If it exists, remove it
rm -rf /home/user/imobi/node_modules/@fastify/static

# Rebuild and restart
cd /home/user/imobi/services/api
pnpm build
node dist/main.js
```

## Development URLs

| Service | URL | Purpose |
|---------|-----|---------|
| API Health | http://localhost:4000/api/v1/health | System status |
| Auth Login | http://localhost:4000/api/v1/auth/login | Authentication |
| Prisma Studio | http://localhost:5555 | Database GUI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache/Queues |

## Logs Location

- PostgreSQL: `/tmp/postgres.log`
- Redis: `/tmp/redis.log`  
- API: `/tmp/api_clean.log` (or wherever you redirect `node dist/main.js`)

## Key Files

- API Config: `/home/user/imobi/services/api/.env.local`
- Database Schema: `/home/user/imobi/services/api/prisma/schema.prisma`
- Seed Data: `/home/user/imobi/services/api/src/seeds/`
- Main API: `/home/user/imobi/services/api/src/main.ts`

---

**Last Updated**: June 23, 2026  
**Status**: ✅ All services running  
**Ready for**: Development, E2E testing, API integration
