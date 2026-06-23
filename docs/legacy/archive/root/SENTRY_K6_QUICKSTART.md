# Sentry & k6 Quick Start Guide

**TL;DR**: 3 steps to production monitoring

## Step 1: Get Sentry DSN (5 minutes)

1. Visit https://sentry.io/signup
2. Sign up with GitHub (easiest)
3. Create organization "imobi"
4. Create Node.js project
5. Copy DSN → Example: `https://abc123@o1234567.ingest.sentry.io/987654`

## Step 2: Add to Vercel (2 minutes)

1. Go to https://vercel.com/dashboard
2. Select imobi project
3. Settings → Environment Variables
4. Add new variable:
   - **Name**: `SENTRY_DSN`
   - **Value**: (paste DSN from Step 1)
   - **Environments**: Production
5. Click Save → Auto-redeploy

## Step 3: Verify & Monitor

Wait 2-3 min for redeploy, then:
- Visit Sentry dashboard → Issues
- Should see "Deployment" event
- Errors auto-captured as they happen

---

## Run Load Test (After API Deployed)

```bash
# Setup k6 in PATH
export PATH="$HOME/go/bin:$PATH"

# Run 5-min baseline test
cd /home/user/imobi
k6 run --env API_URL=https://api.imobi.com.br load-test.js

# Check results pass:
# ✓ p95 < 800ms
# ✓ p99 < 1000ms
# ✓ Error rate < 10%
```

---

## What You Get

| Tool | What | Where |
|------|------|-------|
| **Sentry** | Real-time error tracking | https://sentry.io/dashboard |
| **k6** | Performance baselines | Terminal output + JSON |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Sentry DSN not configured" | Add to Vercel env vars |
| "No events in Sentry" | Wait for redeploy to finish |
| "k6 command not found" | Run: `export PATH="$HOME/go/bin:$PATH"` |
| "Connection refused" | Verify API deployed: `curl https://api.imobi.com.br/health` |

---

## Files

- Sentry config: `/home/user/imobi/services/api/src/common/config/sentry.config.ts`
- Load test: `/home/user/imobi/load-test.js`
- Full guide: `/home/user/imobi/SENTRY_K6_SETUP_REPORT.md`

**That's it! You're monitoring production now.** 🚀
