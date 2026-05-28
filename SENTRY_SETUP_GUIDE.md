# Sentry Setup Guide — Complete Instructions

> **Created**: 2026-05-28  
> **Purpose**: Step-by-step guide to create Sentry account, projects, and configure DSNs  
> **Audience**: DevOps/Deployment team

---

## Overview

This guide walks through creating a Sentry account, setting up two projects (API + Web), and obtaining the DSNs needed for production monitoring. Expected time: **15-20 minutes**.

### What is Sentry?

Sentry is a real-time error tracking and performance monitoring platform that helps teams:
- **Capture errors** automatically from both backend (NestJS API) and frontend (Next.js web)
- **Monitor performance** of API endpoints and web page loads
- **Alert the team** when errors occur
- **Track releases** to correlate errors with code changes

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ imobi Application (Production)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │ Next.js Web App  │         │ NestJS API       │    │
│  │ apps/web/        │         │ services/api/    │    │
│  │                  │         │                  │    │
│  │ @sentry/nextjs   │         │ @sentry/node     │    │
│  │ NEXT_PUBLIC_DSN  │         │ SENTRY_DSN       │    │
│  └────────┬─────────┘         └────────┬─────────┘    │
│           │                            │               │
│           └────────────┬───────────────┘               │
│                        │                               │
│              (HTTPS Error Events)                      │
│                        │                               │
└────────────────────────┼───────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Sentry.io Cloud    │
              │                     │
              │ ┌─────────────────┐ │
              │ │ imobi-api       │ │
              │ │ (Node.js proj)  │ │
              │ └─────────────────┘ │
              │                     │
              │ ┌─────────────────┐ │
              │ │ imobi-web       │ │
              │ │ (JS/React proj) │ │
              │ └─────────────────┘ │
              │                     │
              └─────────────────────┘
```

---

## Part 1: Create Sentry Account

### Step 1.1: Sign Up

1. Go to https://sentry.io/signup
2. Choose signup method:
   - **GitHub OAuth** (recommended for developers)
   - **Email signup** (if preferred)

#### GitHub OAuth (Recommended)

1. Click **"Sign in with GitHub"**
2. You'll be redirected to GitHub login
3. Authorize Sentry app
4. GitHub will redirect back to Sentry

#### Email Signup

1. Click **"Sign up with email"**
2. Enter:
   - Email: `contato.vinicaetano93@gmail.com`
   - Password: (create strong password)
3. Check email for verification link
4. Click verification link

### Step 1.2: Complete Profile

After signup, complete onboarding:

1. **Organization Name**: Enter `imbobi`
2. **Organization Slug**: Auto-generates (e.g., `imbobi-abc123`)
3. **Team**: Keep default or create new team
4. Click **"Create Organization"**

### Step 1.3: Note Organization Details

Copy these for reference:

- **Organization Name**: `imbobi`
- **Organization Slug**: `_____________` (from URL: sentry.io/organizations/[slug]/)
- **Organization ID**: _(optional, shown in settings)_

---

## Part 2: Create API Project (NestJS)

### Step 2.1: Create Project

1. In Sentry dashboard, go to **Projects** section
2. Click **"Create Project"**
3. Or click **"Projects"** → **"New Project"**

### Step 2.2: Select Platform

1. **Platform Selection Page**
2. Search or scroll to: **Node.js**
3. Click **Node.js** card

### Step 2.3: Select Framework

1. **Framework Selection Page**
2. Look for: **NestJS** or **Express** (NestJS uses Express-compatible)
3. If NestJS not listed, select:
   - **Express** (NestJS is Express-compatible), or
   - **Other** (generic Node.js)
4. Click selected framework

### Step 2.4: Configure Project Details

Fill in the form:

- **Project Name**: `imobi-api`
- **Team**: Select your team (default is fine)
- **Alert Rule Email**: `contato.vinicaetano93@gmail.com`
- **Environment**: `production`

### Step 2.5: Create and Get DSN

1. Click **"Create Project"**
2. Sentry generates configuration page
3. You'll see code snippets and **Your DSN**:

```
https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
```

### Step 2.6: Copy API DSN

Example (yours will differ):

```
https://abc1234567890def@o1234567.ingest.sentry.io/9876543
```

**ACTION**: Save this DSN in secure location as `SENTRY_DSN_API`

---

## Part 3: Create Web Project (Next.js)

### Step 3.1: Create Second Project

1. Go back to Projects page
2. Click **"Create Project"** again
3. Or click **"Projects"** → **"New Project"**

### Step 3.2: Select Platform

1. **Platform Selection Page**
2. Search or scroll to: **JavaScript**
3. Click **JavaScript** card

### Step 3.3: Select Framework

1. **Framework Selection Page**
2. Look for: **React** or **Next.js** (both supported)
3. If Next.js listed, select it; otherwise select:
   - **React** (Next.js is React-based), or
   - **Browser JavaScript** (generic)
4. Click selected framework

### Step 3.4: Configure Project Details

Fill in the form:

- **Project Name**: `imobi-web`
- **Team**: Select your team (same as API)
- **Alert Rule Email**: `contato.vinicaetano93@gmail.com`
- **Environment**: `production`

### Step 3.5: Create and Get DSN

1. Click **"Create Project"**
2. Sentry generates configuration page
3. You'll see **Your DSN**:

```
https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
```

### Step 3.6: Copy Web DSN

Example (yours will differ):

```
https://xyz9876543210abc@o1234567.ingest.sentry.io/1234567
```

**ACTION**: Save this DSN in secure location as `SENTRY_DSN_WEB`

---

## Part 4: Verify Projects in Dashboard

### Step 4.1: View Projects List

1. From Sentry dashboard, click **"Projects"**
2. Should see two projects:
   - ✅ `imobi-api` (Node.js)
   - ✅ `imobi-web` (JavaScript)

### Step 4.2: Verify Project Settings

For each project:

1. Click project name
2. Go to **Settings** (gear icon)
3. Verify:
   - **Project Name** is correct
   - **Platform** is correct
   - **Team** assignment
   - **Alert Rule** email is set

### Step 4.3: Find DSN Again (If Needed)

If you need to find DSN again:

1. Project → **Settings**
2. Look for **"Client Keys (DSN)"** section
3. See DSN listed with format:
   ```
   https://[PUBLIC_KEY]@o[ID].ingest.sentry.io/[PROJECT_ID]
   ```

---

## Part 5: Configure Environment Variables

### Step 5.1: Update .env.production

For **API service** (`services/api/`):

```bash
# From Sentry imobi-api project
SENTRY_DSN="https://[PUBLIC_KEY]@o[ID].ingest.sentry.io/[API_PROJECT_ID]"
SENTRY_RELEASE="1.0.0"
SENTRY_ENABLE_PROFILER="true"  # Optional: adds performance profiling
```

For **Web app** (`apps/web/`):

```bash
# From Sentry imobi-web project (note NEXT_PUBLIC prefix)
NEXT_PUBLIC_SENTRY_DSN="https://[PUBLIC_KEY]@o[ID].ingest.sentry.io/[WEB_PROJECT_ID]"
NEXT_PUBLIC_SENTRY_RELEASE="1.0.0"
```

### Step 5.2: Update Vercel Environment Variables

For deployed production environment:

1. Go to Vercel: https://vercel.com/contatovinicaetano93-commits/imobi
2. **Settings** → **Environment Variables**
3. Add following variables:

#### API DSN (for Edge Functions/Serverless)

- **Name**: `SENTRY_DSN`
- **Value**: (from imobi-api project)
- **Environments**: Production ✓, Staging ✓

#### API Release Version

- **Name**: `SENTRY_RELEASE`
- **Value**: `1.0.0` (update with each release)
- **Environments**: Production ✓, Staging ✓

#### Web DSN (public, for browser)

- **Name**: `NEXT_PUBLIC_SENTRY_DSN`
- **Value**: (from imobi-web project)
- **Environments**: Production ✓, Staging ✓

#### Web Release Version

- **Name**: `NEXT_PUBLIC_SENTRY_RELEASE`
- **Value**: `1.0.0` (update with each release)
- **Environments**: Production ✓, Staging ✓

### Step 5.3: Verify in Render (API)

For API running on Render:

1. Go to Render dashboard: https://dashboard.render.com
2. Select API service: `imobi-api`
3. **Settings** → **Environment**
4. Add:
   - `SENTRY_DSN`: (from imobi-api project)
   - `SENTRY_RELEASE`: `1.0.0`
5. Redeploy service

---

## Part 6: Test Sentry Integration

### Step 6.1: Trigger Test Error in API

Use curl to trigger an error:

```bash
# This will generate a 404 error (invalid endpoint)
curl -X GET "https://api.imobi.com/api/v1/invalid-endpoint" \
  -H "Accept: application/json"
```

Expected response:
```json
{
  "statusCode": 404,
  "message": "Not Found",
  "error": "Not Found"
}
```

### Step 6.2: Check Sentry for Error

1. Go to Sentry dashboard: https://sentry.io
2. Click **`imobi-api`** project
3. Go to **Issues** tab
4. Look for new error from last minute
5. Should see: `404 Not Found` or similar

### Step 6.3: Trigger Test Error in Web

1. Open browser to: https://app.imobi.com.br
2. Open Developer Console (F12)
3. Paste: `throw new Error('Test error from deployment');`
4. Press Enter

### Step 6.4: Check Sentry for Web Error

1. Go to Sentry dashboard: https://sentry.io
2. Click **`imobi-web`** project
3. Go to **Issues** tab
4. Look for new error from last minute
5. Should see: `Test error from deployment`

### Step 6.5: Verify Error Details

Click on error to view details:

Expected information:
- **Error Message**: Exact text from error
- **Stack Trace**: Code location in source
- **Environment**: `production`
- **Release**: `1.0.0` (if configured)
- **Browser/OS**: (for web errors)
- **Request Details**: (for API errors)
- **Timestamp**: When error occurred

---

## Part 7: Configure Alerts

### Step 7.1: Create Alert Rule (API)

1. Go to **`imobi-api`** project
2. Click **Alerts** (or **Settings** → **Alerts**)
3. Click **"Create Alert Rule"**
4. Configure:
   - **Alert Condition**:
     - If `[error count]` is `[greater than]` `5` in `5 minutes`
   - **Actions**:
     - Send `email` to `contato.vinicaetano93@gmail.com`
   - **Name**: `API Error Spike`
5. Click **Save**

### Step 7.2: Create Alert Rule (Web)

1. Go to **`imobi-web`** project
2. Click **Alerts**
3. Click **"Create Alert Rule"**
4. Configure:
   - **Alert Condition**:
     - If `[error count]` is `[greater than]` `5` in `5 minutes`
   - **Actions**:
     - Send `email` to `contato.vinicaetano93@gmail.com`
   - **Name**: `Web Error Spike`
5. Click **Save**

### Step 7.3: (Optional) Slack Integration

1. Go to **Integrations** (Organization Settings)
2. Search: **Slack**
3. Click **Install** or **Configure**
4. Authorize Sentry app to your Slack workspace
5. Select channel: `#deployments` or `#alerts`
6. Test by generating alert

---

## Part 8: GitHub Integration (Optional)

### Step 8.1: Install GitHub Integration

1. Go to **Organization Settings** → **Integrations**
2. Search: **GitHub**
3. Click **Install**
4. GitHub will redirect for authorization
5. Authorize Sentry to access your repositories
6. Select: `contatovinicaetano93-commits/imobi`

### Step 8.2: Enable Features

In GitHub integration settings:

- [x] Commit tracking (connect errors to commits)
- [x] Issue linking (create GitHub issues from Sentry)
- [x] Pull request comments (optional)
- [x] Suggested assignees (optional)

---

## Reference: DSN Format Breakdown

Understanding DSN structure helps with troubleshooting:

```
https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
│      │              │        │                   │
│      │              │        │                   └─ Sentry Project ID
│      │              │        └─ Organization ID
│      │              └─ Authentication key (public)
│      └─ Protocol (HTTPS only)
└─ Sentry domain

Example:
https://abc1234567890@o1234567.ingest.sentry.io/9876543
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Projects not appearing | Refresh page; ensure you're in correct organization |
| Can't find DSN | Project → Settings → "Client Keys (DSN)" section |
| Events not appearing | Verify DSN is correct in environment variables; redeploy |
| Test error not showing | Wait 1-2 minutes for Sentry to ingest; check error rate quota |
| "Invalid DSN" error at startup | Verify DSN format: must be complete HTTPS URL |
| Empty organization slug | Slug auto-generates; go to Org Settings to view |

---

## Verification Checklist

Use this to verify complete Sentry setup:

- [ ] Sentry account created
- [ ] Organization created: `imbobi`
- [ ] Project 1: `imobi-api` created (Node.js)
- [ ] Project 2: `imobi-web` created (JavaScript)
- [ ] API DSN obtained: `SENTRY_DSN_API` = `https://...`
- [ ] Web DSN obtained: `SENTRY_DSN_WEB` = `https://...`
- [ ] Environment variables configured in Vercel
- [ ] Environment variables configured in Render
- [ ] Deployment redeployed with new env vars
- [ ] Test error generated in API
- [ ] Test error appeared in Sentry
- [ ] Test error generated in Web
- [ ] Test error appeared in Sentry
- [ ] Alert rules created for both projects
- [ ] Alert rule tested (optional)

---

## Quick Reference Commands

### Verify API DSN is Used

```bash
# Check logs for Sentry initialization
curl https://api.imobi.com/api/v1/health | jq .

# Should not have Sentry errors
```

### Verify Web DSN is Used

```bash
# Check browser console after page load
# Should see message like: "Sentry initialized"
# Or check Network tab for Sentry requests
```

### Update Sentry Release Version

Whenever you deploy, update release:

**In Vercel:**
- `SENTRY_RELEASE`: `1.0.1` (increment)
- `NEXT_PUBLIC_SENTRY_RELEASE`: `1.0.1`

**In Render:**
- `SENTRY_RELEASE`: `1.0.1` (increment)

---

## Security Notes

### API DSN (Private)

- Contains `SENTRY_DSN` (server-side only)
- Should NOT be public
- Store securely in environment variables
- Never commit to git

### Web DSN (Public)

- Contains `NEXT_PUBLIC_SENTRY_DSN` (browser-side)
- Must be public (web app needs to send errors)
- Prefix `NEXT_PUBLIC_` indicates public exposure
- Is in built JavaScript bundle
- Consider IP whitelisting in Sentry if concerned

### Best Practices

- Rotate auth keys periodically
- Monitor token usage in Sentry dashboard
- Limit data retention (per GDPR/compliance)
- Review alert emails regularly
- Audit GitHub integration permissions

---

## Support & Documentation

- **Sentry Main**: https://sentry.io
- **Sentry API Docs**: https://docs.sentry.io/api/
- **Node.js Integration**: https://docs.sentry.io/platforms/node/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **NestJS Guide**: https://docs.sentry.io/platforms/node/configuration/integrations/nestjs/

---

**Created**: 2026-05-28  
**Contact**: contato.vinicaetano93@gmail.com  
**Related Files**:
- [SENTRY_IMPLEMENTATION_CHECKLIST.md](./SENTRY_IMPLEMENTATION_CHECKLIST.md)
- [.env.production.example](./.env.production.example)
- [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md)
