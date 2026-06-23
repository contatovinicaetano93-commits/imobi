# Vercel Rebuild & Deployment Checklist

## Quick Reference

**Build Time**: 3-5 minutes (first build may take longer)  
**Deployment Time**: 1-2 minutes after build completes  
**Monitoring Period**: 5 minutes post-deployment  
**Rollback Time**: < 2 minutes

---

## Pre-Deployment Checklist

Before pushing code or triggering a deployment:

### Code Quality
- [ ] TypeScript compilation passes locally: `pnpm type-check`
- [ ] All tests pass: `pnpm test` (if applicable)
- [ ] Linting passes: `pnpm lint`
- [ ] Build succeeds locally: `pnpm build`
- [ ] Production build runs: `pnpm start`
- [ ] No console errors in development

### Environment Configuration
- [ ] All 12 environment variables configured in Vercel Dashboard
- [ ] Validator script passes: `./scripts/validate-vercel-env.sh`
- [ ] Database migrations complete (if applicable)
- [ ] Redis instance is running and accessible
- [ ] AWS S3 credentials are valid and have necessary permissions
- [ ] SendGrid API key is active

### Git Hygiene
- [ ] Code is committed with clear message
- [ ] Branch is up to date with main: `git pull origin main`
- [ ] No uncommitted changes: `git status`
- [ ] `.env` files are NOT committed (only `.env.example`)

---

## Triggering a Deployment

### Option 1: Automatic (Recommended)
**Best for**: Production deployments, most common case

```bash
# 1. Commit your changes
git add .
git commit -m "your clear message"

# 2. Push to main branch
git push origin main

# Vercel automatically detects push and starts deployment
# (Watch the Vercel Dashboard for progress)
```

**Timeline**:
- Push received: Immediate
- Build starts: Within 30 seconds
- Build completes: 3-5 minutes
- Deployment goes live: 1-2 minutes after build

### Option 2: Manual Redeploy
**Best for**: Re-running a failed deployment, or testing without code changes

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project **imobi-web**
3. Click the **Deployments** tab
4. Find the deployment you want to redeploy
5. Click the three dots (•••) → **Redeploy**
6. Choose:
   - **Use existing Build Cache** (faster, 2-3 min)
   - **Redeploy without Cache** (slower, 4-5 min, but clears any stale cache)
7. Click **Redeploy**

### Option 3: Rebuild from Vercel Dashboard
**Best for**: Debugging configuration changes without code push

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project **imobi-web**
3. Click **Deployments** tab
4. Click the **Details** button on the latest deployment
5. Scroll to **Build Logs** section
6. Click **Redeploy** button in top right

---

## Monitoring During Deployment

### Step 1: Watch Build Progress (3-5 minutes)

In Vercel Dashboard:
1. Click **Deployments** tab
2. Find the deployment with "Building..." status
3. Click **View Build Logs** to see real-time output

**Expected build output**:
```
✓ Resolving packages
✓ Installing dependencies
✓ Running build command
✓ Generating static files
✓ Collecting analytics
✓ Creating deployment bundle
✓ Uploading deployment bundle
✓ Complete
```

**Signs of problems**:
- Build stuck for > 10 minutes
- Out of memory error (OOM)
- Peer dependency warnings (usually OK)
- Module not found errors (CRITICAL)

### Step 2: Check for Build Errors

Common build errors and fixes:

#### ❌ Error: `Module not found: Can't resolve '@imbobi/core'`
**Cause**: Workspace dependencies not properly installed  
**Fix**:
1. Verify `pnpm install` runs successfully locally
2. Check `packages.json` workspaces configuration
3. Trigger **Redeploy without Cache** to force clean install

#### ❌ Error: `Environment variable "DATABASE_URL" is not set`
**Cause**: Environment variable not configured in Vercel  
**Fix**:
1. Go to Settings → Environment Variables
2. Verify all 12 variables are present
3. Run `./scripts/validate-vercel-env.sh` locally
4. Trigger **Redeploy without Cache**

#### ❌ Error: `ENOSPC: no space left on device`
**Cause**: Build artifacts too large or disk full  
**Fix**:
1. Trigger **Redeploy without Cache** to clear old builds
2. Check for large generated files in `.next` directory
3. Verify no large node_modules artifacts are being bundled

#### ❌ Error: `Peer dependency warning for react@...`
**Cause**: Version mismatch between packages  
**Status**: Usually non-fatal (build continues)  
**Action**: Monitor if functionality is actually broken

#### ❌ Error: `Function payload size exceeded`
**Cause**: Lambda function is too large (> 50MB)  
**Fix**:
1. Check if large dependencies are being bundled
2. Use dynamic imports to reduce initial bundle size
3. Split code into smaller functions
4. Review serverless function configuration in `vercel.json`

### Step 3: Wait for Deployment Completion (1-2 minutes)

Status indicators in Vercel Dashboard:
- **Building** → Blue progress bar
- **Ready** → Green checkmark ✓
- **Error** → Red ✗
- **Canceled** → Yellow pause icon

Click on the deployment to view:
- Deployment URL (e.g., `https://imobi-web-abc123.vercel.app`)
- Build duration
- Function runtimes
- Edge cache statistics

### Step 4: Verify Live Deployment (Immediate)

Once status shows "Ready":

1. **Visit the deployment URL**
   - Vercel provides the URL in the deployment details
   - Format: `https://imobi-web-[hash].vercel.app`

2. **Check homepage loads**:
   - Page should load within 2 seconds
   - No 404 or 500 errors in browser console
   - No red error messages

3. **Test critical user flows**:
   - [ ] Can log in
   - [ ] Dashboard loads and displays data
   - [ ] Can create a new obra
   - [ ] Can submit obra data
   - [ ] File uploads work (tests S3)
   - [ ] Profile page loads
   - [ ] Can log out

4. **Monitor browser console for errors**:
   - Press F12 to open Developer Tools
   - Click **Console** tab
   - Should see no red error messages
   - Warnings are OK

---

## Post-Deployment Monitoring (5 minutes)

### Minute 1: Check Sentry Dashboard

1. Log in to [https://sentry.io](https://sentry.io)
2. Navigate to your imobi project
3. Check **Issues** tab for new errors
4. Expected: No new critical errors
5. OK: A few new issues may appear as users interact
6. Problem: High volume of same error (e.g., database connection failures)

**If problems appear**:
- Check error details
- If critical, proceed to Rollback section below

### Minute 2-3: Monitor Vercel Analytics

In Vercel Dashboard:
1. Click **Deployments** → your deployment → **Analytics** tab
2. Check:
   - Response times (should be < 1000ms for initial request)
   - Error rate (should be < 0.1%)
   - Edge requests working correctly

### Minute 4-5: Real-World User Testing

1. Test on actual device (phone + browser, if applicable)
2. Try the flows that were changed in this deployment
3. Check that specific feature is working
4. Look for console warnings/errors

### After 5 minutes: Continuous Monitoring

Let deployment run for at least 5 minutes before declaring success. Continue to monitor:
- Sentry error rate
- Vercel analytics
- Actual user reports in Slack/Discord

---

## Checking Deployment Status

### Current Status Command (Git)
```bash
# See latest commits and deployments
git log --oneline -5
```

### In Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **imobi-web** project
3. Click **Deployments** tab
4. Deployments are listed most-recent-first
5. Green checkmark = successful
6. Red X = failed
7. Blue progress = still building/deploying

### Via Vercel CLI (if installed)
```bash
vercel deployments --json | head -10
```

---

## Rollback Procedure

### Quick Rollback (< 2 minutes)

If deployment is broken and needs immediate rollback:

#### Method 1: Promote Previous Deployment (Recommended)
1. Go to Vercel Dashboard
2. Click **Deployments** tab
3. Find the last known-good deployment (usually second in list)
4. Click the deployment
5. Click **Promote to Production** button
6. Confirm the action

**Result**: Production URL immediately points to previous version  
**Time**: < 30 seconds to activate

#### Method 2: Revert Git Commit
```bash
# Revert the problematic commit
git revert HEAD --no-edit

# Push to main
git push origin main

# Vercel automatically builds and deploys the reverted code
```

**Result**: New deployment with old code  
**Time**: 4-6 minutes for new build

#### Method 3: Manual Downtime
If both methods above fail:
1. Contact Vercel support (for paid plans)
2. Or temporarily take site down: go to project Settings → Domains → change domain mapping

### Database Rollback (If Migrations Failed)

If a database migration caused data corruption:

```bash
# DO NOT do this in production without backup verification

# 1. Identify the failed migration
ls services/database/migrations/

# 2. Restore from backup
# Contact database provider to restore from automated backup
# Typically available for last 30 days

# 3. Re-run successful migrations only
pnpm db:migrate
```

**Important**: Have a backup plan BEFORE deploying database changes

---

## Understanding Build Logs

### Build Log Sections

#### ❌ Resolving packages
```
❌ Error: Could not resolve dependency
```
**Meaning**: Missing or incompatible package  
**Action**: Run `pnpm install` locally, verify lock file, redeploy

#### ❌ Installing dependencies
```
❌ Error: ERESOLVE unable to resolve dependency tree
```
**Meaning**: Conflicting peer dependencies  
**Action**: Usually non-fatal, build will continue, monitor functionality

#### ❌ Running build command
```
❌ Error: Command failed: npm run build
```
**Meaning**: Your build script (in `vercel.json`) failed  
**Action**: Run `pnpm build` locally to reproduce, fix locally, redeploy

#### ✓ Generating static files
```
✓ Generated 1,234 static pages
✓ Generated 56 serverless functions
```
**Meaning**: Build is progressing well  
**Status**: Normal, no action needed

#### ✓ Collecting analytics
```
✓ Telemetry disabled
✓ Build size: 45.2 MB
```
**Meaning**: Build collected metrics  
**Status**: Normal, informational only

---

## Common Deployment Issues

### Issue 1: Deployment Stuck for > 10 minutes

**Possible causes**:
1. Large build artifact
2. Network issues
3. Database migration hanging
4. External API call timeout

**Solutions**:
```bash
# Option A: Cancel and redeploy without cache
# (via Vercel Dashboard UI)

# Option B: Check if deployment is actually running
curl -I https://imobi-web-[hash].vercel.app
# If returns 504 Gateway Timeout, it's likely still building

# Option C: Wait up to 15 minutes for build to complete
```

### Issue 2: "Rate Limit Exceeded" Error

**Error message**: `Resource is limited - try again in 24 hours`

**Cause**: Free tier limit of 100 deployments/day exceeded

**Solutions**:
1. Wait 24 hours for limit to reset
2. Upgrade to Vercel Pro for unlimited deployments
3. Batch commits to reduce deployment frequency

**Check current status**: Vercel Dashboard → Project → Settings → Usage

### Issue 3: Deployment Succeeds but Site is Broken

**Symptoms**:
- Deployment shows "Ready"
- But site shows 500 error or blank page
- Or missing styles/JavaScript

**Debug steps**:
1. Open browser Developer Tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Check Application tab for corrupted cache

**Common fixes**:
```bash
# Clear browser cache
# (Ctrl+Shift+Delete in Chrome, Cmd+Shift+Delete in Safari)

# Or use incognito/private window to skip cache

# Or redeploy without build cache
# (Vercel Dashboard → Deployments → three dots → Redeploy without Cache)
```

### Issue 4: Environment Variables Not Updating

**Symptoms**: Changed variable in Vercel, but old value still used

**Cause**: Build cache contains old value

**Fix**:
1. Go to Vercel Dashboard → Deployments
2. Find the deployment
3. Click three dots (•••) → **Redeploy without Cache**
4. Wait 4-5 minutes for new build with updated values

---

## Performance Monitoring

### Check Function Response Times

In Vercel Dashboard:
1. Click **Analytics** tab
2. Look for "Function Duration" metrics
3. Target: < 200ms for most functions
4. Alert: > 1000ms indicates problems

### Check Cache Hit Rate

In Vercel Dashboard:
1. Click **Analytics** tab
2. Look for "Edge Cache Hit Rate"
3. Target: > 80% for static content
4. Low rate = more serverless function invocations = higher costs

### Monitor Real User Metrics

After deployment, monitor:
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

Check in:
- Vercel Analytics dashboard
- Google PageSpeed Insights
- Browser DevTools → Lighthouse

---

## Deployment Success Criteria

Deployment is considered **successful** when all of these are true:

1. ✅ Vercel status shows "Ready" (green checkmark)
2. ✅ Site homepage loads without errors
3. ✅ Critical user flows work (login, dashboard, create obra)
4. ✅ Browser console has no red error messages
5. ✅ Sentry dashboard shows no sudden spike in errors
6. ✅ Response times are normal (< 1s for most requests)
7. ✅ No database connection errors in logs
8. ✅ File uploads work (S3 connectivity)

If all criteria are met, deployment is safe to consider complete.

---

## Next Steps

- For detailed configuration steps, see: **VERCEL_CONFIG_STEP_BY_STEP.md**
- For deployment planning, see: **VERCEL_DEPLOYMENT_GUIDE.md**
- For production readiness, see: **PRODUCTION_READINESS_REPORT.md**

---

## Quick Command Reference

```bash
# Validate environment variables
./scripts/validate-vercel-env.sh

# Build locally to test before deploying
pnpm build
pnpm start

# Check build size
ls -lh .next/

# View recent deployments (Git)
git log --oneline -10

# Push to trigger deployment
git push origin main

# Revert last deployment
git revert HEAD --no-edit && git push origin main
```
