# Production Validation Guide

## Overview

The Imobi API includes a comprehensive startup validation system that ensures all required external services are properly configured before the application starts. This guide explains the validation process and how to configure each service.

## Validation Layers

### Layer 1: Environment Variables (main.ts)
Before creating the NestJS application, `validateEnvironmentOrThrow()` is called. This ensures:
- All critical variables are defined
- Values have correct format
- Missing configuration fails fast with clear error messages

### Layer 2: Module Initialization (app.module.ts)
When the AppModule initializes, it:
- Calls `getRedisConfig()` to parse Redis URL or host/port
- Initializes CacheModule with Redis connection
- Initializes BullModule for job queue

### Layer 3: Health Check (GET /api/v1/health)
The health check endpoint validates actual connectivity:
- Tests Redis PING command
- Returns status of all external services
- Reports specific errors if connections fail

## Configuration Requirements

### Database (Critical)
```env
DATABASE_URL="postgresql://user:password@host:5432/imobi_prod?schema=public"
```
- Required in all environments
- Must have PostgreSQL + PostGIS extension
- Connection tested at app startup

### Redis (Critical)
Choose **one** method:

**Method 1: URL (Recommended for Upstash, Render)**
```env
REDIS_URL="redis://default:password@host:6379"
```
- Supports: redis:// and rediss:// protocols
- Password is optional

**Method 2: Separate Variables**
```env
REDIS_HOST="host.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="password"  # Optional
```

Both methods are supported. If REDIS_URL is set, REDIS_HOST/REDIS_PORT are ignored.

### Email Provider (Critical in Production)
Choose **one** provider:

#### SendGrid
```env
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="SG.xxxxxxxxxxxx"
```

#### AWS SES
```env
EMAIL_PROVIDER="ses"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

#### SMTP (Default)
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="user@gmail.com"
SMTP_PASS="app-specific-password"
SMTP_SECURE="false"  # true for port 465
```

### Firebase (Critical in Production)
For push notifications and user token management:
```env
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
```

**Note**: Private key must be a valid PEM format with `\n` for newlines.

### AWS S3 (Critical in Production)
For evidence photo storage:
```env
AWS_S3_BUCKET="imobi-prod-evidence"
AWS_S3_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

Can reuse AWS credentials from SES if desired.

## Validation Behavior by Environment

### Development (NODE_ENV=development)
- Database is required
- Redis defaults to localhost:6379 if not configured
- Email, Firebase, S3 are optional (mocked)
- Allows quick local development

### Production (NODE_ENV=production)
- **All** external service credentials are required
- Missing configuration causes immediate startup failure
- Forces explicit configuration (no defaults)

## Checking Configuration Status

### Health Check Endpoint
```bash
curl http://localhost:4000/api/v1/health
```

Response includes:
```json
{
  "status": "ok|degraded|error",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "redis": {
    "status": "connected|error",
    "host": "host.upstash.io",
    "port": 6379,
    "error": "optional error message"
  },
  "email": {
    "provider": "sendgrid|ses|smtp",
    "configured": true
  },
  "firebase": {
    "configured": true
  },
  "database": {
    "configured": true
  }
}
```

- **status: ok** — All services connected and configured
- **status: degraded** — Some optional services missing, but core functions work
- **status: error** — Critical service (Redis or Database) unavailable

## Common Issues & Solutions

### "Redis configuration missing"
**Problem**: Neither REDIS_URL nor (REDIS_HOST + REDIS_PORT) are set
**Solution**:
- Set REDIS_URL: `redis://default:password@host:6379`
- OR set REDIS_HOST and REDIS_PORT separately

### "SENDGRID_API_KEY is required"
**Problem**: EMAIL_PROVIDER=sendgrid but SENDGRID_API_KEY not set
**Solution**:
- Get API key from https://app.sendgrid.com/settings/api_keys
- Set SENDGRID_API_KEY environment variable

### "Failed to parse REDIS_URL"
**Problem**: Invalid Redis URL format
**Solution**:
- Check protocol: must be `redis://` or `rediss://`
- Check format: `redis://[user:password@]host[:port]`
- Valid examples:
  - `redis://localhost:6379`
  - `redis://default:password@host:6379`
  - `rediss://default:password@host:6380` (TLS)

### "Firebase credentials ... are required in production"
**Problem**: Missing Firebase config in production environment
**Solution**:
- Download service account JSON from Firebase Console
- Extract: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
- Set as environment variables
- For Docker: Pass via secrets or environment variables

## Deployment Checklist

### Pre-Deployment
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Fill in all required credentials
- [ ] Test locally with production config: `NODE_ENV=production pnpm dev`
- [ ] Verify health check: `curl http://localhost:4000/api/v1/health`

### Before Deploy
- [ ] All env vars are set in deployment platform (Vercel, Railway, etc.)
- [ ] Redis is accessible from deployment environment
- [ ] Database is accessible from deployment environment
- [ ] Firebase project is created and service account downloaded
- [ ] S3 bucket exists and credentials are valid
- [ ] Email provider is configured and tested

### Post-Deploy
- [ ] Health check returns `status: ok`
- [ ] Check logs for validation errors
- [ ] Test email sending (create user)
- [ ] Test push notifications (login)
- [ ] Test evidence upload (create obra and etapa)

## Configuration Examples

### Vercel Deployment
Set environment variables in Vercel Settings:
```
DATABASE_URL = postgresql://...
REDIS_URL = redis://default:...@...
SENDGRID_API_KEY = SG.xxx
FIREBASE_PROJECT_ID = ...
FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL = ...
AWS_S3_BUCKET = ...
AWS_S3_REGION = us-east-1
```

### Railway Deployment
Set variables in Railway Dashboard or via CLI:
```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
# etc...
```

### Docker / Self-Hosted
Pass environment variables:
```bash
docker run -e DATABASE_URL="..." \
           -e REDIS_URL="..." \
           -e SENDGRID_API_KEY="..." \
           imobi-api:latest
```

## Understanding the Config Modules

### redis.config.ts
- `getRedisConfig()` — Parses REDIS_URL or returns REDIS_HOST/REDIS_PORT
- `validateRedisConfig()` — Validates host and port are valid
- Supports both URL and separate variable configuration

### env.validator.ts
- `validateEnvironment()` — Validates all environment variables at startup
- `validateEnvironmentOrThrow()` — Called in main.ts, fails fast if config invalid
- Provides clear error messages for missing credentials

### email.config.ts
- `getEmailConfig()` — Returns typed email configuration
- Supports SendGrid, SES, and SMTP
- Type-safe configuration with discriminated unions

### firebase.config.ts
- `getFirebaseConfig()` — Returns Firebase credentials
- Validates presence of all required fields
- Mock values for development

### s3.config.ts
- `getS3Config()` — Returns S3 bucket and credentials
- Validates credentials are consistent (both or neither)

## Troubleshooting

### Check Validation
Add this to your code to see what's being validated:
```typescript
import { validateEnvironment } from './common/config';
const errors = validateEnvironment(process.env);
console.log('Validation errors:', errors);
```

### Enable Debug Logging
```bash
NODE_ENV=production DEBUG=* pnpm dev
```

### Test Config Loading
```bash
cd services/api
NODE_ENV=production node -e "
  require('dotenv').config({ path: '../../.env.production' });
  const { validateEnvironmentOrThrow } = require('./dist/common/config/env.validator');
  validateEnvironmentOrThrow();
  console.log('Config OK');
"
```

## Next Steps

1. Copy `.env.production.example` to actual `.env.production`
2. Fill in credentials from your service providers
3. Run `pnpm dev` and check health endpoint
4. Deploy to your platform (Vercel, Railway, etc.)
5. Monitor logs for any configuration issues
