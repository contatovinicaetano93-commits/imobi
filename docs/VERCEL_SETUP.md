# Vercel Environment Variables Setup

## Overview

This document provides step-by-step instructions for configuring environment variables in the Vercel production environment for the Imbobi application.

## Prerequisites

- Access to Vercel Dashboard with admin permissions
- Credentials from the following services (obtained from Agent 1):
  - New Relic License Key
  - Sentry DSN (Web)
  - Sentry DSN Public (Web)

## Step-by-Step Setup

### 1. Access Vercel Dashboard

1. Navigate to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **imbobi** project
3. Go to **Settings** → **Environment Variables**

### 2. Add Production Environment Variables

Add the following variables in the Vercel dashboard. Ensure each variable is set to the **Production** environment only:

#### Monitoring & Error Tracking

| Variable | Value | Type | Environment |
|----------|-------|------|-------------|
| `NEW_RELIC_LICENSE_KEY` | `<license_key_from_newrelic>` | Encrypted | Production |
| `NEW_RELIC_ENABLED` | `true` | Plain | Production |
| `SENTRY_DSN` | `<sentry_dsn_from_dashboard>` | Encrypted | Production |
| `NEXT_PUBLIC_SENTRY_DSN` | `<sentry_dsn_public>` | Plain | Production |
| `SENTRY_ENVIRONMENT` | `production` | Plain | Production |

### 3. Validation Checklist

After adding all variables, verify the following:

#### New Relic Setup
- [ ] `NEW_RELIC_LICENSE_KEY` is populated (encrypted)
- [ ] `NEW_RELIC_ENABLED` is set to `true`
- [ ] Verify in New Relic dashboard that the app is reporting data

#### Sentry Setup
- [ ] `SENTRY_DSN` is populated (encrypted)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` is populated (public, safe for browser exposure)
- [ ] `SENTRY_ENVIRONMENT` is set to `production`
- [ ] Verify in Sentry dashboard that errors are being captured

#### Database & Infrastructure
- [ ] `DATABASE_URL` is set (should already exist)
- [ ] `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` are set (should already exist)
- [ ] AWS credentials are properly set

#### API Configuration
- [ ] `NEXT_PUBLIC_API_URL=https://api.imbobi.com.br`
- [ ] `CORS_ORIGIN=https://imbobi.com.br` (on API service, not Web)

### 4. Deploy & Verification

1. After adding all variables:
   - Vercel will prompt to redeploy
   - Click "Redeploy" or push a new commit to trigger a deployment
   
2. Monitor deployment:
   - Go to **Deployments** tab
   - Verify build completes successfully
   - Check production URL loads without errors

3. Post-deployment verification:
   - Check Sentry dashboard for incoming error events
   - Check New Relic dashboard for APM data collection
   - Monitor application logs for any startup errors

## Environment Variables Reference

### Complete List Required in Production

All variables from `.env.example` should be configured:

```
# API & Core
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://imbobi.com.br
DATABASE_URL=postgresql://...
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...

# JWT
JWT_SECRET=<strong_random_64_chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imbobi-evidencias-prod

# Web (Next.js)
NEXT_PUBLIC_API_URL=https://api.imbobi.com.br
NEXT_PUBLIC_SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Mobile (Expo)
EXPO_PUBLIC_API_URL=https://api.imbobi.com.br
EAS_PROJECT_ID=...

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://imbobi.com.br

# Firebase/FCM
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# KYC/Identity
UNICO_API_KEY=...
SERPRO_TOKEN=...

# APM & Monitoring
NEW_RELIC_LICENSE_KEY=...
NEW_RELIC_ENABLED=true
SENTRY_DSN=...
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=...
```

## Secrets Management Best Practices

1. **Encrypted Variables**: Use Vercel's encrypted storage for sensitive data:
   - All `*_KEY`, `*_TOKEN`, `*_SECRET` variables
   - Database credentials
   - AWS credentials

2. **Public Variables**: Use `NEXT_PUBLIC_` prefix only for non-sensitive data:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SENTRY_DSN` (this is safe—Sentry provides a public DSN)
   - `NEXT_PUBLIC_SENTRY_ENVIRONMENT`

3. **Never Commit Secrets**: 
   - Update `.env.example` with placeholder values, not real secrets
   - Use Vercel UI or CLI for sensitive data only

## Troubleshooting

### Build Fails After Adding Variables
- Check variable names for typos (case-sensitive)
- Verify special characters are properly escaped
- Ensure `NODE_ENV=production` is set
- Check Vercel build logs for specific errors

### Application Starts but Monitoring Not Working
- Verify API keys/DSNs are correct in Vercel UI
- Check that variables are assigned to **Production** environment only
- Redeploy the application after updating variables
- Check service dashboards (New Relic, Sentry) for account/billing issues

### Environment Variables Not Appearing in Logs
- Variables prefixed with `NEXT_PUBLIC_` are embedded in client bundles
- Other variables should only appear in server logs
- Use `console.log(process.env.VARIABLE_NAME)` in API routes to debug

## References

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [New Relic License Key Setup](https://docs.newrelic.com/docs/accounts/accounts-billing/account-setup/new-relic-license-key/)
- [Sentry DSN Configuration](https://docs.sentry.io/product/sentry-basics/dsn-explainer/)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## Maintenance

- Review and rotate sensitive credentials quarterly
- Monitor variable usage in Vercel Analytics
- Update documentation when adding new integrations
- Test staging deployments before production changes
