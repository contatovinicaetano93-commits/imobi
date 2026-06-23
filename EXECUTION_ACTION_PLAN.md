# 🎬 EXECUTION PLAN - START HERE

**Status**: 🟢 **ALL SYSTEMS GO**

---

## 🎯 FOR CURSOR: Frontend Implementation (Start NOW)

### IMMEDIATE (Next 30 minutes)

**Setup Local Environment**:
```bash
cd /home/user/imobi
pnpm install
cd apps/web
pnpm dev
# Should see "Ready in 1.2s" at http://localhost:3001
```

**Verify Backend Running** (in another terminal):
```bash
cd services/api
pnpm dev
# Should see "Listening on 0.0.0.0:3000"

# Test it works:
curl http://localhost:3000/health
```

### NEXT (Next 2 hours) - PRIORITY 1

**Create `hooks/useAuth.ts`**:
```typescript
// Location: apps/web/hooks/useAuth.ts

import { useState, useEffect } from 'react';

// Get JWT from localStorage
// Decode JWT to get user info
// Check if expired (exp < now)
// If expired, call refresh endpoint
// Provide logout function

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Decode and validate
      const decoded = decodeJwt(token);
      if (decoded && !isExpired(decoded.exp)) {
        setUser(decoded);
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
  }, []);

  return { user, loading, isAuthenticated, logout: () => { /* ... */ } };
}
```

**Create `middleware.ts`** (root level):
```typescript
// Location: apps/web/middleware.ts

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  // Public paths (no auth required)
  const publicPaths = ['/login', '/cadastro', '/simulador', '/api/health'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protected paths (auth required)
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

**Create `hooks/useToast.ts`**:
```typescript
// Location: apps/web/hooks/useToast.ts

import { useContext } from 'react';
import { ToastContext } from '@/components/ToastProvider';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Usage in forms:
// const toast = useToast();
// try {
//   await loginWithRetry(data);
//   toast.success('Login successful!');
// } catch (e) {
//   toast.error(e.message);
// }
```

### AFTER (Next 3-4 hours) - PRIORITY 2

1. **Add Toast Provider** (`components/ToastProvider.tsx`)
2. **Add Skeleton Loaders** (`components/ui/Skeleton.tsx`)
3. **Enforce Role-Based Access** on dashboard pages
4. **Test Full Auth Cycle** (login → dashboard → logout)

### SUCCESS CRITERIA (By Day 1, 4 PM)

- [ ] Can register new user
- [ ] Can login with registered credentials
- [ ] Can navigate to `/dashboard` (should redirect to role-specific page)
- [ ] Session persists on page reload
- [ ] Logout works
- [ ] No console errors
- [ ] API calls work with JWT token

---

## 🎯 FOR DEVOPS/CLAUDE: Deployment Setup (Start NOW)

### IMMEDIATE (Next 30 minutes)

**Verify Local Setup Works**:
```bash
cd /home/user/imobi

# Check all code compiles
bash scripts/pre-deploy-check.sh
# Should show green checkmarks

# Run integration tests
pnpm test --testPathPattern=integration.test
# Should pass all tests
```

### NEXT (Next 1-2 hours) - PRIORITY 1

**Create Railway Project**:
1. Go to https://railway.app
2. Sign up / Login
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Authorize GitHub & select: `contatovinicaetano93-commits/imobi`
6. Select branch: `main`
7. Click Deploy

**Add PostgreSQL Database**:
1. In Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Wait for initialization (2-3 minutes)
4. Copy DATABASE_URL from Variables tab
5. Store it temporarily: `export RAILWAY_DB_URL="postgres://..."`

**Add Redis Cache**:
1. Click "New" → "Cache" → "Redis"
2. Wait for initialization
3. Copy REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
4. Store temporarily

### AFTER (Next 1-2 hours) - PRIORITY 2

**Configure Environment Variables** (in Railway project):
```env
# From .env.example, fill in:
NODE_ENV=production
PORT=3000
DATABASE_URL=<from PostgreSQL above>
REDIS_HOST=<from Redis>
REDIS_PORT=<from Redis>
REDIS_PASSWORD=<from Redis>
JWT_SECRET=<generate: openssl rand -base64 32>
ENCRYPTION_KEY=<generate: openssl rand -base64 32>
SENTRY_DSN=<create Sentry project first>
# ... rest from .env.example
```

**Deploy API Service**:
1. In Railway, create new Service
2. Select GitHub repo: `contatovinicaetano93-commits/imobi`
3. Configure:
   - Root Directory: `services/api`
   - Build: `pnpm install && pnpm build --filter @imbobi/api`
   - Start: `node dist/main.js`
4. Click Deploy

**Run Database Migrations**:
1. In Railway shell (service → shell button):
   ```bash
   cd services/api
   npx prisma migrate deploy
   ```

### SUCCESS CRITERIA (By Day 1, 4 PM)

- [ ] Railway project created
- [ ] PostgreSQL database connected
- [ ] Redis cache connected
- [ ] Environment variables configured
- [ ] API deployed
- [ ] Health check: `curl https://api.railway.app/health` returns 200 OK
- [ ] Can call public simulator: `curl -X POST https://api.railway.app/api/v1/public/simulador ...`

---

## 📊 SYNC CHECKPOINT (Day 1, 4 PM UTC)

Both teams report status:

### Frontend Status Report
- [ ] useAuth hook created & working
- [ ] middleware.ts protecting routes
- [ ] useToast hook created
- [ ] Can register & login locally
- [ ] Session persists across reloads
- [ ] No TypeScript errors

### DevOps Status Report
- [ ] Railway project operational
- [ ] API deployed (health check 200 OK)
- [ ] Database migrations applied
- [ ] Integration tests passing
- [ ] Can call API from Railway URL
- [ ] Monitoring configured (Sentry DSN set)

### If Either Team is Blocked
- Post in Slack immediately
- Likely blockers:
  - Frontend: Can't reach API → Check API URL in .env.local
  - DevOps: Build failing → Check build logs in Railway dashboard
  - DevOps: Migrations failing → Check database connection

---

## 📈 NEXT DAY (Day 2)

Once both teams pass the 4 PM sync:

**Frontend** (Cursor):
- Add Toast Provider component
- Add Skeleton loaders
- Test integration with Railway API
- Fix any auth flow issues

**DevOps** (Claude):
- Setup Sentry error tracking
- Configure UptimeRobot monitoring
- Setup GitHub Actions auto-deploy
- Performance tune if needed

**Combined**:
- Full E2E test: Login on prod API
- Monitor for errors in Sentry
- Check latency metrics
- Plan final soft launch

---

## 🚀 LAUNCH CHECKLIST (Day 3)

### Technical Requirements
- [ ] Frontend fully functional (all features working)
- [ ] Backend API responding (< 500ms latency)
- [ ] Database migrations applied
- [ ] Monitoring active (Sentry, UptimeRobot)
- [ ] CI/CD working (GitHub Actions auto-deploys)
- [ ] No critical errors in Sentry
- [ ] Uptime > 99.5%

### Documentation
- [ ] README updated
- [ ] Deployment guide finalized
- [ ] API docs accessible
- [ ] Quick start guide complete
- [ ] Troubleshooting guide updated

### Communication
- [ ] Announce soft launch to stakeholders
- [ ] Provide API endpoint to testers
- [ ] Create feedback collection form
- [ ] Setup support channel (#imobi-support)

---

## 📚 RESOURCES AVAILABLE

**Documentation**:
- `/docs/OPENAPI_SPECIFICATION.md` — All 30+ API endpoints
- `/docs/FRONTEND_STATUS.md` — What's done, what's missing
- `/docs/RAILWAY_DEPLOYMENT.md` — Step-by-step deployment
- `/docs/SOFT_LAUNCH_GUIDE.md` — Monitoring, CI/CD, rollback
- `QUICK_START_LOCAL.md` — Local dev setup
- `/docs/FRONTEND_IMPLEMENTATION.md` — Week-by-week breakdown

**Code Examples**:
- `/app/(auth)/login/LoginFormClient.tsx` — Form patterns
- `/lib/login-with-retry.ts` — API retry logic
- `/services/api/src/app.module.ts` — Backend setup
- `/services/api/test/integration.test.ts` — Test patterns

**Scripts**:
- `bash scripts/pre-deploy-check.sh` — Pre-deployment validation
- `pnpm type-check` — Type safety verification
- `pnpm test` — Run all tests

---

## ⏰ TIMELINE

```
NOW (Hour 0)
  ├─ Frontend: Setup local env, start useAuth
  ├─ DevOps: Create Railway project, add services
  └─ Both: Run integration tests locally

Hour 2-4
  ├─ Frontend: Finish useAuth, middleware, toast
  ├─ DevOps: Deploy API, run migrations
  └─ Checkpoint: Both teams verify their piece works

Day 2 (Hour 24-48)
  ├─ Frontend: Polish, fix errors
  ├─ DevOps: Monitor, tune performance
  └─ Combined: Full integration testing

Day 3 (Hour 48-72)
  ├─ Frontend: Final tests, ready to ship
  ├─ DevOps: Final checks, monitoring active
  └─ LAUNCH: Soft launch announcement
```

---

## 🎯 SUCCESS DEFINITION

### By Day 1, 4 PM
✅ Frontend: Full auth flow working locally  
✅ DevOps: API deployed to production  
✅ Combined: Frontend can call production API

### By Day 2, 4 PM
✅ Frontend: All Week 1 features complete  
✅ DevOps: Monitoring & CI/CD working  
✅ Combined: Zero critical bugs found

### By Day 3, 4 PM
✅ **SOFT LAUNCH READY**: Product in beta  
✅ **User testing starts**: Feedback collection  
✅ **Week 2 planning begins**: Next features

---

## 📞 SUPPORT

**Blocked on something?**
- Check the relevant documentation
- Check Discord/Slack for similar issues
- Post detailed error in #imobi-dev
- Tag the relevant team lead

**Decision needed?**
- Frontend: Ask @cursor
- DevOps: Ask @claude
- Product: Ask @user

---

**Status**: 🟢 **GO**  
**Time**: NOW  
**Target**: Day 3 Soft Launch  
**Confidence**: HIGH

🚀 **LET'S BUILD THIS!**
