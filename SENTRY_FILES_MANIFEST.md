# Sentry Implementation - Files Manifest

## Complete List of Changes

### NEW Files Created

```
/home/user/imobi/
├── SENTRY_SETUP.md                          (11 KB) - Comprehensive setup guide
├── SENTRY_QUICKSTART.md                     (4.6 KB) - Quick reference guide
├── SENTRY_IMPLEMENTATION_CHECKLIST.md       (8.3 KB) - Task tracking checklist
├── SENTRY_IMPLEMENTATION_SUMMARY.md         (9.8 KB) - Implementation overview
├── SENTRY_FILES_MANIFEST.md                 (this file) - File changes reference
├── apps/web/
│   └── lib/
│       └── sentry.ts                        (2.4 KB) - Sentry client library
```

### MODIFIED Files

```
/home/user/imobi/
├── .env.example                             - Added NEXT_PUBLIC_SENTRY_DSN examples
├── .env.production.example                  - Added API + Web Sentry configuration
├── vercel.json                              - Added Sentry env var references
├── apps/web/
│   ├── package.json                         - Added @sentry/nextjs@8.0.0
│   └── app/layout.tsx                       - Added Sentry initialization
```

## Detailed Changes

### 1. `/home/user/imobi/apps/web/package.json` (MODIFIED)

**Change**: Added Sentry dependency

```diff
  "dependencies": {
    "@hookform/resolvers": "^3.6.0",
    "@imbobi/core": "workspace:*",
    "@imbobi/schemas": "workspace:*",
    "@imbobi/ui": "workspace:*",
+   "@sentry/nextjs": "^8.0.0",
    "@vercel/analytics": "^2.0.1",
    ...
  }
```

### 2. `/home/user/imobi/apps/web/lib/sentry.ts` (NEW)

**Purpose**: Sentry client library for error tracking and monitoring

**Exports**:
- `initSentry()` - Initialize Sentry with DSN and configuration
- `captureException(error, context?)` - Manually capture exceptions
- `captureMessage(message, level?)` - Capture log messages
- `setUserContext(userId, email?)` - Track user sessions
- `clearUserContext()` - Clear user on logout
- `addBreadcrumb(message, category?, level?)` - Add debug breadcrumbs

**Configuration**:
- Reads `NEXT_PUBLIC_SENTRY_DSN` from environment
- Reads `NEXT_PUBLIC_SENTRY_RELEASE` for version tracking
- Reads `NODE_ENV` for environment detection
- 10% trace sample rate in production, 100% in development
- Session replay enabled (masked for privacy)
- Health check endpoints filtered

### 3. `/home/user/imobi/apps/web/app/layout.tsx` (MODIFIED)

**Changes**:
- Added import: `import { useEffect } from "react";`
- Added import: `import { initSentry } from "@/lib/sentry";`
- Added initialization check: `if (typeof window !== "undefined") { initSentry(); }`
- Added useEffect hook to initialize on component mount
- Maintains existing Analytics component

**Why**: Ensures Sentry is initialized before errors can occur in browser

### 4. `/home/user/imobi/.env.example` (MODIFIED)

**Changes**: Added Sentry DSN examples for web app

```diff
  # ── WEB (Next.js) ──────────────────────────────────
  NEXT_PUBLIC_API_URL=https://api.imbobi.com.br
+ NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
+ NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
  
  # ── MOBILE (Expo) ──────────────────────────────────
```

### 5. `/home/user/imobi/.env.production.example` (MODIFIED)

**Changes**: Updated Sentry error tracking section

```diff
  # ============================================================================
  # ERROR TRACKING & MONITORING (OPTIONAL - strongly recommended for production)
  # ============================================================================
  # Sentry: Real-time error tracking and performance monitoring
  # Sign up at https://sentry.io/signup and create a project
+ # Note: You need TWO separate projects - one for API (Node.js), one for Web (JavaScript/Next.js)
  
+ # API (NestJS + Fastify) - Node.js project
  SENTRY_DSN="https://your_public_key@o123456.ingest.sentry.io/123456"
  SENTRY_RELEASE="1.0.0"
  SENTRY_ENABLE_PROFILER="true"
+ 
+ # Web (Next.js) - JavaScript/Browser project
+ # Must be NEXT_PUBLIC to be available in browser
+ NEXT_PUBLIC_SENTRY_DSN="https://your_public_key@o123456.ingest.sentry.io/654321"
+ NEXT_PUBLIC_SENTRY_RELEASE="1.0.0"
```

### 6. `/home/user/imobi/vercel.json` (MODIFIED)

**Changes**: Added Sentry environment variable references

```diff
  "env": {
    "NODE_ENV": "production",
    "NEXT_PUBLIC_API_URL": "https://api.imobi.com",
+   "NEXT_PUBLIC_SENTRY_DSN": "@next_public_sentry_dsn",
+   "NEXT_PUBLIC_SENTRY_RELEASE": "@next_public_sentry_release",
    "DATABASE_URL": "@database_url",
    ...
  }
```

## Pre-Existing Sentry Configuration (API)

The API already had Sentry configured:

```
/home/user/imobi/services/api/
├── src/main.ts
│   └── Contains: initSentry() call on startup
├── src/common/config/sentry.config.ts
│   └── Contains: Sentry initialization and utility functions
└── package.json
    └── Contains: @sentry/node@10.55.0 and @sentry/tracing@7.120.4
```

No changes were needed for API as it was already properly configured.

## File Sizes Summary

| File | Size | Type | Status |
|------|------|------|--------|
| SENTRY_SETUP.md | 11 KB | Documentation | NEW |
| SENTRY_QUICKSTART.md | 4.6 KB | Documentation | NEW |
| SENTRY_IMPLEMENTATION_CHECKLIST.md | 8.3 KB | Checklist | NEW |
| SENTRY_IMPLEMENTATION_SUMMARY.md | 9.8 KB | Summary | NEW |
| apps/web/lib/sentry.ts | 2.4 KB | Code | NEW |
| .env.example | Updated | Config | MODIFIED |
| .env.production.example | Updated | Config | MODIFIED |
| vercel.json | Updated | Config | MODIFIED |
| apps/web/package.json | Updated | Config | MODIFIED |
| apps/web/app/layout.tsx | Updated | Code | MODIFIED |

## Validation Checklist

### Code Quality
- [x] TypeScript types included
- [x] JSDoc comments added
- [x] Error handling implemented
- [x] Configuration validation present
- [x] Browser-compatible (typeof window check)

### Configuration
- [x] Environment variables documented
- [x] Production vs development configs separated
- [x] Two separate projects documented (API + Web)
- [x] Vercel integration ready

### Documentation
- [x] Comprehensive setup guide created
- [x] Quick reference guide created
- [x] Task checklist created
- [x] Implementation summary created
- [x] File manifest created (this file)

### Integration
- [x] Imported in main layout
- [x] No conflicting imports
- [x] Compatible with existing Analytics
- [x] Ready for pnpm install

## Next Actions for User

1. **Read Documentation** (5 min)
   - Start with: `SENTRY_QUICKSTART.md`
   - Or detailed: `SENTRY_SETUP.md`

2. **Create Sentry Account** (5 min)
   - https://sentry.io/signup

3. **Create Two Projects** (5 min)
   - API project (Node.js)
   - Web project (JavaScript)

4. **Configure Vercel** (5 min)
   - Add 4 environment variables
   - Set to Production environment

5. **Redeploy** (5 min)
   - Trigger redeploy in Vercel
   - Monitor build completion

6. **Verify** (3 min)
   - Check Sentry dashboard
   - Confirm events are received

## Rollback Instructions

If needed to revert changes:

```bash
# Revert code changes
git checkout -- apps/web/package.json
git checkout -- apps/web/app/layout.tsx

# Delete new file
rm apps/web/lib/sentry.ts

# Revert config files
git checkout -- .env.example
git checkout -- .env.production.example
git checkout -- vercel.json

# Delete documentation
rm SENTRY_*.md
```

## Support

For questions about the implementation:
1. Check `SENTRY_SETUP.md` for detailed guidance
2. Review `SENTRY_QUICKSTART.md` for quick answers
3. Use `SENTRY_IMPLEMENTATION_CHECKLIST.md` to track progress
4. Visit https://docs.sentry.io for official documentation

---

**Created**: May 28, 2026
**Status**: Complete and Ready for Configuration
**Next Step**: Create Sentry Account
