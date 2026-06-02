# Render Configuration Reference — imobi Web Frontend

This document serves as a configuration reference for the Render deployment of the imobi web application.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          RENDER PLATFORM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         Web Service (Next.js 14)                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  https://imbobi-staging.onrender.com                │  │  │
│  │  │                                                      │  │  │
│  │  │  • Landing Page (/cadastro)                         │  │  │
│  │  │  • Authentication Pages (/login)                    │  │  │
│  │  │  • Dashboard (/dashboard)                           │  │  │
│  │  │  • Shared Components & Styling                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  Build from: apps/web (monorepo root: imobi)              │  │
│  │  Branch: claude/happy-goldberg-AFQPj                      │  │
│  │  Instance: Starter ($7/month) — us-east-1                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                               ▼                                    │
│                    OUTBOUND CONNECTIONS                           │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  API Service (External — Deployed Elsewhere)              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  https://api.staging.imbobi.com/api/v1               │  │  │
│  │  │                                                      │  │  │
│  │  │  • NestJS + Fastify                                  │  │  │
│  │  │  • PostgreSQL + PostGIS                              │  │  │
│  │  │  • Redis + BullMQ                                    │  │  │
│  │  │  • AWS S3 (evidence photos)                          │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└─────────────────────────────────────────────────────────────────────┘

KEY POINTS:
• Web frontend deployed to Render
• API deployed separately (not in this Render service)
• Web communicates to API via HTTPS
• Environment variable NEXT_PUBLIC_API_URL points to API
```

---

## Complete Configuration Checklist

### 1. Repository & Branch Setup

```yaml
Repository:
  URL: https://github.com/contatovinicaetano93-commits/imobi
  Type: Monorepo (Turborepo + pnpm workspaces)
  Branch: claude/happy-goldberg-AFQPj
  Root Directory: apps/web
  Auto-deploy: Enabled (on GitHub push)
```

### 2. Build Configuration

```yaml
Build Command: pnpm install && pnpm build

Explanation:
  - pnpm install: Installs all workspace dependencies
  - pnpm build: Builds entire monorepo including:
    * @imbobi/core (utils, hooks, api-client)
    * @imbobi/schemas (Zod validation schemas)
    * @imbobi/ui (React UI components)
    * @imbobi/web (Next.js 14 app — main output)

Build Artifacts:
  - Location: apps/web/.next/
  - Size: ~100-200 MB (typical Next.js build)
  - Time: 2-3 minutes
```

### 3. Start Configuration

```yaml
Start Command: pnpm --filter @imbobi/web start

Alternative:
  cd apps/web && npm start

Explanation:
  - Starts Next.js production server
  - Listens on port 3000 (Render proxies to external HTTPS)
  - Serves pre-built static and dynamic pages
  - Compresses responses automatically
```

### 4. Environment Variables (Full List)

```yaml
Environment Variables in Render Dashboard:

NEXT_PUBLIC_API_URL: "https://api.staging.imbobi.com/api/v1"
├── Purpose: Points web app to API
├── Visibility: PUBLIC (visible in browser)
├── Used: All API calls from client
├── Format: Must include /api/v1 path
└── Critical: If wrong, API calls will fail

NODE_ENV: "staging"
├── Purpose: Indicates non-production environment
├── Visibility: Available at build & runtime
├── Used: Feature flags, error handling
├── Values: "development", "staging", "production"
└── Affects: Logging verbosity, performance optimizations
```

#### Why Only These Variables?

The web frontend does NOT need:
- ❌ Database URL (web doesn't access DB directly)
- ❌ JWT secrets (managed by API)
- ❌ Encryption keys (managed by API)
- ❌ AWS credentials (API handles S3)
- ❌ Redis/cache access (API handles caching)

The web frontend ONLY needs:
- ✅ API endpoint URL
- ✅ Environment indicator

---

## Runtime Configuration

```yaml
Runtime: Node.js
├── Version: Auto-selected by Render
├── Engine Required: >=20.0.0 (from package.json)
├── Package Manager: pnpm 9.0.0+ (from package.json)
└── Image: Render's Node.js buildpack

Region: us-east-1
├── Location: US East (Virginia)
├── Rationale: Matches API database region
├── Latency: Minimal between web and API
└── Note: Change if API is in different region

Instance Type & Pricing:
  Free:
    Cost: $0/month
    CPU: Shared
    Memory: 512 MB
    Caveat: Spins down after 15 min inactivity
    Use Case: Testing only

  Starter:
    Cost: $7/month
    CPU: 0.5 CPU
    Memory: 512 MB
    Uptime: 99.5% SLA
    Use Case: Staging environments (RECOMMENDED)

  Standard:
    Cost: $25/month
    CPU: 1 CPU
    Memory: 1 GB
    Uptime: 99.95% SLA
    Use Case: Production with light traffic

  Standard Plus:
    Cost: $50/month
    CPU: 2 CPU
    Memory: 4 GB
    Uptime: 99.99% SLA
    Use Case: Production with medium traffic

RECOMMENDATION FOR STAGING: Starter ($7/month)
```

---

## Deployment Flow

```
┌─────────────────────────────────────────┐
│  1. Push to Branch or Click Deploy      │
│     (claude/happy-goldberg-AFQPj)       │
└─────────────┬───────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  2. Render Notification                 │
│     (GitHub webhook or manual trigger)  │
└─────────────┬───────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  3. Prepare Build                       │
│     • Clone repository                  │
│     • Checkout branch                   │
│     • Prepare Node.js environment       │
└─────────────┬───────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  4. Run Build Command                   │
│     $ pnpm install && pnpm build        │
│     • Installs dependencies (1-2 min)   │
│     • Builds monorepo packages (30s)    │
│     • Builds Next.js app (1-2 min)      │
└─────────────┬───────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  5. Run Start Command                   │
│     $ pnpm --filter @imbobi/web start   │
│     • Next.js starts on :3000           │
│     • Render routes HTTPS traffic       │
│     • Health checks pass                │
└─────────────┬───────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  6. LIVE!                               │
│     https://imbobi-staging.onrender.com │
│     Status: Green (Live)                │
└─────────────────────────────────────────┘

Total Time: 3-5 minutes
```

---

## Health Check & Monitoring

```yaml
Health Checks:
  Endpoint: https://imbobi-staging.onrender.com/
  Method: HTTP GET
  Expected Response: 200 OK (HTML landing page)
  Frequency: Every 10 seconds
  Timeout: 30 seconds
  Restart: Automatic if health check fails 3x

Logs:
  Location: Render Dashboard → Logs tab
  Updated: Real-time
  Includes: Request logs, errors, stdout/stderr
  Retention: 30 days

Metrics:
  Location: Render Dashboard → Metrics tab
  Available: CPU usage, memory, request count, response time
  Retention: 30 days

Alerts:
  Can configure: Email, Slack, webhooks
  Recommended: Downtime alerts, high error rate alerts
  Setup: Render Dashboard → Settings → Alerts
```

---

## File Structure After Deployment

After successful deployment, Render's filesystem includes:

```
/opt/render/project/
├── src/                           # Your cloned repo
│   ├── apps/
│   │   ├── web/                   ← Deployed app
│   │   │   ├── .next/             ← Build output
│   │   │   ├── package.json
│   │   │   ├── next.config.js
│   │   │   ├── app/               ← Pages/routes
│   │   │   ├── public/            ← Static assets
│   │   │   └── ...
│   │   └── mobile/                # Not deployed
│   ├── packages/                  ← Built during `pnpm build`
│   ├── services/                  # Not deployed
│   └── package.json
├── node_modules/                  # Installed by pnpm
├── pnpm-lock.yaml                 # Lockfile
└── ...

Key Directories:
  • /opt/render/project/src/apps/web/.next/ — Build output served by Next.js
  • /opt/render/project/node_modules/ — All dependencies
  • /opt/render/project/src/apps/web/public/ — Static files (images, CSS, etc.)
```

---

## Environment at Runtime

```bash
# Render automatically sets:
NODE_ENV=staging
PORT=3000
HOSTNAME=0.0.0.0

# You set in Render dashboard:
NEXT_PUBLIC_API_URL=https://api.staging.imbobi.com/api/v1

# Available to Next.js:
# All NEXT_PUBLIC_* and standard Node.js environment variables
```

---

## Expected Performance

```yaml
Page Load Time:
  Landing Page: 0.5-2 seconds
  Registration: 1-3 seconds
  Login: 1-3 seconds
  Dashboard: 1-2 seconds (includes API call)

Factors Affecting Performance:
  • First request: Slower (container warm-up)
  • Subsequent requests: Faster (warm container)
  • API response time: Included in page load
  • Network latency: Depends on client location

Optimization Tips:
  • API response times should be < 500ms
  • Images should be optimized (Next.js Image component)
  • Large bundles should be code-split (Next.js automatic)
  • CSS is inlined (Tailwind CSS production build)
```

---

## Comparing Start Commands

Three possible start commands, in order of preference:

```bash
# Option 1: Monorepo-aware (RECOMMENDED)
pnpm --filter @imbobi/web start
  Pros: Targets only web app, faster, cleaner
  Cons: Requires pnpm
  Use: If pnpm install succeeds

# Option 2: Direct npm
cd apps/web && npm start
  Pros: Simple, doesn't require pnpm
  Cons: Requires cd, less elegant
  Use: If Option 1 fails

# Option 3: Node direct (NOT RECOMMENDED)
node apps/web/node_modules/.bin/next start
  Pros: Most direct
  Cons: Hard to debug, less maintainable
  Use: Only if others fail
```

**Stick with Option 1** unless you encounter errors.

---

## Accessing Logs

### Real-Time Logs

```
Render Dashboard
  → Select your service
  → Click "Logs" tab
  → Logs stream in real-time
  → Search by keyword
  → Download logs
```

### Log Types

```
Build Logs:
  • Shown during deployment
  • Include: install, build, start output
  • Duration: Until "Service running" appears
  • Retention: 30 days

Runtime Logs:
  • Shown after deployment
  • Include: HTTP requests, errors, custom logs
  • Continuous: While service is running
  • Retention: 30 days
```

---

## Rollback & Revert

If deployment fails or you need to go back:

```yaml
Option 1: Automatic Rollback
  • Render detects failed health checks
  • Previous good deployment restarts
  • Timeline: ~30 seconds

Option 2: Manual Revert
  1. Go to Render Dashboard
  2. Click "Deployments" tab
  3. Find previous successful deployment
  4. Click "Redeploy"
  5. Confirm
  6. Wait for redeployment

Option 3: Revert Git Branch
  1. Push revert commit to branch
  2. Render redeploys automatically (if auto-deploy enabled)
  3. New deployment starts
```

---

## Cost Breakdown

```yaml
Staging Deployment (Monthly):

  Starter Instance: $7.00
    • 0.5 CPU
    • 512 MB RAM
    • 99.5% uptime SLA
    • 100 GB bandwidth included
    • Per-server pricing (not by usage)

  Bandwidth (included in Starter): Up to 100 GB/month
    • Additional bandwidth: $0.10/GB
    • Typical staging: < 10 GB/month

  Additional Services: $0
    • No database (separate service)
    • No Redis cache (separate service)
    • No file storage (S3 external)

Total Estimated Cost (Staging): $7-15/month
  • Includes all hosting and bandwidth
  • No hidden charges
  • Can pause service to stop charges
```

---

## Troubleshooting Quick Reference

```yaml
Build Fails - "pnpm not found":
  Fix: npm install -g pnpm && pnpm install && pnpm build

Build Fails - "Root directory not found":
  Fix: Verify "Root Directory" = apps/web (no slashes)

App Shows 500 Error:
  Check: Environment variable NEXT_PUBLIC_API_URL correct?
  Check: API service running and accessible?
  Check: Logs for error messages

App Won't Start:
  Check: Start command is correct?
  Check: Next.js build succeeded in logs?
  Check: Port 3000 not in use?

API Connection Fails:
  Check: NEXT_PUBLIC_API_URL includes /api/v1 path
  Check: API CORS allows your Render domain
  Check: API service is running
  Check: Network tab in browser dev tools (F12)

Pages Load but Styling Broken:
  Fix: Trigger manual redeploy
  Fix: Hard-refresh browser (Ctrl+Shift+R)
  Fix: Check Tailwind CSS build in logs
```

---

## Post-Deployment Checklist

After deployment goes live:

```
IMMEDIATE (First 5 minutes)
  ☐ Service status shows "Live" (green)
  ☐ Landing page loads in browser
  ☐ No JavaScript errors (F12 → Console)

FIRST HOUR
  ☐ Test /cadastro page (registration)
  ☐ Test /dashboard redirect to /login
  ☐ Verify API requests in Network tab (status 200)
  ☐ Check Render logs for errors
  ☐ Monitor CPU/Memory in Metrics tab

FIRST DAY
  ☐ Share URL with team for testing
  ☐ Monitor logs for trends
  ☐ Check for performance issues
  ☐ Verify mobile responsive design
  ☐ Test on different browsers

ONGOING
  ☐ Check Logs weekly for errors
  ☐ Monitor Metrics for capacity issues
  ☐ Set up Slack/email alerts
  ☐ Document any issues and resolutions
```

---

## Reference Information

```yaml
Git Repository:
  URL: https://github.com/contatovinicaetano93-commits/imobi
  Branch: claude/happy-goldberg-AFQPj
  Root: Monorepo using Turborepo + pnpm

Deployed Application:
  Framework: Next.js 14 (App Router)
  Location: apps/web/
  Dependencies: @imbobi/core, @imbobi/schemas, @imbobi/ui
  Port: 3000 (internal, exposed via HTTPS)

API Integration:
  Staging: https://api.staging.imbobi.com/api/v1
  Production: https://api.imbobi.com.br/api/v1
  Environment Var: NEXT_PUBLIC_API_URL

Node.js Version:
  Minimum: 20.0.0
  Recommended: 20.x LTS
  Auto-selected: By Render buildpack

Package Manager:
  pnpm: 9.0.0+
  Workspaces: apps/*, packages/*, services/*
```

---

**This reference document is kept for:**
- Configuration recall
- Troubleshooting
- Onboarding new team members
- Deployment consistency

**Last Updated**: June 2, 2026  
**Version**: 1.0  
**Environment**: Staging (Render)
