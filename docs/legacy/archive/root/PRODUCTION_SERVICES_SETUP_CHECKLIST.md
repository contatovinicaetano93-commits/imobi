# Production Services Setup Checklist
**imobi MVP - Quick Reference**

---

## 1. AWS S3 Configuration

### AWS CLI Commands (Copy-Paste Ready)

```bash
# 1. Create bucket
aws s3api create-bucket \
  --bucket imobi-evidencias-prod \
  --region us-east-1

# 2. Enable versioning
aws s3api put-bucket-versioning \
  --bucket imobi-evidencias-prod \
  --versioning-configuration Status=Enabled

# 3. Enable encryption (AES-256)
aws s3api put-bucket-encryption \
  --bucket imobi-evidencias-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# 4. Set CORS policy
aws s3api put-bucket-cors \
  --bucket imobi-evidencias-prod \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["https://imobi.vercel.app", "https://api.imobi.com"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'

# 5. Create IAM user
aws iam create-user --user-name imobi-s3-user

# 6. Attach S3 policy
aws iam attach-user-policy \
  --user-name imobi-s3-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# 7. Create access key
aws iam create-access-key --user-name imobi-s3-user
```

### Environment Variables (Vercel Dashboard)

```
AWS_REGION=us-east-1
AWS_S3_BUCKET=imobi-evidencias-prod
AWS_ACCESS_KEY_ID=AKIA... [SECRET]
AWS_SECRET_ACCESS_KEY=... [SECRET]
```

### Verification

```bash
# Test upload to S3
aws s3 cp test.jpg s3://imobi-evidencias-prod/test.jpg
aws s3 ls s3://imobi-evidencias-prod/
```

**Status**: [ ] Complete

---

## 2. SendGrid Email Provider

### SendGrid Setup Steps

1. [ ] Sign up: https://sendgrid.com
2. [ ] Verify domain: imobi.com.br
3. [ ] Add DNS CNAME records:
   ```
   k1._domainkey.imobi.com.br CNAME k1.domainkey.sendgrid.net
   ```
4. [ ] Create API Key:
   - Settings → API Keys
   - Create "Mail Send" key
   - Copy: `SG.xxxxx...`

### Environment Variables (Vercel Dashboard)

```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG... [SECRET]
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://imobi.com.br
```

### Test Email

```bash
# Via curl (after deployment)
curl -X POST https://api.imobi.com/api/email/test \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "seu-email@example.com",
    "type": "bemVindo",
    "nome": "Teste User"
  }'
```

**Status**: [ ] Complete

---

## 3. Firebase Cloud Messaging

### Firebase Setup Steps

1. [ ] Go to: https://console.firebase.google.com
2. [ ] Create project: `imbobi-prod`
3. [ ] Enable Cloud Messaging
4. [ ] Create Web app + iOS app + Android app
5. [ ] Go to Project Settings → Service Accounts
6. [ ] Generate new private key (JSON)
7. [ ] Download and extract:

```bash
# Extract from downloaded JSON
cat downloaded-key.json | jq '.' | grep -E "project_id|private_key|client_email"
```

### Environment Variables (Vercel Dashboard)

```
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" [SECRET]
FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-prod.iam.gserviceaccount.com
```

**Important**: The private key must escape newlines as `\n` literal

### Test Notification (Firebase Console)

1. [ ] Go to Cloud Messaging in Firebase Console
2. [ ] Click "Send your first message"
3. [ ] Title: "Test"
4. [ ] Body: "This is a test"
5. [ ] Select your app and send

**Status**: [ ] Complete

---

## 4. Vercel Environment Variables

### Configure in Vercel Dashboard

Go to: **Vercel Dashboard → imobi-web → Settings → Environment Variables**

Set scope: **PRODUCTION** for all variables

```bash
# Core
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.imobi.com
CORS_ORIGIN=https://imobi.vercel.app,https://api.imobi.com,https://imobi.com.br

# Database & Cache
DATABASE_URL=postgresql://user:pass@host:5432/db [MARK SECRET]
REDIS_URL=redis://user:pass@host:6379 [MARK SECRET]

# Authentication
JWT_SECRET=<generate: openssl rand -base64 48> [MARK SECRET]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=imobi-evidencias-prod
AWS_ACCESS_KEY_ID=AKIA... [MARK SECRET]
AWS_SECRET_ACCESS_KEY=... [MARK SECRET]

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG... [MARK SECRET]
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://imobi.com.br

# Firebase
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" [MARK SECRET]
FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-prod.iam.gserviceaccount.com

# Monitoring
SENTRY_DSN=https://...@...ingest.sentry.io/... [MARK SECRET]
SENTRY_RELEASE=1.0.0
SENTRY_ENABLE_PROFILER=true
SENTRY_TRACING_SAMPLE_RATE=0.1
SENTRY_ERROR_SAMPLE_RATE=1.0

# Optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... [MARK SECRET]
```

**Status**: [ ] Complete

---

## 5. Database Setup

### PostgreSQL with PostGIS

```bash
# Create database (assume AWS RDS or self-hosted)
psql -h your-host -U postgres -c "CREATE DATABASE imbobi_prod;"

# Enable PostGIS extension
psql -h your-host -U postgres -d imbobi_prod -c "CREATE EXTENSION postgis;"

# Run migrations
DATABASE_URL=postgresql://user:pass@host:5432/imbobi_prod \
  npx prisma migrate deploy
```

**Status**: [ ] Complete

---

## 6. Redis Setup

### Redis Instance

Option A: AWS ElastiCache
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id imobi-prod-redis \
  --cache-node-type cache.t3.small \
  --engine redis \
  --engine-version 7.0
```

Option B: Self-hosted
```bash
# Docker Compose
docker run -d -p 6379:6379 redis:7-alpine
```

**Connection String**: `redis://user:password@host:6379`

**Status**: [ ] Complete

---

## 7. Production Smoke Test

### Run Tests

```bash
cd /home/user/imobi
bash PRODUCTION_SMOKE_TEST.sh
```

### Expected Output

```
Total Tests: 27
Passed: 24
Failed: 0
Warned: 3
Success Rate: 88%
✅ ALL CRITICAL FLOWS OPERATIONAL
```

**Status**: [ ] Complete (Already passed!)

---

## 8. Post-Deployment Verification

### Health Check

```bash
curl https://api.imobi.com/api/health
```

Expected response (200 OK):
```json
{
  "status": "OK",
  "modules": {
    "database": { "status": "OK" },
    "redis": { "status": "OK" },
    "s3": { "configured": true },
    "email": { "configured": true },
    "firebase": { "configured": true }
  }
}
```

**Status**: [ ] Complete

---

## 9. Deployment Timeline

```
Day 1 (Today):
[ ] AWS S3 configured
[ ] SendGrid API key created
[ ] Firebase project created

Day 2:
[ ] All env vars configured in Vercel
[ ] Database provisioned + migrations run
[ ] Redis instance running

Day 3:
[ ] Smoke tests pass on staging
[ ] Health check OK
[ ] Manual UAT (user flows)

Day 4:
[ ] Go-live: git push to main
[ ] Monitor Sentry for 24h
[ ] Be on-call for rollback
```

---

## 10. Quick Command Reference

```bash
# Generate JWT secret
openssl rand -base64 48

# Test S3 connection
aws s3 ls s3://imobi-evidencias-prod/

# Test database connection
psql -h $DATABASE_HOST -U $DATABASE_USER -d imbobi_prod -c "SELECT 1;"

# Test Redis connection
redis-cli -h $REDIS_HOST -p 6379 PING

# Run migrations
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy

# Build project
pnpm build

# Start dev
pnpm dev

# Type check
pnpm type-check

# Run tests
pnpm test
```

---

## Troubleshooting

### S3 Access Denied
```bash
# Check IAM policy
aws iam get-user-policy --user-name imobi-s3-user --policy-name inline-policy

# Re-attach if needed
aws iam attach-user-policy \
  --user-name imobi-s3-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### SendGrid Connection Failed
```bash
# Test SMTP
curl -X GET https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
# Should return 405 (method not allowed) if key is valid
```

### Firebase Initialization Failed
```bash
# Verify credentials
echo $FIREBASE_PRIVATE_KEY | head -c 50
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL
```

### Database Connection Failed
```bash
# Test connection
psql postgresql://user:pass@host:5432/imbobi_prod -c "SELECT 1;"

# Check migrations status
DATABASE_URL=postgresql://... npx prisma migrate status
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-30  
**Status**: ✅ READY FOR PRODUCTION DEPLOYMENT
