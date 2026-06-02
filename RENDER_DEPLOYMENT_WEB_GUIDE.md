# Render Deployment Guide — imobi Web Frontend (Next.js 14)

**Date Created:** June 2, 2026  
**Environment:** Staging  
**Application:** @imbobi/web (Next.js 14 with App Router)  
**GitHub Repo:** contatovinicaetano93-commits/imobi  
**Branch:** claude/happy-goldberg-AFQPj

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Service Creation](#step-by-step-service-creation)
3. [Build & Start Commands](#build--start-commands)
4. [Environment Variables](#environment-variables)
5. [Deployment Settings](#deployment-settings)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Domain Configuration](#domain-configuration)
9. [Workflow: Deploying Updates](#workflow-deploying-updates)
10. [Scaling & Cost](#scaling--cost)

---

## Prerequisites

Before starting, ensure you have:

- **GitHub Access:** Write access to `contatovinicaetano93-commits/imobi` repository
- **Render Account:** Free or paid account at [render.com](https://render.com)
- **Branch Ready:** Code pushed to `claude/happy-goldberg-AFQPj` branch
- **API Backend:** API service running and accessible at `https://api.staging.imbobi.com/api/v1`
- **Node.js Version:** 20.0.0 or higher (checked by Render automatically)

**Estimated Time:** 15-20 minutes for complete setup

---

## Step-by-Step Service Creation

### Step 1: Log into Render Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Sign in with GitHub (or email if already registered)

![Expected view: Render main dashboard with list of services]

### Step 2: Create a New Web Service

1. Click the **"New +"** button in the top-right corner
2. Select **"Web Service"** from the dropdown menu

![Expected view: Selection menu with options like "Web Service", "Database", "Redis", etc.]

### Step 3: Connect GitHub Repository

1. Under **"Connect a repository"** section, search for: `imobi`
2. Look for: `contatovinicaetano93-commits/imobi`
3. Click **"Connect"** next to the repository

![Expected view: Repository selection showing contatovinicaetano93-commits/imobi]

**Note:** Render may ask you to authorize GitHub access. Click "Authorize" if prompted.

### Step 4: Fill in Basic Service Information

In the service creation form, fill in these fields:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imbobi-web-staging` | Service identifier in Render |
| **Environment** | Node.js | Should auto-detect |
| **Region** | `us-east-1` | Same as staging database |
| **Branch** | `claude/happy-goldberg-AFQPj` | Your staging branch |
| **Root Directory** | (leave blank) | Monorepo root level |

![Expected view: Form fields with values entered]

### Step 5: Enter Build Command

In the **"Build Command"** field, enter:

```
pnpm build
```

**Why?**
- This command runs Turborepo to build all workspace dependencies
- Builds in correct order: schemas → core → ui → web
- Creates optimized `.next/` folder for production

![Expected view: Build command input field with "pnpm build" entered]

### Step 6: Enter Start Command

In the **"Start Command"** field, enter:

```
pnpm --filter @imbobi/web start
```

**Alternative (if pnpm fails):**
```
cd apps/web && npm start
```

**Why?**
- Tells Render to run only the web app (not the entire monorepo)
- `--filter @imbobi/web` targets the web package specifically
- Starts Next.js production server on port 3000

![Expected view: Start command input field with the pnpm command entered]

### Step 7: Select Instance Type

Scroll down to **"Instance Type"**:

**Recommended for Staging:**
- **Free Tier**: 0.5 CPU, 512 MB RAM (works for light testing)
- **Starter** ($7/month): 1 CPU, 512 MB RAM (recommended for stability)

For this staging deployment, choose **Free** to test, then upgrade to **Starter** if needed.

![Expected view: Instance type selector with options and pricing]

### Step 8: Auto-Deploy Settings (Optional)

Scroll to **"Auto-Deploy"** section:
- **Recommended:** Keep as "Yes, auto-deploy to latest commit"
- This means every push to `claude/happy-goldberg-AFQPj` automatically redeploys

If you prefer manual control, select "No" and deploy via the Redeploy button.

![Expected view: Toggle switch for auto-deploy]

### Step 9: Create the Service

1. Click **"Create Web Service"** button at the bottom
2. Render will now:
   - Clone the repository
   - Install dependencies with pnpm
   - Run `pnpm build`
   - Run `pnpm --filter @imbobi/web start`

A **deployment progress screen** appears with live logs. Wait for the message:
```
✓ Service is live
```

This usually takes 3-5 minutes.

![Expected view: Build log with green checkmarks and "Service is live" message]

---

## Build & Start Commands (Technical Details)

### Project Structure: Turborepo Monorepo

The imobi project uses **Turborepo + pnpm workspaces**:

```
imobi/
├── apps/
│   ├── web/              ← Next.js frontend (THIS SERVICE)
│   └── mobile/           ← Expo mobile app
├── packages/
│   ├── schemas/          ← Zod validation schemas
│   ├── core/             ← Shared hooks & utilities
│   └── ui/               ← Shared UI components
├── services/
│   └── api/              ← NestJS backend API
├── pnpm-workspace.yaml   ← Workspace config
└── turbo.json            ← Build orchestration
```

### Build Command Flow: `pnpm build`

```
pnpm build
↓
Turborepo reads turbo.json
↓
Builds in dependency order:
  1. @imbobi/schemas    (no dependencies)
  2. @imbobi/core       (depends on schemas)
  3. @imbobi/ui         (depends on schemas, core)
  4. @imbobi/web        (depends on schemas, core, ui)
↓
Next.js transpiles:
  - TypeScript → JavaScript
  - JSX → React code
  - Tailwind CSS → compiled styles
↓
Creates optimized output in: apps/web/.next/
```

**Key Files Generated:**
- `apps/web/.next/` — Production-ready Next.js build
- `apps/web/.next/server/` — Server functions (App Router)
- `apps/web/.next/static/` — Compiled client code, CSS, images

### Start Command Flow: `pnpm --filter @imbobi/web start`

```
pnpm --filter @imbobi/web start
↓
pnpm workspace filter selects only @imbobi/web package
↓
Runs: npm start (from apps/web/package.json)
↓
Executes: next start (Next.js production server)
↓
Server starts on port 3000
↓
Render exposes on public HTTPS URL
```

**Next.js Production Server:**
- Serves pre-built `.next/` folder
- Uses server-side rendering (SSR) for routes
- Serves static assets with compression
- Implements automatic code splitting

### If pnpm Build Fails

**Common Issue:** "pnpm: command not found"

**Workaround:** Change start command to:
```
cd apps/web && npm start
```

This skips pnpm and uses standard npm from the web folder directly.

---

## Environment Variables

### Step 10: Add Environment Variables in Render Dashboard

In the **"Environment"** section, add these variables:

| Variable | Value | Visibility |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_URL` | `https://api.staging.imbobi.com/api/v1` | Public (for browser) |
| `NODE_ENV` | `staging` | Private |

**Input Method:**
1. Click **"Advanced"** or **"Environment Variables"**
2. Click **"Add Environment Variable"**
3. For each variable:
   - **Key:** Enter the variable name
   - **Value:** Enter the corresponding value
   - Click **"Add"**
4. Repeat for both variables

![Expected view: Environment variables input form with two entries]

### Environment Variable Explanation

**`NEXT_PUBLIC_API_URL`**
- **Accessible in:** Browser (not a secret!)
- **Purpose:** Tells the web app where the API is located
- **Value:** `https://api.staging.imbobi.com/api/v1`
- **Used by:** `@imbobi/core` API client for all backend requests
- **Why "NEXT_PUBLIC"?** Next.js automatically exposes to frontend at build time

**`NODE_ENV`**
- **Purpose:** Indicates environment (development, staging, production)
- **Value:** `staging` (for this deployment)
- **Used by:** Next.js optimization and error handling

### Variables NOT Needed for Web Frontend

The web app is **frontend-only**. It does NOT need:
- Database URL
- Redis credentials
- AWS credentials
- JWT secrets

**These are only needed for the API service.**

---

## Deployment Settings

### Instance Type & Pricing

**Free Tier:**
- **CPU:** 0.5
- **RAM:** 512 MB
- **Cost:** $0/month
- **Best for:** Testing, light staging workloads
- **Limitation:** May be slower to build and respond

**Starter ($7/month):**
- **CPU:** 1
- **RAM:** 512 MB
- **Cost:** $7/month
- **Best for:** Staging with multiple concurrent users
- **Benefit:** Faster builds and responses

**Standard ($12/month):**
- **CPU:** 1
- **RAM:** 1 GB
- **Cost:** $12/month
- **Best for:** Production or high-traffic staging
- **Benefit:** More memory for caching

For this staging deployment:
- **Start with:** Free tier
- **Upgrade if needed:** After testing, switch to Starter for reliability

![Expected view: Instance type dropdown with pricing]

### Region Selection

**Selected Region:** `us-east-1`

**Why this region?**
- Matches staging database location (reduced latency)
- Matches API service region
- Standard AWS region with good uptime
- No specific compliance requirements for staging

**Available Regions:**
- North Carolina, USA (us-east-1)
- Ohio, USA (us-east-4)
- Oregon, USA (us-west-1)
- Frankfurt, Germany (eu-central-1)
- London, UK (eu-west-1)
- Singapore (ap-southeast-1)

Use `us-east-1` unless you have specific geographic requirements.

### HTTPS & Domains

**HTTPS:** Enabled by default ✓
- Render automatically provides SSL certificate
- Your URL will be: `https://imbobi-web-staging.onrender.com`
- No configuration needed

**Custom Domain (Optional):**
- See [Domain Configuration](#domain-configuration) section

### Auto-Deploy

**Recommended Setting:** Auto-deploy enabled

This means:
- Every push to `claude/happy-goldberg-AFQPj` auto-deploys
- Render watches the branch for new commits
- New deployment starts automatically
- Takes 3-5 minutes per deploy

**To manually deploy instead:**
1. Render dashboard → Select service
2. Click **"Redeploy"** button (top-right)
3. Select commit and redeploy

---

## Post-Deployment Verification

### Step 11: Wait for Deployment to Complete

After clicking "Create Web Service":
1. A **deployment progress page** appears
2. Watch the build log for:
   - ✓ Dependencies installed
   - ✓ Build completed
   - ✓ Server started
3. Wait for message: **"Service is live"**
4. Note your public URL (e.g., `imbobi-web-staging.onrender.com`)

Typical timeline:
- **First deployment:** 3-5 minutes
- **Subsequent deployments:** 1-3 minutes (cached dependencies)

![Expected view: Build log with timestamps and green checkmarks]

### Step 12: Verify the Landing Page

#### Test 1: Access the Web App

1. Go to your Render URL: `https://imbobi-web-staging.onrender.com`
2. You should see the **landing page** load
3. Verify you see:
   - imobi logo/branding
   - Hero section with headline
   - Feature cards or sections
   - Call-to-action buttons (Sign Up, Learn More, etc.)

If blank page appears:
- Wait 30 seconds and refresh (F5)
- Check browser console (F12) for errors
- If still blank, see [Troubleshooting](#troubleshooting)

![Expected view: Landing page with hero, features, and CTA buttons]

#### Test 2: Check the Cadastro (Registration) Link

1. On the landing page, find the **"Cadastro"** or **"Sign Up"** button
2. Click it
3. You should navigate to: `/cadastro`
4. Verify the registration form appears with fields:
   - Email address
   - Password
   - Company/Organization (if applicable)
   - Confirm password
   - Submit button

**Expected URL:** `https://imbobi-web-staging.onrender.com/cadastro`

If page shows error:
- Check browser console (F12 → Console tab)
- Look for error messages
- Verify `NEXT_PUBLIC_API_URL` environment variable is set correctly

![Expected view: Registration form with input fields and submit button]

#### Test 3: Verify Dashboard Redirect

1. Manually type in URL bar: `https://imbobi-web-staging.onrender.com/dashboard`
2. Press Enter
3. Page should **redirect to `/login`** (because you're not authenticated)
4. You should see a **login form** with:
   - Email input
   - Password input
   - Login button
   - "Forgot password?" link
   - "Sign up" link to cadastro

**Expected Final URL:** `https://imbobi-web-staging.onrender.com/login`

This tests:
- Authentication middleware is working
- App recognizes unauthenticated access
- Redirect logic is correct

![Expected view: Login form with email/password fields and submit button]

#### Test 4: Verify API Connectivity

1. Open the web app in browser
2. Press **F12** to open Developer Tools
3. Go to **Network** tab
4. Perform an action:
   - Try logging in with test credentials
   - Fill out registration form and submit
5. Look at network requests
6. Find requests going to: `https://api.staging.imbobi.com/api/v1`
7. Check the response status (should be 200, 201, 400, 401 — not 0 or connection error)

**What this verifies:**
- Web app can communicate with API
- API URL is configured correctly
- Network connectivity is working
- No CORS errors blocking requests

**Expected requests:**
- `POST /api/v1/auth/login` (status 200 or 401)
- `POST /api/v1/auth/register` (status 201 or 400)

![Expected view: DevTools Network tab showing requests to api.staging.imbobi.com]

### Step 13: Review Build Logs

If deployment failed or app not loading:

1. Render dashboard → Select your service (imbobi-web-staging)
2. Click **"Logs"** tab
3. Read from bottom to top (latest first)
4. Look for error messages (usually in red text)

**Common errors:**

| Error | Solution |
|-------|----------|
| `pnpm: command not found` | Use alternative start command: `cd apps/web && npm start` |
| `Module not found: @imbobi/web` | Check turbo.json configuration, may need to rebuild |
| `ENOENT: apps/web/next.config.js` | Project structure issue, check file paths |
| `Port 3000 already in use` | Render bug, usually resolves on redeploy |
| `Out of memory` | Upgrade to Starter instance type |

---

## Monitoring & Troubleshooting

### Real-Time Monitoring

#### View Application Logs

1. Render dashboard → Select service
2. Click **"Logs"** tab
3. Logs auto-refresh every few seconds
4. Color coding:
   - **White:** Normal application output
   - **Yellow:** Warnings
   - **Red:** Errors

#### Check Metrics

1. Render dashboard → Select service
2. Click **"Metrics"** tab
3. View:
   - **CPU usage:** % CPU being used
   - **Memory usage:** MB RAM being used
   - **Network:** Bandwidth in/out
   - **Requests:** HTTP request count
   - **Response time:** Average response time

If **CPU or memory consistently high**:
- Upgrade to Starter or Standard instance
- Check for memory leaks in application logs

#### Monitor Uptime

1. Render dashboard → Select service
2. Scroll down to **"Status"** section
3. Shows uptime percentage and recent deployments
4. Click deployment to see detailed logs

### Common Issues & Solutions

#### Issue 1: Blank Page / 404 Error

**Symptoms:**
- Landing page shows blank
- Or shows "404 Not Found"

**Diagnosis:**
1. Check build logs for errors
2. Verify start command is correct
3. Check if port is correctly bound

**Solution:**
1. Go to Render dashboard → **Settings** tab
2. Try alternative start command:
   ```
   cd apps/web && npm start
   ```
3. Click **"Redeploy"**
4. Wait 2-3 minutes and refresh page

#### Issue 2: "Cannot Find Module" Errors

**Symptoms:**
- Errors like: `Cannot find module '@imbobi/core'`

**Cause:** Workspace dependencies not properly linked

**Solution:**
1. Render dashboard → **Environment** tab
2. Add environment variable: `PNPM_VERSION=9.0.0`
3. Click **"Redeploy"**
4. Wait for rebuild and test again

#### Issue 3: API Not Responding / CORS Errors

**Symptoms:**
- Network errors in browser console
- Requests to API fail or timeout
- Error: "blocked by CORS policy"

**Diagnosis:**
1. Check `NEXT_PUBLIC_API_URL` is set correctly: `https://api.staging.imbobi.com/api/v1`
2. Verify API service is running and accessible
3. Check API's CORS configuration includes this web domain

**Solution:**
1. Verify environment variable:
   - Render dashboard → Environment tab
   - Check `NEXT_PUBLIC_API_URL` value
2. Test API directly:
   - Open browser console
   - Try: `fetch('https://api.staging.imbobi.com/api/v1/health')`
   - Should return successful response
3. If API error, contact API team or check API deployment

#### Issue 4: Slow Performance

**Symptoms:**
- Page loads slowly (>3 seconds)
- High CPU/memory in metrics

**Solution:**
1. Check instance type (free tier = slower)
2. Upgrade to Starter ($7/month):
   - Render dashboard → **Settings** → Instance Type
   - Select **Starter**
   - Click **"Save"**
   - Service restarts automatically
3. Monitor metrics again after 5 minutes

#### Issue 5: Deployment Takes Too Long (>10 minutes)

**Symptoms:**
- Build is stuck or hanging

**Solution:**
1. Cancel deployment:
   - Render dashboard → Click **"Cancel"**
2. Check build logs for stuck step
3. Try redeploy:
   - Click **"Redeploy"** button
4. If persists, try updating build command:
   - Change to: `pnpm build --force`

### Getting Help

**For Render-specific issues:**
- Render docs: https://render.com/docs
- Check Render status page: https://status.render.com

**For Next.js issues:**
- Next.js docs: https://nextjs.org/docs

**For imobi application issues:**
- Check project CLAUDE.md
- Review source code in `apps/web/`

---

## Domain Configuration

### Option 1: Use Render's Default Domain (Recommended for Staging)

Your app is automatically available at:
```
https://imbobi-web-staging.onrender.com
```

**Advantages:**
- No DNS configuration needed
- Free HTTPS certificate
- Works immediately

**Disadvantages:**
- `onrender.com` domain (not branded)

### Option 2: Configure Custom Domain

If you want to use a custom domain like `staging.imbobi.com`:

#### Step 1: Verify Domain Ownership

1. Purchase domain (if not already owned)
2. Ensure you have access to DNS records

#### Step 2: Add Domain in Render

1. Render dashboard → Select service
2. Go to **"Settings"** tab
3. Scroll to **"Custom Domains"** section
4. Click **"Add Custom Domain"**
5. Enter: `staging.imbobi.com`
6. Click **"Add"**

#### Step 3: Update DNS Records

Render provides DNS instructions:
1. Copy the **CNAME value** provided by Render
2. Go to your domain registrar (GoDaddy, Namecheap, Route 53, etc.)
3. Find DNS settings for `staging.imbobi.com`
4. Add CNAME record:
   - **Name:** `staging` or `staging.imbobi.com` (depending on registrar)
   - **Value:** (the CNAME value from Render)
   - **TTL:** 3600

#### Step 4: Verify DNS Propagation

1. Wait 5-15 minutes for DNS to propagate
2. Try accessing: `https://staging.imbobi.com`
3. Should load your web app (may show SSL warning for 5-10 min while cert generates)

**Certificate Generation:**
- Render auto-generates free SSL certificate (Let's Encrypt)
- Takes 5-30 minutes
- Once ready, HTTPS works without warnings

---

## Workflow: Deploying Updates

### Deploy Code Changes

**Scenario:** You've made changes to the web app and want to deploy.

#### Method 1: Auto-Deploy (If Enabled)

1. **Commit and push to the staging branch:**
   ```bash
   git add .
   git commit -m "feat: update landing page hero section"
   git push origin claude/happy-goldberg-AFQPj
   ```

2. **Render automatically detects the push:**
   - Render webhook receives GitHub event
   - New deployment starts automatically
   - Usually within 30 seconds

3. **Monitor the deployment:**
   - Go to Render dashboard
   - Watch the "Logs" tab
   - Wait for "Service is live"

4. **Verify the changes:**
   - Go to https://imbobi-web-staging.onrender.com
   - Hard refresh (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)
   - Check that your changes appear

#### Method 2: Manual Deploy (If Auto-Deploy Disabled)

1. **Make code changes and commit:**
   ```bash
   git add .
   git commit -m "feat: update dashboard layout"
   git push origin claude/happy-goldberg-AFQPj
   ```

2. **Trigger manual deployment:**
   - Go to Render dashboard
   - Select your service (imbobi-web-staging)
   - Click **"Redeploy"** button (top-right)
   - Confirm when prompted

3. **Wait for deployment:**
   - Watch logs for "Service is live"
   - Usually 1-3 minutes

4. **Verify changes:**
   - Hard refresh browser
   - Test functionality

### Rollback to Previous Deployment

If new deployment breaks the app:

1. Render dashboard → Select service
2. Scroll to **"Deployments"** section
3. Find the previous working deployment
4. Click **"..." menu** → **"Redeploy"**
5. Render rolls back to that commit

Changes will be live in 1-3 minutes.

### Disable/Enable Auto-Deploy

**To disable auto-deploy:**
1. Render dashboard → Select service
2. Go to **"Settings"** tab
3. Find **"Auto-Deploy"** setting
4. Toggle to **"No"**
5. Click **"Save"**

**To enable auto-deploy:**
1. Same steps, toggle to **"Yes"**

---

## Scaling & Cost

### Estimated Costs

| Tier | CPU | RAM | Cost | Best For |
|------|-----|-----|------|----------|
| Free | 0.5 | 512 MB | $0 | Development, light testing |
| Starter | 1 | 512 MB | $7/month | Staging with few users |
| Standard | 1 | 1 GB | $12/month | Staging with multiple concurrent users |
| Pro | 2 | 1 GB | $18/month | High-traffic staging or production |

**For this staging deployment:** Start with **Free**, upgrade to **Starter** if needed.

### When to Upgrade

**Signs you need to upgrade:**
- Build times exceed 10 minutes
- Page load times exceed 3 seconds
- Metrics show CPU > 80% or Memory > 80%
- Multiple concurrent users experiencing slowness

**To upgrade:**
1. Render dashboard → **Settings**
2. Click **"Change Instance Type"**
3. Select new tier
4. Click **"Save"**
5. Service restarts (usually < 1 minute)

### Cost Optimization Tips

1. **Use free tier for development/testing** — Deploy only to staging when ready
2. **Enable auto-deploy** — Avoid manual redeploys which consume resources
3. **Monitor metrics** — Upgrade only if needed, don't overprovision
4. **Clean up old deployments** — Render stores old deployments (can clean manually)

For staging: **Free tier is usually sufficient.** Upgrade to Starter ($7/month) if performance becomes an issue.

---

## Deployment Checklist

Before deploying, verify:

- [ ] GitHub repository: contatovinicaetano93-commits/imobi
- [ ] Branch: claude/happy-goldberg-AFQPj
- [ ] Build command: `pnpm build`
- [ ] Start command: `pnpm --filter @imbobi/web start`
- [ ] Environment variable: `NEXT_PUBLIC_API_URL` = `https://api.staging.imbobi.com/api/v1`
- [ ] Environment variable: `NODE_ENV` = `staging`
- [ ] Region: `us-east-1`
- [ ] Instance type: Free (or Starter)
- [ ] Runtime: Node.js

After deployment, verify:

- [ ] Service shows "Service is live"
- [ ] Landing page loads (https://imbobi-web-staging.onrender.com)
- [ ] `/cadastro` link works and shows registration form
- [ ] `/dashboard` redirects to `/login`
- [ ] API calls in Network tab go to correct endpoint
- [ ] No console errors in browser DevTools

---

## Support & Documentation

### Official Documentation
- **Render Docs:** https://render.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/app/building-your-application/deploying
- **Turborepo:** https://turbo.build/repo/docs

### imobi Documentation
- **Project Guide:** See `CLAUDE.md` in repository root
- **Architecture:** See documentation in `docs/` folder (if exists)

### Need Help?

**For deployment issues:**
1. Check Render logs (see [Monitoring](#monitoring--troubleshooting))
2. Review [Common Issues](#common-issues--solutions) section
3. Check Render status page: https://status.render.com

**For application issues:**
1. Review project CLAUDE.md
2. Check `apps/web/` source code
3. Contact project team

---

## Quick Reference

### URLs
- **Web App:** https://imbobi-web-staging.onrender.com
- **API Backend:** https://api.staging.imbobi.com/api/v1
- **Render Dashboard:** https://dashboard.render.com

### Commands (for local testing)
```bash
# Install dependencies
pnpm install

# Build locally
pnpm build

# Start web app locally (for testing)
cd apps/web
npm start
```

### Environment Variables (Web Frontend Only)
```
NEXT_PUBLIC_API_URL=https://api.staging.imbobi.com/api/v1
NODE_ENV=staging
```

### Render Service Settings
- **Name:** imbobi-web-staging
- **Region:** us-east-1
- **Instance:** Free (or Starter)
- **Auto-Deploy:** Yes

---

**Created:** June 2, 2026  
**Last Updated:** June 2, 2026  
**Maintained by:** Claude Code Assistant  
**For questions:** Review project CLAUDE.md or contact project lead
