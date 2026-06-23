# Sentry Setup Quick Reference

## TL;DR - Get Sentry Running in 15 Minutes

### 1. Create Sentry Projects (5 min)
```
1. Go to https://sentry.io/signup (or login)
2. Create new project (API - Node.js)
3. Copy DSN: https://[KEY]@o[ID].ingest.sentry.io/[PROJECT_ID]
4. Create another project (Web - JavaScript)
5. Copy second DSN for web
```

### 2. Set Environment Variables (5 min)

**Local Development** (`.env` file):
```bash
# API
SENTRY_DSN=https://[KEY]@o[ID].ingest.sentry.io/[API_ID]
SENTRY_RELEASE=1.0.0

# Web (note NEXT_PUBLIC prefix)
NEXT_PUBLIC_SENTRY_DSN=https://[KEY]@o[ID].ingest.sentry.io/[WEB_ID]
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
```

**Production** (Vercel):
1. Go to https://vercel.com/contatovinicaetano93-commits/imobi/settings/environment-variables
2. Add 4 variables (same names/values as above)
3. Set them to "Production" environment
4. Save

### 3. Redeploy (5 min)
```bash
# In Vercel dashboard:
# Deployments → Click latest → Redeploy
# Wait for build to complete
```

### 4. Verify (3 min)
1. Go to https://sentry.io → Issues
2. Should see deployment event
3. Try triggering a test error
4. Should appear in Sentry within 1-2 minutes

## What Was Set Up

### Code Changes
- ✅ `@sentry/nextjs` added to web app
- ✅ Sentry client library: `/apps/web/lib/sentry.ts`
- ✅ Layout.tsx updated to initialize Sentry
- ✅ API already has Sentry configured (`@sentry/node`)

### Configuration Files Updated
- ✅ `.env.example` - Added DSN examples
- ✅ `.env.production.example` - Added production DSN config
- ✅ `vercel.json` - Added Sentry env vars for deployment
- ✅ `apps/web/package.json` - Added `@sentry/nextjs` dependency

### Documentation
- ✅ `SENTRY_SETUP.md` - Full setup guide (this file)
- ✅ `SENTRY_QUICKSTART.md` - This quick reference

## Using Sentry in Code

### API (NestJS)
```typescript
import { captureException, setUserContext } from "@/common/config";

// Capture errors
try {
  await someOperation();
} catch (error) {
  captureException(error as Error, { userId: "123" });
}

// Track users
setUserContext(userId, email);
```

### Web (Next.js)
```typescript
import { captureException, setUserContext } from "@/lib/sentry";

// Capture errors
try {
  await someOperation();
} catch (error) {
  captureException(error as Error);
}

// Track users
useEffect(() => {
  setUserContext(userId, email);
}, [userId, userEmail]);
```

## DSN Format Reference

```
https://PUBLIC_KEY@o[ORG_ID].ingest.sentry.io/PROJECT_ID
└─────────────┬─────────────────────────────────┬──────┬────────┘
            Key                              Org      Project

Example:
https://abc123def456@o7890.ingest.sentry.io/1234567
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No events in Sentry" | Check DSN is set: `echo $SENTRY_DSN` |
| Build fails with Sentry | Run `pnpm install` to ensure dependencies |
| Events not appearing | Check environment is set to `production` |
| Health checks creating noise | Already filtered in config |

## Next Steps

1. **Monitor production**: Go to https://sentry.io → Issues
2. **Set up alerts**: https://sentry.io → Alerts → Create Alert Rule
3. **Link GitHub**: https://sentry.io → Settings → Integrations
4. **Review dashboard**: https://sentry.io → Discover

## Files Modified/Created

```
/home/user/imobi/
├── SENTRY_SETUP.md                          (NEW - Full guide)
├── SENTRY_QUICKSTART.md                     (NEW - This file)
├── .env.example                             (MODIFIED - Added DSN examples)
├── .env.production.example                  (MODIFIED - Added DSN config)
├── vercel.json                              (MODIFIED - Added env vars)
├── apps/web/
│   ├── package.json                         (MODIFIED - Added @sentry/nextjs)
│   ├── lib/sentry.ts                        (NEW - Sentry client library)
│   └── app/layout.tsx                       (MODIFIED - Initialize Sentry)
└── services/api/
    ├── src/main.ts                          (UNCHANGED - Sentry already initialized)
    └── src/common/config/sentry.config.ts   (UNCHANGED - Sentry already configured)
```

## Sentry Pricing

- **Free tier**: Up to 5,000 events/month
- **Production setup**: Usually requires paid plan
- **Recommendation**: Start with free tier, upgrade as needed

See https://sentry.io/pricing/ for details.

---

**Setup Date**: May 28, 2026
**Status**: Ready for configuration and deployment
