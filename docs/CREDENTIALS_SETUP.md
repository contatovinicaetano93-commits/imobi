# Production Credentials Setup Guide

**Last Updated**: 2026-05-28  
**Scope**: Sentry and New Relic credentials for imbobi production environment

---

## Overview

This document provides instructions for creating monitoring service accounts and generating the required credentials (DSNs and license keys) for production deployment.

### Services to Configure

1. **Sentry** - Error tracking (2 projects: Web + API)
2. **New Relic** - Application Performance Monitoring (APM)

### Timeline

- Account creation: ~10 minutes per service
- Credentials extraction: ~5 minutes
- Environment variable setup: ~10 minutes

---

## Part 1: Sentry Setup

### 1.1 Create Sentry Organization & Account

1. Navigate to https://sentry.io/
2. Click **Sign Up**
3. Enter email: `contato.vinicaetano93@gmail.com`
4. Create secure password and verify email
5. Create organization: **imbobi**
6. Select **Free** plan (5,000 events/month)

### 1.2 Create Sentry Web Project (Next.js)

1. In Sentry dashboard, go to **Projects** → **Create Project**
2. Platform: **JavaScript - Next.js**
3. Project name: `imbobi-web`
4. Alert frequency: **Default (immediate)**
5. Click **Create Project**
6. **Copy DSN** from project settings
   - Location: Settings → Client Keys (DSN)
   - Format: `https://[key]@[domain].ingest.sentry.io/[projectId]`

#### Sentry Web DSN
```
SENTRY_WEB_DSN=[PASTE_YOUR_DSN_HERE]
```

**Example format:**
```
https://examplekey123@o123456.ingest.sentry.io/6789012
```

### 1.3 Create Sentry API Project (Node.js)

1. In Sentry dashboard, go to **Projects** → **Create Project**
2. Platform: **Node.js**
3. Project name: `imbobi-api`
4. Alert frequency: **Default (immediate)**
5. Click **Create Project**
6. **Copy DSN** from project settings
   - Location: Settings → Client Keys (DSN)

#### Sentry API DSN
```
SENTRY_API_DSN=[PASTE_YOUR_DSN_HERE]
```

**Example format:**
```
https://examplekey456@o123456.ingest.sentry.io/6789013
```

---

## Part 2: New Relic Setup

### 2.1 Create New Relic Account

1. Navigate to https://newrelic.com/signup
2. Sign up with email: `contato.vinicaetano93@gmail.com`
3. Choose region: **US** (unless you have specific regional requirements)
4. Select plan: **Free Tier** (100GB/month data ingestion)
5. Complete email verification

### 2.2 Locate & Copy License Key

1. Log in to https://one.newrelic.com/
2. Click user icon (top-right) → **Account**
3. Navigate to **API keys**
4. Under **License key** section, click **Copy**
5. Store the 40-character key securely

#### New Relic License Key
```
NEW_RELIC_LICENSE_KEY=[PASTE_YOUR_LICENSE_KEY_HERE]
```

**Example format:**
```
nr-12345678901234567890123456789012345678
```

---

## Part 3: Environment Variable Setup

### 3.1 Vercel Web Environment Variables

In Vercel dashboard for `alagami-site` (web app):

1. Go to **Settings** → **Environment Variables**
2. Add the following variables (select `Production` environment):

```
NEXT_PUBLIC_SENTRY_DSN = [SENTRY_WEB_DSN]
```

**Note**: The `NEXT_PUBLIC_` prefix makes this available in browser code (necessary for client-side error tracking)

### 3.2 Vercel API Environment Variables

In Vercel dashboard for API deployment (or via `vercel env` CLI):

```
SENTRY_API_DSN = [SENTRY_API_DSN]
NEW_RELIC_LICENSE_KEY = [NEW_RELIC_LICENSE_KEY]
NODE_ENV = production
```

### 3.3 Local Development (.env files)

For local testing before deployment:

**`apps/web/.env.local`:**
```
NEXT_PUBLIC_SENTRY_DSN=[SENTRY_WEB_DSN]
```

**`services/api/.env.local`:**
```
SENTRY_API_DSN=[SENTRY_API_DSN]
NEW_RELIC_LICENSE_KEY=[NEW_RELIC_LICENSE_KEY]
NODE_ENV=development
```

---

## Part 4: Credentials Inventory

### Summary Table

| Service | Type | Credential | Status |
|---------|------|-----------|--------|
| Sentry | Web DSN | `https://...@...ingest.sentry.io/...` | ⏳ Pending |
| Sentry | API DSN | `https://...@...ingest.sentry.io/...` | ⏳ Pending |
| New Relic | License Key | `nr-...` (40 chars) | ⏳ Pending |

### Actual Credentials (Private - Store Securely)

```
=== SENTRY ===
Web DSN: [REDACTED]
API DSN: [REDACTED]

=== NEW RELIC ===
License Key: [REDACTED]
```

**⚠️ Security Note**: Never commit credentials to git. These must be:
- Stored in a password manager
- Added to Vercel environment variables
- Configured via CI/CD secrets (if applicable)

---

## Part 5: Verification & Testing

### 5.1 Test Sentry Web Integration

After deploying to production:

1. Go to https://[your-web-app-url]/
2. Trigger a test error (if test endpoint exists)
3. Check Sentry dashboard → `imbobi-web` project
4. Verify error appears within 5-10 seconds

### 5.2 Test Sentry API Integration

1. Deploy API with `SENTRY_API_DSN` configured
2. Trigger a test error on API endpoint
3. Check Sentry dashboard → `imbobi-api` project
4. Verify error appears within 5-10 seconds

### 5.3 Test New Relic APM

1. Deploy API with `NEW_RELIC_LICENSE_KEY` configured
2. Make requests to API endpoints
3. Go to https://one.newrelic.com/
4. Navigate to **APM & Services** → **imbobi-api**
5. Verify transaction traces appear (may take 1-2 minutes)

---

## Troubleshooting

### Sentry: No errors appearing

- [ ] Verify DSN is correct format
- [ ] Check `NEXT_PUBLIC_SENTRY_DSN` is set (web)
- [ ] Check `SENTRY_API_DSN` is set (API)
- [ ] Verify error is being triggered (not silently caught)
- [ ] Check Sentry project is not in archived state

### New Relic: No APM data appearing

- [ ] Verify license key is exactly 40 characters
- [ ] Check `NEW_RELIC_LICENSE_KEY` environment variable is set
- [ ] Verify API service restarted after env var change
- [ ] Check New Relic account region (US vs EU)
- [ ] Wait 2-5 minutes for data to appear in dashboard

### Cannot copy credentials

- [ ] Ensure you're logged in to respective dashboards
- [ ] Try using browser's developer tools copy function
- [ ] Verify email address is verified before accessing settings
- [ ] Check account permissions (admin access required)

---

## Security Checklist

- [ ] Credentials stored in password manager
- [ ] `.env` files are in `.gitignore`
- [ ] Vercel environment variables set for production
- [ ] No credentials logged in CI/CD output
- [ ] DSNs use HTTPS (not HTTP)
- [ ] License keys are rotated annually
- [ ] Access is logged and monitored

---

## Additional Resources

- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Node.js Integration](https://docs.sentry.io/platforms/node/)
- [New Relic Node.js APM](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## Related Documentation

- [SENTRY_SETUP.md](./SENTRY_SETUP.md) - Detailed Sentry configuration
- [APM_SETUP.md](./APM_SETUP.md) - New Relic APM integration guide
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Complete monitoring stack overview
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Environment configuration guide
