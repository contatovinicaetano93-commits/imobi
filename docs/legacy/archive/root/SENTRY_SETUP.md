# Sentry Error Tracking Setup Guide

Sentry is configured in the imobi project for real-time error tracking and performance monitoring in production. This guide walks you through setting up Sentry for both the NestJS API and Next.js web application.

## Overview

- **API (NestJS)**: Already partially configured with Sentry support (`@sentry/node`)
- **Web (Next.js)**: Newly configured with Sentry support (`@sentry/nextjs`)
- **Two Projects Needed**: API and Web require separate Sentry projects due to different runtime environments

## Prerequisites

- Sentry account at https://sentry.io
- Access to Vercel dashboard
- GitHub OAuth or email for Sentry signup

## Step 1: Create Sentry Account & Organization

### 1.1 Sign up for Sentry
1. Go to https://sentry.io/signup
2. Choose authentication method:
   - **Option A**: GitHub OAuth (recommended)
   - **Option B**: Email + password
3. Complete signup

### 1.2 Create Organization (if needed)
If this is your first time, Sentry will prompt you to create an organization:
- Organization Name: `imbobi` (or your preferred name)
- Slug: `imbobi` (auto-generated)
- Save and continue

## Step 2: Create Sentry Projects

### 2.1 Create API Project (Node.js)

1. Go to **Projects** → Click **Create Project**
2. Select Platform: **Node.js**
3. Framework: **NestJS** (or Generic Node.js)
4. Alert settings: Keep defaults (or configure as preferred)
5. Click **Create Project**
6. You'll see a setup page with:
   ```
   https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
   ```
7. **Copy this DSN** — this is `SENTRY_DSN` for the API

### 2.2 Create Web Project (JavaScript/Browser)

1. Go to **Projects** → Click **Create Project** again
2. Select Platform: **JavaScript**
3. Framework: **Next.js** (or React)
4. Alert settings: Keep defaults
5. Click **Create Project**
6. You'll see another setup page with a different DSN
7. **Copy this DSN** — this is `NEXT_PUBLIC_SENTRY_DSN` for the Web app

## Step 3: Configure DSN in Environment Variables

### 3.1 For Development (Local)

Update your local `.env` file (or create from `.env.example`):

```bash
# API (NestJS)
SENTRY_DSN="https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[API_PROJECT_ID]"
SENTRY_RELEASE="1.0.0"
SENTRY_ENABLE_PROFILER="false"  # Set to "true" in production for performance profiling

# Web (Next.js) - Must use NEXT_PUBLIC prefix for browser access
NEXT_PUBLIC_SENTRY_DSN="https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[WEB_PROJECT_ID]"
NEXT_PUBLIC_SENTRY_RELEASE="1.0.0"
```

### 3.2 For Production (Vercel)

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project: https://vercel.com/contatovinicaetano93-commits/imobi/settings/environment-variables
2. Add new environment variables:

| Name | Value | Environment |
|------|-------|-------------|
| `SENTRY_DSN` | (API DSN from Step 2.1) | Production |
| `SENTRY_RELEASE` | `1.0.0` | Production |
| `NEXT_PUBLIC_SENTRY_DSN` | (Web DSN from Step 2.2) | Production |
| `NEXT_PUBLIC_SENTRY_RELEASE` | `1.0.0` | Production |

3. Save each variable
4. Trigger a redeploy:
   - Go to **Deployments**
   - Click the latest deployment
   - Click **Redeploy**
   - Wait for build to complete (~60 seconds)

#### Option B: Via Vercel CLI

```bash
# Set API Sentry DSN
vercel env add SENTRY_DSN

# Set Web Sentry DSN (public)
vercel env add NEXT_PUBLIC_SENTRY_DSN

# Trigger redeploy
vercel redeploy
```

## Step 4: Verify Sentry is Receiving Data

### 4.1 Check Deployment

1. Go to Vercel Deployments
2. Verify latest build:
   - Status: **Deployment successful**
   - No build errors
   - All functions deployed

### 4.2 Check Sentry Dashboard

1. Go to Sentry dashboard: https://sentry.io
2. Select your organization
3. Go to **Discover** → **Issues** or **Issues**
4. You should see:
   - **Deployment event** (initial telemetry from startup)
   - Environment: `production`
   - Projects: Both API and Web listed

### 4.3 Trigger a Test Error (Optional)

To verify Sentry captures errors:

#### Test API Error
```bash
# Call non-existent API endpoint (will trigger 404)
curl https://api.imobi.com/api/v1/invalid-endpoint

# OR in Node REPL:
# const Sentry = require('@sentry/node');
# Sentry.captureException(new Error('Test error from API'));
```

#### Test Web Error
In browser console on production site:
```javascript
// Trigger a client error
throw new Error('Test error from web app');
```

Then check Sentry Issues → Should show both errors within 1-2 minutes.

## Step 5: Configure Alerts (Optional but Recommended)

### 5.1 Create Alert Rule

1. Go to **Alerts** → **Create Alert Rule**
2. Select "Issues"
3. Set condition: **Error count > 5 in 5 minutes**
4. Select action:
   - **Email**: Send to `contato.vinicaetano93@gmail.com`
   - **Slack**: Integrate Slack workspace (if available)
5. Save alert

### 5.2 Recommended Alert Rules

| Condition | Action | Notes |
|-----------|--------|-------|
| Error count > 5 in 5 min | Email | Detect error spikes |
| New issue created | Email | First occurrence of new error |
| Regression | Email | Previously fixed error returns |
| Release deployed | Email | Track deployments |

## Step 6: Link Sentry to GitHub (Optional)

For enhanced issue tracking:

1. Go to **Settings** → **Integrations**
2. Search for "GitHub"
3. Click **Install**
4. Authorize Sentry to access your GitHub repo
5. Select repository: `contatovinicaetano93-commits/imobi`
6. Enable features:
   - ✅ Commit tracking
   - ✅ Issue linking
   - ✅ Code suggestions

## Monitoring Features

### Error Tracking

#### API Errors
- Automatically captured by `@sentry/node`
- Includes:
  - Request/response details
  - Stack traces
  - Environment context
  - User information (if logged in)

#### Web Errors
- Automatically captured by `@sentry/nextjs`
- Includes:
  - Browser/OS information
  - Session replay (masked)
  - Network requests
  - Console logs

### Performance Monitoring

Both projects track:
- Request/response times
- Database query duration
- External API calls
- Frontend component render times

Sampling rates:
- **Development**: 100% (all transactions captured)
- **Production API**: 10% (1 in 10 transactions)
- **Production Web**: 10% (1 in 10 sessions)

### Session Replay (Web Only)

The web app is configured with session replay:
- **Session sample rate**: 10% of all sessions
- **Error sample rate**: 100% of sessions with errors
- **Data masking**: All text and media masked for privacy
- Helps debug user interactions leading to errors

## Development Usage

### In NestJS API

```typescript
import { initSentry, captureException, setUserContext } from "@/common/config";

// Capture errors manually
try {
  // some operation
} catch (error) {
  captureException(error as Error, { context: "specific-operation" });
}

// Track user sessions
setUserContext(userId, userEmail);

// Clear user on logout
clearUserContext();
```

### In Next.js Web

```typescript
import { 
  captureException, 
  setUserContext, 
  addBreadcrumb 
} from "@/lib/sentry";

// Capture errors
try {
  // some operation
} catch (error) {
  captureException(error as Error, { context: "specific-operation" });
}

// Track user
useEffect(() => {
  setUserContext(userId, userEmail);
}, [userId, userEmail]);

// Add breadcrumbs for debugging
addBreadcrumb("User navigated to dashboard", "navigation");
```

## Environment Variables Reference

### API (.env)
| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `SENTRY_DSN` | No | `https://key@org.ingest.sentry.io/id` | Leave empty to disable |
| `SENTRY_RELEASE` | No | `1.0.0` | Helps track which version |
| `SENTRY_ENABLE_PROFILER` | No | `true` | CPU/memory profiling |

### Web (.env)
| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | `https://key@org.ingest.sentry.io/id` | Public - included in bundle |
| `NEXT_PUBLIC_SENTRY_RELEASE` | No | `1.0.0` | Must use NEXT_PUBLIC prefix |

**Note**: These are completely separate DSNs from different Sentry projects.

## Troubleshooting

### Sentry Not Receiving Events

**Symptoms**: Dashboard shows "No events" or outdated data

**Solutions**:
1. **Verify DSN format**:
   - Starts with `https://`
   - Contains `@` and `.ingest.sentry.io`
   - Example: `https://abc123@o1234.ingest.sentry.io/5678`

2. **Check DSN is set**:
   ```bash
   # API
   echo $SENTRY_DSN
   
   # Web
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

3. **Verify environment variable is in production**:
   - Vercel: Check deployment shows variable in logs
   - Local: Ensure `.env` is loaded

4. **Check firewall/proxy**:
   - Ensure outbound HTTPS to `*.ingest.sentry.io` is allowed

### Events Being Filtered

**Symptoms**: Errors occur but don't appear in Sentry

**Common reasons**:
- `beforeSend()` filter blocks them (see configuration)
- Health check endpoints filtered intentionally
- High sample rate in production (10%)

### Missing Source Maps

For better error tracking:
1. Configure source map upload in CI/CD
2. See Sentry docs: https://docs.sentry.io/product/releases/source-maps/

## CLI Commands for Development

```bash
# Install dependencies (includes Sentry packages)
pnpm install

# Start development with Sentry disabled (set SENTRY_DSN to empty)
NODE_ENV=development SENTRY_DSN="" pnpm dev

# Type check to ensure Sentry imports work
pnpm type-check

# View Sentry initialization logs on startup
pnpm dev  # Look for "Sentry initialized in development mode"
```

## Production Deployment Checklist

- [ ] Both API and Web Sentry projects created
- [ ] DSNs copied and verified
- [ ] Environment variables set in Vercel
- [ ] Redeploy triggered and completed successfully
- [ ] Sentry dashboard shows deployment event
- [ ] Test error captured and visible in Issues
- [ ] Alert rules configured
- [ ] Team notified of Sentry setup

## Useful Links

- **Sentry Dashboard**: https://sentry.io
- **Sentry Docs**: https://docs.sentry.io
- **NestJS Integration**: https://docs.sentry.io/platforms/node/integrations/nestjs/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **API DSN Format**: https://docs.sentry.io/product/sentry-basics/dsn-explainer/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/

## Support

For issues with Sentry setup:
1. Check official docs (links above)
2. Contact Sentry support via dashboard
3. Review application logs for initialization errors

---

**Last Updated**: May 28, 2026
**Sentry Versions**: API `@sentry/node@10.55.0`, Web `@sentry/nextjs@8.0.0`
