# Production Monitoring & Observability Guide

**Last Updated**: 2026-05-28  
**Environment**: Production (Vercel + Render + AWS)

---

## Overview

This guide provides step-by-step instructions for setting up comprehensive monitoring across the imbobi platform, including:
- **Web Frontend**: Vercel Web Analytics, error tracking
- **API Backend**: Application performance monitoring (APM), logging
- **Database**: Query performance, connection pooling
- **Infrastructure**: Uptime monitoring, alerts

---

## Table of Contents

1. [Vercel Web Analytics Setup](#1-vercel-web-analytics-setup)
2. [Sentry Error Tracking (Recommended)](#2-sentry-error-tracking)
3. [Render API Monitoring](#3-render-api-monitoring)
4. [Comprehensive APM Setup (DataDog/New Relic)](#4-comprehensive-apm-setup)
5. [Accessing Dashboards](#5-accessing-dashboards)
6. [Alerts & Notifications](#6-alerts--notifications)
7. [Performance Baselines](#7-performance-baselines)

---

## 1. Vercel Web Analytics Setup

### Enable Web Analytics

**Status**: May need activation depending on Vercel plan

#### Step 1: Check Current Plan
1. Go to https://vercel.com/dashboard
2. Select project: **alagami-site**
3. Navigate to **Settings** → **Usage & Billing**
4. Check if "Web Analytics" is available
   - **Pro Plan**: Included automatically
   - **Free Plan**: Not available (upgrade required)

#### Step 2: Enable Analytics (if on Pro or higher)
1. Go to **Settings** → **Web Analytics**
2. Click **Enable Web Analytics**
3. Confirmation: "Web Analytics enabled for this project"
4. Allow 24 hours for initial data collection

#### Step 3: Access Web Analytics Dashboard
1. From project dashboard, click **Analytics** tab
2. View metrics:
   - **Real User Monitoring (RUM)**: Page load times, Core Web Vitals
   - **Events**: Custom events (if instrumented)
   - **Traffic**: Pageviews, unique visitors
   - **Performance**: LCP, FID, CLS scores

### What Web Analytics Tracks

| Metric | Insight | Target |
|--------|---------|--------|
| **Largest Contentful Paint (LCP)** | Time to render main content | < 2.5s |
| **First Input Delay (FID)** | Response time to user input | < 100ms |
| **Cumulative Layout Shift (CLS)** | Visual stability | < 0.1 |
| **Time to First Byte (TTFB)** | Server response time | < 600ms |
| **Page Load Time** | Total time to interactive | < 3s |

### Accessing Performance Data

**URL**: `https://vercel.com/dashboard/[PROJECT_ID]/analytics`

**Frequency**: Real-time updates, dashboards refresh every 60 seconds

**Historical Data**: Last 90 days available

---

## 2. Sentry Error Tracking

**Recommendation**: Implement Sentry for production error tracking and source map support

### Setup for Next.js (Web App)

#### Step 1: Create Sentry Account
1. Go to https://sentry.io/
2. Sign up with email: `contato.vinicaetano93@gmail.com`
3. Create organization: **imbobi**
4. Create project:
   - **Name**: `imbobi-web`
   - **Platform**: JavaScript/Next.js
   - Copy **DSN** (Data Source Name)

#### Step 2: Install Dependencies
```bash
cd /home/user/alagami-site/apps/web
npm install --save @sentry/nextjs
```

#### Step 3: Configure Sentry

Create `/home/user/alagami-site/apps/web/sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

export const sentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
};
```

Create `/home/user/alagami-site/apps/web/sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

export const sentryConfig = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
};
```

#### Step 4: Update next.config.js

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

#### Step 5: Add Environment Variables to Vercel

1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[project-id]
   SENTRY_DSN=https://[key]:[secret]@[domain].ingest.sentry.io/[project-id]
   SENTRY_AUTH_TOKEN=[auth-token-from-sentry]
   ```

#### Step 6: Test Error Tracking

Add test route in `/home/user/alagami-site/apps/web/app/test-sentry.ts`:
```typescript
"use server";

export async function testSentryError() {
  throw new Error("This is a test error from Sentry");
}
```

After deployment, call this function and verify error appears in Sentry dashboard.

### Setup for NestJS API (Backend)

#### Step 1: Create Sentry API Project
1. Go to https://sentry.io/organizations/imbobi/
2. Click **Projects** → **Create Project**
3. **Name**: `imbobi-api`
4. **Platform**: Node.js
5. Copy **DSN**

#### Step 2: Install Sentry for NestJS
```bash
cd /home/user/alagami-site/services/api
npm install --save @sentry/node @sentry/tracing
```

#### Step 3: Configure Sentry in AppModule

Create `/home/user/alagami-site/services/api/src/common/sentry.middleware.ts`:
```typescript
import * as Sentry from "@sentry/node";
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class SentryMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    Sentry.captureException(new Error(), {
      request: {
        url: req.url,
        method: req.method,
        headers: req.headers,
      },
    });
    next();
  }
}
```

Update `/home/user/alagami-site/services/api/src/main.ts`:
```typescript
import * as Sentry from "@sentry/node";

async function bootstrap() {
  // Initialize Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Postgres({ usePatchAll: true }),
      ],
    });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env["NODE_ENV"] !== "production" })
  );

  // ... rest of bootstrap code
}
```

#### Step 4: Add API Environment Variables to Render

1. Go to Render Dashboard → **alagami-api** service
2. **Settings** → **Environment** → Add:
   ```
   SENTRY_DSN=https://[key]:[secret]@[domain].ingest.sentry.io/[project-id]
   ```

### Accessing Sentry Dashboard

**URL**: https://sentry.io/organizations/imbobi/issues/

**Key Features**:
- Real-time error alerts
- Stack traces with source maps
- Release tracking
- Performance monitoring
- User feedback

---

## 3. Render API Monitoring

### Built-in Render Monitoring

#### View Service Logs

1. Go to https://dashboard.render.com/
2. Select service: **alagami-api**
3. Click **Logs** tab
4. View real-time and historical logs

**Log Features**:
- Filter by log level (ERROR, WARN, INFO, DEBUG)
- Search by keyword
- Export logs for analysis
- 30-day retention

#### Set Up Render Alerts

1. Service page → **Settings** → **Notifications**
2. Add email notification for:
   - **Deployment failures**
   - **Service crashes** (exit code != 0)
   - **Threshold alerts** (CPU > 80%, Memory > 90%)

#### Monitor Service Health

1. Service page → **Metrics** tab (if available)
2. View:
   - CPU usage
   - Memory consumption
   - Network I/O
   - Deployment history

### PostgreSQL Monitoring (Render)

1. Go to Render Dashboard → **alagami-postgres** database
2. Click **Metrics** tab
3. Monitor:
   - Database size
   - Connection count
   - Query performance

#### Enable Slow Query Log

1. Database settings → **Advanced**
2. Add parameter: `log_min_duration_statement = 1000` (log queries > 1000ms)
3. Apply changes

---

## 4. Comprehensive APM Setup

### Option A: DataDog (Recommended for serious monitoring)

#### Step 1: Create DataDog Account
1. Go to https://www.datadoghq.com/
2. Sign up for free tier or paid plan
3. Create organization: **imbobi**

#### Step 2: Install DataDog Agent in API Service

Add to `/home/user/alagami-site/services/api/package.json`:
```json
{
  "dependencies": {
    "dd-trace": "^4.x"
  }
}
```

Create `/home/user/alagami-site/services/api/src/dd-trace.ts`:
```typescript
import tracer from "dd-trace";

tracer.init({
  service: "imbobi-api",
  env: process.env.NODE_ENV,
  logInjection: true,
  profiling: {
    enabled: process.env.NODE_ENV === "production",
  },
});

export default tracer;
```

Update `main.ts`:
```typescript
import "./dd-trace"; // Must be first import
import { NestFactory } from "@nestjs/core";
// ... rest of imports
```

#### Step 3: Add to Render Environment

1. Render Dashboard → **alagami-api** → **Environment**
2. Add:
   ```
   DD_AGENT_HOST=localhost
   DD_AGENT_PORT=8126
   DD_SERVICE=imbobi-api
   DD_ENV=production
   DD_VERSION=1.0.0
   ```

#### Step 4: Access DataDog Dashboard

**URL**: https://app.datadoghq.com/

**Key Dashboards**:
- **APM**: Request latency, error rates, trace analysis
- **Logs**: Centralized logging from API, database
- **Metrics**: CPU, memory, custom application metrics
- **Alerts**: Automatic anomaly detection

---

### Option B: New Relic (Enterprise-grade alternative)

#### Step 1: Create New Relic Account
1. Go to https://newrelic.com/
2. Sign up for free tier
3. Create organization: **imbobi**

#### Step 2: Install New Relic Node.js Agent

```bash
cd /home/user/alagami-site/services/api
npm install --save newrelic
```

Create `/home/user/alagami-site/services/api/newrelic.js`:
```javascript
"use strict";

exports.config = {
  app_name: ["imbobi-api"],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      "request.headers.cookie",
      "request.headers.authorization",
      "request.headers.proxyAuthorization",
      "request.headers.setCookie",
      "request.headers.x-*",
      "response.headers.cookie",
      "response.headers.authorization",
      "response.headers.proxyAuthorization",
      "response.headers.setCookie",
      "response.headers.x-*",
    ],
  },
};

if (process.env.NODE_ENV === "production") {
  exports.config.distributed_tracing = {
    enabled: true,
  };
  exports.config.transaction_tracer = {
    record_sql: "obfuscated",
  };
}
```

Update `main.ts`:
```typescript
require("newrelic"); // Must be first line

import { NestFactory } from "@nestjs/core";
// ... rest of code
```

#### Step 3: Add New Relic License to Render

1. Render Dashboard → **alagami-api** → **Environment**
2. Add: `NEW_RELIC_LICENSE_KEY=[from-new-relic-account]`

#### Step 4: Access New Relic Dashboard

**URL**: https://one.newrelic.com/

**Features**:
- Real User Monitoring (RUM)
- Distributed tracing
- Custom dashboards
- Alerting policies

---

## 5. Accessing Dashboards

### Quick Reference

| Platform | URL | Purpose |
|----------|-----|---------|
| **Vercel Analytics** | https://vercel.com/dashboard/alagami-site/analytics | Web performance metrics |
| **Vercel Logs** | https://vercel.com/dashboard/alagami-site/deployments | Build & deployment logs |
| **Sentry Web** | https://sentry.io/organizations/imbobi/projects/imbobi-web/ | Frontend errors |
| **Sentry API** | https://sentry.io/organizations/imbobi/projects/imbobi-api/ | Backend errors |
| **Render Logs** | https://dashboard.render.com/services/[service-id] | API logs in real-time |
| **Render Metrics** | https://dashboard.render.com/services/[service-id] → Metrics | Resource usage |
| **DataDog** | https://app.datadoghq.com/ | Comprehensive APM |
| **New Relic** | https://one.newrelic.com/ | Enterprise monitoring |

### Monitoring Cadence

**Daily Checks** (5 min):
- Vercel deployment status
- API service health (Render status page)
- Sentry for critical errors

**Weekly Reviews** (30 min):
- Core Web Vitals trends (Vercel Analytics)
- API response time p95 (APM dashboard)
- Error rate and top issues (Sentry)
- Database slow query logs

**Monthly Analysis** (1 hour):
- Performance vs baselines (see Section 7)
- Capacity planning (memory, CPU, DB connections)
- Uptime and SLA compliance
- Cost optimization

---

## 6. Alerts & Notifications

### Vercel Alerts

**Settings → Notifications** (in Vercel Project):

```
Deployment Failed    → Email: contato.vinicaetano93@gmail.com
Build Error         → Slack webhook (if configured)
```

### Sentry Alerts

1. Go to Sentry → **Settings** → **Alert Rules**
2. Create rule:
   - **Condition**: `When events in issue reach 10 in 1 hour`
   - **Action**: `Send email to: contato.vinicaetano93@gmail.com`

3. Create rule:
   - **Condition**: `When an error event is first seen`
   - **Action**: `Send email to: contato.vinicaetano93@gmail.com`

### Render Alerts

**Settings → Notifications**:

```
Deployment Failed   → contato.vinicaetano93@gmail.com
Service Crashed     → contato.vinicaetano93@gmail.com
Memory > 90%       → contato.vinicaetano93@gmail.com
CPU > 80%          → contato.vinicaetano93@gmail.com
```

### DataDog/New Relic Alerts

Example DataDog alert:
```
Trigger: API p95 latency > 500ms for 5 minutes
Action: Send to contato.vinicaetano93@gmail.com and Slack #alerts
```

---

## 7. Performance Baselines

### Web Frontend (from PERFORMANCE.md)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Lighthouse Score | > 80 | 75-82 | ⚠️ Monitor |
| LCP | < 2.5s | ~2.2s | ✓ Good |
| FID | < 100ms | ~45ms | ✓ Good |
| CLS | < 0.1 | ~0.08 | ✓ Good |
| Bundle Size | < 300KB | 350KB | ⚠️ Optimize |

**Monitoring**: Vercel Web Analytics dashboard

### API Backend

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| P50 Latency | < 100ms | ~82ms | ✓ Good |
| P95 Latency | < 250ms | ~215ms | ✓ Good |
| P99 Latency | < 500ms | ~480ms | ✓ Good |
| Error Rate | < 2% | ~1.8% | ✓ Good |
| Memory (Peak) | < 500MB | ~245MB | ✓ Good |

**Monitoring**: APM dashboard (DataDog/New Relic/Sentry)

### Database

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Connection Pool | 20 | 20 | ✓ Good |
| Idle Connections | < 15 | ~8 | ✓ Good |
| Slow Query (p99) | < 100ms | ~35ms (PostGIS) | ✓ Good* |
| Query Timeout | 0% | 0% | ✓ Good |

*PostGIS spatial queries are optimized with indices (see PERFORMANCE.md section 4)

**Monitoring**: Render database metrics + slow query logs

### Cache (Redis)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Hit Ratio | > 80% | 87% | ✓ Excellent |
| Memory Used | < 500MB | ~145MB | ✓ Good |
| Command Latency (p99) | < 10ms | ~3ms | ✓ Good |
| Eviction Rate | < 1% | 0.3% | ✓ Good |

**Monitoring**: Render Redis metrics

---

## 8. Incident Response

### When Monitoring Detects an Issue

**High Severity** (API down, > 50% error rate):
1. Check Sentry for error stack traces
2. Check Render logs for crash indicators
3. Verify database connection in Render dashboard
4. Check API health: `curl https://api.imbobi.com/api/v1/health`
5. Trigger rollback or restart service if needed

**Medium Severity** (Response time > 500ms, memory > 80%):
1. View APM dashboard (DataDog/New Relic)
2. Identify slow queries in database
3. Check for stuck transactions
4. Scale up resources if needed

**Low Severity** (Response time > 250ms, error rate < 1%):
1. Log for analysis in next weekly review
2. Add to performance tracking spreadsheet
3. Plan optimization if trend continues

---

## 9. Maintenance & Updates

### Monthly Tasks

- [ ] Review dashboard data export
- [ ] Verify backup status (Render DB)
- [ ] Update monitoring thresholds if needed
- [ ] Check license/subscription renewals (APM tools)
- [ ] Review and optimize alert rules

### Quarterly Tasks

- [ ] Audit log retention policies
- [ ] Performance trend analysis
- [ ] Cost optimization review
- [ ] Update runbooks and playbooks
- [ ] Team training on incident response

---

## 10. Configuration Summary

### Current Status: May 28, 2026

| Component | Status | Notes |
|-----------|--------|-------|
| Vercel Web Analytics | ⚠️ To Configure | Check plan eligibility |
| Sentry (Web) | ⚠️ To Install | Ready for implementation |
| Sentry (API) | ⚠️ To Install | Ready for implementation |
| Render Logs | ✓ Available | Accessible now |
| Render Alerts | ⚠️ To Configure | Set up email notifications |
| APM (DataDog/New Relic) | ⚠️ To Implement | Recommended for production |

### Next Steps

1. **Week 1**: Enable Vercel Web Analytics + set up Sentry
2. **Week 2**: Configure Render alerts + test error tracking
3. **Week 3**: Implement comprehensive APM (DataDog or New Relic)
4. **Week 4**: Establish monitoring runbooks and incident response procedures

---

## Contact & Support

**Responsible Party**: contato.vinicaetano93@gmail.com

**Documentation References**:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Infrastructure setup
- [PERFORMANCE.md](./PERFORMANCE.md) - Baseline metrics
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - API health endpoints

**External Resources**:
- Vercel Docs: https://vercel.com/docs/analytics
- Sentry Docs: https://docs.sentry.io/
- Render Docs: https://render.com/docs
- DataDog Docs: https://docs.datadoghq.com/
- New Relic Docs: https://docs.newrelic.com/

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-28  
**Next Review**: 2026-06-28 (30 days)
