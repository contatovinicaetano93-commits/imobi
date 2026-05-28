# Environment Setup Guide

This document details all environment variables required for local development and production deployment.

## Quick Reference Table

| Variable | Scope | Service | Type | Required | Default | Example |
|----------|-------|---------|------|----------|---------|---------|
| `PORT` | API | Local | integer | No | 4000 | 4000 |
| `NODE_ENV` | All | All | enum | Yes | development | production |
| `CORS_ORIGIN` | API | API | string | Yes | - | http://localhost:3000 |
| `DATABASE_URL` | API | PostgreSQL | string | Yes | - | postgresql://user:pass@host:5432/db |
| `REDIS_URL` | API, Workers | Upstash Redis | string | Yes | - | redis://default:pass@host:6379 |
| `REDIS_HOST` | API, Workers | Upstash Redis | string | No | localhost | host.upstash.io |
| `REDIS_PORT` | API, Workers | Upstash Redis | integer | No | 6379 | 6379 |
| `REDIS_PASSWORD` | API, Workers | Upstash Redis | string | No | - | password123 |
| `JWT_SECRET` | API | API | string | Yes | - | (min 64 chars) |
| `JWT_EXPIRES_IN` | API | API | string | No | 15m | 15m |
| `JWT_REFRESH_EXPIRES_IN` | API | API | string | No | 7d | 7d |
| `AWS_REGION` | API | AWS S3 | string | No | us-east-1 | us-east-1 |
| `AWS_ACCESS_KEY_ID` | API | AWS S3 | string | Optional | - | (from AWS IAM) |
| `AWS_SECRET_ACCESS_KEY` | API | AWS S3 | string | Optional | - | (from AWS IAM) |
| `S3_BUCKET` | API | AWS S3 | string | No | imbobi-evidencias | imbobi-evidencias |
| `NEXT_PUBLIC_API_URL` | Web | Vercel | string | Yes | - | http://localhost:4000 |
| `EXPO_PUBLIC_API_URL` | Mobile | Expo | string | Yes | - | http://localhost:4000 |
| `EAS_PROJECT_ID` | Mobile | EAS | string | Optional | - | (from Expo) |
| `EMAIL_PROVIDER` | API | SMTP/SendGrid | enum | No | smtp | smtp, sendgrid, ses |
| `SMTP_HOST` | API | SMTP | string | Conditional | - | smtp.sendgrid.net |
| `SMTP_PORT` | API | SMTP | integer | Conditional | 587 | 587 |
| `SMTP_USER` | API | SMTP | string | Conditional | - | apikey |
| `SMTP_PASS` | API | SMTP | string | Conditional | - | (from SendGrid) |
| `SMTP_FROM` | API | SMTP | string | No | noreply@imbobi.com | noreply@imbobi.com |
| `SENDGRID_API_KEY` | API | SendGrid | string | Conditional | - | (from SendGrid) |
| `APP_URL` | API | API | string | Yes | - | http://localhost:3000 |
| `UNICO_API_KEY` | API | KYC (Unico) | string | Optional | - | (from Unico) |
| `SERPRO_TOKEN` | API | KYC (Serpro) | string | Optional | - | (from Serpro) |
| `FIREBASE_PROJECT_ID` | API, Mobile | Firebase | string | Optional | - | (from Firebase) |
| `FIREBASE_PRIVATE_KEY` | API | Firebase | string | Optional | - | (JSON from Firebase) |
| `FIREBASE_CLIENT_EMAIL` | API | Firebase | string | Optional | - | (from Firebase) |

## Setup by Environment

### Local Development

Create `.env.local` in the monorepo root:

```bash
# ── API ────────────────────────────────────────────
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# PostgreSQL + PostGIS (local)
DATABASE_URL=postgresql://imbobi:senha@localhost:5432/imbobi_dev

# Redis (local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=seu_jwt_secret_minimo_64_caracteres_aqui_nao_use_em_producao_1234567890
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 (configure se usando S3 localmente)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=imbobi-evidencias

# ── WEB (Next.js) ──────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000

# ── MOBILE (Expo) ──────────────────────────────────
EXPO_PUBLIC_API_URL=http://localhost:4000
EAS_PROJECT_ID=

# ── Email (SMTP) ───────────────────────────────────
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=
SMTP_FROM=noreply@imbobi.com
APP_URL=http://localhost:3000

# Firebase (opcional)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

**Setup Commands:**
```bash
# Install dependencies
pnpm install

# Setup local PostgreSQL and run migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Start development environment (web + API)
pnpm dev
```

### Staging Deployment

**Render API + Upstash Redis + Render Postgres**

```
REDIS_URL=redis://default:PASSWORD@HOST.upstash.io:PORT
REDIS_HOST=HOST.upstash.io
REDIS_PORT=PORT
REDIS_PASSWORD=PASSWORD
DATABASE_URL=postgresql://USER:PASSWORD@RENDER_POSTGRES_HOST:5432/DBNAME
NEXT_PUBLIC_API_URL=https://alagami-api-staging.onrender.com
CORS_ORIGIN=https://alagami-web-staging.vercel.app
NODE_ENV=staging
```

### Production Deployment

```
REDIS_URL=redis://default:PASSWORD@HOST.upstash.io:PORT
REDIS_HOST=HOST.upstash.io
REDIS_PORT=PORT
REDIS_PASSWORD=PASSWORD
DATABASE_URL=postgresql://USER:PASSWORD@RENDER_POSTGRES_HOST:5432/DBNAME
NEXT_PUBLIC_API_URL=https://api.alagami.com.br
CORS_ORIGIN=https://alagami.com.br
NODE_ENV=production
```

## Getting Service Credentials

### Upstash Redis

1. Go to https://console.upstash.com/
2. Create new Redis database (free tier)
3. Select Region: São Paulo
4. Copy connection details from dashboard:
   - `REDIS_URL` - Full connection string
   - `REDIS_HOST` - Extract from URL (part after @)
   - `REDIS_PORT` - Default 6379 or from URL
   - `REDIS_PASSWORD` - Extract from URL (part before @)

### Render PostgreSQL

1. Go to https://render.com/
2. Create PostgreSQL database
3. Copy connection string as `DATABASE_URL`
4. Run migrations: `pnpm db:migrate`

### Vercel (Web)

1. Go to https://vercel.com/
2. Import GitHub repository
3. Set environment variables in project settings
4. Mark `NEXT_PUBLIC_*` variables appropriately

### AWS S3

1. Create IAM user with S3 permissions
2. Generate access keys
3. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`

### SendGrid (Email)

1. Go to https://sendgrid.com/
2. Create API key
3. Set `SENDGRID_API_KEY` or use SMTP credentials

### Firebase (Push Notifications)

1. Go to https://console.firebase.google.com/
2. Create project or select existing
3. Download service account JSON
4. Extract `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

## Variable Visibility

### Public Variables (Frontend Access)

These variables are embedded in the browser bundle and visible to all users:
- `NEXT_PUBLIC_API_URL` - API endpoint URL
- `EXPO_PUBLIC_API_URL` - Mobile API endpoint URL
- `FIREBASE_PROJECT_ID` - Firebase project (public by nature)

**Never expose:**
- API secrets (JWT_SECRET, database passwords)
- AWS credentials
- Private keys (Firebase, etc.)

### Private Variables (API Only)

These variables are only available to the backend:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL`, `REDIS_PASSWORD` - Redis credentials
- `JWT_SECRET` - JWT signing key
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `SMTP_PASS` - Email credentials
- `FIREBASE_PRIVATE_KEY` - Firebase service account key

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` template
2. **Rotate secrets regularly** - Especially `JWT_SECRET`
3. **Use strong JWT_SECRET** - Minimum 64 characters for production
4. **Environment-specific URLs** - Different API URLs for staging/production
5. **Backup Redis** - Enable automatic backups on Upstash
6. **Monitor logs** - Check Render and Vercel dashboards regularly
7. **Keep dependencies updated** - Run `pnpm update` periodically

## Troubleshooting

### Redis Connection Timeout
- Check `REDIS_URL` format: `redis://default:password@host:port`
- Verify network access on Upstash console
- Check if BullMQ worker is running

### Database Connection Failed
- Verify `DATABASE_URL` includes correct credentials
- Check if Render database is running
- Run migrations if first deployment: `pnpm db:migrate`

### Missing Environment Variable Error
- Check if variable is defined in current environment
- Some variables are optional with defaults (see table)
- Restart application after updating variables

### CORS Errors
- Update `CORS_ORIGIN` to match frontend URL
- Ensure `NEXT_PUBLIC_API_URL` is set correctly on frontend
- Check API logs for specific CORS error messages
