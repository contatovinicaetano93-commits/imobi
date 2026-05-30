# Configuration Mapping - Environment Variables

**imobi MVP - Complete Environment Variable Reference**

---

## Variable Requirements by Service

### Web (Next.js) - apps/web

```env
# Public (prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=https://api.imobi.com
NEXT_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...

# Private (only available on server)
# None required beyond API_URL for basic functionality
```

### API (NestJS) - services/api

```env
# Core
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://imobi.vercel.app,https://api.imobi.com,https://imobi.com.br

# Database
DATABASE_URL=postgresql://user:pass@host:5432/imbobi_prod

# Cache
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Authentication
JWT_SECRET=min_64_chars_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=imobi-evidencias-prod
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://imobi.com.br

# Firebase
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-prod.iam.gserviceaccount.com

# Monitoring
SENTRY_DSN=https://...@...ingest.sentry.io/...
SENTRY_RELEASE=1.0.0
```

### Mobile (Expo) - apps/mobile

```env
EXPO_PUBLIC_API_URL=https://api.imobi.com
EAS_PROJECT_ID=...

# Firebase (for notifications)
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_API_KEY=...
```

---

## Variable Mapping by Service

### Storage (Evidence Photos)

| Component | Variable | Service | Scope |
|-----------|----------|---------|-------|
| StorageService | `AWS_REGION` | API | Core |
| StorageService | `AWS_S3_BUCKET` | API | Core |
| StorageService | `AWS_ACCESS_KEY_ID` | API | Secret |
| StorageService | `AWS_SECRET_ACCESS_KEY` | API | Secret |

**Code Location**: `services/api/src/modules/storage/storage.service.ts`

### Email (Notifications)

| Component | Variable | Service | Scope |
|-----------|----------|---------|-------|
| EmailService | `EMAIL_PROVIDER` | API | Core |
| EmailService | `SENDGRID_API_KEY` | API | Secret |
| EmailService | `SMTP_FROM` | API | Core |
| EmailService | `APP_URL` | API | Core |
| EmailService | `SMTP_HOST` | API | Core |
| EmailService | `SMTP_PORT` | API | Core |

**Code Location**: `services/api/src/modules/email/email.service.ts`

### Firebase (Push Notifications)

| Component | Variable | Service | Scope |
|-----------|----------|---------|-------|
| PushNotificacoesService | `FIREBASE_PROJECT_ID` | API | Core |
| PushNotificacoesService | `FIREBASE_PRIVATE_KEY` | API | Secret |
| PushNotificacoesService | `FIREBASE_CLIENT_EMAIL` | API | Core |

**Code Location**: `services/api/src/modules/push-notificacoes/push-notificacoes.service.ts`

### Database

| Component | Variable | Service | Scope |
|-----------|----------|---------|-------|
| PrismaService | `DATABASE_URL` | API | Secret |

**Code Location**: `services/api/prisma/schema.prisma`

### Cache (Redis)

| Component | Variable | Service | Scope |
|-----------|----------|---------|-------|
| CacheService | `REDIS_HOST` | API | Core |
| CacheService | `REDIS_PORT` | API | Core |
| CacheService | `REDIS_PASSWORD` | API | Secret |

### Authentication (JWT)

| Component | Variable | Service | Scope |
|-----------|----------|---------|-------|
| AuthService | `JWT_SECRET` | API | Secret |
| AuthService | `JWT_EXPIRES_IN` | API | Core |
| AuthService | `JWT_REFRESH_EXPIRES_IN` | API | Core |

---

## Environment Variable Validation

### Config Validators

**File**: `services/api/src/common/config/`

```typescript
// s3.config.ts
✅ validateS3Config(config: S3Config)
   - bucket: required, string
   - region: required, string
   - accessKeyId: optional (unless secretAccessKey present)
   - secretAccessKey: optional (unless accessKeyId present)

// email.config.ts
✅ validateEmailConfig(config: EmailConfig)
   - SendGrid: apiKey required
   - SES: region, accessKeyId, secretAccessKey required
   - SMTP: host required, port required (1-65535)

// firebase.config.ts
✅ validateFirebaseConfig(config: FirebaseConfig)
   - projectId: required, string
   - privateKey: required, string (with newlines)
   - clientEmail: required, string
```

### Validation in Action

All services validate on startup:

```typescript
// Example: storage.service.ts startup
constructor() {
  const config = getS3Config();
  const errors = validateS3Config(config);
  if (errors.length > 0 && NODE_ENV === 'production') {
    throw new Error(`S3 Config Error: ${errors.join(', ')}`);
  }
}
```

---

## Fallback Behaviors

### Storage (S3)

**No credentials**: Uses local dev bucket
```typescript
// If AWS_ACCESS_KEY_ID not set in production
throw new Error('AWS_S3_BUCKET and AWS_S3_REGION are required in production');
```

### Email

**No API key**: Logs to console
```typescript
// If SENDGRID_API_KEY not set
logger.warn("SendGrid API key not found - using console mode");
// Emails logged instead of sent
```

### Firebase

**No credentials**: Logs to console
```typescript
// If FIREBASE_PROJECT_ID not set
logger.warn(`Firebase not configured: ${error}`);
// Push notifications logged instead of sent
messaging = null; // Fire-and-forget fails gracefully
```

---

## Production Deployment Checklist

### Before Vercel Deployment

- [ ] All environment variables defined locally in `.env`
- [ ] `.env` file NOT committed to git
- [ ] All SECRET variables marked as Secret in Vercel dashboard
- [ ] Database URL points to production PostgreSQL
- [ ] Redis URL points to production Redis
- [ ] AWS credentials have S3-only permissions
- [ ] SendGrid API key created and domain verified
- [ ] Firebase project created and service account downloaded
- [ ] Sentry project created and DSN obtained

### Vercel Configuration

1. Go to Vercel Dashboard
2. Select project: `imobi-web`
3. Settings → Environment Variables
4. Add each variable with correct scope and Secret flag

### Environment Variable Scopes

- **Production**: Used during `pnpm build` and runtime on Vercel production deployment
- **Preview**: Used for pull request previews
- **Development**: Used for local `pnpm dev` (not from Vercel)
- **Secret**: Encrypted value, hidden in logs

---

## Troubleshooting Configuration

### Error: "AWS_S3_BUCKET and AWS_S3_REGION are required in production"

**Solution**:
```bash
# Verify in Vercel Dashboard
Settings → Environment Variables
✓ AWS_S3_BUCKET=imobi-evidencias-prod (scope: Production)
✓ AWS_REGION=us-east-1 (scope: Production)
```

### Error: "SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid"

**Solution**:
```bash
# Verify in Vercel Dashboard
Settings → Environment Variables
✓ EMAIL_PROVIDER=sendgrid (scope: Production)
✓ SENDGRID_API_KEY=SG... (scope: Production, marked Secret)
```

### Error: "Firebase credentials ... are required in production"

**Solution**:
```bash
# Verify in Vercel Dashboard
Settings → Environment Variables
✓ FIREBASE_PROJECT_ID=imbobi-prod (scope: Production)
✓ FIREBASE_PRIVATE_KEY (scope: Production, marked Secret)
  # Ensure newlines are escaped as \n literals
✓ FIREBASE_CLIENT_EMAIL=firebase-admin@... (scope: Production)
```

### Error: "CORS_ORIGIN does not include origin"

**Solution**:
```env
# Update in Vercel Dashboard
CORS_ORIGIN=https://imobi.vercel.app,https://api.imobi.com,https://imobi.com.br,http://localhost:3000
# Comma-separated list, no spaces
```

---

## Local Development Configuration

### .env.local (git-ignored)

```bash
# Create for local development
cp .env.example .env.local

# Update with local values
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbobi_dev
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-min-64-chars-dev-secret-min-64-chars-dev-secret
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025  # MailHog
AWS_S3_BUCKET=local-dev-bucket
AWS_REGION=us-east-1
FIREBASE_PROJECT_ID=mock-project
SENTRY_DSN=  # Leave empty for local dev
```

### MailHog (Local Email Testing)

```bash
# Start MailHog (Docker)
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Access at http://localhost:8025
# Emails sent to localhost:1025 appear in web UI
```

### Firebase Emulator (Local Push Notifications)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulator
firebase emulators:start

# Set in .env.local
FIREBASE_EMULATOR_HOST=localhost:9099
```

---

## Production Monitoring

### CloudWatch (AWS S3)

```bash
# Monitor S3 requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name NumberOfObjects \
  --dimensions Name=BucketName,Value=imobi-evidencias-prod \
  --start-time 2026-05-30T00:00:00Z \
  --end-time 2026-05-31T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

### SendGrid Dashboard

```
https://app.sendgrid.com/statistics
- Monitor delivery rate
- Check for bounces/drops
- Review spam complaints
```

### Firebase Console

```
https://console.firebase.google.com/project/imbobi-prod/messaging
- View notification send statistics
- Monitor delivery success rate
- Check for errors
```

### Sentry Dashboard

```
https://sentry.io/organizations/imbobi/
- Monitor error rate
- Review performance metrics
- Check transaction throughput
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-30  
**Applies to**: imobi MVP Production Deployment
