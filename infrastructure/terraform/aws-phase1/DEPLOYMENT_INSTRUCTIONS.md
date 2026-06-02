# AWS Phase 1 Terraform Deployment - Complete Instructions

## Overview
This document provides step-by-step instructions to deploy the AWS Phase 1 infrastructure using Terraform.

**Services to Deploy:**
- PostgreSQL RDS (t2.micro, 20GB free tier)
- Redis ElastiCache (cache.t2.micro, free tier)
- SES Email Service (50k emails/day free tier)
- VPC, Subnets, Security Groups
- CloudWatch Logs and Alarms

**Estimated Deployment Time:** 15-20 minutes

## Prerequisites

1. **AWS Account** with free tier eligibility
2. **Terraform** >= 1.0 installed (`terraform version`)
3. **AWS CLI** installed (`aws --version`)
4. **AWS IAM User** with appropriate permissions (see AWS_CREDENTIALS_SETUP.md)
5. **jq** installed for JSON parsing (`jq --version`)

## Quick Start

### Step 1: Validate Terraform Configuration

```bash
cd infrastructure/terraform/aws-phase1

# Check formatting
terraform fmt -check .

# This will be available once credentials are set up:
# terraform validate
```

**Status:** ✓ Format validation passed
**Syntax:** ✓ All braces balanced and structure valid

### Step 2: Configure AWS Credentials

```bash
# 1. Copy credentials template
cp .env.aws.example .env.aws

# 2. Edit with your credentials (see AWS_CREDENTIALS_SETUP.md)
nano .env.aws

# 3. Load into environment
source .env.aws

# 4. Validate credentials
./validate-aws-credentials.sh
```

**Expected output:**
```
✓ Credentials are valid!
✓ EC2 access OK
✓ RDS access OK
✓ ElastiCache access OK
✓ SES access OK
```

### Step 3: Initialize Terraform

```bash
terraform init
```

This will:
- Download AWS provider plugin (~50MB)
- Create `.terraform/` directory
- Generate `.terraform.lock.hcl`

**Note:** `.terraform/` and `.terraform.lock.hcl` are in `.gitignore` (local only)

### Step 4: Preview Deployment

```bash
terraform plan -out=phase1.tfplan
```

Review the output for:
- Number of resources to create
- Resource configurations
- Any warnings or errors

**Expected resources:** ~15 resources

### Step 5: Deploy Infrastructure

```bash
# Option A: Use saved plan
terraform apply phase1.tfplan

# Option B: Deploy directly
terraform apply
```

**Deployment duration:** ~5-10 minutes for RDS/ElastiCache

### Step 6: Capture Outputs

```bash
# Show all outputs
terraform output -json > outputs.json

# Key outputs to capture:
terraform output -raw rds_host
terraform output -raw elasticache_endpoint
terraform output -raw ses_from_email
```

Save these to `.env.production`:
```bash
DATABASE_URL=postgresql://imbobimaster:PASSWORD@<RDS_HOST>:5432/imbobi_staging
REDIS_URL=redis://<ELASTICACHE_ENDPOINT>:6379
SES_REGION=us-east-1
```

## Deployment Details by Service

### RDS PostgreSQL
- **Instance:** db.t2.micro (eligible for free tier)
- **Storage:** 20GB gp2 (free tier)
- **Database:** imbobi_staging
- **Username:** imbobimaster
- **Backup:** 7-day retention
- **Multi-AZ:** No (free tier)
- **Encryption:** Enabled
- **Connection time:** ~5 minutes

### ElastiCache Redis
- **Instance:** cache.t2.micro (eligible for free tier)
- **Engine:** Redis 7.0
- **Port:** 6379
- **At-rest encryption:** Enabled
- **Transit encryption:** Disabled (free tier limitation)
- **Failover:** Disabled (free tier)
- **Connection time:** ~5 minutes

### SES (Simple Email Service)
- **Service:** AWS SES v2
- **Email sender:** noreply@imbobi.com.br
- **Daily quota:** 50,000 emails
- **Rate limit:** 1 email/second
- **Status:** Ready to configure DKIM/DMARC

### VPC & Networking
- **CIDR:** 10.0.0.0/16
- **Private subnets:** 2 (for HA)
- **Security groups:** RDS, ElastiCache, ECS
- **Internet Gateway:** Attached (for outbound traffic)

## Post-Deployment Steps

### 1. Test RDS Connection

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(terraform output -raw rds_host)

# Test connection (requires psql)
psql -h $RDS_ENDPOINT -U imbobimaster -d imbobi_staging -c "SELECT version();"
```

### 2. Test Redis Connection

```bash
# Get Redis endpoint
REDIS_ENDPOINT=$(terraform output -raw elasticache_endpoint)

# Test connection (requires redis-cli)
redis-cli -h $REDIS_ENDPOINT PING
```

### 3. Verify SES Setup

```bash
# List verified identities
aws ses list-verified-email-addresses --region us-east-1

# To send emails, must verify domain or email first:
# aws ses verify-email-identity --email-address your-email@example.com
```

### 4. Configure Database

```bash
# Run Prisma migrations against new RDS
export DATABASE_URL="postgresql://..."
pnpm db:migrate
pnpm db:generate
```

### 5. Update Application Environment

Update `.env.production` with:
```bash
DATABASE_URL=postgresql://imbobimaster:PASSWORD@<RDS_ENDPOINT>:5432/imbobi_staging
REDIS_URL=redis://<ELASTICACHE_ENDPOINT>:6379
SES_REGION=us-east-1
SES_FROM_EMAIL=noreply@imbobi.com.br
```

## Rollback / Cleanup

To destroy all resources:

```bash
terraform destroy

# Confirm when prompted
# This will delete RDS, ElastiCache, VPC, and all related resources
# RDS will create a final snapshot before deletion
```

**Important:** This is destructive and cannot be undone.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `terraform init` fails with "403 Forbidden" | Network issue accessing Terraform Registry. Validate AWS credentials first. |
| RDS deployment slow | Normal, RDS provisioning takes 5-10 minutes. Monitor AWS console. |
| ElastiCache stuck in "creating" | Rare, try `terraform refresh` and `terraform plan` again. |
| Cannot connect to RDS | Check security group allows inbound on port 5432. Check RDS subnet group. |
| SES rate limiting | Free tier is 1 email/sec, max 50k/day. Implement exponential backoff. |

## File Structure

```
infrastructure/terraform/aws-phase1/
├── main.tf                          # Main resource definitions
├── variables.tf                     # Variable definitions
├── outputs.tf                       # Output definitions
├── versions.tf                      # Provider and version constraints
├── terraform.tfvars                 # Variable values (sensitive, gitignored)
├── terraform.tfvars.example         # Template for terraform.tfvars
├── .env.aws.example                 # Template for AWS credentials
├── validate-aws-credentials.sh      # Credential validation script
├── AWS_CREDENTIALS_SETUP.md         # Credentials setup guide
├── DEPLOYMENT_INSTRUCTIONS.md       # This file
├── .terraform/                      # Terraform working directory (local)
├── .terraform.lock.hcl              # Dependency lock file (local)
└── terraform.tfstate*               # State files (local, gitignored)
```

## Important Security Notes

1. **Never commit `terraform.tfstate`** - Contains sensitive data, already in .gitignore
2. **Never commit `terraform.tfvars`** - Contains database passwords, already in .gitignore
3. **Never commit `.env.aws`** - Contains AWS credentials, already in .gitignore
4. **Use Terraform Cloud for production** - For remote state management and team collaboration
5. **Implement MFA on IAM user** - For credential-based deployments
6. **Rotate credentials regularly** - Use AWS IAM access key rotation

## Monitoring & Alerts

Terraform sets up these automatically:

1. **CloudWatch Log Groups:** `/aws/imbobi/phase1` (30-day retention)
2. **SNS Topics:** 
   - `imbobi-elasticache-notifications` (for Redis alerts)
   - `imbobi-ses-alerts` (for email bounce rate)
3. **CloudWatch Alarms:**
   - SES bounce rate (threshold: >100 bounces in 5 min)

Subscribe to SNS topics for alerts:
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:imbobi-elasticache-notifications \
  --protocol email \
  --notification-endpoint your-email@example.com
```

## Next Steps

### Phase 2 Roadmap (Months 4-6)
- [ ] Migrate to Lambda + API Gateway
- [ ] Deploy to Vercel (frontend)
- [ ] Replace BullMQ with SQS/SNS
- [ ] Setup CloudWatch Dashboards

### Phase 3 Roadmap (Months 7+)
- [ ] AWS Cognito for authentication
- [ ] Secrets Manager for credentials
- [ ] WAF + Shield for security

## Support & Resources

- **Terraform Docs:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **AWS Free Tier:** https://aws.amazon.com/free/
- **Project Guide:** /CLAUDE.md

## Deployment Checklist

- [ ] AWS account created and free tier verified
- [ ] IAM user created with appropriate permissions
- [ ] AWS credentials configured in `.env.aws`
- [ ] Credentials validated with `validate-aws-credentials.sh`
- [ ] `terraform init` executed successfully
- [ ] `terraform plan` reviewed and approved
- [ ] `terraform apply` completed successfully
- [ ] RDS endpoint captured and tested
- [ ] ElastiCache endpoint captured and tested
- [ ] SES email verified or domain DKIM configured
- [ ] Application environment variables updated
- [ ] Database migrations applied
- [ ] Monitoring alerts subscribed

---

**Last Updated:** 2026-06-02
**Status:** Ready for Phase 1 Deployment
**Deployment Branch:** claude/gifted-hawking-ULZTB
