# Sentry Implementation Checklist

This checklist tracks the Sentry setup process from initial configuration through production deployment and verification.

## Phase 1: Account & Project Setup (Manual - 10 minutes)

- [ ] **Create Sentry Account**
  - [ ] Go to https://sentry.io/signup
  - [ ] Sign up with GitHub OAuth or email
  - [ ] Verify email (if using email signup)
  
- [ ] **Create Organization**
  - [ ] Set organization name to `imbobi`
  - [ ] Confirm organization slug
  - [ ] Note organization ID: `o[ORG_ID]`

- [ ] **Create API Project (Node.js)**
  - [ ] Platform: Node.js
  - [ ] Framework: NestJS
  - [ ] Copy DSN for API
  - [ ] Store in secure location: `SENTRY_DSN_API`
  - [ ] Example format: `https://[KEY]@o[ID].ingest.sentry.io/[PROJECT_ID]`

- [ ] **Create Web Project (JavaScript)**
  - [ ] Platform: JavaScript
  - [ ] Framework: Next.js or React
  - [ ] Copy DSN for Web
  - [ ] Store in secure location: `SENTRY_DSN_WEB`
  - [ ] Example format: `https://[KEY]@o[ID].ingest.sentry.io/[PROJECT_ID]`

## Phase 2: Code & Configuration Updates (Completed ✅)

The following have already been completed in the codebase:

- [x] **Web App Updates**
  - [x] Added `@sentry/nextjs@8.0.0` to `apps/web/package.json`
  - [x] Created `/apps/web/lib/sentry.ts` with initialization logic
  - [x] Updated `/apps/web/app/layout.tsx` to initialize Sentry on load
  - [x] Added TypeScript types for Sentry methods

- [x] **Environment Configuration**
  - [x] Updated `.env.example` with Sentry DSN examples
  - [x] Updated `.env.production.example` with production values
  - [x] Documented environment variable naming (`SENTRY_DSN` vs `NEXT_PUBLIC_SENTRY_DSN`)

- [x] **Deployment Configuration**
  - [x] Updated `vercel.json` to include Sentry environment variables
  - [x] Configured both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` refs

- [x] **Documentation**
  - [x] Created `SENTRY_SETUP.md` (comprehensive guide)
  - [x] Created `SENTRY_QUICKSTART.md` (quick reference)
  - [x] Created this checklist

- [x] **API Configuration** (Pre-existing)
  - [x] `@sentry/node@10.55.0` already in `services/api/package.json`
  - [x] `/services/api/src/common/config/sentry.config.ts` already configured
  - [x] Initialization code in `/services/api/src/main.ts`

## Phase 3: Vercel Environment Setup (Manual - 5 minutes)

- [ ] **Set Production Environment Variables**
  - [ ] Go to Vercel dashboard: https://vercel.com/contatovinicaetano93-commits/imobi/settings/environment-variables
  - [ ] Add `SENTRY_DSN` (from Sentry API project)
    - [ ] Value: `https://[KEY]@o[ID].ingest.sentry.io/[API_PROJECT_ID]`
    - [ ] Environment: Production ✅ Staging ✅
  - [ ] Add `SENTRY_RELEASE` (API)
    - [ ] Value: `1.0.0`
    - [ ] Environment: Production ✅ Staging ✅
  - [ ] Add `NEXT_PUBLIC_SENTRY_DSN` (from Sentry Web project)
    - [ ] Value: `https://[KEY]@o[ID].ingest.sentry.io/[WEB_PROJECT_ID]`
    - [ ] Environment: Production ✅ Staging ✅
  - [ ] Add `NEXT_PUBLIC_SENTRY_RELEASE` (Web)
    - [ ] Value: `1.0.0`
    - [ ] Environment: Production ✅ Staging ✅

- [ ] **Verify Variable Configuration**
  - [ ] All 4 variables show correct values
  - [ ] All set to correct environment(s)
  - [ ] No typos in names or values

## Phase 4: Deployment & Verification (5-15 minutes)

- [ ] **Trigger Redeploy**
  - [ ] Go to Vercel Deployments tab
  - [ ] Click on latest deployment
  - [ ] Click "Redeploy" button
  - [ ] Wait for build to complete (~60 seconds)
  - [ ] Monitor build logs for errors

- [ ] **Verify Build Success**
  - [ ] Build status: ✅ Complete (green)
  - [ ] No build errors or warnings
  - [ ] All functions deployed successfully
  - [ ] Visit production URL to confirm app loads

- [ ] **Check Sentry Dashboard**
  - [ ] Go to https://sentry.io
  - [ ] Select your organization
  - [ ] Go to **Issues** tab
  - [ ] Look for deployment event
  - [ ] Verify environment shown as: `production`
  - [ ] Both projects visible (API and Web)

- [ ] **Initial Data Check**
  - [ ] Sentry shows at least one event
  - [ ] Event timestamp matches deployment time
  - [ ] Project assignment is correct (API events in API project, etc.)

## Phase 5: Validation & Testing (Optional - 10 minutes)

### Test Error Capture (Recommended)

- [ ] **Trigger API Error**
  - [ ] Run: `curl https://api.imobi.com/api/v1/invalid-endpoint`
  - [ ] Check Sentry Issues within 1-2 minutes
  - [ ] Verify 404 error appears with full context

- [ ] **Trigger Web Error**
  - [ ] Visit production site in browser
  - [ ] Open browser console
  - [ ] Paste: `throw new Error('Test error from web');`
  - [ ] Check Sentry Issues within 1-2 minutes
  - [ ] Verify error appears with session info

- [ ] **Verify Error Context**
  - [ ] Stack trace visible
  - [ ] Request/response details captured
  - [ ] Environment shows `production`
  - [ ] User information (if applicable)

## Phase 6: Alerts & Monitoring (Optional - 5 minutes)

- [ ] **Create Alert Rule**
  - [ ] Go to Sentry Dashboard → **Alerts**
  - [ ] Click **Create Alert Rule**
  - [ ] Condition: Error count > 5 in 5 minutes
  - [ ] Action: Email to `contato.vinicaetano93@gmail.com`
  - [ ] Save alert
  - [ ] Test alert by generating multiple errors

- [ ] **Create Additional Alerts** (Optional)
  - [ ] New issue created → Send email
  - [ ] Regression detected → Send email
  - [ ] Release deployed → Send email notification

- [ ] **Configure Slack Integration** (If available)
  - [ ] Go to Integrations
  - [ ] Install Slack app
  - [ ] Connect to workspace
  - [ ] Route error alerts to channel

## Phase 7: GitHub Integration (Optional - 5 minutes)

- [ ] **Link GitHub Repository**
  - [ ] Go to Sentry → Settings → Integrations
  - [ ] Search for GitHub
  - [ ] Click **Install**
  - [ ] Authorize Sentry to access repo
  - [ ] Select repository: `contatovinicaetano93-commits/imobi`

- [ ] **Enable Features**
  - [ ] Enable commit tracking
  - [ ] Enable issue linking
  - [ ] Enable code suggestions
  - [ ] Enable pull request comments

## Phase 8: Monitoring & Maintenance

- [ ] **Weekly Review**
  - [ ] Check Sentry Issues dashboard
  - [ ] Review high-frequency errors
  - [ ] Identify patterns
  - [ ] Create issues for critical errors

- [ ] **Performance Review**
  - [ ] Check Performance tab
  - [ ] Review slow transactions
  - [ ] Monitor database query times
  - [ ] Identify bottlenecks

- [ ] **Release Management**
  - [ ] Update `SENTRY_RELEASE` when deploying
  - [ ] Tag releases in Sentry
  - [ ] Track error regression between versions

- [ ] **Team Communication**
  - [ ] Notify team when alerts fire
  - [ ] Share access to Sentry dashboard
  - [ ] Document error resolution process
  - [ ] Schedule weekly error review meetings

## Reference: Environment Variables

### API Variables
```
SENTRY_DSN="https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]"
SENTRY_RELEASE="1.0.0"
SENTRY_ENABLE_PROFILER="true"  # Optional: CPU/memory profiling
```

### Web Variables (Note: NEXT_PUBLIC prefix)
```
NEXT_PUBLIC_SENTRY_DSN="https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]"
NEXT_PUBLIC_SENTRY_RELEASE="1.0.0"
```

**IMPORTANT**: API and Web DSNs are DIFFERENT (different projects in Sentry)

## Troubleshooting Reference

| Issue | Check |
|-------|-------|
| No events in Sentry | Verify DSN is set in Vercel |
| Wrong environment | Check `NODE_ENV` is set to `production` |
| Events missing | Check health checks aren't filtered |
| High event volume | Adjust sample rates in config |
| Source maps missing | Configure in Sentry project settings |

## Sign-Off

- [ ] All code changes implemented
- [ ] Environment variables configured
- [ ] Deployment successful
- [ ] Sentry receiving events
- [ ] Alerts configured
- [ ] Team notified
- [ ] Documentation complete

**Date Completed**: _______________
**Completed By**: _______________
**Sentry Organization**: _______________
**Sentry Dashboard**: https://sentry.io/organizations/[org-slug]/

---

## Quick Links

- **Sentry Main**: https://sentry.io
- **Project Settings**: https://sentry.io/settings/[org]/projects/
- **Organization Settings**: https://sentry.io/settings/[org]/
- **API Docs**: https://docs.sentry.io/platforms/node/
- **Web Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**Last Updated**: May 28, 2026
**Status**: Implementation ready for configuration
