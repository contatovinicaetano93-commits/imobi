# Production Configuration Guide

This guide covers the production-ready configurations implemented for the imbobi API.

## Components Configured

### 1. Redis Cache & Job Queue

**Purpose**: High-performance caching and async job processing

**Configuration**:
```env
# Option A: Connection string (recommended for cloud)
REDIS_URL=redis://:password@redis.example.com:6379/0

# Option B: Individual vars (traditional setup)
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0
```

**Features**:
- Automatic retry and error handling
- 5-minute default TTL for cached data
- Supports Redis Sentinel and Cluster via connection string
- Per-feature cache key patterns to prevent collisions
- Configurable TTL per cache type (short/medium/long/very-long)

**Usage in code**:
```typescript
import { CACHE_KEYS, CACHE_TTL } from '@imbobi/api/common/config';

// Cache a user's credits
await this.cacheManager.set(
  CACHE_KEYS.USER_CREDITS('user-123'),
  creditsData,
  CACHE_TTL.LONG
);

// Get cached value
const cached = await this.cacheManager.get(
  CACHE_KEYS.USER_CREDITS('user-123')
);
```

### 2. Rate Limiting (Request Throttling)

**Purpose**: Prevent abuse and ensure fair resource distribution

**Rate Limits**:
- **General endpoints**: 100 requests/minute
- **Auth endpoints**: 10 requests/minute (login, register, refresh)
- **File uploads**: 5 requests/minute (prevent storage abuse)
- **Manager operations**: 20 requests/minute (admin actions)
- **API key generation**: 3 requests/minute (critical operation)
- **Password reset**: 5 attempts/minute

**Configuration**:
```typescript
import { RateLimit, SkipRateLimit } from '@imbobi/api/common/decorators';

// Apply custom rate limit to endpoint
@Post('login')
@RateLimit('auth')
async login() { ... }

// Skip rate limiting for public endpoint
@Get('health')
@SkipRateLimit()
async health() { ... }
```

**Production vs Development**:
- Development: Relaxed limits (1000+ requests/minute) for testing
- Production: Strict limits as listed above

### 3. Email Configuration

**Supported Providers**:

#### SendGrid (Recommended for production)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxx
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://imbobi.com.br
```

**Advantages**:
- Highest deliverability rates
- Built-in analytics and webhooks
- Excellent for transactional emails
- Best for SaaS platforms

#### AWS SES (Cost-effective for high volume)
```env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
SMTP_FROM=noreply@imbobi.com.br
```

**Advantages**:
- Integrates with existing AWS infrastructure
- Lower costs for high volume
- Built-in authentication

#### SMTP (Most flexible)
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG...
SMTP_FROM=noreply@imbobi.com.br
```

**Advantages**:
- Works with any SMTP provider
- Self-hosted options available
- Maximum flexibility

**Email Features**:
- Automatic retry with exponential backoff (3 attempts by default)
- Support for HTML and plain text content
- Type-safe email templates
- Transactional email categories for analytics

**Email Templates Available**:
- Welcome email
- Etapa aprovada (stage approved)
- Parcela liberada (payment released)
- KYC aprovado (identity verified)
- KYC rejeitado (identity rejected)
- Password recovery
- Email verification
- Dispute notifications

### 4. Firebase Cloud Messaging (FCM)

**Purpose**: Push notifications for mobile apps (Expo)

**Configuration**:
```env
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-prod.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://imbobi-prod.firebaseio.com
```

**Setup Steps**:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Project Settings
3. Go to "Service Accounts" tab
4. Click "Generate New Private Key"
5. Copy the JSON values to environment variables

**Push Notification Features**:
- Automatic token management (invalid tokens auto-deactivated)
- Multiple device support per user
- High-priority notifications for important events
- Multicast send (send to multiple devices at once)
- Notification templates with data payload

**Notification Types**:
- Stage Approved (ETAPA_APROVADA) - High priority
- Payment Released (PARCELA_LIBERADA) - High priority
- KYC Approved (KYC_APROVADO) - High priority
- KYC Rejected (KYC_REJEITADO) - High priority
- Comment on Obra (OBRA_COMENTARIO) - Normal priority
- Marketplace Match (MARKETPLACE_MATCH) - Normal priority
- Dispute Notification (DISPUTA_NOTIFICACAO) - High priority
- System Alert (SISTEMA_ALERT) - High priority

**Usage in code**:
```typescript
import { PushNotificacoesService } from '@imbobi/api/modules/push-notificacoes';

// Send push notification
await this.pushService.enviarPush({
  usuarioId: 'user-123',
  titulo: 'Etapa Aprovada!',
  mensagem: 'Sua etapa foi aprovada',
  tipo: 'ETAPA_APROVADA',
  dados: {
    etapaNome: 'Fundação',
    obraNome: 'Casa Exemplo'
  }
});

// Register FCM token
await this.pushService.registrarToken(usuarioId, token);
```

## Production Checklist

### Pre-deployment

- [ ] Set strong, random JWT_SECRET (min 64 characters)
  ```bash
  openssl rand -base64 48
  ```
- [ ] Configure Redis with password authentication
- [ ] Test email delivery with SendGrid/SES/SMTP
- [ ] Verify Firebase credentials are correct
- [ ] Set appropriate CORS_ORIGIN for your domain
- [ ] Enable HTTPS for all connections
- [ ] Set NODE_ENV=production

### Monitoring

**Key metrics to monitor**:
- Redis connection pool health
- Email delivery rate and bounce rate
- FCM notification delivery success rate
- Rate limit hit rates (indicates abuse patterns)
- Cache hit rate (optimize TTL if too low)
- API response times (increased response time may indicate cache misses)

### Troubleshooting

**Redis connection issues**:
```bash
# Test Redis connection
redis-cli -h REDIS_HOST -p REDIS_PORT ping
# Should return: PONG
```

**Email delivery issues**:
- Verify SMTP credentials
- Check API key validity
- Enable logging: `EMAIL_DEBUG=true`
- Check spam folder
- Verify DKIM/SPF records

**FCM issues**:
- Verify Firebase private key format (newlines properly escaped)
- Check FCM token validity
- Ensure app has proper permissions
- Check Firebase quota

**Rate limiting issues**:
- Monitor for DDoS patterns
- Adjust limits per environment
- Use IP-based or user-based throttling
- Implement whitelist for trusted IPs (if needed)

## Environment Variables Reference

### Core
- `NODE_ENV` - Application environment (development/production)
- `PORT` - API server port
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)

### Database
- `DATABASE_URL` - PostgreSQL connection string

### Redis
- `REDIS_URL` - Full connection string (recommended)
- `REDIS_HOST` - Hostname
- `REDIS_PORT` - Port
- `REDIS_PASSWORD` - Authentication password
- `REDIS_DB` - Database number (0-15)

### JWT
- `JWT_SECRET` - Secret key (min 64 chars, strong random)
- `JWT_EXPIRES_IN` - Token expiration (default: 15m)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)

### Email
- `EMAIL_PROVIDER` - Provider choice (sendgrid/ses/smtp)
- `SENDGRID_API_KEY` - SendGrid API key
- `AWS_REGION` - AWS region for SES
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - From email address
- `EMAIL_RETRY_ATTEMPTS` - Number of retry attempts
- `EMAIL_RETRY_DELAY_MS` - Initial retry delay
- `EMAIL_RETRY_BACKOFF` - Backoff multiplier

### Firebase/FCM
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Private key (JSON format)
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_DATABASE_URL` - Database URL (optional)
- `FCM_TTL` - Notification time-to-live
- `FCM_MAX_RETRIES` - Max retry attempts
- `FCM_RETRY_DELAY_MS` - Retry delay
- `FCM_DEBUG` - Debug logging

### AWS S3
- `AWS_REGION` - AWS region
- `AWS_ACCESS_KEY_ID` - Access key
- `AWS_SECRET_ACCESS_KEY` - Secret key
- `S3_BUCKET` - S3 bucket name

### Application
- `APP_URL` - Public application URL
- `NEXT_PUBLIC_API_URL` - API URL for web app
- `EXPO_PUBLIC_API_URL` - API URL for mobile app

### External APIs
- `UNICO_API_KEY` - Unico (identity validation)
- `SERPRO_TOKEN` - SERPRO (government data)

## Performance Optimization

### Cache TTL Strategy

Different data types have different freshness requirements:

```typescript
CACHE_TTL.SHORT (60s)        // User sessions, real-time data
CACHE_TTL.MEDIUM (300s)      // Most API responses, listings
CACHE_TTL.LONG (1800s)       // Static data, configurations
CACHE_TTL.VERY_LONG (3600s)  // Rarely changing data
```

### Rate Limiting Strategy

- **Auth endpoints**: Strict limits to prevent brute force
- **Upload endpoints**: Very strict to prevent storage abuse
- **General endpoints**: Balanced for typical API usage
- **Manager endpoints**: Moderate to allow admin operations

### Database Query Optimization

- Use indexes on frequently queried fields
- Cache expensive PostGIS queries
- Implement pagination for large result sets
- Use database query analysis tools

## Security Considerations

1. **Secrets Management**:
   - Never commit `.env` to version control
   - Use `.env.example` for documentation
   - Rotate secrets regularly
   - Use secret management tools (AWS Secrets Manager, etc.)

2. **Redis Security**:
   - Enable password authentication
   - Use encrypted connections (TLS)
   - Restrict network access
   - Monitor for suspicious patterns

3. **Email Security**:
   - Enable DKIM/SPF records
   - Use strong API keys
   - Monitor email authentication
   - Implement rate limiting on send operations

4. **Firebase Security**:
   - Keep private key secure
   - Rotate credentials periodically
   - Monitor token usage
   - Enable Firebase security rules

5. **Rate Limiting**:
   - Monitor abuse patterns
   - Implement IP-based whitelisting if needed
   - Consider geographic restrictions
   - Use DDoS mitigation services

## Deployment

### Docker Example

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy dependencies
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy source
COPY . .

# Build
RUN pnpm build

# Start
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

### Health Check

```bash
curl http://localhost:4000/api/v1/health
```

Should return:
```json
{
  "status": "ok",
  "redis": "connected",
  "database": "connected"
}
```

## Support & Documentation

- NestJS Caching: https://docs.nestjs.com/techniques/caching
- Rate Limiting: https://docs.nestjs.com/security/rate-limiting
- SendGrid API: https://docs.sendgrid.com/
- AWS SES: https://docs.aws.amazon.com/ses/
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
