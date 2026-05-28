# APM Setup Guide: New Relic & DataDog

**Last Updated**: 2026-05-28  
**Scope**: Production monitoring for imbobi API, Web, and Database

---

## Overview

This guide provides detailed setup instructions for Application Performance Monitoring (APM) tools to track real-time metrics across the imbobi platform.

### Supported Platforms

1. **New Relic** (Recommended for simplicity & free tier)
   - Free tier: 100GB/month of data ingestion
   - Best for: Small to mid-size teams
   - Setup time: ~20 minutes

2. **DataDog** (Recommended for advanced analytics)
   - Free tier: 30-day trial
   - Best for: Comprehensive observability (metrics, logs, traces)
   - Setup time: ~30 minutes

---

## Part 1: New Relic APM Setup

### 1.1 Account Creation & License Key

#### Step 1: Create New Relic Account

1. Go to https://newrelic.com/signup
2. Sign up with email: `contato.vinicaetano93@gmail.com`
3. Choose region: **US** (or EU if preferred)
4. Select plan: **Free Tier** (100GB/month included)

#### Step 2: Locate License Key

1. Log in to https://one.newrelic.com/
2. Navigate to: **Account Settings** (user icon) → **Account** → **API keys**
3. Under **License key** section, click **Copy**
4. Store securely (will be added to `.env` files)

**Format**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (40 characters)

---

### 1.2 NestJS API Integration

#### Step 1: Install New Relic Node.js Agent

```bash
cd /home/user/alagami-site/services/api
pnpm add newrelic
```

#### Step 2: Create `newrelic.js` Configuration

Create `/home/user/alagami-site/services/api/newrelic.js`:

```javascript
"use strict";

exports.config = {
  // Application name (appears in New Relic UI)
  app_name: ["imbobi-api"],
  
  // License key from account
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  
  // Logging
  logging: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  },
  
  // Allow all headers for tracing
  allow_all_headers: true,
  
  // Sensitive data exclusion
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
  
  // Production-only settings
  ...(process.env.NODE_ENV === "production" && {
    distributed_tracing: {
      enabled: true,
    },
    transaction_tracer: {
      record_sql: "obfuscated", // Don't log raw SQL
    },
    slow_sql: {
      enabled: true,
      threshold: 500, // Alert on queries > 500ms
    },
  }),
};
```

#### Step 3: Initialize in `main.ts`

Update `/home/user/alagami-site/services/api/src/main.ts` — **MUST BE FIRST IMPORT**:

```typescript
// ⚠️ CRITICAL: This must be the very first line in the file
require("newrelic");

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== "production",
    })
  );

  // Rest of bootstrap code...
  const port = process.env.PORT || 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

#### Step 4: Add Environment Variable

Add to `.env.production`:
```bash
NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 5: Deploy & Verify

1. Deploy API to Render with updated environment variables
2. After 2-3 minutes, check New Relic:
   - Go to https://one.newrelic.com/
   - Select **APM & Services**
   - Look for **imbobi-api** service
   - Verify data is flowing (green checkmark)

---

### 1.3 Next.js Web Integration

#### Step 1: Install Sentry for Next.js (Better than New Relic for web)

```bash
cd /home/user/alagami-site/apps/web
pnpm add @sentry/nextjs
```

**Note**: For Next.js, Sentry is recommended over New Relic. See [SENTRY_SETUP.md](./SENTRY_SETUP.md) for web setup.

---

### 1.4 Dashboard Configuration

#### Access New Relic Dashboard

1. URL: https://one.newrelic.com/
2. Select **APM & Services** from left sidebar
3. Click **imbobi-api**

#### Key Metrics to Monitor

| Metric | Location | Target |
|--------|----------|--------|
| **Response Time (p99)** | Overview tab | < 500ms |
| **Error Rate** | Overview tab | < 2% |
| **Throughput** | Overview tab | Baseline + 10% headroom |
| **Apdex Score** | Overview tab | > 0.95 (1.0 = perfect) |
| **Slow Transactions** | Transactions tab | < 5 per hour |
| **Database Query Time** | Databases tab | < 100ms (p95) |

#### Create Custom Dashboard

1. Click **Dashboards** (left sidebar)
2. Click **+ Create a dashboard**
3. Name: `imbobi-api-health`
4. Add widgets:
   - Response Time (p50, p95, p99)
   - Error Rate (%)
   - Throughput (requests/min)
   - Database Performance
   - Memory Usage

#### Set Up Alerts

1. **Alerts & AI** → **Alert conditions** (left sidebar)
2. Create condition:
   - **Name**: `API Response Time High`
   - **Condition**: Threshold (Response Time > 500ms for 5 minutes)
   - **Notification channel**: Email to `contato.vinicaetano93@gmail.com`

3. Create condition:
   - **Name**: `API Error Rate High`
   - **Condition**: Threshold (Error Rate > 5% for 2 minutes)
   - **Notification channel**: Email + Slack (if configured)

---

## Part 2: DataDog APM Setup

### 2.1 Account Creation & API Key

#### Step 1: Create DataDog Account

1. Go to https://www.datadoghq.com/
2. Click **Free Trial** (14-day free tier available)
3. Sign up with email: `contato.vinicaetano93@gmail.com`
4. Select region: **US** (or EU)
5. Choose plan: **Free** tier to start

#### Step 2: Create API Key

1. Log in to https://app.datadoghq.com/
2. Navigate to: **Organization Settings** → **API keys**
3. Click **+ New Key**
4. Name: `imbobi-api`
5. Copy the key (you'll need this for setup)

---

### 2.2 NestJS API Integration with dd-trace

#### Step 1: Install DataDog Trace Library

```bash
cd /home/user/alagami-site/services/api
pnpm add dd-trace
```

#### Step 2: Create DataDog Configuration

Create `/home/user/alagami-site/services/api/src/dd-trace.ts`:

```typescript
import tracer from "dd-trace";

// Initialize DataDog tracing
tracer.init({
  service: "imbobi-api",
  env: process.env.NODE_ENV || "development",
  version: process.env.DD_VERSION || "1.0.0",
  
  // Enable profiling in production
  profiling: {
    enabled: process.env.NODE_ENV === "production",
    sourceMap: true,
  },
  
  // Log injection for correlation
  logInjection: true,
  
  // Tracing configuration
  samplingRules: [
    {
      service: "imbobi-api",
      sampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    },
  ],
});

export default tracer;
```

#### Step 3: Initialize in `main.ts`

Update `/home/user/alagami-site/services/api/src/main.ts` — **MUST BE FIRST IMPORT**:

```typescript
// ⚠️ CRITICAL: This must be the very first line in the file
import "./dd-trace";

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== "production",
    })
  );

  // Rest of bootstrap code...
}

bootstrap();
```

#### Step 4: Add Environment Variables

Add to `.env.production`:
```bash
DD_SERVICE=imbobi-api
DD_ENV=production
DD_VERSION=1.0.0
DD_TRACE_SAMPLE_RATE=0.1
```

For Render deployment, add via dashboard:
```
DD_AGENT_HOST=localhost
DD_AGENT_PORT=8126
```

#### Step 5: Deploy & Verify

1. Deploy API to Render with updated environment variables
2. After 3-5 minutes, check DataDog:
   - Go to https://app.datadoghq.com/
   - Select **APM** → **Services**
   - Look for **imbobi-api**
   - Verify traces are appearing

---

### 2.3 DataDog Dashboards

#### Access APM Dashboard

1. URL: https://app.datadoghq.com/apm
2. Select **Services** tab
3. Click **imbobi-api**

#### Key Metrics

| Metric | Location | Target |
|--------|----------|--------|
| **Latency (p99)** | Overview | < 500ms |
| **Requests** | Overview | Baseline + headroom |
| **Errors** | Overview | < 2% |
| **Service Dependencies** | Dependencies graph | All services healthy |
| **Database Performance** | Databases section | < 100ms (p95) |
| **Memory & CPU** | Host metrics | < 80% each |

#### Create Custom Dashboard

1. **Dashboards** → **+ New Dashboard**
2. Name: `imbobi-api-prod`
3. Add DataDog widgets:
   - **Timeseries**: Latency (p50, p95, p99)
   - **Timeseries**: Error rate
   - **Gauge**: Apdex score
   - **Heatmap**: Request latency distribution
   - **Top list**: Slowest endpoints

#### Set Up Alerts

1. **Alerts** → **Manage monitors**
2. Create monitor:
   ```
   Name: API Latency High
   Metric: Latency (p99)
   Condition: > 500 ms for 5 minutes
   Notify: contato.vinicaetano93@gmail.com
   ```

3. Create monitor:
   ```
   Name: API Error Rate High
   Metric: Error rate
   Condition: > 5% for 2 minutes
   Notify: Slack + Email
   ```

---

### 2.4 Log Aggregation (Optional but Recommended)

#### Forward Render Logs to DataDog

1. In Render dashboard for **alagami-api**
2. **Settings** → **Log Drain**
3. Add DataDog HTTP log drain:
   ```
   https://http-intake.logs.datadoghq.com/v1/input/<DD_API_KEY>?ddsource=render
   ```
4. Replace `<DD_API_KEY>` with your DataDog API key

---

## Part 3: Comparison & Recommendations

### Feature Comparison

| Feature | New Relic | DataDog |
|---------|-----------|---------|
| **Free Tier Data** | 100GB/month | 14-day trial |
| **Setup Time** | 15 min | 25 min |
| **UI Complexity** | Simple | Advanced |
| **Log Aggregation** | Extra cost | Included |
| **Database Monitoring** | ✓ | ✓ |
| **Distributed Tracing** | ✓ | ✓ |
| **Custom Dashboards** | ✓ | ✓ Advanced |
| **AI Anomaly Detection** | ✓ | ✓ |
| **Support** | Community | Premium |

### Recommendation

**Start with New Relic** for:
- Simplicity
- Free tier covers 100GB/month
- Sufficient for production monitoring
- Easier onboarding for small teams

**Upgrade to DataDog** when:
- Log aggregation needed
- Advanced APM insights required
- Team size > 5 engineers
- Dedicated support needed

---

## Part 4: Environment Variables Template

### `.env.production` (APM Configuration)

```bash
# ────────────────────────────────────
# New Relic APM
# ────────────────────────────────────
NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEW_RELIC_ENABLED=true

# ────────────────────────────────────
# DataDog APM (Optional)
# ────────────────────────────────────
DD_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DD_SERVICE=imbobi-api
DD_ENV=production
DD_VERSION=1.0.0
DD_TRACE_SAMPLE_RATE=0.1
DD_PROFILING_ENABLED=true
```

### `.env.staging` (Staging Configuration)

```bash
# New Relic
NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEW_RELIC_ENABLED=true

# DataDog
DD_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DD_SERVICE=imbobi-api
DD_ENV=staging
DD_VERSION=1.0.0
DD_TRACE_SAMPLE_RATE=1.0  # Sample all in staging for debugging
```

---

## Part 5: Verification Checklist

### New Relic Verification

- [ ] Account created at https://newrelic.com/
- [ ] License key obtained from Account Settings
- [ ] `newrelic.js` created in services/api
- [ ] `require("newrelic")` added as first line in main.ts
- [ ] Environment variable set: `NEW_RELIC_LICENSE_KEY`
- [ ] API deployed to Render
- [ ] Service appears in APM dashboard (https://one.newrelic.com/)
- [ ] Data flowing (response times, errors, transactions visible)
- [ ] Custom dashboard created
- [ ] Alert conditions configured

### DataDog Verification

- [ ] Account created at https://www.datadoghq.com/
- [ ] API key obtained from Organization Settings
- [ ] `dd-trace.ts` created in services/api/src
- [ ] `import "./dd-trace"` added as first import in main.ts
- [ ] Environment variables set: `DD_SERVICE`, `DD_ENV`, `DD_VERSION`
- [ ] API deployed to Render
- [ ] Service appears in APM (https://app.datadoghq.com/apm)
- [ ] Traces visible in services list
- [ ] Custom dashboard created
- [ ] Log drain configured (optional)

---

## Part 6: Troubleshooting

### New Relic Not Showing Data

**Problem**: Service appears in New Relic but no metrics visible

**Solutions**:
1. Verify `require("newrelic")` is the **first** line in main.ts
2. Check environment variable: `echo $NEW_RELIC_LICENSE_KEY`
3. Wait 5-10 minutes after deployment
4. Check Render logs for errors: `grep -i "newrelic" logs`
5. Verify license key is correct (40 alphanumeric characters)

### DataDog Traces Missing

**Problem**: Service appears but no traces

**Solutions**:
1. Verify `import "./dd-trace"` is the **first** import in main.ts
2. Check dd-trace initialization: Add `console.log("DD Trace initialized")` in dd-trace.ts
3. Verify environment variables in Render dashboard
4. Check sampling rate: May be too low (try increasing DD_TRACE_SAMPLE_RATE)
5. Wait 10-15 minutes for first traces to appear

### High Memory Usage with APM

**Problem**: API memory increased after APM installation

**Solutions**:
1. Lower sample rate: `DD_TRACE_SAMPLE_RATE=0.05` (5% of requests)
2. Disable profiling in staging: Remove `profiling.enabled` flag
3. Monitor memory in Render dashboard
4. Consider separate staging APM account to reduce data collection

---

## Part 7: Cost Estimation

### New Relic (Recommended for MVP)

| Item | Free Tier | Cost |
|------|-----------|------|
| **Data Ingestion** | 100GB/month | Free |
| **User Seats** | 5 | Free |
| **Overage** | — | $0.50/GB |
| **Annual Cost (No Overage)** | — | $0 |

**Typical Usage**: 10-50GB/month = Free tier sufficient

### DataDog (When scaling up)

| Item | Free Trial | Paid |
|------|-----------|------|
| **Trial Period** | 14 days | — |
| **APM (per host)** | — | $15/month |
| **Logs (per GB)** | — | $0.10-$2/GB |
| **Infrastructure** | — | $5-15/host |
| **Annual Cost (1 service)** | — | ~$180-360 |

---

## References

- New Relic Node.js Docs: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/
- DataDog Tracing Docs: https://docs.datadoghq.com/tracing/
- New Relic Pricing: https://newrelic.com/pricing
- DataDog Pricing: https://www.datadoghq.com/pricing/

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-28  
**Next Review**: 2026-06-28
