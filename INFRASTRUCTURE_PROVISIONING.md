# Infrastructure Provisioning Guide — imbobi Staging

**Target Environment:** AWS (or similar cloud provider)  
**Deployment Type:** Containerized (Docker)  
**Expected Setup Time:** 30-60 minutes  
**Difficulty:** Intermediate

---

## Phase 1: Pre-Requisites

### Access & Permissions Required

- [ ] AWS Account with admin or sufficient IAM permissions
- [ ] Docker installed locally (for testing)
- [ ] PostgreSQL 14+ client tools (psql)
- [ ] Redis client tools (redis-cli)
- [ ] Domain name (for HTTPS/SSL)
- [ ] SSL certificate (ACM or third-party)

### Credentials to Generate

Before provisioning, generate these secure values:

```bash
# JWT_SECRET (64+ random characters)
openssl rand -base64 64
# Output: ABC123+/=... (use this value)

# ENCRYPTION_KEY (base64-encoded 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Output: abc123+/=... (use this value)
```

**Store these in a secure location** (password manager, 1Password, LastPass, AWS Secrets Manager)

---

## Phase 2: Database Setup

### 2.1 PostgreSQL 14+ Instance

**AWS Option: RDS**

```bash
# Via AWS Console:
1. RDS → Create database
2. Engine: PostgreSQL 14.x (or newer)
3. Instance class: db.t3.medium (minimum for staging)
4. Storage: 50GB gp3
5. Multi-AZ: No (staging only)
6. Public accessibility: Yes (if accessed from outside VPC)
7. Database name: imobi
8. Master username: postgres
9. Master password: [Generate strong password]
10. Security group: Allow port 5432 from API server IP
```

**Verify Connection:**

```bash
psql -h <RDS_ENDPOINT> -U postgres -d imobi -c "SELECT version();"
# Expected: PostgreSQL 14.x...
```

### 2.2 PostGIS Extension

**Required for:** Geospatial queries (evidência location validation)

```bash
# Connect to database
psql -h <RDS_ENDPOINT> -U postgres -d imobi

# Create extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Verify
SELECT PostGIS_Version();
# Expected: 3.x.x
```

### 2.3 Database Migrations

**Run once PostgreSQL is ready:**

```bash
# From project root
export DATABASE_URL="postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/imobi"

# Run migrations
pnpm db:migrate

# Verify schema
pnpm db:generate

# Expected: Prisma client updated successfully
```

**What migrations do:**
- Creates `usuarios` table with KYC status tracking
- Creates `obras` (construction projects) table
- Creates `etapas` (stages) table with workflow state
- Creates `creditos` (loans) table
- Creates `evidencias` (photo evidence) table
- Creates spatial indexes for PostGIS queries
- Creates regular indexes for performance

---

## Phase 3: Redis Cache Setup

### 3.1 Redis 7+ Instance

**AWS Option: ElastiCache**

```bash
# Via AWS Console:
1. ElastiCache → Create Redis cluster
2. Engine: Redis 7.x
3. Node type: cache.t3.micro (staging)
4. Number of nodes: 1
5. Multi-AZ: No (staging only)
6. Port: 6379 (default)
7. Security group: Allow port 6379 from API server IP
8. Subnet group: Default or custom VPC
9. Parameter group: default.redis7.x (for cluster mode disabled)
```

**Verify Connection:**

```bash
redis-cli -h <REDIS_ENDPOINT> -p 6379 ping
# Expected: PONG
```

### 3.2 Validate Redis Access from API Server

```bash
# From API server instance
redis-cli -h <REDIS_ENDPOINT> SET test "hello"
redis-cli -h <REDIS_ENDPOINT> GET test
# Expected: "hello"
```

---

## Phase 4: AWS S3 Setup (File Storage)

### 4.1 Create S3 Bucket

**Via AWS Console or CLI:**

```bash
aws s3 mb s3://imobi-staging-uploads --region us-east-1

# Block public access (IMPORTANT)
aws s3api put-public-access-block \
  --bucket imobi-staging-uploads \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 4.2 Create IAM User for S3 Access

**Via AWS Console:**

1. IAM → Users → Create user: `imobi-staging-app`
2. Permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::imobi-staging-uploads",
           "arn:aws:s3:::imobi-staging-uploads/*"
         ]
       }
     ]
   }
   ```
3. Create access key → Store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

### 4.3 Configure Bucket Lifecycle (Optional but Recommended)

```bash
# Delete old uploads after 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket imobi-staging-uploads \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "DeleteOldUploads",
        "Status": "Enabled",
        "Prefix": "uploads/",
        "Expiration": {"Days": 90}
      }
    ]
  }'
```

---

## Phase 5: API Server Deployment

### 5.1 Create EC2 Instance (or use ECS/AppRunner)

**Option A: EC2 (Simple)**

```bash
# Via AWS Console:
1. EC2 → Launch instance
2. AMI: Ubuntu 22.04 LTS
3. Instance type: t3.medium (staging)
4. Security group:
   - SSH: 22 (from your IP)
   - HTTP: 80 (from load balancer)
   - HTTPS: 443 (from load balancer)
5. Storage: 30GB gp3
6. Launch and note the public IP
```

**Option B: ECS/AppRunner (Recommended)**
- Easier scaling
- Built-in container orchestration
- Better for zero-downtime deployments

### 5.2 Prepare Environment Variables

Create `.env.staging` file with all required variables:

```bash
# === Core Configuration ===
NODE_ENV=production
PORT=4000

# === Secrets (from Phase 1) ===
JWT_SECRET=<from openssl rand -base64 64>
ENCRYPTION_KEY=<from node -e>

# === Database ===
DATABASE_URL=postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/imobi

# === Redis ===
REDIS_HOST=ELASTICACHE_ENDPOINT
REDIS_PORT=6379
REDIS_PASSWORD=<if AUTH enabled>

# === AWS S3 ===
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from IAM user>
AWS_SECRET_ACCESS_KEY=<from IAM user>
S3_BUCKET_NAME=imobi-staging-uploads

# === Security ===
CORS_ORIGIN=https://staging.imobi.com,https://api-staging.imobi.com

# === Firebase (optional for auth)
FIREBASE_PROJECT_ID=<if using Firebase>
FIREBASE_PRIVATE_KEY=<if using Firebase>
FIREBASE_CLIENT_EMAIL=<if using Firebase>

# === Logging (optional)
LOG_LEVEL=info
SENTRY_DSN=<if using Sentry for error tracking>
```

### 5.3 Deploy Application

**Using Docker:**

```bash
# Build image from project root
docker build -t imobi-api:staging -f services/api/Dockerfile .

# Tag for ECR (if using AWS ECR)
docker tag imobi-api:staging ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:staging

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:staging

# Run container with env variables
docker run -d \
  --name imobi-api-staging \
  -p 4000:4000 \
  --env-file .env.staging \
  imobi-api:staging
```

**Verify Container Health:**

```bash
curl -s http://localhost:4000/api/v1/health
# Expected: {"status":"ok","timestamp":"2026-05-30T..."}
```

---

## Phase 6: Web Frontend Deployment

### 6.1 Build Next.js Application

```bash
# From project root
pnpm build

# Output: .next/ directory (production-ready)
```

### 6.2 Deploy to Vercel (Easiest) or Self-Hosted

**Option A: Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod --cwd apps/web --env-file=.env.staging

# Configure environment variables in Vercel dashboard:
# - NEXT_PUBLIC_API_URL=https://api-staging.imobi.com
```

**Option B: Self-Hosted (EC2/App Engine)**

```bash
# Copy .next/ to server
scp -r apps/web/.next ubuntu@SERVER_IP:/app/

# Install dependencies
npm install --production

# Start with PM2 or systemd
pm2 start "next start -p 3000" --name imobi-web
```

---

## Phase 7: Domain & SSL Configuration

### 7.1 DNS Setup

```bash
# Create DNS records:
A record: api-staging.imobi.com → API_SERVER_IP
A record: staging.imobi.com → WEB_SERVER_IP  (or Vercel)
CNAME record: *.staging.imobi.com → api-staging.imobi.com (optional)
```

### 7.2 SSL Certificate

**Via AWS ACM (Certificate Manager):**

```bash
# Request certificate for:
# - api-staging.imobi.com
# - staging.imobi.com
# - *.staging.imobi.com (wildcard, optional)

# Validate via DNS (automatic)
# Apply to CloudFront / Load Balancer
```

### 7.3 Load Balancer (ALB)

```bash
# Create Application Load Balancer
1. EC2 → Load Balancers → Create
2. Name: imobi-staging-alb
3. HTTPS listener (443, with ACM certificate)
4. Target groups:
   - api: port 4000 (API server)
   - web: port 3000 (Web server)
5. Rules:
   - Host: api-staging.imobi.com → api target group
   - Host: staging.imobi.com → web target group
```

---

## Phase 8: Health Checks & Monitoring

### 8.1 API Health Endpoints

```bash
# Verify API is ready
curl -s https://api-staging.imobi.com/api/v1/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-05-30T10:00:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### 8.2 Database Health Check

```bash
# Connect and verify schema
psql -h RDS_ENDPOINT -U postgres -d imobi -c "\dt"

# Expected: List of tables (usuarios, obras, etapas, etc.)
```

### 8.3 Redis Connection Test

```bash
redis-cli -h REDIS_ENDPOINT PING
# Expected: PONG
```

### 8.4 CloudWatch Monitoring (AWS)

```bash
# Create CloudWatch dashboards for:
- RDS: CPU, connections, storage
- ElastiCache: CPU, memory, evictions
- EC2: CPU, network, disk
- ALB: Request count, error rates, latency
```

---

## Phase 9: Pre-Deployment Checklist

Run these validations before opening to users:

### Environment Variables

- [ ] JWT_SECRET set and >64 chars
- [ ] ENCRYPTION_KEY set (base64, 32 bytes)
- [ ] NODE_ENV=production
- [ ] DATABASE_URL points to RDS instance
- [ ] REDIS_HOST points to ElastiCache instance
- [ ] AWS credentials valid
- [ ] CORS_ORIGIN configured (no wildcards)

### Database

- [ ] PostgreSQL 14+ running
- [ ] PostGIS extension installed
- [ ] All migrations applied (`pnpm db:migrate`)
- [ ] Test connection works: `psql -h ... -d imobi -c "SELECT 1"`

### Redis

- [ ] Redis 7+ running
- [ ] Connection verified: `redis-cli PING` → PONG
- [ ] No password issues

### S3

- [ ] Bucket created and public access blocked
- [ ] IAM credentials working
- [ ] Test upload: `aws s3 cp test.txt s3://bucket/test.txt`

### Security

- [ ] HTTPS enabled on all endpoints
- [ ] SSL certificate valid
- [ ] CORS properly restricted
- [ ] Rate limiting thresholds reviewed
- [ ] No test credentials in environment

### Application

- [ ] API server running: `curl https://api-staging.imobi.com/api/v1/health`
- [ ] Web server accessible: `curl https://staging.imobi.com`
- [ ] API can connect to database
- [ ] API can connect to Redis
- [ ] API can access S3 bucket

---

## Phase 10: Post-Deployment Testing

Once everything is deployed, run the security validation test suite:

```bash
# See SECURITY_VALIDATION_REPORT.md for detailed test scenarios:

# 1. Test missing JWT_SECRET behavior
# 2. Test CSRF protection
# 3. Test IDOR prevention
# 4. Test rate limiting
# 5. Test encryption at rest
# 6. Test authorization checks
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Revert to previous API version (if using ECR tags)
docker tag imobi-api:latest-working ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:staging
docker push ...

# 2. Restart services
docker stop imobi-api-staging
docker run ... (with previous version)

# 3. Verify health
curl https://api-staging.imobi.com/api/v1/health

# 4. Investigate issue
# - Check logs: docker logs imobi-api-staging
# - Check database: psql -h RDS_ENDPOINT -d imobi -c "SELECT * FROM migrations;"
# - Check Redis: redis-cli PING
```

---

## Estimated Costs (AWS)

```
Component                Monthly Cost (Staging)
----------------------------------------------
RDS (db.t3.medium)       ~$75
ElastiCache (t3.micro)   ~$20
EC2 (t3.medium)          ~$40
S3 (10GB usage)          ~$0.25
Data Transfer Out        ~$5
ALB                      ~$20
ACM Certificate          Free
Monitoring (CloudWatch)  ~$5
----------------------------------------------
Total                    ~$165/month
```

---

## Support & Troubleshooting

### Database Connection Fails

```bash
# Check security group
aws ec2 describe-security-groups --group-ids sg-xxx

# Verify RDS endpoint
nslookup RDS_ENDPOINT

# Test with psql
psql -h RDS_ENDPOINT -U postgres -c "SELECT 1"
```

### Redis Connection Fails

```bash
# Check Redis availability
redis-cli -h REDIS_ENDPOINT PING

# Check security group
aws ec2 describe-security-groups --group-ids sg-xxx

# Verify endpoint
nslookup REDIS_ENDPOINT
```

### API Container Won't Start

```bash
# Check logs
docker logs imobi-api-staging

# Common issues:
# - Missing ENCRYPTION_KEY (production)
# - Invalid DATABASE_URL
# - Port 4000 already in use
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl s_client -connect api-staging.imobi.com:443

# Renew via ACM
aws acm request-certificate --domain-name api-staging.imobi.com
```

---

## Next Steps After Provisioning

1. **Deploy Application** (see Phase 5-7)
2. **Run Security Tests** (see SECURITY_VALIDATION_REPORT.md)
3. **Load Testing** (optional, see STAGING_DEPLOYMENT.md)
4. **Monitor** (first 24 hours, watch logs + metrics)
5. **Production Deployment** (after 1-2 weeks of staging validation)

---

**Questions?** Check:
- AWS RDS documentation: https://docs.aws.amazon.com/rds/
- ElastiCache documentation: https://docs.aws.amazon.com/elasticache/
- Docker documentation: https://docs.docker.com/
- PostgreSQL PostGIS: https://postgis.net/

**Emergency contact:** infrastructure@imobi.com.br

