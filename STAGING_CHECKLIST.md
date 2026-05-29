# imbobi — Staging Environment Deployment Checklist

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     STAGING ENVIRONMENT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Next.js Web │  │ Expo Mobile  │  │  Health      │          │
│  │  (Port 3000) │  │  (Port 8081) │  │  Check       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                    ┌──────▼─────────┐                          │
│                    │  nginx/reverse │                          │
│                    │   proxy        │                          │
│                    │ (Port 80/443)  │                          │
│                    └──────┬─────────┘                          │
│                           │                                     │
│              ┌────────────┴────────────┐                       │
│              │                         │                        │
│      ┌───────▼────────┐    ┌──────────▼────────┐              │
│      │   NestJS API   │    │  Other Services   │              │
│      │  (Port 4000)   │    │                   │              │
│      └───────┬────────┘    └───────────────────┘              │
│              │                                                  │
│    ┌─────────┴──────────┬────────────────┐                     │
│    │                    │                │                     │
│┌───▼──────────┐ ┌──────▼────────┐ ┌────▼────────────┐         │
││  PostgreSQL  │ │    Redis      │ │  AWS S3 Storage │         │
││  +PostGIS    │ │  +BullMQ      │ │ (Staging Bucket)│         │
││ (Port 5433)  │ │ (Port 6380)   │ └─────────────────┘         │
│└──────────────┘ └───────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-Deployment Requirements

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ or similar)
- **Hardware**: 4+ CPU cores, 8GB+ RAM, 50GB+ SSD storage
- **Network**: Public or VPN-accessible IP address with DNS configured

### Required Software

Before deploying to staging, ensure you have installed:

```bash
# Check versions
docker --version          # v20.10+
docker-compose --version # v1.29+
git --version            # v2.30+
pnpm --version           # v8.0+
node --version           # v18.0+
aws --version            # v2.x (optional, for S3)
nginx --version          # (optional, for reverse proxy)
postgresql-client        # psql command (optional)
```

### Installation Guide

If any of these are missing:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git curl wget postgresql-client

# Install pnpm globally
sudo npm install -g pnpm@8

# Install AWS CLI (if using S3)
sudo apt-get install -y awscli

# Install nginx (if using reverse proxy)
sudo apt-get install -y nginx
```

### System Configuration

**Important**: Run these before deployment:

```bash
# Start Docker daemon (if not already running)
sudo systemctl start docker
sudo systemctl enable docker  # Auto-start on boot

# Add your user to docker group (avoid sudo for every command)
sudo usermod -aG docker $USER
# Log out and back in, or:
newgrp docker

# Create deployment directories
sudo mkdir -p /opt/deploys/imobi
sudo mkdir -p /opt/imobi
sudo chown -R $USER:$USER /opt/imobi
sudo chown -R $USER:$USER /opt/deploys/imobi

# Increase system limits for database/redis
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step-by-Step Setup Guide

### Phase 1: Environment Preparation

#### 1.1 Clone/Pull Repository

```bash
cd /opt/imobi
git clone https://github.com/your-org/imobi.git . || git pull origin main
git status  # Verify clean working directory
```

#### 1.2 Install Dependencies

```bash
pnpm install
# Expected output: "up to date, audited X packages"
```

#### 1.3 Generate Environment Files

```bash
# Copy the staging example
cp .env.staging.example .env.staging

# Edit with your staging-specific values
nano .env.staging
# Required fields:
#   - DATABASE_URL (update host/port/password if needed)
#   - REDIS_HOST/PORT (update if needed)
#   - JWT_SECRET (generate: openssl rand -base64 48)
#   - ENCRYPTION_KEY (generate: openssl rand -base64 32)
#   - AWS_* (S3 credentials)
#   - SENDGRID_API_KEY or SMTP config
#   - FIREBASE_* (push notifications)
```

### Phase 2: Database & Cache Setup

#### 2.1 Start Docker Services (PostgreSQL + Redis)

```bash
# Using docker-compose.staging.yml
docker-compose -f docker-compose.staging.yml up -d

# Verify containers are running
docker-compose -f docker-compose.staging.yml ps
# Expected output:
#   NAME              COMMAND                SERVICE    STATUS
#   imobi-postgres    "docker-entrypoint..." postgres   Up X seconds
#   imobi-redis       "redis-server..."      redis      Up X seconds

# Check logs for any errors
docker-compose -f docker-compose.staging.yml logs postgres
docker-compose -f docker-compose.staging.yml logs redis
```

#### 2.2 Verify Database Connectivity

```bash
# Test PostgreSQL connection
PGPASSWORD=staging_password_secure_12345 psql -h localhost -p 5433 -U imobi -d imobi_staging -c "SELECT version();"

# Expected output:
#   PostgreSQL X.X.X (Debian X.X-X)

# Verify PostGIS extension
PGPASSWORD=staging_password_secure_12345 psql -h localhost -p 5433 -U imobi -d imobi_staging -c "SELECT PostGIS_Version();"

# Expected output:
#   PostGIS 3.X.X
```

#### 2.3 Verify Redis Connectivity

```bash
# Test Redis connection
redis-cli -h localhost -p 6380 ping
# Expected output: PONG

# Check Redis memory
redis-cli -h localhost -p 6380 info memory | grep -E "used_memory|maxmemory"
```

#### 2.4 Run Database Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Expected output:
#   ✔ Generated Prisma Client

# Run migrations
pnpm db:migrate

# Expected output:
#   Running migrations
#   Your database is now in sync with your schema.

# (Optional) Seed with test data
pnpm db:seed  # if available in your project
```

### Phase 3: Build Preparation

#### 3.1 Type Check

```bash
pnpm type-check

# Expected output:
#   Services: OK
#   Web: OK
#   Mobile: OK
#   Packages: OK
```

#### 3.2 Run Tests (if configured)

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests (optional, may require running services)
pnpm test:e2e || true  # Continue even if skipped

# Expected: All tests pass or are intentionally skipped
```

#### 3.3 Build Artifacts

```bash
pnpm build

# Expected output:
#   Building...
#   api: ✓ bundle successful
#   web: ✓ build successful
#   Total: ~2-3 minutes for full build
```

### Phase 4: Service Deployment

#### 4.1 Deploy Using Automation Script

```bash
# Make the script executable
chmod +x ./scripts/setup-staging.sh

# Run the automated setup
./scripts/setup-staging.sh

# Expected output:
#   [✓] Prerequisites verified
#   [✓] Directories created
#   [✓] PostgreSQL running
#   [✓] Redis running
#   [✓] .env.staging file created
#   [✓] All connectivity checks passed
#   [Next steps...]
```

#### 4.2 Manual Service Start (if not using script)

```bash
# Build Docker images (if needed)
docker-compose -f docker-compose.staging.yml build

# Start all services
docker-compose -f docker-compose.staging.yml up -d

# Verify all services are running
docker-compose -f docker-compose.staging.yml ps

# Expected statuses: all "Up"
```

#### 4.3 Deploy Using deployment script

```bash
# Standard deployment
./scripts/deploy.sh --standard

# Or with blue-green (recommended for zero-downtime)
./scripts/deploy.sh --blue-green

# Monitor deployment logs
tail -f /var/log/imobi/deploy.log

# Once deployment completes, you should see:
#   Deployment Summary
#   Status: operational
```

### Phase 5: Post-Deployment Verification

#### 5.1 Health Checks

```bash
# Check API health
curl -s http://localhost:4000/api/v1/health | jq .

# Expected output:
# {
#   "status": "ok",
#   "timestamp": "2026-05-29T...",
#   "database": "connected",
#   "redis": "connected",
#   "version": "1.0.0"
# }

# Run automated health checks
./scripts/health-check.sh

# Expected output:
#   ✓ API responding
#   ✓ Database connected
#   ✓ Redis connected
#   ✓ S3 accessible
```

#### 5.2 Smoke Tests

```bash
./scripts/smoke-test.sh http://localhost:4000

# Expected output:
#   Testing authentication...
#   ✓ Auth endpoints responding
#   Testing user flows...
#   ✓ User creation works
#   ✓ Photo upload works
#   [Total: X tests, Failures: 0]
```

#### 5.3 Web/Mobile Verification

```bash
# Check if web is accessible
curl -s http://localhost:3000 | head -20

# Check if API endpoints respond
curl -s http://localhost:4000/api/v1/public/health | jq .

# Mobile can test with:
# EXPO_PUBLIC_API_URL=http://staging-ip:4000 expo start
```

#### 5.4 Log Verification

```bash
# Check API logs
docker-compose -f docker-compose.staging.yml logs api --tail=100

# Check for errors
docker-compose -f docker-compose.staging.yml logs api | grep -i error | head -20

# Follow logs in real-time
docker-compose -f docker-compose.staging.yml logs api -f
```

---

## Pre-Deployment Checklist

Run this before executing `./scripts/deploy.sh`:

- [ ] All system requirements installed and verified
- [ ] Docker daemon is running: `docker ps` works
- [ ] Deployment directories created: `/opt/imobi` and `/opt/deploys/imobi`
- [ ] Repository up-to-date: `git status` shows clean working directory
- [ ] `.env.staging` file exists and is properly configured
- [ ] Database and Redis are running: `docker ps` shows containers
- [ ] Database migrations are current: `pnpm db:migrate` completes successfully
- [ ] All tests pass: `pnpm test` and `pnpm type-check` pass
- [ ] Production build completes: `pnpm build` succeeds
- [ ] No uncommitted changes: `git status` is clean
- [ ] Backups exist: Previous version backed up if applicable
- [ ] Disk space available: `df -h` shows at least 20GB free
- [ ] Network connectivity confirmed for AWS S3, SendGrid, Firebase APIs
- [ ] Team has been notified of deployment window

## Post-Deployment Checklist

Perform these after deployment completes:

- [ ] API is responding to health checks: `curl http://localhost:4000/api/v1/health`
- [ ] Web frontend loads: `curl http://localhost:3000` returns HTML
- [ ] Database is accessible and migrations applied
- [ ] Redis is operational and BullMQ jobs are processing
- [ ] S3 integration works: test photo upload
- [ ] Email/SendGrid working: test notification send
- [ ] Push notifications working: Firebase test message sends
- [ ] Logs show no critical errors: `docker logs imobi-api | grep ERROR` returns minimal results
- [ ] Authentication flows work: login/signup tested
- [ ] Main workflows functional: create project, upload photo, validate location
- [ ] Performance acceptable: response times < 500ms for common operations
- [ ] No data corruption detected in database
- [ ] Monitoring/alerting configured (if applicable)
- [ ] Team has been notified of successful deployment
- [ ] Documentation updated with any configuration changes

---

## Troubleshooting Guide

### Database Connection Issues

**Problem**: `error: connect ECONNREFUSED 127.0.0.1:5433`

**Solutions**:

```bash
# 1. Check if PostgreSQL container is running
docker-compose -f docker-compose.staging.yml ps postgres

# 2. Check PostgreSQL logs for errors
docker-compose -f docker-compose.staging.yml logs postgres

# 3. Verify DATABASE_URL in .env.staging
# Must match: postgresql://imobi:staging_password_secure_12345@localhost:5433/imobi_staging

# 4. Restart the container
docker-compose -f docker-compose.staging.yml restart postgres

# 5. Verify port is not in use
lsof -i :5433

# If port is in use by another process:
sudo kill -9 <PID>
```

### Redis Connection Issues

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6380`

**Solutions**:

```bash
# 1. Check if Redis container is running
docker-compose -f docker-compose.staging.yml ps redis

# 2. Test connection directly
redis-cli -h localhost -p 6380 ping

# 3. Check Redis logs
docker-compose -f docker-compose.staging.yml logs redis

# 4. Restart Redis
docker-compose -f docker-compose.staging.yml restart redis

# 5. Clear Redis cache (will flush all data)
redis-cli -h localhost -p 6380 FLUSHALL
```

### API Not Starting

**Problem**: API container exits or responds with 502 errors

**Solutions**:

```bash
# 1. Check API logs
docker-compose -f docker-compose.staging.yml logs api

# 2. Verify .env.staging has all required variables
grep -E "JWT_SECRET|ENCRYPTION_KEY|DATABASE_URL|REDIS" .env.staging

# 3. Rebuild API image if code changed
docker-compose -f docker-compose.staging.yml build api

# 4. Verify database is accessible from API container
docker-compose -f docker-compose.staging.yml exec api \
  sh -c "PGPASSWORD=staging_password_secure_12345 psql -h postgres -p 5432 -U imobi -d imobi_staging -c 'SELECT 1;'"

# 5. Check for port conflicts
lsof -i :4000
```

### Migration Failures

**Problem**: `pnpm db:migrate` fails with schema errors

**Solutions**:

```bash
# 1. Check migration status
pnpm prisma migrate status

# 2. View detailed error
pnpm prisma migrate deploy --verbose

# 3. Reset database (DESTRUCTIVE - staging only!)
pnpm prisma migrate reset --force

# 4. Manually apply migrations from scratch
pnpm prisma db push

# 5. Check for pending migrations
ls prisma/migrations/
```

### Deployment Timeout Issues

**Problem**: `Deployment failed: API failed to become healthy after 30 seconds`

**Solutions**:

```bash
# 1. Check if API process is actually running
docker-compose -f docker-compose.staging.yml ps api

# 2. Increase startup timeout in deploy.sh (if needed)
# Edit: scripts/deploy.sh, change timeout from 30 to 60 seconds

# 3. Check API startup logs
docker-compose -f docker-compose.staging.yml logs api --tail=50

# 4. Verify all environment variables are set
docker-compose -f docker-compose.staging.yml exec api env | sort

# 5. Check system resources (may be memory/CPU constrained)
docker stats
```

### S3/AWS Connectivity Issues

**Problem**: Photo uploads fail with AWS credentials error

**Solutions**:

```bash
# 1. Verify AWS credentials in .env.staging
grep AWS_ .env.staging

# 2. Test AWS CLI connectivity
aws s3 ls --region us-east-1

# 3. Verify S3 bucket exists and is accessible
aws s3 ls s3://imbobi-evidencias-staging/

# 4. Check IAM permissions (bucket policy allows your IAM user)
aws s3api get-bucket-policy --bucket imbobi-evidencias-staging

# 5. Verify bucket region matches AWS_REGION in .env.staging
```

### Memory/Performance Issues

**Problem**: Staging runs slowly, containers consuming too much memory

**Solutions**:

```bash
# 1. Check current resource usage
docker stats

# 2. Check available system memory
free -h

# 3. Increase Docker memory allocation
# Edit docker-compose.staging.yml, add under services:
#   api:
#     deploy:
#       resources:
#         limits:
#           memory: 2G

# 4. Clear unused Docker resources
docker system prune -a

# 5. Restart all services
docker-compose -f docker-compose.staging.yml restart
```

### Nginx Reverse Proxy Issues

**Problem**: Web requests timeout or fail to reach API

**Solutions**:

```bash
# 1. Check if nginx is running
sudo systemctl status nginx

# 2. Verify nginx configuration
sudo nginx -t

# 3. Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 4. Verify upstream servers in nginx config
cat /etc/nginx/sites-enabled/imobi.conf | grep upstream -A 5

# 5. Reload nginx configuration
sudo systemctl reload nginx
```

---

## Common Configuration Examples

### Example: Using RDS Instead of Local PostgreSQL

Edit `.env.staging`:

```bash
# Instead of local PostgreSQL
DATABASE_URL="postgresql://imobi:secure-password@imobi-staging.xxxxx.us-east-1.rds.amazonaws.com:5432/imobi_staging"
```

Then:

```bash
# Run migrations against RDS
pnpm db:migrate

# Verify connection
psql postgresql://imobi:secure-password@imobi-staging.xxxxx.us-east-1.rds.amazonaws.com:5432/imobi_staging -c "SELECT version();"
```

### Example: Using ElastiCache for Redis

Edit `.env.staging`:

```bash
REDIS_HOST=imobi-redis-staging.xxxxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-auth-token  # If auth is enabled
```

### Example: Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/imobi-staging`:

```nginx
upstream api_backend {
    server localhost:4000;
}

upstream web_frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name staging.imbobi.local;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.imbobi.local;
    
    ssl_certificate /etc/ssl/certs/staging.imbobi.local.crt;
    ssl_certificate_key /etc/ssl/private/staging.imbobi.local.key;
    
    # API proxy
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Web frontend
    location / {
        proxy_pass http://web_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/imobi-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Monitoring & Maintenance

### Daily Health Check Script

```bash
#!/bin/bash
# Run this daily via cron

API_URL="http://localhost:4000/api/v1/health"
DB_QUERY="SELECT COUNT(*) FROM projects;"

# Check API
if ! curl -s "$API_URL" | grep -q "ok"; then
    echo "[ALERT] API is unhealthy!" | mail -s "Staging Alert" ops@imbobi.com
fi

# Check database size
SIZE=$(docker-compose -f docker-compose.staging.yml exec -T postgres psql -U imobi -d imobi_staging -t -c "SELECT pg_size_pretty(pg_database_size('imobi_staging'));")
echo "Database size: $SIZE"

# Check available disk space
DISK=$(df /opt/imobi | awk 'NR==2 {print $4}')
if [ "$DISK" -lt 5242880 ]; then  # Less than 5GB
    echo "[ALERT] Low disk space: ${DISK}MB available" | mail -s "Staging Alert" ops@imbobi.com
fi

# Backup database
BACKUP_FILE="/opt/deploys/imobi/backups/imobi_staging_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f docker-compose.staging.yml exec -T postgres pg_dump -U imobi imobi_staging > "$BACKUP_FILE"
gzip "$BACKUP_FILE"
```

Add to crontab:

```bash
crontab -e
# Add line:
0 2 * * * /home/user/imobi/scripts/daily-health-check.sh
```

---

## Support & Documentation

- **Issues**: Check `/home/user/imobi/docs/` for architecture documentation
- **API**: Health endpoint: `GET /api/v1/health`
- **Logs**: Located at `/var/log/imobi/` (if configured)
- **Backups**: Stored in `/opt/deploys/imobi/backups/`

For questions or issues, reference:
- Project CLAUDE.md: `/home/user/imobi/CLAUDE.md`
- Deployment guide: `/home/user/imobi/scripts/deploy.sh`
- Setup script: `/home/user/imobi/scripts/setup-staging.sh`
