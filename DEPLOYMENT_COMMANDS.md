# imobi Render Deployment Commands & Reference

Complete guide to deploying imobi on Render with all required configurations, commands, and troubleshooting steps.

---

## 1. Generate Security Credentials

Generate required cryptographic keys before deploying. Run these commands in your local terminal:

### JWT Secret (Token Authentication)

```bash
# Generate 64-character base64-encoded JWT secret (minimum required for production)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Output Example:**
```
g8f3ks+/FmK9nL2pQ7xR8vD5wE1Y4zH6jT8uI3kL9mN0oP5qS6tU7vW8xY9zA0bC1=
```

**What it generates:** A cryptographically secure random string for signing JWT tokens. Used for user authentication and token verification.

**How to save:**
1. Copy the output
2. Save to Render dashboard → Environment Variables → `JWT_SECRET`
3. Keep a backup in a secure vault (1Password, LastPass, etc.)

---

### Encryption Key (Data Encryption)

```bash
# Generate 32-byte base64-encoded encryption key for AES-256-GCM
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Output Example:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t=
```

**What it generates:** A 256-bit encryption key for AES-256-GCM symmetric encryption. Used to encrypt sensitive data like refresh tokens and user credentials.

**How to save:**
1. Copy the output
2. Save to Render dashboard → Environment Variables → `ENCRYPTION_KEY`
3. Keep a backup in a secure vault

---

## 2. Environment Variables Template

Complete reference for all required and optional environment variables. Copy each section as needed.

### Database Configuration

| Variable | Value/Format | Example | Where to Find |
|----------|--------------|---------|---------------|
| `DATABASE_URL` | PostgreSQL connection string with PostGIS | `postgresql://user:password@host:5432/imobi_prod` | Render → Postgres database details |
| `REDIS_HOST` | Redis server hostname | `localhost` or `redis.imobi.internal` | Render → Redis service name or IP |
| `REDIS_PORT` | Redis port number | `6379` | Render → Redis port (default 6379) |
| `REDIS_PASSWORD` | Redis authentication password | Leave empty if no password | Render → Redis credentials |

### Security & Authentication

| Variable | Value/Format | Example | Where to Find |
|----------|--------------|---------|---------------|
| `JWT_SECRET` | Base64 string, min 64 chars | See "Generate Credentials" section | Generate locally (keep private) |
| `JWT_EXPIRES_IN` | Time duration | `15m` | Token expiry time (default: 15 minutes) |
| `JWT_REFRESH_EXPIRES_IN` | Time duration | `7d` | Refresh token expiry (default: 7 days) |
| `ENCRYPTION_KEY` | Base64 string, 32-byte | See "Generate Credentials" section | Generate locally (keep private) |

### API Service Configuration

| Variable | Value/Format | Example | Where to Find |
|----------|--------------|---------|---------------|
| `NODE_ENV` | `development`, `staging`, or `production` | `production` | Deployment target |
| `PORT` | Service port | `4000` | Must match Render port settings |
| `CORS_ORIGIN` | Comma-separated URLs | `https://imobi.com.br,https://app.imobi.com.br` | Your domain URLs |

### Web Service Configuration

| Variable | Value/Format | Example | Where to Find |
|----------|--------------|---------|---------------|
| `NEXT_PUBLIC_API_URL` | API endpoint URL | `https://api.imobi.com.br/api/v1` | Render API service URL |

### AWS S3 (Photo Storage)

| Variable | Value/Format | Example | Where to Find |
|----------|--------------|---------|---------------|
| `AWS_REGION` | AWS region code | `us-east-1` or `sa-east-1` | AWS Console → Region selector |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `AKIA...` | AWS IAM User → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | (sensitive, show dots only) | AWS IAM User → Security credentials |
| `S3_BUCKET` | S3 bucket name | `imobi-evidencias-prod` | AWS Console → S3 → Bucket name |

### Email Configuration (Choose One Provider)

#### SendGrid (Recommended)

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

#### AWS SES

```env
EMAIL_PROVIDER=ses
# Uses AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY from above
```

#### Generic SMTP

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx
SMTP_FROM=noreply@imobi.com.br
APP_URL=https://imobi.com.br
```

### Firebase Cloud Messaging (Push Notifications)

```env
FIREBASE_PROJECT_ID=imobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imobi-prod.iam.gserviceaccount.com
```

**How to get Firebase credentials:**
1. Go to Firebase Console → Project Settings
2. Click "Service Accounts" tab
3. Click "Generate new private key"
4. Download JSON file
5. Extract `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

---

## 3. Complete Environment Variables for Copy-Paste

### Minimal Production Setup

```bash
# Core Database & Cache
DATABASE_URL=postgresql://user:password@host:5432/imobi_prod
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security (Generate using commands above)
JWT_SECRET=<GENERATE_AND_PASTE_HERE>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=<GENERATE_AND_PASTE_HERE>

# Service Configuration
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://imobi.com.br
NEXT_PUBLIC_API_URL=https://api.imobi.com.br/api/v1

# AWS S3 (Required for photo uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imobi-evidencias-prod

# Email (Choose SendGrid for simplicity)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...

# Firebase (Required for mobile push notifications)
FIREBASE_PROJECT_ID=imobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imobi-prod.iam.gserviceaccount.com
```

### Complete Production Setup

```bash
# ── DATABASE & CACHE ─────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/imobi_prod
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# ── AUTHENTICATION & ENCRYPTION ──────────────────
JWT_SECRET=<GENERATE_WITH_NODE_COMMAND>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=<GENERATE_WITH_NODE_COMMAND>

# ── SERVER CONFIGURATION ─────────────────────────
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://imobi.com.br,https://app.imobi.com.br

# ── API ENDPOINTS ────────────────────────────────
NEXT_PUBLIC_API_URL=https://api.imobi.com.br/api/v1
EXPO_PUBLIC_API_URL=https://api.imobi.com.br/api/v1

# ── AWS S3 (EVIDENCE PHOTOS) ─────────────────────
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imobi-evidencias-prod

# ── EMAIL PROVIDER ───────────────────────────────
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...

# ── PUSH NOTIFICATIONS ───────────────────────────
FIREBASE_PROJECT_ID=imobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imobi-prod.iam.gserviceaccount.com

# ── LOGGING & MONITORING ────────────────────────
SENTRY_DSN=https://key@o123.ingest.sentry.io/456789
RELEASE_VERSION=v1.0.0
LOG_LEVEL=info

# ── RATE LIMITING ────────────────────────────────
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

---

## 4. Database Migration Commands

After deploying the API service to Render, run migrations to set up PostgreSQL schema with PostGIS support.

### Initial Setup (First Deployment)

```bash
# Generate Prisma client (required first)
pnpm db:generate

# Run all migrations
pnpm db:migrate
```

### Remote Database Migration (From Local Machine)

If you need to run migrations against a remote Render database:

```bash
# Set DATABASE_URL pointing to your Render Postgres instance
export DATABASE_URL="postgresql://user:password@your-render-db.internal:5432/imobi_prod?schema=public"

# Run migrations
pnpm db:migrate
```

### Expected Output

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "imobi_prod" at "your-db-host"

22 migrations found in prisma/migrations

Applying migration: 20240101000001_initial_setup
Applying migration: 20240101000002_add_postgis_extensions
Applying migration: 20240101000003_create_usuarios_table
Applying migration: 20240101000004_create_creditos_table
... (more migrations)
Applying migration: 20240601000022_final_migrations

All migrations applied successfully.
✓ Database schema is up to date
```

### What Gets Created

The migrations set up:
- **Users** table with authentication fields
- **Credits** table with financial data
- **Obras** (construction projects) with GPS coordinates
- **Etapas** (project stages) with progress tracking
- **Evidencias** (photo evidence) with location validation
- **KYC Documents** for identity verification
- **PostGIS** extension for geographic queries
- **Indexes** for performance optimization

---

## 5. Health Check Commands

Verify that all services are responding correctly after deployment.

### API Health Endpoint

```bash
# Test API availability and service status
curl -i https://api.imobi.com.br/api/v1/health
```

### Expected Response (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2024-06-02T12:34:56.789Z",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600
}
```

### Liveness Probe (Kubernetes-style)

```bash
# Checks if API service is running (doesn't check dependencies)
curl -i https://api.imobi.com.br/api/v1/health/live
```

**Expected:** `200 OK` even if database/Redis are down

### Readiness Probe (All Dependencies)

```bash
# Checks if API is ready to handle requests
curl -i https://api.imobi.com.br/api/v1/health/ready
```

**Expected:** `200 OK` only if database AND Redis are connected

**Returns:** `503 Service Unavailable` if any dependency is down

### Test Complete Deployment

```bash
#!/bin/bash
# Quick health check script
API_URL="https://api.imobi.com.br"

echo "Testing health endpoints..."
echo

echo "1. API Health:"
curl -s "${API_URL}/api/v1/health" | jq '.'

echo -e "\n2. Liveness:"
curl -s "${API_URL}/api/v1/health/live" | jq '.'

echo -e "\n3. Readiness:"
curl -s "${API_URL}/api/v1/health/ready" | jq '.'
```

---

## 6. Database Verification Commands

After migration, verify the database schema and data integrity.

### Check Migrations Applied

```bash
# List all applied migrations
pnpm db:info

# Expected output shows 22+ migrations applied
```

### Connect to Database Directly

```bash
# Using psql (if installed locally)
psql "postgresql://user:password@your-render-db.internal:5432/imobi_prod"

# Once connected, check tables:
\dt                    # List all tables
\d usuarios            # Describe usuarios table
SELECT COUNT(*) FROM usuarios;  # Count records
```

### Verify PostGIS Extension

```bash
# Connect to database, then run:
SELECT version();
SELECT PostGIS_version();

# Should return PostGIS version like 3.3.0
```

---

## 7. Quick Deployment Checklist

### Before Deploying

- [ ] Generate JWT_SECRET (see section 1)
- [ ] Generate ENCRYPTION_KEY (see section 1)
- [ ] Create Render PostgreSQL database
- [ ] Create Render Redis cache
- [ ] Get AWS S3 credentials and create bucket
- [ ] Get Firebase service account credentials
- [ ] Get SendGrid API key (or choose other email provider)
- [ ] Have your domain ready (for CORS_ORIGIN and API URL)

### During Deployment (Render Dashboard)

- [ ] Create API service (NestJS app)
  - [ ] Set environment variables from section 2
  - [ ] Set PORT=4000
  - [ ] Connect to PostgreSQL database
  - [ ] Connect to Redis cache
  - [ ] Set build command: `pnpm install && pnpm db:generate && pnpm build`
  - [ ] Set start command: `pnpm -F @imbobi/api start`

- [ ] Create Web service (Next.js app)
  - [ ] Set NEXT_PUBLIC_API_URL to your API URL
  - [ ] Set NODE_ENV=production
  - [ ] Set build command: `pnpm install && pnpm build`
  - [ ] Set start command: `pnpm -F @imbobi/web start`

### After Deployment

- [ ] Run health checks (section 5)
- [ ] Test database connection
- [ ] Verify Redis cache is working
- [ ] Test authentication flow
- [ ] Check S3 photo uploads
- [ ] Monitor error logs in Render dashboard

---

## 8. Seed Data Script (Optional)

Load test/demo data after successful deployment. Useful for testing and staging environments.

### Prerequisites

```bash
# Ensure database is empty (will be cleared by script)
# Ensure you have access to the remote database
```

### Run Seed Script

```bash
# Set environment variable pointing to your Render database
export DATABASE_URL="postgresql://user:password@your-render-db.internal:5432/imobi_prod?schema=public"

# Run seed script
pnpm --filter @imbobi/api seed
```

### What Gets Loaded

The seed script loads realistic test data:

- **10 test users** (mix of normal users, admins, managers)
  - Email: test1@example.com, test2@example.com, etc.
  - Default password for testing: `TestPassword123`

- **10 credits** with various statuses
  - Values: R$ 50,000 to R$ 200,000
  - Terms: 12 to 36 months
  - Statuses: PENDENTE, APROVADO, LIBERADO, PAGO

- **10 construction projects (obras)**
  - Locations in São Paulo (validated GPS coordinates)
  - Various sizes: 500m² to 2000m²
  - Statuses: ATIVA, CONCLUIDA, PAUSADA

- **90 construction stages (etapas)**
  - 9 stages per project (foundation, structure, finishes, etc.)
  - Progressive completion statuses
  - Realistic timelines and budgets

- **50 photo evidences**
  - Sample S3 URLs
  - Validation status (approved/pending)
  - GPS coordinates with distance calculations

- **Sample KYC documents**
  - Various approval statuses
  - Different document types

- **Sample notifications**
  - Credit approvals, KYC updates, stage approvals

### Expected Output

```
╔════════════════════════════════════════════════════════╗
║     Starting Database Seeding for Staging Environment   ║
╚════════════════════════════════════════════════════════╝
✓ Seed data loaded from seed-data.json
Clearing database...
✓ Database cleared successfully

Seeding 10 users...
  ✓ Created USUARIO: João Silva (joao@example.com)
  ✓ Created USUARIO: Maria Santos (maria@example.com)
  ... (more users)

Seeding 10 credits...
  ✓ Created credit: R$ 150,000 | Status: APROVADO
  ... (more credits)

... (projects, stages, evidence, etc.)

╔════════════════════════════════════════════════════════╗
║                  Seeding Complete! ✓                    ║
║                                                         ║
║  Data Summary:                                          ║
║  - Users: 10                                            ║
║  - Credits: 10                                          ║
║  - Obras: 10                                            ║
║  - Etapas: 90 (9 per obra)                              ║
║  - Evidencias: 50                                       ║
║  - KYC Documents: 20                                    ║
║  - Score Records: 30                                    ║
╚════════════════════════════════════════════════════════╝
```

### When to Use

- **Development:** After setting up local database
- **Staging:** To test with realistic data before production
- **Testing:** Quickly populate database for manual testing
- **Demos:** Show working features to stakeholders

---

## 9. Troubleshooting Commands

Common issues and how to diagnose them.

### Check Service Status

```bash
# View service logs in real-time
# Go to Render dashboard → Select service → Logs tab
# Or use Render CLI:
render logs <service-id>
```

### Database Connection Issues

```bash
# Test database connectivity
curl -i https://api.imobi.com.br/api/v1/health/ready

# If database shows as disconnected, check:
# 1. DATABASE_URL is correctly set
# 2. PostgreSQL service is running in Render
# 3. Network access is allowed (check Render firewall)
```

### Redis Connection Issues

```bash
# Check Redis status from health endpoint
curl -s https://api.imobi.com.br/api/v1/health | jq '.redis'

# If redis shows as disconnected:
# 1. Check REDIS_HOST and REDIS_PORT are correct
# 2. Check REDIS_PASSWORD is correct
# 3. Verify Redis service is running
```

### Application Crashes on Deploy

```bash
# View detailed error logs
# In Render dashboard: Service → Logs tab
# Look for errors during build phase

# Common issues:
# 1. Missing environment variable
# 2. Database migration failed
# 3. Build command timed out
# 4. Insufficient memory (upgrade to paid plan)
```

### High Memory Usage

```bash
# Check service metrics in Render dashboard
# If consistently high (>80%):
# 1. Upgrade instance size
# 2. Optimize database queries
# 3. Check for memory leaks in code

# View resource usage:
# Render dashboard → Service → Metrics tab
```

### Authentication Failing

```bash
# Verify JWT_SECRET is set correctly
echo $JWT_SECRET  # Should output 64+ character string

# Check JWT token format
# Decode token at https://jwt.io/
# Verify it's signed with correct secret
```

### CORS Errors in Web App

```bash
# Verify CORS_ORIGIN is correct
# Should match your web domain exactly:
# ✓ https://imobi.com.br
# ✗ http://imobi.com.br (protocol mismatch)
# ✗ imobi.com.br (missing protocol)

# Test CORS:
curl -H "Origin: https://imobi.com.br" \
  -H "Access-Control-Request-Method: GET" \
  -i https://api.imobi.com.br/api/v1/health
```

### S3 Upload Failures

```bash
# Verify AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $S3_BUCKET

# Test S3 connectivity (if AWS CLI installed)
aws s3 ls s3://$S3_BUCKET --region $AWS_REGION

# Check IAM policy allows:
# - s3:PutObject
# - s3:GetObject
# - s3:DeleteObject
```

---

## 10. Monitoring & Maintenance

### Daily Monitoring

```bash
# Check error rate
curl -s https://api.imobi.com.br/api/v1/health | jq '.'

# Monitor through Render dashboard
# - CPU usage (target: <60%)
# - Memory usage (target: <80%)
# - Response time (target: <500ms)
```

### Weekly Tasks

- [ ] Review error logs in Render dashboard
- [ ] Check database growth (may need optimization)
- [ ] Monitor S3 storage costs
- [ ] Verify Redis cache hit rate
- [ ] Check email delivery (SendGrid dashboard)

### Monthly Tasks

- [ ] Rotate credentials if needed
- [ ] Review and optimize slow database queries
- [ ] Analyze usage patterns
- [ ] Plan capacity upgrades if needed
- [ ] Backup database (Render handles this)

### Upgrade Instructions

```bash
# To upgrade Node.js or dependencies:
# 1. Update in services/api/package.json
# 2. Run: pnpm install
# 3. Test locally: pnpm dev
# 4. Commit: git add . && git commit -m "chore: upgrade dependencies"
# 5. Push: git push origin main
# 6. Render auto-deploys when main is updated
```

---

## 11. Deployment Summary Checklist

**Security Credentials Generated:** ✓
- JWT_SECRET: `[64+ char base64]`
- ENCRYPTION_KEY: `[32-byte base64]`

**Environment Variables Set:** ✓
- Database: PostgreSQL + PostGIS
- Cache: Redis
- Storage: AWS S3
- Email: SendGrid
- Notifications: Firebase

**Services Deployed:** ✓
- API (NestJS) on Render
- Web (Next.js) on Render
- PostgreSQL on Render
- Redis on Render

**Migrations Run:** ✓
- All 22 migrations applied
- PostGIS extension enabled
- Schema verified

**Health Checks Passing:** ✓
- API responding
- Database connected
- Redis connected
- Response time <500ms

**Data Loaded:** ✓
- Seed data (optional)
- Test users ready
- Sample projects loaded

---

## Quick Reference

### Most Common Commands

```bash
# Generate security keys
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # ENCRYPTION_KEY

# Run migrations
pnpm db:migrate

# Load test data
pnpm --filter @imbobi/api seed

# Check health
curl https://api.imobi.com.br/api/v1/health

# View logs (in Render dashboard)
# Service → Logs tab

# Restart service (in Render dashboard)
# Service → Deployments → Manual Deploy
```

---

**Questions or Issues?** Check the troubleshooting section or review Render's official documentation for additional support.

Last updated: 2024-06-02
Version: 1.0
