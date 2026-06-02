# AWS Phase 1 Migration Setup Guide

**Project**: imbobi  
**Phase**: 1 (MVP - Free Tier)  
**Created**: 2026-06-02  
**AWS Services**: RDS PostgreSQL, ElastiCache Redis, SES

## Overview

This guide walks you through provisioning imbobi's Phase 1 AWS infrastructure using Terraform. All services use AWS Free Tier to minimize costs:

- **RDS PostgreSQL**: t2.micro instance (750h/month free, 20GB storage)
- **ElastiCache Redis**: cache.t2.micro node (single-AZ, no encryption in transit)
- **SES**: Email service (50,000 emails/day free quota)

## Prerequisites

### Required Tools
```bash
# Install Terraform
# macOS:
brew install terraform

# Linux:
sudo apt-get install terraform

# Windows:
choco install terraform

# Verify installation
terraform version  # Should be >= 1.0
```

### AWS Account Setup
1. Create an AWS account if you don't have one
2. Ensure you're eligible for Free Tier (new accounts get 12 months free)
3. Create an IAM user with **Programmatic Access**:
   - Required permissions: EC2, RDS, ElastiCache, SES, VPC, CloudWatch, IAM, SNS
   - Or use the `AdministratorAccess` policy for simplicity

### AWS Credentials
Set up AWS credentials for Terraform:

```bash
# Option 1: Environment variables (temporary)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Option 2: AWS CLI config (persistent)
aws configure
# Enter your Access Key ID, Secret Access Key, default region (us-east-1), output format (json)

# Verify credentials work
aws sts get-caller-identity
```

## Step 1: Prepare Configuration

### 1.1 Copy and Edit terraform.tfvars

```bash
cd infrastructure/terraform/aws-phase1

# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars  # or use your editor
```

### 1.2 Update terraform.tfvars Values

```hcl
aws_region   = "us-east-1"    # Keep for free tier eligibility
environment  = "dev"           # or "staging"/"prod"
vpc_cidr     = "10.0.0.0/16"   # Default is fine

# IMPORTANT: Generate a strong database password
# Run this in your terminal:
# openssl rand -base64 32 | tr -d '=' | cut -c1-32
db_name       = "imbobi_dev"
db_username   = "imbobimaster"
db_password   = "PASTE_YOUR_GENERATED_PASSWORD_HERE"

# SES: Use your domain or noreply address
ses_from_email         = "noreply@imbobi.com.br"    # Will verify this
ses_mail_from_domain   = "bounce.imbobi.com.br"     # DKIM/SPF config needed
```

**Critical**: Never commit `terraform.tfvars` to git—it contains secrets!
```bash
# Already ignored in .gitignore
git status infrastructure/terraform/aws-phase1/terraform.tfvars  # Should show as ignored
```

## Step 2: Verify AWS SES Email Identity

Before deploying, you must verify the sender email address in AWS SES:

### 2.1 Access AWS SES Console
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses)
2. Ensure you're in **us-east-1** region (free tier region)
3. Navigate to **Verified Identities** section

### 2.2 Create Email Identity
1. Click **Create Identity**
2. Choose **Email Address** (not Domain)
3. Enter your sender email: `noreply@imbobi.com.br`
4. AWS will send a verification email—click the link in it
5. Refresh the SES console to confirm status shows "Verified"

### 2.3 (Optional) Verify Domain
For production, verify your entire domain to improve deliverability:
1. Click **Create Identity** → **Domain**
2. Enter: `imbobi.com.br`
3. Add DNS records (TXT, CNAME) as shown in AWS console
4. After DNS propagates (5-30 min), identity shows "Verified"

**Note**: You can deploy with just email verification; domain verification improves email reputation.

## Step 3: Initialize and Plan Terraform

```bash
cd infrastructure/terraform/aws-phase1

# Initialize Terraform (downloads AWS provider)
terraform init

# Validate syntax
terraform validate
# Expected output: Success! The configuration is valid.

# Generate execution plan (preview what will be created)
terraform plan -out=tfplan

# Review the plan
# You should see:
# - aws_vpc
# - aws_subnet (2 private)
# - aws_db_instance (PostgreSQL)
# - aws_elasticache_cluster (Redis)
# - aws_sesv2_email_identity
# - aws_security_groups (3)
# - aws_cloudwatch_log_group
# - aws_sns_topics (2)
```

**Expected Resources**: ~15-20 AWS resources will be created
**Estimated Cost**: ~$0 (Free Tier)

## Step 4: Apply Terraform Configuration

```bash
# Apply the saved plan
terraform apply tfplan

# Confirm AWS credentials and region are correct
# Terraform will ask for confirmation—type "yes" and press Enter
# Deployment takes ~5-10 minutes

# Expected output: "Apply complete! Resources: 15 added, 0 changed, 0 destroyed."
```

⏳ **Wait for completion**—Terraform is creating RDS instance (usually takes 5-7 minutes)

## Step 5: Retrieve Connection Details

After successful deployment, Terraform outputs the connection information:

```bash
# Display all outputs
terraform output

# Expected outputs:
# rds_host = "imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com"
# rds_database_url = "postgresql://imbobimaster:****@imbobi-postgres.xxxxx:5432/imbobi_dev" (sensitive)
# elasticache_endpoint = "imbobi-redis.xxxxx.cache.amazonaws.com"
# elasticache_url = "redis://imbobi-redis.xxxxx.cache.amazonaws.com:6379"
# ses_from_email = "noreply@imbobi.com.br"
# ses_region = "us-east-1"
```

### Store Securely
Copy these values to a **secure location** (password manager, AWS Secrets Manager, not plaintext):
- RDS host, password
- ElastiCache host
- SES region

## Step 6: Update Environment Variables

### 6.1 Update .env.local (for local development fallback)

```bash
# Keep local PostgreSQL for dev if preferred
DATABASE_URL="postgresql://imbobi:imbobi123@localhost:5432/imbobi_dev"

# OR use RDS (from terraform output)
DATABASE_URL="postgresql://imbobimaster:PASSWORD@imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com:5432/imbobi_dev"

# ElastiCache Redis
REDIS_HOST="imbobi-redis.xxxxx.cache.amazonaws.com"
REDIS_PORT=6379

# AWS SES
USE_AWS_SES=true
SES_FROM_EMAIL="noreply@imbobi.com.br"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
```

### 6.2 Update services/api/.env

```bash
cd services/api

# Copy .env.example if needed
cp .env.example .env

# Edit with AWS credentials
nano .env
```

Same variables as above.

### 6.3 Update infrastructure/.env

```bash
cd infrastructure

# Create or update .env with AWS credentials
cat > .env << EOF
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EOF
```

## Step 7: Initialize Database with Prisma

```bash
cd services/api

# Install dependencies
pnpm install

# Run Prisma migrations against RDS
pnpm prisma migrate deploy

# Generate Prisma client (includes PostGIS types)
pnpm db:generate

# Verify database
pnpm prisma db seed  # If seed script exists
```

## Step 8: Test Email Service

```bash
# Start API server
pnpm dev

# In another terminal, test email sending
curl -X POST http://localhost:4000/api/v1/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "subject": "Test Email from imbobi AWS SES",
    "html": "<h1>Hello from AWS SES!</h1>"
  }'

# Check email receipt (may appear in spam initially)
# After ~5 minutes, check your inbox or spam folder
```

**Note**: If you receive the email, SES is working correctly!

## Step 9: Verify Redis Connection

```bash
# Install redis-cli if needed
# macOS:
brew install redis

# Linux:
sudo apt-get install redis-tools

# Windows: Download from https://github.com/microsoftarchive/redis/releases

# Test Redis connection
redis-cli -h imbobi-redis.xxxxx.cache.amazonaws.com -p 6379 ping

# Expected output: PONG
```

If successful, BullMQ job queues will work via ElastiCache!

## Step 10: Monitor in AWS Console

### CloudWatch Logs
```bash
# View RDS logs
aws logs tail /aws/rds/instance/imbobi-postgres --follow

# View application logs (if configured)
aws logs tail /aws/imbobi/phase1 --follow
```

### RDS Instance
1. Go to [RDS Console](https://console.aws.amazon.com/rds)
2. Click **imbobi-postgres** instance
3. Verify:
   - Status: **Available**
   - Storage: **20 GB (Free Tier)**
   - Instance class: **db.t2.micro**

### ElastiCache Cluster
1. Go to [ElastiCache Console](https://console.aws.amazon.com/elasticache)
2. Click **imbobi-redis** cluster
3. Verify:
   - Status: **Available**
   - Node type: **cache.t2.micro**
   - Engine: **Redis 7.0**

### SES
1. Go to [SES Console](https://console.aws.amazon.com/ses)
2. Check **Verified Identities**:
   - Email: `noreply@imbobi.com.br` should show **Verified**
3. Monitor **Sending Statistics** to track email volume

## Troubleshooting

### Terraform Fails with "InvalidParameterValue"
**Cause**: Region doesn't support t2.micro or free tier not active
**Solution**: Ensure `aws_region = "us-east-1"` in terraform.tfvars

### RDS Creation Takes >10 Minutes
**Cause**: AWS is provisioning infrastructure
**Solution**: Wait—this is normal. Check AWS console for progress.

### Email Delivery Fails (Not Received)
**Cause**: Email not verified in SES or in spam folder
**Solution**:
1. Check [SES Console](https://console.aws.amazon.com/ses)—verify the sender email
2. Add email to contacts list in test provider
3. Check spam folder
4. Increase SES sending rate quota if needed

### Redis Connection Refused
**Cause**: ElastiCache security group not allowing inbound
**Solution**: 
```bash
# Verify security group allows port 6379
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'
```

### Database Connection Refused
**Cause**: RDS endpoint not responding
**Solution**:
```bash
# Test with psql
psql -h imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com \
     -U imbobimaster \
     -d imbobi_dev \
     -c "SELECT 1"

# Or use AWS CLI
aws rds describe-db-instances \
  --db-instance-identifier imbobi-postgres \
  --query 'DBInstances[0].DBInstanceStatus'
```

## Cost Estimation

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| RDS PostgreSQL t2.micro | 750h + 20GB storage | $0 (if <750h) |
| ElastiCache cache.t2.micro | Single node | $0 (if <750h) |
| SES | 50,000 emails/day | $0 (if <50k/day) |
| **Total** | | **$0** |

**Note**: Charges may apply if usage exceeds free tier. Monitor in AWS Billing console.

## Security Best Practices

1. **Never commit secrets**:
   ```bash
   # Add to .gitignore
   terraform.tfvars
   .env
   .env.local
   ```

2. **Rotate passwords regularly**:
   ```bash
   # Update RDS password via AWS console
   # Update terraform.tfvars
   # Reapply Terraform
   ```

3. **Enable deletion protection**:
   - Already enabled for RDS in Terraform
   - Requires AWS console interaction to delete

4. **Set up backups**:
   - RDS: 7-day retention (enabled by default)
   - ElastiCache: Not backed up (can recreate easily)

5. **Monitor costs**:
   - Go to [AWS Billing Dashboard](https://console.aws.amazon.com/billing)
   - Set budget alert for $0.01 to catch overages

## Next Steps

### Phase 2 Roadmap (Months 4-6)
- Lambda/API Gateway (replace NestJS)
- Vercel hosting (replace Next.js local)
- SQS/SNS (replace BullMQ + Redis)
- CloudWatch (replace Sentry)

### Phase 3 Roadmap (Months 7+)
- Cognito authentication
- AWS Secrets Manager
- WAF + Shield
- Cost optimization

## References

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [AWS Free Tier FAQ](https://aws.amazon.com/free/faq/)
- [RDS PostgreSQL Setup](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreateDBInstance.html)
- [ElastiCache Setup](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/GettingStarted.html)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)

## Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Review AWS service health: [AWS Status Page](https://status.aws.amazon.com/)
3. Contact: contato.vinicaetano93@gmail.com

---

**Created by**: AWS Solutions Architect  
**Last Updated**: 2026-06-02  
**Status**: Production-Ready for Phase 1 Deployment
