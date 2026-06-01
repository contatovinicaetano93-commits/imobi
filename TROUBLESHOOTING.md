# Troubleshooting Guide — imobi Development

This guide helps resolve common issues during development and testing.

---

## 🔧 Setup & Installation

### Issue: `pnpm install` fails with permission errors

**Cause:** pnpm directories don't have correct permissions  
**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Issue: "No such file or directory" for Node modules

**Cause:** Monorepo structure issue or incomplete install  
**Solution:**
```bash
# Ensure all workspace packages are linked
pnpm install --recursive

# Verify package resolution
pnpm list @imbobi/schemas
```

---

## 🗄️ Database Issues

### Issue: PostgreSQL connection failed

**Cause:** Database server not running or wrong credentials  
**Solution:**
```bash
# Check if PostgreSQL is running
psql -U postgres -d postgres -c "SELECT 1"

# If not running, start it:
# Linux/Mac with Homebrew:
brew services start postgresql

# Docker:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:14
```

### Issue: "Database does not exist" error

**Cause:** Database not created before running migrations  
**Solution:**
```bash
# Create database manually
psql -U postgres -c "CREATE DATABASE imobi_dev"

# Or use setup script
./setup-dev-env.sh
```

### Issue: Migration fails with "permission denied" on table creation

**Cause:** User doesn't have CREATE TABLE permission  
**Solution:**
```bash
# Grant superuser privileges (development only)
psql -U postgres -c "ALTER USER your_user CREATEDB SUPERUSER"

# Then retry migration
pnpm db:migrate:dev
```

### Issue: Prisma client out of sync with schema

**Cause:** Schema changed but Prisma client wasn't regenerated  
**Solution:**
```bash
# Regenerate Prisma client
pnpm db:generate

# If that fails, clear cache first
rm -rf node_modules/.prisma
pnpm db:generate
```

---

## ⚡ Redis Issues

### Issue: Redis connection failed (ECONNREFUSED)

**Cause:** Redis server not running  
**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start it:
# Linux/Mac with Homebrew:
brew services start redis

# Docker:
docker run -d -p 6379:6379 redis:7

# In-memory fallback for development:
# Redis is optional for local development
# Remove REDIS_HOST from .env to use in-memory cache
```

### Issue: "UnhandledPromiseRejectionWarning: Connect ECONNREFUSED"

**Cause:** API started without Redis running  
**Solution:**
```bash
# Option 1: Start Redis
redis-cli ping

# Option 2: Remove Redis requirement for development
# Edit .env: Comment out REDIS_HOST and REDIS_PORT
# The app will use in-memory cache instead
```

---

## 🚀 API Build & Runtime

### Issue: "Cannot find module '@imbobi/schemas'" during build

**Cause:** Package references not resolved in monorepo  
**Solution:**
```bash
# Ensure packages are properly linked
pnpm install

# Clear TypeScript cache
find . -name "tsconfig.tsbuildinfo" -delete
rm -rf .turbo

# Rebuild
pnpm build
```

### Issue: "Property 'analyticsEvent' does not exist on type 'PrismaService'"

**Cause:** Prisma client not regenerated after schema changes  
**Solution:**
```bash
# Regenerate Prisma client
pnpm db:generate

# Clear build cache and rebuild
rm -rf dist
pnpm build
```

### Issue: "Nest can't resolve dependencies" error at runtime

**Cause:** Service not registered in module providers  
**Solution:**
1. Check the service is imported in the module
2. Add it to `providers` array (not `services`)
3. Ensure the service is exported if used in other modules

Example:
```typescript
@Module({
  imports: [PrismaModule],
  providers: [AnalyticsService],  // ✓ Correct
  exports: [AnalyticsService],
})
```

---

## 🌐 Web App Issues

### Issue: "Port 3000 already in use" when starting Next.js dev server

**Cause:** Another process is using port 3000  
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or start on different port
cd apps/web
npm run dev -- -p 3001
```

### Issue: Page shows 404 even though route exists

**Cause:** Next.js cache issue or file not recognized  
**Solution:**
```bash
# Clear Next.js cache
rm -rf apps/web/.next

# Restart dev server
cd apps/web
pnpm dev
```

### Issue: "ReferenceError: window is not defined"

**Cause:** Client-side code executing on server during build  
**Solution:**
```typescript
// Use dynamic imports with no SSR
import dynamic from 'next/dynamic'

const Component = dynamic(
  () => import('../components/ClientComponent'),
  { ssr: false }
)
```

---

## ✅ Testing Issues

### Issue: Integration tests timeout

**Cause:** Database not responding or migrations not complete  
**Solution:**
```bash
# Verify database is running and migrations are complete
psql -U postgres -d imobi_dev -c "SELECT * FROM \"Usuario\" LIMIT 1"

# If database is empty, run migrations
pnpm db:migrate:dev

# Run tests with longer timeout
pnpm test:e2e -- --testTimeout 30000
```

### Issue: "relation 'Usuario' does not exist" in tests

**Cause:** Test database not initialized with schema  
**Solution:**
```bash
# Ensure test database matches development database
pnpm db:migrate:dev

# Drop and recreate if needed
psql -U postgres -d imobi_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm db:migrate:dev
```

### Issue: Supertest request errors in integration tests

**Cause:** API server not started or port conflict  
**Solution:**
```bash
# Kill any existing processes on port 4000
lsof -i :4000
kill -9 <PID>

# Ensure app boots successfully
pnpm --filter @imbobi/api start:prod

# Then run tests
pnpm test:e2e
```

---

## 🔐 Security & Authentication

### Issue: "JWT malformed" error during authentication

**Cause:** JWT_SECRET changed or token from different secret  
**Solution:**
```bash
# Verify JWT_SECRET in .env
grep JWT_SECRET .env

# Should be 64+ characters
# If incorrect, update it:
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Update .env and restart API
```

### Issue: Refresh token not working

**Cause:** Token storage or cookie issues  
**Solution:**
```bash
# Check if HttpOnly cookies are being set
curl -i http://localhost:4000/api/v1/auth/login

# Should see Set-Cookie header with refreshToken

# Verify CORS allows credentials
# In .env: CORS_ORIGIN should be exact match (no trailing slash)
```

---

## 📊 Performance Issues

### Issue: API response is slow (>1 second)

**Cause:** Database queries not optimized or cache not working  
**Solution:**
```bash
# Enable debug logging
LOG_LEVEL=debug pnpm dev

# Check Redis is running
redis-cli ping

# Check database indices exist
psql -U postgres -d imobi_dev -c "\di"

# Review query count with cache manager
```

### Issue: Memory usage growing rapidly

**Cause:** Cache memory leaks or missing cleanup  
**Solution:**
```bash
# Check Redis memory
redis-cli INFO memory

# Clear cache if needed
redis-cli FLUSHDB

# Check for unhandled promises
grep -r "\.catch" src/ | grep -v "// catch"
```

---

## 🔍 TypeScript & Type Checking

### Issue: "Type 'any' is not assignable to type 'never'"

**Cause:** Type inference too strict or missing type definition  
**Solution:**
1. Add explicit type annotation
2. Use type assertion if type is correct: `as SomeType`
3. Update interface definition if needed

### Issue: "Property does not exist" on Object

**Cause:** Object type doesn't match expected interface  
**Solution:**
```bash
# Run type checking to see all issues
pnpm type-check

# Check type definition in node_modules/@types/
```

---

## 🐛 Common Error Messages & Quick Fixes

| Error | Quick Fix |
|-------|-----------|
| `ENOENT: no such file or directory` | Run `pnpm install` |
| `ECONNREFUSED` (PostgreSQL) | Start PostgreSQL |
| `ECONNREFUSED` (Redis) | Start Redis or comment out `REDIS_HOST` |
| `Cannot find module` | Run `pnpm install` and `pnpm db:generate` |
| `Port already in use` | Kill process: `lsof -i :PORT` then `kill -9 PID` |
| `Permission denied` | Check file permissions: `chmod +x script.sh` |
| `EPERM: operation not permitted` | Run with correct permissions or use `sudo` |

---

## 🆘 Still Stuck?

### Debug Checklist

1. **Verify environment:**
   ```bash
   node --version  # Should be 22+
   pnpm --version  # Should be 9.0.0+
   psql --version  # Should be 14+
   redis-cli --version  # Should be 7+
   ```

2. **Check all services running:**
   ```bash
   psql -U postgres -c "SELECT 1"      # PostgreSQL
   redis-cli ping                      # Redis
   pnpm --filter @imbobi/api start:prod # API
   ```

3. **Verify .env file:**
   ```bash
   grep -E "DATABASE_URL|REDIS|JWT_SECRET" .env
   ```

4. **Clear caches and rebuild:**
   ```bash
   rm -rf node_modules dist .turbo
   pnpm install
   pnpm build
   ```

5. **Check logs for details:**
   ```bash
   LOG_LEVEL=debug pnpm dev 2>&1 | tee debug.log
   ```

### Need More Help?

- Check `DEVELOPMENT_STATUS.md` for current project status
- Review `IMPLEMENTATION_GUIDE.md` for architecture details
- See `SECURITY_SUMMARY.md` for security implementation
- Run `./security-audit.sh` to verify system integrity

---

**Last Updated:** 2026-05-29  
**Version:** 1.0  
**Status:** Ready for use
