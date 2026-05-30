# Vercel Deployment Configuration Guide

## Current Issues & Solutions

### Issue 1: Missing Environment Variables
**Error**: `Environment Variable "DATABASE_URL" references Secret "database_url", which does not exist`

**Cause**: Vercel is looking for environment variables that haven't been configured in the Vercel Dashboard.

**Solution**:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project `imobi-web`
3. Navigate to **Settings → Environment Variables**
4. Add the following variables with **Production** scope:

```
DATABASE_URL          → [Your PostgreSQL connection string - mark as Secret]
NEXT_PUBLIC_SENTRY_DSN → [Your Sentry DSN - mark as Secret]
AWS_ACCESS_KEY_ID     → [Your AWS access key - mark as Secret]
AWS_SECRET_ACCESS_KEY → [Your AWS secret key - mark as Secret]
SENDGRID_API_KEY      → [Your SendGrid API key - mark as Secret]
REDIS_URL             → [Your Redis connection string - mark as Secret]
```

See `.env.vercel.example` for the complete list of required variables.

---

### Issue 2: Vercel Rate Limit (Free Tier)
**Error**: `Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day")`

**Cause**: Vercel free tier limits 100 deployments per day. Once this is hit, you must wait 24 hours or upgrade.

**Solution** (pick one):
- **Option A**: Wait 24 hours, then retry deployment
- **Option B**: Upgrade to [Vercel Pro](https://vercel.com/pricing) for unlimited deployments
- **Option C**: Batch multiple commits together to reduce deployment frequency

**Current Status**: Rate limit will reset automatically after 24 hours (approx. May 30, 2026, 01:22 UTC)

---

### Issue 3: vercel.json Configuration
**Status**: ✅ **RESOLVED**

The `vercel.json` file has been validated and is correct:
- ✅ No invalid `serverless` property
- ✅ Correct `buildCommand` and `outputDirectory`
- ✅ Valid git deployment settings

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured in Vercel Dashboard
- [ ] Database migrations run on production database
- [ ] Redis instance is running and accessible
- [ ] AWS S3 bucket is created and credentials are correct
- [ ] SendGrid account is active with API key
- [ ] Sentry project is created and DSN is configured
- [ ] Firebase project is configured (if using Firebase auth)
- [ ] Health check endpoint returns 200 OK
- [ ] CORS_ORIGIN includes all required domains

---

## Local Testing Before Production Deploy

```bash
# 1. Create .env.local in apps/web with production values
cp .env.vercel.example apps/web/.env.local

# 2. Build locally
pnpm build

# 3. Start production server
pnpm start

# 4. Test critical flows
# - Login with test account
# - View dashboard
# - Create obra
# - Submit obra data
```

---

## Post-Deployment Monitoring

After Vercel deployment is successful:

1. **Sentry Dashboard**
   - Monitor for new errors in production
   - Check error rate and performance metrics

2. **Vercel Dashboard**
   - Check deployment logs for warnings
   - Monitor function runtimes
   - Verify no edge case errors

3. **Application Monitoring**
   - Test all critical user flows
   - Verify database connections are stable
   - Confirm cache is working (Redis)

---

## Rollback Procedure

If production deployment fails:

1. **Immediate Rollback** (< 5 minutes)
   ```bash
   # Vercel auto-rollback: Go to Deployments → Previous → Promote
   ```

2. **Manual Rollback** (if auto-rollback unavailable)
   ```bash
   git revert <failed-commit-sha>
   git push origin main
   # Vercel will auto-deploy previous working version
   ```

3. **Database Rollback** (if needed)
   ```bash
   # Restore from backup created before deployment
   # See PRODUCTION_CUTOVER_PLAN.md for backup procedure
   ```

---

## Related Documentation

- `PRODUCTION_CUTOVER_PLAN.md` — Full deployment plan with timeline
- `.env.vercel.example` — Complete list of environment variables
- `PRODUCTION_READINESS_REPORT.md` — Production readiness validation
