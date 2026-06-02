# iMobi Render Deployment - Quick Reference Card

Copy-paste ready commands for Render deployment.

## 1. Generate Security Credentials (Do First!)

```bash
# Generate JWT Secret (64+ characters)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Generate Encryption Key (base64-encoded 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save both values to 1Password before proceeding.

---

## 2. Create Render Services

**In Render Dashboard:**
1. New → PostgreSQL database (name: `imbobi-db`)
2. New → Redis instance (name: `imbobi-redis`)
3. New → Web Service (connect GitHub repo)
4. New → Web Service (connect GitHub repo)

Copy the connection strings from each service.

---

## 3. Environment Variables Cheat Sheet

### Database
```
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
```

### Security (Use generated values above)
```
JWT_SECRET=[from step 1]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=[from step 1]
```

### Redis (From Render dashboard)
```
REDIS_HOST=[from Redis service]
REDIS_PORT=6379
REDIS_PASSWORD=[from Redis service]
```

### API Service
```
PORT=4000
CORS_ORIGIN=https://[your-web-domain]
```

### AWS S3 (For photos)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imbobi-evidencias-prod
```

### Email (Choose ONE)

**Option A: SendGrid (Recommended)**
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...
```

**Option B: AWS SES**
```
EMAIL_PROVIDER=ses
# Uses AWS_* credentials above
```

**Option C: SMTP**
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG...
SMTP_FROM=noreply@imbobi.com.br
```

### Firebase (Push notifications)
```
FIREBASE_PROJECT_ID=[from Firebase]
FIREBASE_PRIVATE_KEY=[from Firebase JSON]
FIREBASE_CLIENT_EMAIL=[from Firebase JSON]
```

### Web Service
```
NEXT_PUBLIC_API_URL=https://[your-api-domain]
NODE_ENV=production
```

---

## 4. Deploy & Test

### Verify API is live
```bash
curl https://api-xxx.render.com/api/v1/health
```

### Run migrations
```bash
DATABASE_URL="postgresql://..." pnpm db:migrate
```

### Enable PostGIS (one-time)
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Seed database (optional)
```bash
DATABASE_URL="postgresql://..." pnpm --filter @imbobi/api seed
```

### Test everything
```bash
./verify-deployment.sh https://api-xxx.render.com https://web-xxx.render.com
```

---

## 5. Common Health Checks

```bash
# API is responding
curl https://api-xxx.render.com/api/v1/health

# Database connection (local)
psql "postgresql://user:pass@host:5432/db" -c "SELECT 1;"

# Redis connection (local)
redis-cli -h host -p 6379 -a password PING

# S3 access (requires AWS CLI)
aws s3 ls s3://imbobi-evidencias-prod

# Email service (SendGrid example)
curl -X GET "https://api.sendgrid.com/v3/user/account" \
  -H "Authorization: Bearer SG.xxxxx"
```

---

## 6. Test Credentials After Seeding

```
Email:    joao@example.com
Password: TestPassword123
Role:     DEVELOPER

Email:    maria@example.com
Password: TestPassword123
Role:     BUILDER
```

---

## 7. Troubleshooting Commands

### View API logs
- In Render dashboard → API service → Logs tab

### Clear build cache
- In Render dashboard → API service → Settings → "Clear build cache"

### Restart service
- In Render dashboard → service → "Restart Service"

### Check environment variables
- In Render dashboard → service → Environment tab

### Test database in Render
- Go to PostgreSQL service → Connections → Query editor

---

## 8. File Locations

- **Full guide:** `DEPLOYMENT_COMMANDS.md`
- **Verification script:** `verify-deployment.sh`
- **This reference:** `QUICK_REFERENCE.md`
- **API config:** `/services/api/.env.example`
- **Dockerfile (API):** `/services/api/Dockerfile`
- **Dockerfile (Web):** `/apps/web/Dockerfile`

---

## 9. Support

For detailed information, see `DEPLOYMENT_COMMANDS.md`
For verification, run `./verify-deployment.sh --help`

Contact: contato.vinicaetano93@gmail.com

---

**Last Updated:** 2026-06-02
