# Production Monitoring Integration Checklist

**Last Updated**: 2026-05-28  
**Estimated Setup Time**: 25 minutes  
**Scope**: APM (New Relic) + Error Tracking (Sentry)

---

## Overview

This checklist guides teams through setting up production monitoring for imbobi using:
- **APM**: New Relic (application performance monitoring)
- **Error Tracking**: Sentry (real-time error reporting)

Both services have free tiers suitable for production use.

---

## Phase 1: Account Setup (5 minutes)

### New Relic

- [ ] Visit https://newrelic.com/signup
- [ ] Sign up with email: `contato.vinicaetano93@gmail.com`
- [ ] Verify email and confirm account
- [ ] Choose region: **US** (or EU)
- [ ] Select plan: **Free Tier** (100GB/month)
- [ ] Navigate to **Account Settings** → **API keys**
- [ ] Copy **License Key** (40 alphanumeric characters)
- [ ] Store securely in password manager

**Time**: ~3 minutes

### Sentry

- [ ] Visit https://sentry.io/ and click **Sign Up**
- [ ] Use email: `contato.vinicaetano93@gmail.com`
- [ ] Verify email and confirm account
- [ ] Create organization: `imbobi`
- [ ] Accept terms and select **Free** plan (5,000 events/month)
- [ ] Confirm organization is created
- [ ] Store credentials securely

**Time**: ~2 minutes

---

## Phase 2: New Relic API Setup (8 minutes)

### Install Agent

- [ ] Navigate to `/home/user/alagami-site/services/api`
- [ ] Run: `pnpm add newrelic`
- [ ] Wait for installation to complete
- [ ] Verify `newrelic` appears in `package.json`

**Time**: ~2 minutes

### Create Configuration File

- [ ] Create file: `/home/user/alagami-site/services/api/newrelic.js`
- [ ] Copy configuration from [APM_SETUP.md](./APM_SETUP.md) - Section 1.2, Step 2
- [ ] Verify file has `app_name: ["imbobi-api"]`
- [ ] Verify `license_key: process.env.NEW_RELIC_LICENSE_KEY`

**Time**: ~2 minutes

### Update Entry Point

- [ ] Open `/home/user/alagami-site/services/api/src/main.ts`
- [ ] Add as **FIRST LINE**: `require("newrelic");`
- [ ] Verify no other imports above this line
- [ ] Save file

**Time**: ~1 minute

### Set Environment Variable

- [ ] Get New Relic License Key from account (Phase 1)
- [ ] Add to `.env.production`:
  ```bash
  NEW_RELIC_LICENSE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  NEW_RELIC_ENABLED=true
  ```
- [ ] Verify key is exactly 40 characters

**Time**: ~1 minute

### Deploy & Verify

- [ ] Commit and push changes to GitHub
- [ ] Wait for Render to auto-deploy API
- [ ] Once deployed (2-3 minutes), check New Relic:
  - [ ] Visit https://one.newrelic.com/
  - [ ] Go to **APM & Services**
  - [ ] Look for **imbobi-api** service
  - [ ] Verify green checkmark (data flowing)
  - [ ] Check **Overview** tab shows response times, errors, throughput

**Time**: ~5 minutes (mostly waiting)

---

## Phase 3: Sentry Web Setup (7 minutes)

### Create Web Project

- [ ] Log in to https://sentry.io/
- [ ] Click **Projects** → **Create Project**
- [ ] Select platform: **JavaScript - Next.js**
- [ ] Project name: `imbobi-web`
- [ ] Alert frequency: `Default (immediate)`
- [ ] Click **Create Project**
- [ ] Copy **DSN** (format: `https://[key]@[domain].ingest.sentry.io/[projectId]`)

**Time**: ~1 minute

### Install & Configure

- [ ] Navigate to `/home/user/alagami-site/apps/web`
- [ ] Run: `pnpm add @sentry/nextjs`
- [ ] Create file: `/home/user/alagami-site/apps/web/sentry.config.ts`
- [ ] Copy configuration from [SENTRY_SETUP.md](./SENTRY_SETUP.md) - Section 2.3, Step 2
- [ ] Update `/home/user/alagami-site/apps/web/next.config.js`
- [ ] Add to root layout file: Initialize Sentry (see Section 2.3, Step 4)
- [ ] Create test file: `/home/user/alagami-site/apps/web/app/test-sentry/page.tsx`

**Time**: ~3 minutes

### Set Vercel Environment Variables

- [ ] Go to https://vercel.com/dashboard
- [ ] Select **alagami-site** project
- [ ] Go to **Settings** → **Environment Variables**
- [ ] Add variables:
  - [ ] `NEXT_PUBLIC_SENTRY_DSN=` (public DSN from Sentry)
  - [ ] `SENTRY_DSN=` (full DSN from Sentry)
  - [ ] `SENTRY_AUTH_TOKEN=` (get from Sentry Settings → Auth Tokens)
  - [ ] `NEXT_PUBLIC_APP_VERSION=1.0.0`
- [ ] Verify all 4 variables are set

**Time**: ~2 minutes

### Get Sentry Auth Token

- [ ] Log in to Sentry: https://sentry.io/
- [ ] Go to **Settings** → **Auth Tokens**
- [ ] Click **Create New Token**
- [ ] Name: `vercel-sentry`
- [ ] Scopes: Check `project:releases` and `org:read`
- [ ] Copy token and paste in Vercel

**Time**: ~1 minute

### Deploy & Verify

- [ ] Push changes to GitHub (triggers Vercel deployment)
- [ ] Wait for Vercel deployment to complete (2-3 minutes)
- [ ] Once deployed, visit test page:
  - [ ] Go to `https://alagami-site.vercel.app/test-sentry`
  - [ ] Click "Test Error (Caught)" button
  - [ ] Check Sentry dashboard within 10 seconds
  - [ ] Error should appear in **Issues** list
  - [ ] Verify stack trace is readable (source maps working)

**Time**: ~4 minutes

---

## Phase 4: Sentry API Setup (5 minutes)

### Create API Project

- [ ] Log in to https://sentry.io/
- [ ] Click **Projects** → **Create Project**
- [ ] Select platform: **Node.js**
- [ ] Project name: `imbobi-api`
- [ ] Click **Create Project**
- [ ] Copy **DSN** (format: `https://[key]:[secret]@[domain].ingest.sentry.io/[projectId]`)

**Time**: ~1 minute

### Install & Configure

- [ ] Navigate to `/home/user/alagami-site/services/api`
- [ ] Run: `pnpm add @sentry/node @sentry/tracing`
- [ ] Create file: `/home/user/alagami-site/services/api/src/common/sentry.middleware.ts`
- [ ] Create file: `/home/user/alagami-site/services/api/src/common/sentry.filter.ts`
- [ ] Update `/home/user/alagami-site/services/api/src/main.ts` (see [SENTRY_SETUP.md](./SENTRY_SETUP.md) Section 3.4)
- [ ] Update `/home/user/alagami-site/services/api/src/app.module.ts` (register exception filter)

**Time**: ~2 minutes

### Set Render Environment Variables

- [ ] Go to https://dashboard.render.com/
- [ ] Select service: **alagami-api**
- [ ] Go to **Settings** → **Environment**
- [ ] Add: `SENTRY_DSN=` (copy from Sentry)
- [ ] Verify variable is set

**Time**: ~1 minute

### Deploy & Verify

- [ ] Commit and push to GitHub
- [ ] Render auto-deploys (2-3 minutes)
- [ ] Trigger a test error (e.g., via health check endpoint)
- [ ] Check Sentry: https://sentry.io/organizations/imbobi/projects/imbobi-api/
- [ ] Verify error appears within 10 seconds
- [ ] Verify stack trace shows original code (not minified)

**Time**: ~4 minutes

---

## Phase 5: Alerts & Notifications (3 minutes)

### New Relic Alerts

- [ ] Log in to https://one.newrelic.com/
- [ ] Go to **Alerts & AI** → **Alert conditions**
- [ ] Create condition:
  - [ ] **Name**: `API Response Time High`
  - [ ] **Condition**: Response Time > 500ms for 5 minutes
  - [ ] **Notification**: Email to `contato.vinicaetano93@gmail.com`
- [ ] Create condition:
  - [ ] **Name**: `API Error Rate High`
  - [ ] **Condition**: Error Rate > 5% for 2 minutes
  - [ ] **Notification**: Email + Slack (if configured)

**Time**: ~2 minutes

### Sentry Slack Integration

- [ ] Log in to https://sentry.io/
- [ ] Go to **Settings** → **Integrations**
- [ ] Search for **Slack** and click **Install**
- [ ] Authorize Sentry to access Slack workspace
- [ ] Select channel: `#alerts` (create if needed)
- [ ] Go to **Alerts** → **Create Alert Rule**
- [ ] Configure:
  - [ ] Filter: `environment:production`
  - [ ] Condition: `An issue is seen 5+ times in 10 minutes`
  - [ ] Action: Send to Slack #alerts
  - [ ] Test by triggering a manual error

**Time**: ~3 minutes

---

## Phase 6: Verify Monitoring (5 minutes)

### New Relic Dashboard

- [ ] Visit https://one.newrelic.com/
- [ ] Go to **APM & Services** → **imbobi-api**
- [ ] Verify metrics visible:
  - [ ] Response Time (p50, p95, p99)
  - [ ] Throughput (requests/min)
  - [ ] Error Rate (%)
  - [ ] Apdex Score > 0.95

### Sentry Dashboard

- [ ] Visit https://sentry.io/organizations/imbobi/
- [ ] Go to **Issues**
- [ ] Verify both projects appear:
  - [ ] `imbobi-web` (errors from Next.js)
  - [ ] `imbobi-api` (errors from NestJS)
- [ ] For each, verify:
  - [ ] Stack traces visible
  - [ ] Source maps working
  - [ ] Recent errors showing

### Testing

- [ ] Make a production API request to `/health`
- [ ] Generate a test error to verify Sentry captures it
- [ ] Verify Slack notification is sent
- [ ] Verify email notification is sent

---

## Summary Checklist

### Phase 1: Accounts
- [ ] New Relic account created
- [ ] Sentry organization created
- [ ] License keys and DSNs stored securely

### Phase 2: New Relic API
- [ ] `newrelic` package installed
- [ ] `newrelic.js` configuration created
- [ ] `require("newrelic")` added to main.ts
- [ ] `NEW_RELIC_LICENSE_KEY` in `.env.production`
- [ ] API deployed and data flowing

### Phase 3: Sentry Web
- [ ] `@sentry/nextjs` installed
- [ ] Sentry config file created
- [ ] Vercel environment variables set
- [ ] Test page accessible at `/test-sentry`
- [ ] Errors captured in Sentry dashboard

### Phase 4: Sentry API
- [ ] `@sentry/node` installed
- [ ] Sentry middleware and filter created
- [ ] Render environment variables set
- [ ] API deployed and errors captured

### Phase 5: Alerts
- [ ] New Relic alert rules configured
- [ ] Sentry Slack integration enabled
- [ ] Test alerts verified

### Phase 6: Verification
- [ ] New Relic dashboard shows production metrics
- [ ] Sentry shows errors from web and API
- [ ] Alerts are functional

---

## Troubleshooting

### If New Relic data is missing:
1. Verify `require("newrelic")` is first line in main.ts
2. Check license key is exactly 40 characters
3. Wait 5-10 minutes after deployment
4. Check Render logs: `grep -i "newrelic" logs`

### If Sentry errors are missing:
1. Verify DSN is correct in environment
2. Check Vercel/Render deployment logs
3. Wait 10-30 seconds after error occurs
4. Manually test: `Sentry.captureException(new Error("test"))`

### If source maps not working:
1. Verify `SENTRY_AUTH_TOKEN` is set in Vercel
2. Check Sentry project: **Settings** → **Source Maps**
3. Ensure release names match

---

## Support

**For New Relic issues**: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/

**For Sentry issues**: https://docs.sentry.io/

**Team contact**: `contato.vinicaetano93@gmail.com`

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-28  
**Next Review**: 2026-06-28
