# 🚂 Railway Deployment - Quick Start (15 minutes)

**Status**: Ready for deployment  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`  
**Estimated Time**: 15-20 minutes

---

## Step 1: Create Railway Project (2 min)

```bash
# Option A: Via Web Dashboard (recommended for first-time)
# 1. Go to https://railway.app
# 2. Sign in / Create account
# 3. Click "New Project"
# 4. Select "Deploy from GitHub"
# 5. Connect GitHub account & select: contatovinicaetano93-commits/imobi
# 6. Select branch: claude/imobi-mvp-fintech-status-jrr2ab
# 7. Click "Deploy"
```

---

## Step 2: Add PostgreSQL Database (3 min)

**Via Railway Dashboard:**
1. Click "New" in your project
2. Select "Database" → "PostgreSQL"
3. Wait for initialization (green checkmark)
4. Copy `DATABASE_URL` from Variables tab

**Expected format:**
```
postgresql://username:password@host.railway.internal:5432/imobi
```

---

## Step 3: Add Redis Cache (3 min)

**Via Railway Dashboard:**
1. Click "New" in your project
2. Select "Cache" → "Redis"
3. Wait for initialization
4. Note from Variables tab:
   - `REDIS_HOST` (ends with `.railway.internal`)
   - `REDIS_PORT` (usually 6379)
   - `REDIS_PASSWORD`

---

## Step 4: Generate Secrets (2 min)

Generate strong keys for JWT & encryption:

```bash
# Generate JWT_SECRET (32+ chars)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32+ chars)
openssl rand -base64 32
```

Save these values — you'll need them in the next step.

---

## Step 5: Configure Environment Variables (3 min)

**In Railway Dashboard:**

1. Go to Project → Variables
2. Add each variable from below:

| Variable | Value | Example |
|----------|-------|---------|
| `NODE_ENV` | `production` | production |
| `PORT` | `3000` | 3000 |
| `DATABASE_URL` | (from Step 2) | `postgresql://...` |
| `REDIS_HOST` | (from Step 3) | `redis-xxx.railway.internal` |
| `REDIS_PORT` | (from Step 3) | 6379 |
| `REDIS_PASSWORD` | (from Step 3) | (auto-generated) |
| `JWT_SECRET` | (from Step 4) | (from openssl command) |
| `ENCRYPTION_KEY` | (from Step 4) | (from openssl command) |
| `LOG_LEVEL` | `info` | info |
| `SENTRY_ENABLED` | `false` | false |
| `PROMETHEUS_ENABLED` | `true` | true |
| `STRUCTURED_LOGGING` | `true` | true |
| `OPENAPI_ENABLED` | `true` | true |
| `SWAGGER_ENABLED` | `true` | true |

> **Note:** Leave SENTRY_DSN, AWS keys, SendGrid, Slack blank for MVP — can add later

---

## Step 6: Deploy API Service (3 min)

**Via Railway Dashboard:**

1. Click "New" in your project
2. Select "GitHub Repo"
3. Configure:
   - **Name**: `imobi-api`
   - **Repo**: `contatovinicaetano93-commits/imobi`
   - **Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`
   - **Root Directory**: `services/api`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build --filter @imbobi/api`
   - **Start Command**: `node dist/main.js`
   - **Node Version**: `20.x`
4. Click "Deploy"
5. Wait for build to complete (green checkmark)

**What to expect:**
- Build starts automatically
- Takes 3-5 minutes
- Shows build logs in real-time
- API becomes available at `https://<railway-subdomain>.railway.app`

---

## Step 7: Run Database Migrations (2 min)

**After API deployment succeeds:**

1. In Railway, open the service shell
2. Run:

```bash
cd services/api
npx prisma migrate deploy --schema prisma/schema.prisma
```

**Expected output:**
```
✓ Applied migration(s): (list of migrations)
```

---

## Step 8: Verify Deployment (3 min)

### Health Check
```bash
curl https://<railway-subdomain>.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-22T22:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### API Docs
```bash
curl https://<railway-subdomain>.railway.app/docs
```

Should show Swagger UI

### Metrics
```bash
curl https://<railway-subdomain>.railway.app/metrics | head -20
```

Should show Prometheus metrics

---

## ✅ Success Criteria

- [ ] Railway project created
- [ ] PostgreSQL database connected & initialized
- [ ] Redis cache connected
- [ ] All environment variables configured
- [ ] API deployed & build succeeded
- [ ] Database migrations applied
- [ ] Health check returns 200 OK
- [ ] Can access Swagger docs at `/docs`

---

## 🚨 Troubleshooting

### Build fails with "pnpm: not found"
- Set Node version to 20.x in Railway
- Ensure build command includes `pnpm install --frozen-lockfile`

### Database migration fails
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is initialized (check Railway dashboard)
- Try running migration again

### API not responding
- Check logs: Railway → Service → Logs
- Verify `PORT=3000` is set
- Check database connection: `RAILS_ENV=production rails db:migrate:status`

### Memory issues
- Reduce `DATABASE_POOL_SIZE` from 25 to 10
- Reduce `REDIS_CONNECT_TIMEOUT` from 5000 to 3000

---

## 📚 Next Steps

Once deployment succeeds:

1. **Update Frontend API URL** → Point to Railway URL
2. **Run E2E Tests** → Test auth flow against production API
3. **Setup Monitoring** → Configure Sentry, UptimeRobot
4. **CI/CD** → Enable auto-deploy on git push

See `docs/RAILWAY_DEPLOYMENT.md` for detailed reference.

---

**Deployment Time**: ~15 minutes  
**Estimated Cost**: Free tier ($5 credits/month included)  
**Status**: ✅ Ready to deploy
