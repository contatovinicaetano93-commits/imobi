# AWS ECS Staging Deployment — Step-by-Step Guide

**Status:** ✅ Ready to Deploy  
**Branch:** `claude/happy-goldberg-AFQPj`  
**Deployment Type:** AWS ECS (Elastic Container Service)  
**Duration:** ~30-45 minutes

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before running the deployment script, ensure you have:

### ✅ AWS Account Setup
- [ ] AWS account created and active
- [ ] Billing enabled
- [ ] IAM user with programmatic access (Access Key ID + Secret Access Key)
- [ ] IAM permissions for: ECR, RDS, ElastiCache, ECS, EC2, VPC, IAM, CloudWatch

### ✅ Local Machine Setup
- [ ] AWS CLI installed: `aws --version`
- [ ] Docker installed: `docker --version`
- [ ] pnpm installed: `pnpm --version`
- [ ] Git with SSH key configured (for GitHub)
- [ ] openssl installed: `openssl version`

### ✅ Repository Ready
- [ ] Branch `claude/happy-goldberg-AFQPj` cloned locally
- [ ] All code committed and pushed
- [ ] Build tested: `pnpm build` ✓
- [ ] Type-checking passed: `pnpm type-check` ✓

---

## 🚀 DEPLOYMENT STEPS

### Step 0: Configure AWS Credentials

```bash
# Configure AWS CLI with your IAM credentials
aws configure

# When prompted, enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: us-east-1
# Default output format: json

# Verify credentials are working
aws sts get-caller-identity
# Should output your Account ID, User ARN, etc.
```

### Step 1: Prepare Environment Variables

```bash
# Generate secure secrets
echo "=== Generating Secrets ==="

# JWT_SECRET (64+ chars)
JWT_SECRET=$(openssl rand -base64 48)
echo "JWT_SECRET=$JWT_SECRET"

# ENCRYPTION_KEY (32 bytes, base64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"

# Database password
DB_PASSWORD=$(openssl rand -base64 32)
echo "DB_PASSWORD=$DB_PASSWORD"

# Save these securely - you'll need them later!
```

### Step 2: Create `.env.staging`

```bash
# Copy template
cp /home/user/imobi/.env.staging.example /home/user/imobi/.env.staging

# Edit with your values
nano /home/user/imobi/.env.staging
```

**Required values to fill:**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:[DB_PASSWORD]@[RDS_ENDPOINT]:5432/imbobi_staging
REDIS_HOST=[ELASTICACHE_ENDPOINT]
REDIS_PORT=6379
JWT_SECRET=[JWT_SECRET_FROM_ABOVE]
ENCRYPTION_KEY=[ENCRYPTION_KEY_FROM_ABOVE]
CORS_ORIGIN=https://staging.imbobi.com.br
AWS_REGION=us-east-1
AWS_S3_BUCKET=imbobi-staging-assets
```

### Step 3: Run AWS Deployment Script

```bash
# Navigate to repository
cd /home/user/imobi

# Make script executable
chmod +x AWS_STAGING_SETUP.sh

# Run deployment
./AWS_STAGING_SETUP.sh

# Script will:
# 1. Validate AWS credentials
# 2. Create ECR repositories
# 3. Build and push Docker images
# 4. Create RDS PostgreSQL instance (5-10 min wait)
# 5. Create ElastiCache Redis
# 6. Create VPC and security groups
# 7. Create ECS cluster
# 8. Deploy API service
# 9. Deploy Web service
# 10. Create load balancer
```

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           🚀 AWS STAGING INFRASTRUCTURE SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configuration:
   Account ID: 123456789012
   Region: us-east-1
   Environment: staging

🔐 STEP 1: Validating AWS credentials...
✅ AWS credentials validated

🐳 STEP 2: Setting up ECR (Elastic Container Registry)...
✅ ECR repository 'imobi-api-staging' created
✅ ECR repository 'imobi-web-staging' created

🔨 STEP 3: Building and pushing Docker images...
✓ Building API image...
✓ Pushing to ECR...
✅ Pushed API

✓ Building Web image...
✓ Pushing to ECR...
✅ Pushed Web

💾 STEP 4: Setting up RDS PostgreSQL...
Creating RDS instance (this takes 5-10 minutes)...
⏳ Waiting for RDS instance to be available...
✅ RDS instance created
   Endpoint: imobi-db-staging.cxyz1234abcd.us-east-1.rds.amazonaws.com
   Database: imbobi_staging

[... continues through all steps ...]

✅ DEPLOYMENT COMPLETE!
```

### Step 4: Database Migration

Once RDS is available, run migrations:

```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="postgresql://postgres:[DB_PASSWORD]@[RDS_ENDPOINT]:5432/imbobi_staging"

# Run migrations
pnpm db:migrate

# Verify migrations
pnpm db:status

# Expected: All migrations "applied successfully"
```

### Step 5: Health Checks

```bash
# Get load balancer URL from AWS Console
# Or via AWS CLI:
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?LoadBalancerName==`imobi-staging-alb`].DNSName' \
  --output text
# Returns: imobi-staging-alb-123456789.us-east-1.elb.amazonaws.com

# Test API health
curl http://imobi-staging-alb-xxx.us-east-1.elb.amazonaws.com/api/v1/health
# Expected: 200 OK { "status": "up" }

# Test Web health
curl http://imobi-staging-alb-xxx.us-east-1.elb.amazonaws.com
# Expected: 200 OK (HTML page)
```

---

## ✅ POST-DEPLOYMENT VALIDATION

### 1. Service Status

```bash
# Check ECS services running
aws ecs describe-services \
  --cluster imobi-staging \
  --services imbobi-api-service imbobi-web-service \
  --query 'services[*].[serviceName,status,runningCount,desiredCount]' \
  --output table

# Expected: Both services should be ACTIVE with desiredCount == runningCount
```

### 2. Security Groups & Network

```bash
# Verify security groups are properly configured
aws ec2 describe-security-groups \
  --filters Name=tag:Environment,Values=staging \
  --query 'SecurityGroups[*].[GroupName,GroupId]' \
  --output table

# Verify RDS is in private subnet
aws rds describe-db-instances \
  --db-instance-identifier imobi-db-staging \
  --query 'DBInstances[0].[DBInstanceIdentifier,Engine,DBInstanceStatus,Endpoint.Address]' \
  --output table
```

### 3. Container Logs

```bash
# View API logs
aws logs tail /ecs/imobi-api-staging --follow

# View Web logs
aws logs tail /ecs/imobi-web-staging --follow

# Look for errors or startup issues
```

### 4. Signup Flow Test

```bash
# Get the load balancer DNS
ALB_URL=$(aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?LoadBalancerName==`imobi-staging-alb`].DNSName' \
  --output text)

# Test signup endpoint
curl -X POST "http://$ALB_URL/api/v1/auth/registrar" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "cpf": "12345678901",
    "telefone": "11999999999",
    "email": "test@staging.imbobi.com",
    "senha": "SecurePass123!",
    "tipo": "TOMADOR"
  }'

# Expected: 201 Created with accessToken
```

### 5. Monitor CloudWatch

```bash
# View CPU/Memory metrics for services
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=imbobi-api-service \
               Name=ClusterName,Value=imobi-staging \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 🔧 TROUBLESHOOTING

### Issue: AWS credentials not found
```bash
# Solution:
aws configure
# Provide your Access Key and Secret Key
```

### Issue: Docker not running
```bash
# Solution:
# Start Docker daemon
sudo systemctl start docker

# Or on macOS:
open /Applications/Docker.app
```

### Issue: RDS creation timeout
```bash
# Solution: This is normal, RDS takes 5-10 minutes
# Monitor progress in AWS Console:
# Services > RDS > Databases > imobi-db-staging
# Wait for status: "Available"
```

### Issue: ECS task failing to start
```bash
# Check task logs:
aws ecs describe-tasks \
  --cluster imobi-staging \
  --tasks [TASK_ID] \
  --query 'tasks[0].containers[0].reason'

# Common causes:
# - Database not ready yet (wait 5 more minutes)
# - Missing environment variables in task definition
# - Docker image not pushed to ECR correctly
```

### Issue: Database connection refused
```bash
# Check security group allows RDS access:
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'

# Ensure ECS security group can reach RDS security group
```

---

## 📊 Infrastructure Overview

After successful deployment, your AWS infrastructure looks like:

```
┌─────────────────────────────────────────────────────────┐
│                    AWS ECS Cluster                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │            Application Load Balancer            │   │
│  │  (imobi-staging-alb)                           │   │
│  └────────────────┬────────────────────────────────┘   │
│                   │                                      │
│         ┌─────────┴─────────┐                          │
│         │                   │                          │
│  ┌──────▼────────┐   ┌──────▼────────┐               │
│  │  API Service  │   │  Web Service  │               │
│  │ (port 4000)   │   │ (port 3000)   │               │
│  └──────┬────────┘   └──────┬────────┘               │
│         │                   │                         │
│         └─────────┬─────────┘                         │
│                   │                                    │
│  ┌────────────────┴────────────────┐                │
│  │      Managed Services           │                │
│  ├────────────────────────────────┤                │
│  │ RDS PostgreSQL + PostGIS        │                │
│  │ (imobi-db-staging)              │                │
│  │                                 │                │
│  │ ElastiCache Redis               │                │
│  │ (imobi-redis-staging)           │                │
│  └─────────────────────────────────┘                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## 📈 Next Steps After Deployment

1. **Configure Custom Domain**
   ```bash
   # Create Route53 DNS records pointing to ALB
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123 \
     --change-batch '{...}'
   ```

2. **Enable HTTPS/SSL**
   ```bash
   # Request SSL certificate from AWS Certificate Manager
   # Update ALB listener to use HTTPS
   ```

3. **Set Up Monitoring & Alerts**
   ```bash
   # Create CloudWatch alarms for:
   # - High error rate (>5% 4xx/5xx)
   # - High latency (>500ms)
   # - RDS CPU >70%
   # - Redis memory >70%
   ```

4. **Configure Auto-scaling**
   ```bash
   # Enable target tracking auto-scaling:
   # API: Target CPU 70%
   # Web: Target CPU 70%
   # Min tasks: 1, Max tasks: 3
   ```

5. **Enable Logging & Monitoring**
   ```bash
   # Send logs to CloudWatch
   # Enable RDS Enhanced Monitoring
   # Set up SNS notifications for alarms
   ```

---

## 💾 Cost Estimation

| Service | Instance Type | Monthly Cost |
|---------|---------------|--------------|
| ECS | t3.small (2 tasks) | ~$20 |
| RDS | db.t3.micro | ~$25 |
| ElastiCache | cache.t3.micro | ~$18 |
| ALB | Application LB | ~$16 |
| Data Transfer | Out-of-region | ~$5 |
| **Total** | | **~$85/month** |

---

## 🎓 Key Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [RDS PostgreSQL Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [ElastiCache Redis](https://docs.aws.amazon.com/elasticache/latest/userguide/)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

## ✨ You're Ready!

Execute the deployment and monitor the AWS Console for real-time updates.

**Command to start:**
```bash
cd /home/user/imobi
chmod +x AWS_STAGING_SETUP.sh
./AWS_STAGING_SETUP.sh
```

**Expected completion time:** 30-45 minutes

**After deployment:**
1. ✅ Check service status in ECS console
2. ✅ Test health endpoints
3. ✅ Run security validation tests
4. ✅ Monitor CloudWatch logs

---

**Good luck! 🚀**
