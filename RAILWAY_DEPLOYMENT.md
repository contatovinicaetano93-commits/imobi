# Railway Deployment Guide — imbobi

## Quick Start

### 1. Initialize Railway Project
```bash
# Login to Railway
railway login

# Link to existing project or create new
railway link
```

### 2. Add Services
The `railway.json` automatically configures PostgreSQL and Redis. When you deploy:

```bash
railway up
```

Railway will:
- Build the Docker image from `services/api/Dockerfile`
- Provision PostgreSQL with PostGIS
- Provision Redis
- Auto-generate environment variables

### 3. Required Environment Variables

Railway **auto-generates** these on plugin installation:
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

You must **manually set** these in Railway Console or `.env`:
```
# API Configuration
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://imobi.com.br,https://gestor.imobi.com.br

# JWT Authentication
JWT_SECRET=<64+ character random string> # Use: openssl rand -base64 48
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (Evidence Storage)
ENABLE_S3_STORAGE=true
AWS_S3_BUCKET=imbobi-evidencias-prod
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Email Provider (Choose ONE)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...
# OR
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=...
# SMTP_PASS=...

# Push Notifications (Firebase)
ENABLE_PUSH_NOTIFICATIONS=true
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# App URLs
APP_URL=https://imobi.com.br
NEXT_PUBLIC_API_URL=https://api.imobi.com.br
EXPO_PUBLIC_API_URL=https://api.imobi.com.br
```

## Setting Environment Variables in Railway

### Option A: Via Railway CLI
```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="<your-64-char-secret>"
railway variables set AWS_S3_BUCKET="imbobi-evidencias-prod"
# ... set all others
```

### Option B: Via Dashboard
1. Go to Railway Dashboard → Your Project
2. Click "Variables" tab
3. Add each variable as key-value pair
4. Click "Deploy"

## Deployment Process

### First Time Deployment
```bash
railway up
```

This will:
1. Build Docker image
2. Run Prisma migrations (`pnpm --filter @imbobi/api start` includes `prisma migrate deploy`)
3. Start the API on port 4000
4. Health checks validate `/api/v1/health` endpoint

### Redeployment
```bash
# Simple redeploy
railway up

# Or via GitHub (if connected)
# Push to main/develop → Auto-trigger Railway deployment
```

## Troubleshooting Failing APIs

### Check Logs
```bash
# Stream logs
railway logs --follow

# View specific service logs
railway logs --service api --follow
```

### Common Issues & Fixes

#### 1. **DATABASE_URL Error**
```
Error: DATABASE_URL is required
```
- **Fix**: Railway PostgreSQL plugin auto-generates this. Check:
  ```bash
  railway variables
  ```
- If missing, add PostgreSQL plugin:
  ```bash
  railway add --plugin postgres
  ```

#### 2. **REDIS_URL Error**
```
Error: Redis configuration missing
```
- **Fix**: Add Redis plugin:
  ```bash
  railway add --plugin redis
  ```

#### 3. **Port Already in Use**
```
Error: Port 4000 already in use
```
- **Fix**: Railway auto-assigns PORT. Set `PORT=4000` in variables if needed.

#### 4. **Prisma Migration Failures**
```
Error: PrismaClientInitializationError
```
- **Check**: `DATABASE_URL` is correct format
- **Verify**: PostGIS extension is installed
- **Manual Fix**:
  ```bash
  railway shell
  pnpm --filter @imbobi/api exec prisma migrate deploy
  ```

#### 5. **Health Check Failing**
```
Error: Health check failed for /api/v1/health
```
- **Cause**: API not starting due to configuration errors
- **Fix**: Check logs for root cause:
  ```bash
  railway logs --follow
  ```

## Database Initialization

### On Fresh Deployment
The `start` script handles migrations:
```bash
# In services/api/package.json
"start": "prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"
```

### Manual Schema Setup (if needed)
```bash
railway shell
cd services/api
pnpm prisma migrate deploy
pnpm prisma db seed  # Optional: load seed data
```

### Seed Development Data
```bash
railway shell
cd services/api
pnpm seed:prod
```

## Monitoring & Alerts

### Enable Health Checks
The `railway.json` includes health check configuration:
```json
"healthcheckPath": "/api/v1/health",
"healthcheckTimeout": 30,
"healthcheckInterval": 10
```

### View Metrics
```bash
railway metrics
```

### Monitor in Real-Time
```bash
railway logs --follow --tail 50
```

## Rollback Procedure

### Revert to Previous Deployment
```bash
railway deployments list
railway deployments rollback <deployment-id>
```

## Production Checklist

- [ ] All environment variables set (validate with `railway variables`)
- [ ] Database migrations completed (`Prisma migrate deploy` in logs)
- [ ] Redis connection healthy
- [ ] S3 credentials verified
- [ ] Email provider credentials set
- [ ] Firebase credentials (if push notifications enabled)
- [ ] CORS_ORIGIN includes correct frontend URLs
- [ ] Health check endpoint responding
- [ ] Logs show no critical errors
- [ ] API accessible: `curl https://api.imobi.com.br/api/v1/health`

## Performance Tuning

### Increase Memory/CPU
```bash
railway environment logs
# Check resource usage, then upgrade plan if needed
```

### Database Connection Pooling
Railway PostgreSQL comes with connection limits. For prod, consider:
- PgBouncer setup (Premium)
- Upgrade database tier

### Redis Performance
Default Railway Redis is suitable for:
- BullMQ job queue (liberacao-parcela)
- Session cache
- Rate limiting

For high-traffic scenarios, upgrade to Redis Premium.

## Support & Debugging

### Common Commands
```bash
# Check status
railway status

# View environment
railway variables

# Connect to database
railway shell
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# View deployment history
railway deployments list

# Manual deploy
railway deploy --service api
```

### Enable Verbose Logging
```bash
NODE_ENV=production DEBUG=imbobi:* railway up
```

## Next Steps

1. ✅ Created `railway.json` with PostgreSQL + Redis plugins
2. ✅ Set all required environment variables
3. ✅ Deploy: `railway up`
4. ✅ Verify: `curl https://api.imobi.com.br/api/v1/health`
5. ✅ Monitor: `railway logs --follow`
