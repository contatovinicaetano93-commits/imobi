# 🚀 Production Deployment Guide — imbobi

**Last Updated:** 2026-05-28  
**Owner:** DevOps Team  
**Status:** Complete - Ready for Production  

---

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Production Environment Setup](#production-environment-setup)
3. [API Deployment Strategy](#api-deployment-strategy)
4. [Web Application Deployment](#web-application-deployment)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Database & Migrations](#database--migrations)
7. [DNS & SSL Configuration](#dns--ssl-configuration)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Security Hardening](#security-hardening)
11. [Performance Optimization](#performance-optimization)
12. [Incident Response](#incident-response)
13. [Post-Deployment Verification](#post-deployment-verification)

---

## Pre-Deployment Requirements

### Infrastructure & Accounts

**AWS Account Setup:**
- [ ] AWS account with production environment
- [ ] IAM roles configured for deployment (EC2, ECS, RDS, S3, Secrets Manager)
- [ ] VPC configured with public/private subnets
- [ ] Security groups configured (ALB, API, RDS, Redis)
- [ ] RDS PostgreSQL 15 with PostGIS extension enabled
- [ ] ElastiCache Redis 7.x cluster
- [ ] S3 bucket for evidence storage (`imbobi-evidencias-prod`)
- [ ] CloudFront distribution for CDN (optional but recommended)

**Vercel / Web Deployment:**
- [ ] Vercel account with production project
- [ ] GitHub integration configured
- [ ] Custom domain configured
- [ ] Auto-deploy from main branch enabled

**Email & Communications:**
- [ ] SendGrid account with API key
- [ ] Email domain verified (SPF, DKIM, DMARC)
- [ ] Email templates tested

**Firebase (Push Notifications):**
- [ ] Firebase production project created
- [ ] Service account JSON downloaded and secured
- [ ] FCM topics configured

**Monitoring & Observability:**
- [ ] Sentry organization and project created
- [ ] Sentry API token for source map uploads
- [ ] Prometheus/Grafana setup (or CloudWatch dashboards)
- [ ] Slack workspace for alerts

**App Store Accounts:**
- [ ] Apple Developer account ($99/year)
- [ ] Google Play Developer account ($25 one-time)
- [ ] App signing certificates configured

---

## Production Environment Setup

### Environment Variables Checklist

**Create `.env.production` (NEVER commit this file):**

```bash
# ════════════════════════════════════════════════════════════
# API Core
# ════════════════════════════════════════════════════════════
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# CORS - Whitelist only production domains
CORS_ORIGIN=https://app.imbobi.com,https://www.imbobi.com

# ════════════════════════════════════════════════════════════
# Database (PostgreSQL 15 + PostGIS)
# ════════════════════════════════════════════════════════════
DATABASE_URL=postgresql://produser:STRONG_PASSWORD@rds-prod.region.rds.amazonaws.com:5432/imbobi_prod?sslmode=require&schema=public&connection_limit=20
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000
# Enable for connection issues debugging
# DATABASE_DEBUG=false

# ════════════════════════════════════════════════════════════
# JWT Tokens (CRITICAL: Generate with: openssl rand -base64 48)
# ════════════════════════════════════════════════════════════
JWT_SECRET=<GENERATE_AND_STORE_IN_AWS_SECRETS_MANAGER>
JWT_REFRESH_SECRET=<GENERATE_AND_STORE_IN_AWS_SECRETS_MANAGER>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ════════════════════════════════════════════════════════════
# Encryption (CRITICAL: Generate with: openssl rand -base64 32)
# ════════════════════════════════════════════════════════════
ENCRYPTION_SECRET=<GENERATE_AND_STORE_IN_AWS_SECRETS_MANAGER>

# ════════════════════════════════════════════════════════════
# Redis (BullMQ for queues)
# ════════════════════════════════════════════════════════════
REDIS_HOST=elasticache-prod.region.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=<ELASTICACHE_AUTH_TOKEN>
REDIS_DB=0
REDIS_TLS=true
# Optional: Redis Sentinel for HA
# REDIS_SENTINEL_HOST=sentinel.region.redis.amazonaws.com
# REDIS_SENTINEL_PORT=26379

# ════════════════════════════════════════════════════════════
# AWS S3 (Evidence Storage & Attachments)
# ════════════════════════════════════════════════════════════
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<IAM_USER_KEY>
AWS_SECRET_ACCESS_KEY=<IAM_USER_SECRET>
S3_BUCKET=imbobi-evidencias-prod
S3_REGION=us-east-1
# Enable CloudFront CDN if configured
# S3_CLOUDFRONT_DOMAIN=d123456.cloudfront.net

# ════════════════════════════════════════════════════════════
# Email (SendGrid)
# ════════════════════════════════════════════════════════════
SENDGRID_API_KEY=SG.<KEY>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=${SENDGRID_API_KEY}
SMTP_FROM=noreply@imbobi.com
APP_URL=https://app.imbobi.com

# ════════════════════════════════════════════════════════════
# KYC & Document Verification
# ════════════════════════════════════════════════════════════
UNICO_API_KEY=<UNICO_PRODUCTION_KEY>
SERPRO_TOKEN=<SERPRO_PRODUCTION_TOKEN>

# ════════════════════════════════════════════════════════════
# Firebase Cloud Messaging (Push Notifications)
# ════════════════════════════════════════════════════════════
FIREBASE_PROJECT_ID=imbobi-production
FIREBASE_PRIVATE_KEY=<SERVICE_ACCOUNT_PRIVATE_KEY_JSON>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@imbobi-production.iam.gserviceaccount.com

# ════════════════════════════════════════════════════════════
# Sentry (Error Tracking & Performance Monitoring)
# ════════════════════════════════════════════════════════════
SENTRY_DSN=https://<KEY>@sentry.io/<PROJECT_ID>
SENTRY_ORG=imbobi
SENTRY_PROJECT=api
SENTRY_ENVIRONMENT=production
SENTRY_TRACE_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.05
```

**Web Application (.env.production in apps/web):**
```bash
NEXT_PUBLIC_API_URL=https://api.imbobi.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_DSN=https://<KEY>@sentry.io/<PROJECT_ID>
NEXT_PUBLIC_VERCEL_ENV=production
```

**Mobile Application (eas.json build profile):**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.imbobi.com",
        "EXPO_PUBLIC_ENVIRONMENT": "production",
        "EXPO_PUBLIC_SENTRY_DSN": "https://<KEY>@sentry.io/<PROJECT_ID>"
      }
    }
  }
}
```

### Secrets Management (AWS Secrets Manager)

Store all sensitive values in AWS Secrets Manager (NOT in .env files):

```bash
# Create secret in AWS
aws secretsmanager create-secret \
  --name imbobi/prod/api-secrets \
  --secret-string '{
    "JWT_SECRET": "...",
    "JWT_REFRESH_SECRET": "...",
    "ENCRYPTION_SECRET": "...",
    "AWS_SECRET_ACCESS_KEY": "...",
    "SENDGRID_API_KEY": "...",
    "REDIS_PASSWORD": "..."
  }' \
  --region us-east-1

# Retrieve in ECS task definition using secretsmanager
```

---

## API Deployment Strategy

### Architecture Overview

```
┌─────────────────┐
│    ALB          │ (Application Load Balancer)
└────────┬────────┘
         │
    ┌────┴────┐
    │ ECS      │ (3 tasks, min 2)
    │ Cluster  │
    └────┬────┘
         │
    ┌────┴──────────────┬──────────────┐
    │                   │              │
┌───┴───┐         ┌─────┴────┐   ┌────┴─────┐
│ RDS   │         │ Redis    │   │ S3       │
│ Postgres       │ ElastiCache    │ Bucket   │
└───────┘         └──────────┘   └──────────┘
```

### Docker Build & Registry

**Build and push Docker image:**

```bash
# From project root
docker build -f services/api/Dockerfile \
  -t imbobi-api:$(git rev-parse --short HEAD) \
  -t imbobi-api:latest \
  .

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag imbobi-api:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest
```

### ECS Task Definition

**File:** `.aws/task-definition-prod.json`

```json
{
  "family": "imbobi-api-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "imbobi-api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "hostPort": 4000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/imbobi-api-prod",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:imbobi/prod/api-secrets:DATABASE_URL::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:imbobi/prod/api-secrets:JWT_SECRET::"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "4000" },
        { "name": "LOG_LEVEL", "value": "info" }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### ECS Service Configuration

```bash
# Create ECS Service
aws ecs create-service \
  --cluster imbobi-prod \
  --service-name imbobi-api-prod \
  --task-definition imbobi-api-prod:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=imbobi-api,containerPort=4000 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-1,subnet-2],securityGroups=[sg-api],assignPublicIp=DISABLED}" \
  --deployment-configuration maximumPercent=200,minimumHealthyPercent=100 \
  --region us-east-1
```

### Zero-Downtime Deployment

**Deployment Strategy:**
1. Update task definition
2. ECS service rolls out new tasks (blue-green)
3. Health checks verify before routing traffic
4. Old tasks drained gracefully (connection timeout)
5. Rollback available within 5 minutes

**Configuration:**
- Maximum percent: 200% (allows 2x tasks during rollout)
- Minimum healthy percent: 100% (ensures availability)
- Health check grace period: 60 seconds
- Connection draining: 30 seconds

---

## Web Application Deployment

### Vercel Deployment (Recommended)

**Setup:**

```bash
# 1. Connect GitHub repository
# https://vercel.com/new → Import Git Repository

# 2. Configure project
vercel env add NEXT_PUBLIC_API_URL https://api.imbobi.com
vercel env add NEXT_PUBLIC_SENTRY_DSN https://...
vercel env add SENTRY_AUTH_TOKEN sentry_token_here

# 3. Configure build settings in Vercel dashboard
# Root Directory: apps/web
# Build Command: pnpm build
# Install Command: pnpm install

# 4. Add environment variables for all environments
# .env.production → NEXT_PUBLIC_API_URL=https://api.imbobi.com
```

**Automatic deployments:**
- Pushes to `main` → Production
- Pushes to `staging` → Preview
- Pull requests → Preview deployments

### Self-Hosted Deployment (Docker + Nginx)

If self-hosting on EC2:

```bash
# Build Next.js app
cd apps/web
pnpm build
pnpm start

# Docker setup
docker build -f Dockerfile.web -t imbobi-web:latest .
docker push imbobi-web:latest
```

**Nginx configuration:**
```nginx
upstream nextjs_backend {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name app.imbobi.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name app.imbobi.com;

  # SSL certificates (Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/app.imbobi.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.imbobi.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "no-referrer-when-downgrade" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; img-src 'self' data: https:;" always;

  location / {
    proxy_pass http://nextjs_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # Cache static assets
  location /_next/static/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
  }

  location /static/ {
    expires 30d;
    add_header Cache-Control "public";
  }
}
```

---

## Mobile App Deployment

### iOS App Store

**Prerequisites:**
- [ ] Apple Developer account ($99/year)
- [ ] App signing certificate (.p8)
- [ ] Provisioning profiles
- [ ] Screenshots (6 per device)
- [ ] App icon (1024x1024)
- [ ] Privacy policy URL

**Deployment Steps:**

```bash
# 1. Create app in App Store Connect
# https://appstoreconnect.apple.com/

# 2. Configure in eas.json
{
  "build": {
    "ios": {
      "releaseChannel": "production",
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.imbobi.com"
      }
    }
  }
}

# 3. Create build
eas build --platform ios --auto-submit

# 4. Monitor submission
eas submit --platform ios --latest
```

### Google Play Store

**Prerequisites:**
- [ ] Google Play Developer account ($25 one-time)
- [ ] App signing key (create in Google Play Console)
- [ ] Screenshots (5 per device type)
- [ ] App icon (512x512)
- [ ] Privacy policy & terms URLs

**Deployment Steps:**

```bash
# 1. Create app in Google Play Console
# https://play.google.com/console/

# 2. Configure in eas.json
{
  "build": {
    "android": {
      "releaseChannel": "production",
      "distribution": "store"
    }
  }
}

# 3. Create build
eas build --platform android --auto-submit

# 4. Monitor release
eas submit --platform android --latest
```

**Over-the-Air Updates (EAS Updates):**

```bash
# Deploy web updates without app store resubmission
eas update --branch production --message "Fix: Authentication bug"

# Clients will download and apply update on next app launch
```

---

## Database & Migrations

### PostgreSQL RDS Setup

**Create RDS instance:**

```bash
aws rds create-db-instance \
  --db-instance-identifier imbobi-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username produser \
  --master-user-password STRONG_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --db-name imbobi_prod \
  --vpc-security-group-ids sg-12345 \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --enable-cloudwatch-logs-exports postgresql \
  --enable-iam-database-authentication \
  --region us-east-1
```

**Enable PostGIS extension:**

```sql
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
SELECT PostGIS_version();
```

### Zero-Downtime Migrations

**Strategy:**

1. **Safe Migrations** (compatible with running code)
   - Add new columns with defaults
   - Create new tables
   - Add non-unique indexes

2. **Unsafe Migrations** (require coordinated deployment)
   - Drop columns
   - Rename columns
   - Change data types

**Procedure:**

```bash
# 1. Deploy code that handles new schema
# (read/write both old and new columns)

# 2. Run migration
pnpm db:migrate

# 3. Deploy code that uses only new schema
# (old columns become dead code)

# 4. Remove dead code in next release
```

**Rollback Procedure:**

```bash
# Create migration that reverses changes
prisma migrate resolve --rolled-back <migration_name>

# Run migration to apply rollback
pnpm db:migrate
```

**Backup Before Migration:**

```bash
# Create snapshot before migration
aws rds create-db-snapshot \
  --db-instance-identifier imbobi-prod \
  --db-snapshot-identifier imbobi-prod-pre-migration-$(date +%s)

# Monitor migration
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Engine:Engine}'
```

### Connection Pooling (PgBouncer)

**Optional but recommended for high throughput:**

```bash
# Install PgBouncer on separate EC2 instance
# Or use RDS Proxy (managed)

aws rds create-db-proxy \
  --db-proxy-name imbobi-prod-proxy \
  --engine POSTGRESQL \
  --role-arn arn:aws:iam::ACCOUNT:role/rds-proxy-role \
  --auth '[{"AuthScheme":"SECRETS","SecretArn":"arn:aws:secretsmanager:...","IAMAuth":"DISABLED"}]' \
  --database-vpc-security-group-ids sg-12345 \
  --vpc-subnet-ids subnet-1 subnet-2
```

**Update DATABASE_URL:**
```
postgresql://user:pass@imbobi-prod-proxy.123456.us-east-1.rds.amazonaws.com:5432/imbobi_prod
```

---

## DNS & SSL Configuration

### Domain Configuration

**Point domain to services:**

```
app.imbobi.com          → Vercel (Web)
api.imbobi.com          → ALB (API)
imbobi.com              → Marketing site or redirect to app.imbobi.com
cdn.imbobi.com          → CloudFront (S3 assets)
```

**DNS Records (Route 53):**

```
Type    Name              Target                      TTL
A       app.imbobi.com    cname.vercel-dns.com       3600
CNAME   api.imbobi.com    imbobi-alb-123.us-east-1.elb.amazonaws.com  300
CNAME   cdn.imbobi.com    d123456.cloudfront.net     300
MX      imbobi.com        aspmx.l.google.com         3600
TXT     imbobi.com        v=spf1 include:sendgrid.net ~all  3600
```

### SSL/TLS Certificates

**Vercel:**
- Automatic SSL via Let's Encrypt
- Renews automatically
- Wildcard support

**ALB (API):**

```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name api.imbobi.com \
  --subject-alternative-names "*.imbobi.com" \
  --validation-method DNS \
  --region us-east-1

# Verify domain ownership (add CNAME to DNS)
# Update ALB listener to use certificate
```

**Certificate Renewal:**
- ACM renews automatically if DNS validation
- Monitor in ACM console
- Set up CloudWatch alarm if renewal fails

### HTTP to HTTPS Redirect

**API (NestJS middleware):**

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Redirect HTTP to HTTPS
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });

  await app.listen(4000);
}
bootstrap();
```

**Web (Next.js config):**

```javascript
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
        destination: 'https://:host/:path*',
        permanent: true,
      },
    ];
  },
};
```

---

## Monitoring & Alerting

### Sentry Setup

**1. Create Sentry project:**

```bash
# Via CLI
sentry-cli projects create --org imbobi api
sentry-cli projects create --org imbobi web
sentry-cli projects create --org imbobi mobile
```

**2. Configure API:**

```bash
# services/api/.env.production
SENTRY_DSN=https://<KEY>@sentry.io/<PROJECT_ID>
SENTRY_ENVIRONMENT=production
SENTRY_TRACE_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.05
```

**3. Setup alerts in Sentry dashboard:**

- [ ] Error rate > 1%
- [ ] Response time P95 > 500ms
- [ ] Custom alert: Database errors
- [ ] Custom alert: Auth failures > 10/min

**4. Notification channels:**
- [ ] Slack integration
- [ ] Email to dev team

### Prometheus & Grafana

**Docker Compose (optional monitoring stack):**

```yaml
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

**Prometheus rules (prometheus.yml):**

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api.imbobi.com:4000']

rule_files:
  - 'alerts.yml'
```

**Alert rules (alerts.yml):**

```yaml
groups:
  - name: imbobi
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        annotations:
          summary: "P95 response time > 500ms"

      - alert: HighCPU
        expr: container_cpu_usage_seconds_total > 0.8
        for: 10m
        annotations:
          summary: "CPU usage > 80%"

      - alert: HighMemory
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 10m
        annotations:
          summary: "Memory usage > 85%"

      - alert: DiskAlmost Full
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        annotations:
          summary: "Disk usage > 90%"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        annotations:
          summary: "Redis is down"

      - alert: DatabaseConnectionErrors
        expr: rate(postgres_client_connections_wait_time_seconds_total[5m]) > 0
        for: 5m
        annotations:
          summary: "Database connection pool issues"
```

### CloudWatch Dashboards

**API Dashboard:**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name ImhobiAPI-Prod \
  --dashboard-body file://dashboards/api-prod.json
```

**Metrics to track:**
- CPU Utilization
- Memory Utilization
- Network In/Out
- HTTP 4xx/5xx errors
- API response times
- RDS CPU/Connections
- Redis CPU/Memory
- BullMQ queue depth

---

## Backup & Disaster Recovery

### Database Backups

**Automated RDS Backups:**
- Retention: 30 days (production minimum)
- Window: 03:00-04:00 UTC (low traffic)
- Multi-AZ enabled (automatic failover)

**Manual Snapshots:**

```bash
# Create snapshot before major changes
aws rds create-db-snapshot \
  --db-instance-identifier imbobi-prod \
  --db-snapshot-identifier imbobi-prod-manual-$(date +%Y%m%d-%H%M%S)

# Copy to different region for disaster recovery
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:ACCOUNT:snapshot:imbobi-prod-manual-20260528 \
  --target-db-snapshot-identifier imbobi-prod-manual-20260528 \
  --source-region us-east-1 \
  --destination-region us-west-2
```

### S3 Backup (Evidence Storage)

**Enable versioning:**

```bash
aws s3api put-bucket-versioning \
  --bucket imbobi-evidencias-prod \
  --versioning-configuration Status=Enabled
```

**Cross-region replication:**

```bash
aws s3api put-bucket-replication \
  --bucket imbobi-evidencias-prod \
  --replication-configuration '{
    "Role": "arn:aws:iam::ACCOUNT:role/s3-replication",
    "Rules": [{
      "Status": "Enabled",
      "Priority": 1,
      "Destination": {
        "Bucket": "arn:aws:s3:::imbobi-evidencias-prod-backup",
        "ReplicationTime": { "Status": "Enabled", "Time": { "Minutes": 15 } }
      }
    }]
  }'
```

### Backup Verification

**Backup validation script (`scripts/validate-backup.sh`):**

```bash
#!/bin/bash
set -e

echo "🔍 Validating production backups..."

# Check RDS backup
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
  --db-instance-identifier imbobi-prod \
  --query 'DBSnapshots | sort_by(@, &SnapshotCreateTime) | [-1]' \
  --output json)

SNAPSHOT_ID=$(echo $LATEST_SNAPSHOT | jq -r '.[0].DBSnapshotIdentifier')
SNAPSHOT_TIME=$(echo $LATEST_SNAPSHOT | jq -r '.[0].SnapshotCreateTime')
SNAPSHOT_SIZE=$(echo $LATEST_SNAPSHOT | jq -r '.[0].AllocatedStorage')

echo "✓ Latest RDS snapshot: $SNAPSHOT_ID"
echo "  Time: $SNAPSHOT_TIME"
echo "  Size: ${SNAPSHOT_SIZE}GB"

# Check S3 versioning
S3_VERSIONS=$(aws s3api list-object-versions \
  --bucket imbobi-evidencias-prod \
  --query 'length(Versions)' \
  --output text)

echo "✓ S3 versions: $S3_VERSIONS objects"

# Test restore (optional - in staging)
# aws rds restore-db-instance-from-db-snapshot \
#   --db-instance-identifier imbobi-prod-restore-test \
#   --db-snapshot-identifier $SNAPSHOT_ID

echo "✅ Backup validation complete"
```

### Disaster Recovery Plan

**RTO/RPO Targets:**
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 15 minutes

**Recovery Procedures:**

**Scenario 1: Database Corruption/Attack**
```bash
# 1. Alert team
# 2. Identify last good snapshot
GOOD_SNAPSHOT=imbobi-prod-manual-20260527-120000

# 3. Create new instance from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-prod-restored \
  --db-snapshot-identifier $GOOD_SNAPSHOT

# 4. Verify data integrity
# 5. Update application DATABASE_URL in Secrets Manager
# 6. Restart API tasks in ECS

# 7. Old database: Keep as imbobi-prod-corrupted for forensics
```

**Scenario 2: Complete Region Failure**
```bash
# 1. Restore RDS from cross-region snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-prod-us-west-2 \
  --db-snapshot-identifier arn:aws:rds:us-west-2:...

# 2. Restore S3 from replication bucket
aws s3 sync \
  s3://imbobi-evidencias-prod-backup \
  s3://imbobi-evidencias-prod-us-west-2

# 3. Deploy API to us-west-2
# 4. Update DNS to point to new region
# 5. Update Vercel deployment region (if needed)
```

**Scenario 3: Ransomware/Widespread Data Loss**
```bash
# 1. Isolate production environment (disable all ingress)
aws ec2 modify-security-group-rules \
  --group-id sg-prod-api \
  --security-group-rules 'IpProtocol=tcp,IpPermission={IpProtocol=tcp,FromPort=4000,ToPort=4000,IpRanges=[]}' \
  --cli-input-json file://disable-rules.json

# 2. Analyze last 7 daily snapshots to find infection point
# 3. Restore from clean snapshot (likely 8+ days old)
# 4. Forensic analysis on corrupted database
```

---

## Security Hardening

### AWS WAF (Web Application Firewall)

**Setup:**

```bash
# Create Web ACL
aws wafv2 create-web-acl \
  --name imbobi-prod-waf \
  --scope CLOUDFRONT \
  --default-action Block={} \
  --rules '[
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": { "None": {} },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "CommonRuleSet"
      }
    }
  ]'
```

**Attach to ALB:**

```bash
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:ACCOUNT:regional/webacl/imbobi-prod-waf/... \
  --resource-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/imbobi-alb/...
```

### DDoS Protection

**AWS Shield Standard:** Included free (3/7 layer attacks)

**AWS Shield Advanced** (optional, $3000/month):
- DDoS cost protection
- 24/7 DDoS Response Team
- Real-time attack notifications

### Rate Limiting

**API Rate Limiting (NestJS middleware):**

```typescript
// src/common/guards/rate-limit.guard.ts
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): string {
    return request.ip;
  }
}

// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100, // 100 requests per minute
    }),
  ],
})
export class AppModule {}
```

**Apply guard globally:**

```typescript
// main.ts
app.useGlobalGuards(new RateLimitGuard(reflector));
```

### Secrets Rotation

**API Keys:**
- Rotate SendGrid keys: Monthly
- Rotate AWS keys: Quarterly
- Rotate JWT secrets: Yearly (with migration period)

**Rotation Procedure:**

```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -base64 48)

# 2. Add to Secrets Manager with suffix
aws secretsmanager update-secret \
  --secret-id imbobi/prod/api-secrets \
  --secret-string "{\"JWT_SECRET\": \"$NEW_KEY\", \"JWT_SECRET_OLD\": \"$OLD_KEY\"}"

# 3. Deploy code that validates both keys
# 4. Wait 7 days (token TTL expiration)
# 5. Remove old key

# 6. Force re-authentication
# (invalidate all existing tokens)
```

### IAM Policies (Least Privilege)

**ECS Task Role:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT:log-group:/ecs/imbobi-api-prod:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:imbobi/prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::imbobi-evidencias-prod/*"
    }
  ]
}
```

### API Key Management

**For external integrations (KYC, SMS, etc.):**

```bash
# Store in Secrets Manager, never in code
aws secretsmanager create-secret \
  --name imbobi/prod/external-apis \
  --secret-string '{
    "UNICO_API_KEY": "...",
    "SERPRO_TOKEN": "..."
  }'
```

---

## Performance Optimization

### Redis Cache Warming

**Strategy:** Pre-populate cache on deployment

```bash
# scripts/warm-cache.sh
#!/bin/bash

API_URL=https://api.imbobi.com
REDIS_URL=redis://...

# Warm frequently accessed data
for category in categories regions companies states; do
  echo "Warming cache for $category..."
  curl -X GET "$API_URL/api/v1/$category" \
    -H "Authorization: Bearer $INTERNAL_TOKEN"
done

# Pre-compute aggregations
curl -X POST "$API_URL/api/v1/cache/rebuild" \
  -H "Authorization: Bearer $INTERNAL_TOKEN"

echo "✅ Cache warming complete"
```

**Run on deployment:**

```bash
# ECS task definition post-deployment
scripts/warm-cache.sh
```

### Database Connection Pooling

**Prisma configuration:**

```bash
# .env.production
DATABASE_URL="postgresql://user:pass@host/db?schema=public&connection_limit=20"
```

**PrismaClient config:**

```typescript
// services/api/src/prisma.service.ts
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ['info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Image Optimization (S3 + CloudFront)

**CloudFront distribution:**

```bash
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "imbobi-prod-cdn",
  "Comment": "CDN for S3 evidence storage",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3Origin",
      "DomainName": "imbobi-evidencias-prod.s3.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": ""
      }
    }]
  },
  "DefaultCacheBehavior": {
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ViewerProtocolPolicy": "redirect-to-https",
    "TargetOriginId": "S3Origin",
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 86400,
    "MaxTTL": 31536000,
    "DefaultTTL": 604800,
    "Compress": true
  }
}'
```

**Image optimization in Next.js:**

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';

export function OptimizedImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={600}
      height={400}
      priority={false}
      loading="lazy"
      placeholder="blur"
      quality={75}
    />
  );
}
```

### Bundle Analysis

**Analyze Next.js bundle:**

```bash
cd apps/web
ANALYZE=true pnpm build
# Opens bundle report in browser
```

**Analyze API bundle:**

```bash
cd services/api
npm install -g npm-bundle-analyzer
bundle-analyze dist/main.js
```

---

## Incident Response

### On-Call Rotation

**Setup Slack workflow:**

```
When: New Sentry alert
  1. Post to #incidents
  2. Mention @on-call
  3. Create incident in PagerDuty
```

**Contact List:**
- Primary: dev-lead@imbobi.com
- Secondary: devops@imbobi.com
- Manager: engineering-manager@imbobi.com

### Common Issues & Remediation

**Issue: High Error Rate (>1%)**

```bash
# 1. Check recent deployments
git log --oneline -10

# 2. Review Sentry error details
# Dashboard: https://sentry.io/imbobi/api/issues/

# 3. Check API logs
aws logs tail /ecs/imbobi-api-prod --follow

# 4. If recent deployment caused issue: Rollback
# ECS Service → Deployment Configuration → Previous task revision

# 5. If issue persists: Page on-call engineer
```

**Issue: Database Connection Exhaustion**

```bash
# Check current connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle' AND query_start < now() - interval '30 minutes';
"

# Increase pool size if needed
# .env.production: DATABASE_POOL_SIZE=25

# Restart API tasks
aws ecs update-service \
  --cluster imbobi-prod \
  --service imbobi-api-prod \
  --force-new-deployment
```

**Issue: Redis Memory Full**

```bash
# Check Redis memory
redis-cli INFO memory

# Clear cache
redis-cli FLUSHDB

# Increase Redis instance size
aws elasticache modify-cache-cluster \
  --cache-cluster-id imbobi-prod \
  --cache-node-type cache.t3.medium \
  --apply-immediately
```

**Issue: S3 Upload Failures**

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket imbobi-evidencias-prod

# Check IAM permissions
# Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are valid

# Check bucket quotas
aws s3api get-bucket-acl --bucket imbobi-evidencias-prod

# Verify CORS configuration
aws s3api get-bucket-cors --bucket imbobi-evidencias-prod
```

### Runbook Template

**Incident: [Issue Name]**

| Field | Value |
|-------|-------|
| **Severity** | P1 (Critical) / P2 (High) / P3 (Medium) / P4 (Low) |
| **Impact** | Affects [X] users, [Y] transactions/minute |
| **Detection** | Alert via [Sentry/CloudWatch/PagerDuty] |
| **ETA to Fix** | < 15 minutes (P1), < 1 hour (P2) |

**Diagnostic Steps:**
1. [ ] Check Sentry dashboard for error patterns
2. [ ] Review CloudWatch logs for anomalies
3. [ ] Check service health endpoints
4. [ ] Verify external service dependencies

**Remediation Steps:**
1. [ ] [Specific action 1]
2. [ ] [Specific action 2]
3. [ ] Verify fix
4. [ ] Post-incident review

---

## Post-Deployment Verification

### Smoke Tests (Critical User Flows)

**Test Case 1: User Registration & Login**
```bash
curl -X POST https://api.imbobi.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@imbobi.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'

# Expect: 201 Created with JWT token
```

**Test Case 2: Evidence Upload**
```bash
curl -X POST https://api.imbobi.com/api/v1/evidences/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"

# Expect: 200 OK with S3 URL
```

**Test Case 3: Location Tracking**
```bash
curl -X POST https://api.imbobi.com/api/v1/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracy": 10
  }'

# Expect: 201 Created (PostGIS validation)
```

**Test Case 4: Push Notifications**
```bash
# Send test notification via Firebase
curl -X POST https://fcm.googleapis.com/v1/projects/imbobi-production/messages:send \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "$DEVICE_TOKEN",
      "notification": {
        "title": "Test Notification",
        "body": "Deployment successful"
      }
    }
  }'
```

**Test Case 5: Payment Processing** (if applicable)
```bash
curl -X POST https://api.imbobi.com/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "BRL",
    "installments": 1
  }'

# Expect: 200 OK with payment URL
```

### Performance Baseline

**Establish baseline metrics:**

| Metric | Target | Method |
|--------|--------|--------|
| API Response Time (P50) | < 100ms | Load test with k6 |
| API Response Time (P95) | < 500ms | Load test with k6 |
| API Response Time (P99) | < 1s | Load test with k6 |
| Database Query Time (P95) | < 100ms | Query logs analysis |
| Error Rate | < 0.5% | Monitor for 24h |
| Uptime | > 99.9% | Monitor for 7 days |

**Load test with k6:**

```bash
# Install k6
brew install k6

# Create test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const res = http.get('https://api.imbobi.com/api/v1/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
EOF

# Run test
k6 run load-test.js
```

### Error Rate Monitoring (First 24h)

**Check Sentry dashboard every 2 hours:**

```bash
# Get error rate via Sentry API
curl https://sentry.io/api/0/projects/imbobi/api/stats/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Alert thresholds (first 24 hours):**
- Error rate > 2% → Page on-call
- Specific error spike (10x normal) → Investigate
- Database errors > 5/min → Check connections
- Auth failures > 20/min → Check service status

### Day 1 Checklist

After deployment goes live:

- [ ] All smoke tests pass
- [ ] Error rate < 1% for 1 hour
- [ ] No database connection issues
- [ ] Push notifications working
- [ ] S3 uploads functional
- [ ] API response times normal
- [ ] Web UI loads without JS errors
- [ ] Mobile app receives updates via EAS
- [ ] External API integrations working
- [ ] Email notifications sent correctly
- [ ] User feedback collection enabled
- [ ] Analytics events firing
- [ ] Payment processing (if applicable) working
- [ ] Admin dashboard accessible
- [ ] Database backups running
- [ ] Monitoring alerts configured
- [ ] On-call rotation active

### Week 1 Checklist

- [ ] Error rate stable at < 0.5%
- [ ] Performance metrics meet baseline
- [ ] Zero security incidents
- [ ] Backup validation successful
- [ ] All integrations stable
- [ ] User feedback positive
- [ ] No critical bugs reported
- [ ] Document lessons learned
- [ ] Update runbooks if needed

---

## Rollback Procedure

### Quick Rollback (< 5 minutes)

**If deployment has critical issue:**

```bash
# 1. Revert to previous task definition
CURRENT_REVISION=$(aws ecs describe-services \
  --cluster imbobi-prod \
  --services imbobi-api-prod \
  --query 'services[0].taskDefinition' \
  --output text | awk -F: '{print $NF}')

PREVIOUS_REVISION=$((CURRENT_REVISION - 1))

# 2. Update service to use previous task
aws ecs update-service \
  --cluster imbobi-prod \
  --service imbobi-api-prod \
  --task-definition imbobi-api-prod:$PREVIOUS_REVISION

# 3. Monitor rollout
aws ecs describe-services \
  --cluster imbobi-prod \
  --services imbobi-api-prod \
  --query 'services[0].deployments'

# 4. Verify health
curl https://api.imbobi.com/health
```

### Database Rollback (Zero-Downtime)

```bash
# 1. Identify last good migration
psql $DATABASE_URL -c "SELECT name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# 2. Create rollback migration
# Example: If migration_2026_05_28_001 is bad, create migration_2026_05_28_002_rollback

# 3. Run rollback
pnpm db:migrate

# 4. Verify data integrity
pnpm db:validate
```

---

## Monitoring Checklist

**Daily:**
- [ ] Check error rate in Sentry
- [ ] Review API response times
- [ ] Check database performance
- [ ] Verify backups completed

**Weekly:**
- [ ] Review AWS costs
- [ ] Check security logs
- [ ] Test backup restoration
- [ ] Review user feedback

**Monthly:**
- [ ] Update runbooks
- [ ] Review incident logs
- [ ] Security audit
- [ ] Capacity planning
- [ ] Performance optimization review

---

## References & Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **Docker Documentation:** https://docs.docker.com/
- **NestJS Documentation:** https://docs.nestjs.com/
- **Next.js Documentation:** https://nextjs.org/docs
- **Expo Documentation:** https://docs.expo.dev/
- **PostgreSQL High Availability:** https://wiki.postgresql.org/wiki/Replication,_Clustering,_and_Connection_Pooling
- **Sentry Documentation:** https://docs.sentry.io/
- **Prometheus Best Practices:** https://prometheus.io/docs/practices/

---

## Support & Escalation

**For deployment issues:**
1. Check this runbook
2. Review recent logs in CloudWatch/Sentry
3. Contact DevOps lead
4. Escalate to AWS support if infrastructure issue

**Slack channels:**
- #incidents — Critical issues
- #deployments — Deployment notifications
- #infrastructure — Infrastructure discussions

**Email contacts:**
- DevOps Lead: devops@imbobi.com
- Engineering Manager: manager@imbobi.com
- AWS Support: (Premium support ticket)
