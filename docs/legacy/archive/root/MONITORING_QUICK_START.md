# Monitoring & Load Testing - Quick Start

## 📊 What's Been Created

### Health Check ✅
- **Script**: `./scripts/health-check.sh` (executable)
- **Purpose**: Monitor API health every minute
- **Setup**: `crontab -e` and add: `* * * * * /home/user/imobi/scripts/health-check.sh`
- **View logs**: `tail -f /tmp/health-check.log`

### Load Testing ✅
- **Script**: `./load-test.js` (k6 test)
- **Metrics**: 50 concurrent users for 5 minutes
- **Baselines**: p95 < 800ms, error rate < 5%
- **Run**: `k6 run load-test.js` (requires k6 installation)

## 🔧 What's Missing (TODO)

### Sentry Integration ❌
1. Install: `pnpm add @sentry/nest @sentry/tracing` (in services/api)
2. Set env var: `SENTRY_DSN=https://...` from sentry.io
3. Update `services/api/src/main.ts` (see full guide)
4. Update exception filter (see full guide)

### Vercel Analytics ❌
1. Install: `pnpm add @vercel/analytics` (in apps/web)
2. Add to `apps/web/src/app/layout.tsx`: 
   ```tsx
   import { Analytics } from '@vercel/analytics/react';
   ```
3. Add component: `<Analytics />` in body

### k6 Installation ❌
- Linux: `sudo apt-get install k6`
- macOS: `brew install k6`
- Then run: `k6 run load-test.js`

## 📖 Full Documentation

See: `/home/user/imobi/docs/MONITORING_AND_LOAD_TESTING.md`

## 🚀 Quick Commands

```bash
# Test health endpoint locally
curl http://localhost:4000/api/v1/health | jq

# View health check logs
tail -f /tmp/health-check.log

# Run load test (after k6 install)
k6 run load-test.js

# With custom API URL
API_URL=https://api.example.com k6 run load-test.js
```

## ✅ Health Check Status (Current)

| Component | Status |
|-----------|--------|
| Health endpoint (`GET /api/v1/health`) | ✅ Ready |
| Health check script (`./scripts/health-check.sh`) | ✅ Ready |
| Redis monitoring | ✅ Included in endpoint |
| Email provider check | ✅ Included in endpoint |
| Database check | ✅ Included in endpoint |
| Sentry error tracking | ❌ Not configured |
| Vercel Analytics | ❌ Not configured |
| k6 load testing | ❌ Not installed |

## 🎯 Next Steps

1. **Immediate**: Set up health check cron job
2. **This week**: Install k6 and run baseline load test
3. **Before production**: Configure Sentry + Analytics, verify p95 < 800ms
4. **Post-launch**: Monitor logs and set up alerting rules

---

For detailed instructions, see the full guide in `/home/user/imobi/docs/MONITORING_AND_LOAD_TESTING.md`
