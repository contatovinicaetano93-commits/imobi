# Monitoring Quick Start Guide

**Duration**: 30-60 minutes for full setup  
**Complexity**: Medium (API code changes + service configuration)  
**Responsible**: contato.vinicaetano93@gmail.com

---

## Executive Summary

This checklist covers the fastest path to production monitoring. Complete all items in order.

---

## Phase 1: Immediate (Free & Built-in) — 10 minutes

### Task 1.1: Enable Vercel Web Analytics

**Time**: 2 minutes

1. Go to https://vercel.com/dashboard/alagami-site/analytics
2. **Status**: Check if "Analytics" tab appears
   - If YES → Already enabled ✓
   - If NO → Plan may not support it; upgrade if needed
3. **Access**: View at https://vercel.com/dashboard/alagami-site/analytics
4. **Metrics tracked automatically**:
   - Core Web Vitals (LCP, FID, CLS)
   - Page load times
   - Traffic patterns

**✓ DONE**: Web performance visibility enabled

---

### Task 1.2: Configure Render Service Alerts

**Time**: 5 minutes

1. Go to https://dashboard.render.com/
2. Select service: **alagami-api-staging** (or production service)
3. Click **Settings** tab
4. Scroll to **Notifications**
5. Add notifications for:
   - ☐ Deployment failed
   - ☐ Service crashed
   - ☐ Memory > 90%
   - ☐ CPU > 80%
6. Email address: `contato.vinicaetano93@gmail.com`
7. Click **Save**
8. Repeat for **alagami-postgres** database

**✓ DONE**: Infrastructure alerts active

---

### Task 1.3: Verify Render Logs Access

**Time**: 3 minutes

1. Go to https://dashboard.render.com/
2. Select: **alagami-api-staging**
3. Click **Logs** tab
4. Verify you see real-time logs
5. Test: Search for keyword "error"
6. Note: Last 30 days of logs available

**✓ DONE**: Real-time log visibility enabled

---

## Phase 2: Error Tracking (Sentry) — 20 minutes

### Task 2.1: Create Sentry Account

**Time**: 2 minutes

1. Go to https://sentry.io/signup/
2. Sign up with: `contato.vinicaetano93@gmail.com`
3. Organization name: `imbobi`
4. Accept terms and verify email
5. You'll be redirected to dashboard

---

### Task 2.2: Create Sentry Project for Web App

**Time**: 3 minutes

1. In Sentry dashboard, click **Create Project**
2. Select platform: **Next.js**
3. Project name: `imbobi-web`
4. Team: (default)
5. Click **Create Project**
6. **Important**: Copy the **DSN** (looks like `https://xxx@yyy.ingest.sentry.io/123`)
7. Copy to a text file for next step

---

### Task 2.3: Create Sentry Project for API

**Time**: 3 minutes

1. Click **Create Project** again
2. Select platform: **Node.js**
3. Project name: `imbobi-api`
4. Team: (default)
5. Click **Create Project**
6. Copy the **DSN**
7. Save both DSNs together

---

### Task 2.4: Add Sentry DSN to Vercel (Web)

**Time**: 3 minutes

1. Go to https://vercel.com/dashboard/alagami-site/settings/environment-variables
2. Click **Add New** variable
3. **Name**: `NEXT_PUBLIC_SENTRY_DSN`
4. **Value**: (paste DSN from Task 2.2)
5. **Environments**: Select all (Preview, Production, Development)
6. Click **Save**

**Note**: This step is optional for now. Error tracking will work after code changes are deployed (see Phase 3).

---

### Task 2.5: Add Sentry DSN to Render (API)

**Time**: 3 minutes

1. Go to https://dashboard.render.com/services/[YOUR_API_SERVICE_ID]
2. Click **Settings** tab
3. Scroll to **Environment** section
4. Click **Add Environment Variable**
5. **Name**: `SENTRY_DSN`
6. **Value**: (paste DSN from Task 2.3)
7. Click **Save**
8. **Important**: Service will auto-redeploy

---

### Task 2.6: Verify Sentry Dashboard

**Time**: 2 minutes

1. Go to https://sentry.io/organizations/imbobi/
2. Click **Projects**
3. Verify both appear:
   - `imbobi-web`
   - `imbobi-api`
4. Click each to see dashboard (will be empty until errors occur)

**✓ DONE**: Error tracking infrastructure ready (waiting for code deployment)

---

## Phase 3: Code Changes (Optional but Recommended) — 20 minutes

**Note**: These changes enable automatic error tracking. Can be deferred if monitoring is urgent.

### Task 3.1: Install Sentry in Web App

```bash
cd /home/user/alagami-site/apps/web
pnpm add @sentry/nextjs
```

**Time**: 2 minutes (mostly network)

---

### Task 3.2: Update next.config.js for Sentry

**Time**: 5 minutes

Edit `/home/user/alagami-site/apps/web/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  transpilePackages: ["@imbobi/core", "@imbobi/schemas", "@imbobi/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: "imbobi",
  project: "imbobi-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
});
```

---

### Task 3.3: Install Sentry in API

```bash
cd /home/user/alagami-site/services/api
pnpm add @sentry/node @sentry/tracing
```

**Time**: 2 minutes

---

### Task 3.4: Update API main.ts for Sentry

**Time**: 5 minutes

Edit `/home/user/alagami-site/services/api/src/main.ts`:

```typescript
import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  // Initialize Sentry for error tracking
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
      ],
    });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  // ThrottlerGuard is registered via AppModule providers
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: process.env["CORS_ORIGIN"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env["PORT"] ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`imbobi API running on port ${port}`);
}

void bootstrap();
```

---

### Task 3.5: Deploy Changes

**Time**: 5 minutes per service

**Vercel (Web)**:
```bash
git add apps/web/
git commit -m "feat: add Sentry error tracking to web app"
git push origin main
# Wait for Vercel to auto-deploy (watch at https://vercel.com/dashboard/alagami-site/deployments)
```

**Render (API)**:
```bash
git add services/api/
git commit -m "feat: add Sentry error tracking to API"
git push origin main
# Wait for Render to auto-deploy (watch at https://dashboard.render.com/)
```

---

### Task 3.6: Test Error Tracking

**Time**: 3 minutes

Once deployed, trigger a test error:

**Web Test**:
1. Open https://imbobi.com.br/test-error (if route exists)
2. Or add this to a React component:
   ```typescript
   <button onClick={() => { throw new Error("Test error") }}>Test</button>
   ```
3. Go to https://sentry.io/organizations/imbobi/projects/imbobi-web/
4. Verify error appears within 30 seconds

**API Test** (run from terminal):
```bash
curl -X GET https://api.imbobi.com.br/api/v1/test-error
```

Then check: https://sentry.io/organizations/imbobi/projects/imbobi-api/

**✓ DONE**: Error tracking fully operational

---

## Phase 4: Advanced APM (Optional, Recommended for Production) — 15 minutes

### Task 4.1: Choose APM Tool

Pick ONE:

**Option A: DataDog** (Recommended)
- **Pros**: Comprehensive, excellent UI, best for startups
- **Cons**: Paid after free tier
- **Cost**: ~$100/month for small team

**Option B: New Relic** (Enterprise)
- **Pros**: Powerful, great support
- **Cons**: More expensive
- **Cost**: ~$300/month

**Option C: Grafana** (Open-source)
- **Pros**: Self-hosted, free
- **Cons**: Requires maintenance

**Recommendation**: Start with Sentry (free) + Vercel Analytics (built-in). Add DataDog when budget allows.

---

### Task 4.2: Sign Up for DataDog (if chosen)

**Time**: 5 minutes

1. Go to https://www.datadoghq.com/
2. Click **Free Trial** (no credit card needed)
3. Sign up with: `contato.vinicaetano93@gmail.com`
4. Create organization: `imbobi`
5. You'll get a **Free 14-day trial** with full access
6. Copy **API Key** from dashboard

---

### Task 4.3: Add DataDog to API (optional)

```bash
cd /home/user/alagami-site/services/api
pnpm add dd-trace
```

Then add to environment in Render:
- `DD_SERVICE=imbobi-api`
- `DD_ENV=production`
- `DD_API_KEY=[from-datadog]`

**Time**: 10 minutes including deployment

---

## Phase 5: Create Dashboard Bookmarks

**Time**: 2 minutes

Save these URLs for quick access:

### Daily Check URLs
```
Vercel Status: https://www.vercel-status.com/
API Logs: https://dashboard.render.com/services/[ID]/logs
Sentry Issues: https://sentry.io/organizations/imbobi/issues/
```

### Monitoring Dashboard URLs
```
Vercel Analytics: https://vercel.com/dashboard/alagami-site/analytics
Render Service: https://dashboard.render.com/services/[API_SERVICE_ID]
Sentry Web: https://sentry.io/organizations/imbobi/projects/imbobi-web/
Sentry API: https://sentry.io/organizations/imbobi/projects/imbobi-api/
```

Create a browser bookmark folder: `Production Monitoring`

---

## Completion Checklist

### Phase 1: Free & Built-in
- [ ] Vercel Web Analytics enabled
- [ ] Render service alerts configured
- [ ] Render logs verified accessible

### Phase 2: Error Tracking
- [ ] Sentry account created
- [ ] Sentry project for web created + DSN noted
- [ ] Sentry project for API created + DSN noted
- [ ] Sentry DSN added to Vercel environment
- [ ] Sentry DSN added to Render environment

### Phase 3: Code Changes (Optional)
- [ ] Sentry installed in web app
- [ ] next.config.js updated
- [ ] Sentry installed in API
- [ ] API main.ts updated
- [ ] Changes deployed to Vercel
- [ ] Changes deployed to Render
- [ ] Error tracking tested and verified

### Phase 4: Advanced APM (Optional)
- [ ] APM tool selected (or deferred)
- [ ] Account created (if proceeding)
- [ ] Credentials added to services (if proceeding)

### Phase 5: Dashboard Setup
- [ ] Monitoring URLs bookmarked
- [ ] Daily check routine defined

---

## Monitoring Access Points (After Setup)

| Check | URL | Frequency | Owner |
|-------|-----|-----------|-------|
| **Deployment Status** | https://vercel.com/dashboard/alagami-site/deployments | After push | DevOps |
| **Web Performance** | https://vercel.com/dashboard/alagami-site/analytics | Daily |  |
| **API Logs** | https://dashboard.render.com/services/[ID]/logs | Real-time |  |
| **Error Issues** | https://sentry.io/organizations/imbobi/issues/ | As alerts come | On-call |
| **API Service Health** | https://dashboard.render.com/services/[ID] | Daily |  |
| **Database Status** | https://dashboard.render.com/services/[DB_ID] | Daily |  |

---

## Support & Troubleshooting

### "I don't see monitoring data yet"

**Web Analytics (Vercel)**:
- Wait 24 hours for first data collection
- Verify plan supports Analytics (Pro or higher)
- Check for HTTP traffic (HTTPS with real users, not localhost)

**Sentry**:
- Verify environment variable is set
- Check for CORS issues in browser console
- Test manually: `fetch('https://api.imbobi.com.br/api/v1/health')`

**Render Logs**:
- Service must be running (green status)
- Logs appear in real-time; refresh page for latest
- Older logs available in archive (30-day retention)

### "Alerts not arriving"

1. Verify email in notification settings
2. Check spam folder
3. Verify alert rules are enabled
4. Test with manual trigger (if available)

### "APM tool not showing data"

1. Verify agent installed and initialized
2. Check environment variable set correctly
3. Restart service
4. Wait 5 minutes for first data to appear
5. Check firewall/network rules

---

## Next Steps

1. **Immediate**: Complete Phase 1 & 2 (20 minutes)
2. **This Week**: Complete Phase 3 & 5 (deploy code changes)
3. **This Month**: Complete Phase 4 (comprehensive APM)

---

**Quick Links**:
- Full docs: [MONITORING_SETUP.md](./MONITORING_SETUP.md)
- Performance baseline: [PERFORMANCE.md](./PERFORMANCE.md)
- Deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

**Questions?** Email: contato.vinicaetano93@gmail.com

---

**Last Updated**: 2026-05-28  
**Estimated Total Time**: 60-90 minutes for complete setup  
**Effort Level**: Medium (mostly configuration, some code changes)
