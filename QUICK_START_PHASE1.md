# Phase 1 AWS Deployment - Quick Start (5 Minutes)

## TL;DR

```bash
# 1. Configure AWS credentials
aws configure

# 2. Setup Terraform variables
cd infrastructure/terraform/aws-phase1
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars:
#   db_password = <run: openssl rand -base64 32 | tr -d '=' | cut -c1-32>
#   ses_from_email = noreply@imbobi.com.br (must verify in AWS SES first!)

# 3. Deploy
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan

# 4. Extract outputs
terraform output

# 5. Update environment
cp .env.local .env.local.backup
# Edit .env.local with RDS_HOST, REDIS_HOST from terraform output

# 6. Initialize database
cd services/api
pnpm db:migrate

# Done!
```

## Prerequisites

- [ ] AWS account (free tier eligible)
- [ ] Terraform installed: `terraform version`
- [ ] AWS credentials: `aws sts get-caller-identity`
- [ ] SES email verified: https://console.aws.amazon.com/ses
  - Region: **us-east-1**
  - Verified Identities: `noreply@imbobi.com.br` status **Verified**

## Critical Pre-Deployment

### SES Email Verification (REQUIRED)
```bash
# 1. Go to AWS SES Console
https://console.aws.amazon.com/ses

# 2. Ensure region = us-east-1 (top right)

# 3. Click "Verified Identities" → "Create Identity"

# 4. Choose "Email Address"

# 5. Enter: noreply@imbobi.com.br

# 6. AWS sends verification email

# 7. Click link in email

# 8. Refresh SES console—status should show "Verified"
```

**⚠️ WARNING**: Terraform will fail if email is not verified!

### Generate Database Password
```bash
# Copy this output to terraform.tfvars db_password field
openssl rand -base64 32 | tr -d '=' | cut -c1-32
```

## Deployment Walkthrough

### Step 1: Configure AWS
```bash
# Setup credentials
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"

# Verify
aws sts get-caller-identity
# Output should show your account ID, user, ARN
```

### Step 2: Prepare Terraform
```bash
cd infrastructure/terraform/aws-phase1

# Copy template
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Edit these values**:
```hcl
aws_region          = "us-east-1"              # DON'T CHANGE (free tier only)
environment         = "dev"                    # dev | staging | prod
db_name             = "imbobi_dev"             # Database name
db_username         = "imbobimaster"           # Master username
db_password         = "PASTE_GENERATED_PASSWORD_HERE"  # Must be strong!
ses_from_email      = "noreply@imbobi.com.br"  # Must match SES verified identity
```

### Step 3: Deploy Infrastructure
```bash
# Initialize (download providers)
terraform init

# Validate syntax
terraform validate
# Expected: "Success! The configuration is valid."

# Plan changes (preview)
terraform plan -out=tfplan
# Review output—should see ~15-20 resources to create

# Apply (creates AWS resources, takes 5-10 minutes)
terraform apply tfplan
# Confirm with "yes" when prompted
# Wait for "Apply complete!" message
```

### Step 4: Retrieve Connection Details
```bash
# Display all outputs
terraform output

# Save to file
terraform output -json > terraform-outputs.json

# Extract specific values
terraform output -raw rds_host           # imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com
terraform output -raw elasticache_endpoint  # imbobi-redis.xxxxx.cache.amazonaws.com
terraform output -raw ses_from_email    # noreply@imbobi.com.br
```

### Step 5: Update Environment Variables
```bash
# Go back to project root
cd ../../..

# Backup current env
cp .env.local .env.local.backup

# Edit .env.local
nano .env.local

# Update these values (from terraform output):
DATABASE_URL="postgresql://imbobimaster:PASSWORD@RDS_HOST:5432/imbobi_dev"
REDIS_HOST="ELASTICACHE_ENDPOINT"
REDIS_PORT=6379
USE_AWS_SES=true
SES_FROM_EMAIL="noreply@imbobi.com.br"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Also update services/api/.env with same values
cp services/api/.env.example services/api/.env
nano services/api/.env
# Same values as .env.local
```

### Step 6: Initialize Database
```bash
cd services/api

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations (creates schema in RDS)
pnpm db:migrate
# Expected: "✔ Successfully applied X migrations"

# Seed data (optional)
pnpm prisma db seed
```

### Step 7: Test Email Service
```bash
# Start API server
pnpm dev
# Should show: "✔ API listening on port 4000"

# In another terminal, send test email
curl -X POST http://localhost:4000/api/v1/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "subject": "imbobi AWS SES Test",
    "html": "<h1>Hello from AWS SES!</h1>"
  }'

# Check email (may take 5 minutes, might be in spam folder)
# If received: SES is working!
```

## Verification Commands

```bash
# Test RDS
psql -h imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com \
     -U imbobimaster \
     -d imbobi_dev \
     -c "SELECT version();"

# Test ElastiCache
redis-cli -h imbobi-redis.xxxxx.cache.amazonaws.com -p 6379 ping
# Expected: PONG

# Check AWS resources
aws rds describe-db-instances --db-instance-identifier imbobi-postgres
aws elasticache describe-cache-clusters --cache-cluster-id imbobi-redis
aws ses verify-email-identity --email-address noreply@imbobi.com.br

# Check CloudWatch logs
aws logs tail /aws/rds/instance/imbobi-postgres --follow
aws logs tail /aws/imbobi/phase1 --follow
```

## Automated Deployment (Alternative)

Instead of manual steps, run:

```bash
cd infrastructure/scripts
./aws-phase1-deploy.sh

# This automates:
# - Prerequisites check
# - Terraform init/validate/plan/apply
# - Output extraction
# - Environment file generation
```

## Troubleshooting

### "Terraform validation failed"
```bash
# Check syntax
terraform fmt -recursive
terraform validate

# Re-run plan
terraform plan -out=tfplan
```

### "Email not verified in SES"
```bash
# Go to AWS SES Console
https://console.aws.amazon.com/ses

# Check Verified Identities shows noreply@imbobi.com.br with status "Verified"
# If not, create and verify it first
```

### "Password validation error"
```bash
# Password must be:
# - At least 8 characters
# - Contains alphanumeric + special characters
# - Valid example: P@ssw0rd!123

# Regenerate
openssl rand -base64 32 | tr -d '=' | cut -c1-32
```

### "Database connection refused"
```bash
# Wait 5-10 minutes (RDS is still initializing)
# Check AWS console: RDS → Instances → imbobi-postgres
# Status should be "Available"

# Then try again
psql -h RDS_HOST -U imbobimaster -d imbobi_dev -c "SELECT 1;"
```

### "Redis connection refused"
```bash
# Check AWS console: ElastiCache → Clusters → imbobi-redis
# Status should be "Available"

# Verify security group allows port 6379
aws ec2 describe-security-groups \
  --query 'SecurityGroups[?GroupName==`imbobi-elasticache-sg`]' \
  --region us-east-1
```

## Rollback

If something goes wrong:

```bash
# Delete all AWS resources
terraform destroy

# Revert to local infrastructure
docker-compose up -d postgres redis

# Restore backup env
cp .env.local.backup .env.local
```

## Cost Verification

```bash
# Check AWS Billing
https://console.aws.amazon.com/billing

# Should show:
# RDS: $0 (within 750 hours/month)
# ElastiCache: $0 (free tier)
# SES: $0 (free forever)
# Total: $0
```

## Post-Deployment Checklist

- [ ] RDS PostgreSQL available in AWS console
- [ ] ElastiCache Redis available in AWS console
- [ ] SES email verified and ready
- [ ] Database migrations applied (`pnpm db:migrate` succeeded)
- [ ] API server starts with AWS backend (`pnpm dev`)
- [ ] Test email sent and received
- [ ] Redis connection works (`redis-cli ping` = PONG)

## Next Steps

1. **Monitor**: Watch CloudWatch logs for 24 hours
2. **Test**: Load test with production-like traffic
3. **Backup**: Create manual RDS snapshot
4. **Document**: Update team runbooks
5. **Phase 2**: Plan Lambda/API Gateway migration

## Help & References

- **Detailed Guide**: `AWS_SETUP.md`
- **Deployment Checklist**: `PHASE1_DEPLOYMENT_CHECKLIST.md`
- **Migration Summary**: `PHASE1_MIGRATION_SUMMARY.md`
- **Terraform Docs**: `infrastructure/terraform/aws-phase1/README.md`
- **AWS Console**: https://console.aws.amazon.com
- **Support**: contato.vinicaetano93@gmail.com

---

**Time to Deploy**: 35-55 minutes  
**Expected Cost**: $0/month  
**Status**: Ready to execute
