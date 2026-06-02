# Phase 1 AWS Deployment Checklist

**Project**: imbobi  
**Phase**: 1 (MVP - Free Tier)  
**Deployment Date**: ___________  
**Deployed By**: ___________

## Pre-Deployment

### AWS Account & Access
- [ ] AWS account created and active
- [ ] Free Tier eligibility verified (new account <12 months old)
- [ ] IAM user created with programmatic access
- [ ] IAM policies attached:
  - [ ] EC2
  - [ ] RDS
  - [ ] ElastiCache
  - [ ] SES
  - [ ] VPC
  - [ ] CloudWatch
  - [ ] SNS
  - [ ] Secrets Manager (Phase 2)
- [ ] AWS credentials exported/configured locally
- [ ] `aws sts get-caller-identity` returns user/account correctly

### Tools & Environment
- [ ] Terraform installed (version >= 1.0)
- [ ] AWS CLI installed (optional but recommended)
- [ ] PostgreSQL client installed (psql) for testing
- [ ] Redis client installed (redis-cli) for testing
- [ ] Git repository cloned and working directory clean
- [ ] No uncommitted changes in `.env*` files

### Configuration Files
- [ ] `infrastructure/terraform/aws-phase1/terraform.tfvars` created from template
- [ ] All required variables filled in:
  - [ ] `aws_region = "us-east-1"` (free tier region)
  - [ ] `environment = "dev"` (or staging/prod)
  - [ ] `db_password` generated and secure (32 chars, random)
  - [ ] `ses_from_email` matches verified SES identity
  - [ ] `ses_mail_from_domain` (optional for production)
- [ ] `terraform.tfvars` added to `.gitignore` (verify: `git status`)
- [ ] `.env.local` and `services/api/.env` NOT committed

### Email Setup (Critical)
- [ ] AWS SES Console accessed: https://console.aws.amazon.com/ses
- [ ] Region set to `us-east-1`
- [ ] Email identity created and verified:
  - [ ] "Verified Identities" section shows `noreply@imbobi.com.br`
  - [ ] Status shows "Verified" (not "Pending Verification")
  - [ ] Verification email received and link clicked
- [ ] (Optional) Domain identity created and verified for production
  - [ ] DKIM/SPF records added to DNS
  - [ ] Domain shows "Verified" in SES console

### Database Preparation
- [ ] PostgreSQL version 15.x compatible with Prisma
- [ ] Prisma schema (`services/api/prisma/schema.prisma`) includes:
  - [ ] `provider = "postgresql"`
  - [ ] All data models defined
  - [ ] PostGIS extensions used (if geographic features needed)
- [ ] Migration files exist in `services/api/prisma/migrations`
- [ ] Seed data script exists (optional): `services/api/prisma/seed.ts`

### Network Planning
- [ ] VPC CIDR block decided: `10.0.0.0/16` (default)
- [ ] Private subnet configuration understood (2 subnets in AZs)
- [ ] Security groups reviewed:
  - [ ] RDS: Port 5432 from ECS/Lambda
  - [ ] ElastiCache: Port 6379 from ECS/Lambda
  - [ ] No public access to database/cache (security best practice)

## Deployment Execution

### Terraform Initialization
- [ ] Changed to correct directory: `cd infrastructure/terraform/aws-phase1`
- [ ] `terraform init` executed successfully
- [ ] Backend comment status: local state (change to S3 after Phase 1)

### Terraform Validation
- [ ] `terraform validate` returns "Success"
- [ ] `terraform plan -out=tfplan` executes and creates plan file
- [ ] Plan review shows:
  - [ ] 1x VPC (aws_vpc)
  - [ ] 2x Private subnets (aws_subnet)
  - [ ] 3x Security groups (RDS, ElastiCache, ECS)
  - [ ] 1x RDS PostgreSQL instance (db.t2.micro)
  - [ ] 1x ElastiCache Redis cluster (cache.t2.micro)
  - [ ] 1x SES email identity
  - [ ] 2x SNS topics (ElastiCache notifications, SES alerts)
  - [ ] 1x CloudWatch log group
  - Total: ~15-20 resources

### Terraform Apply
- [ ] Reviewed all resources one final time
- [ ] `terraform apply tfplan` executed
- [ ] Confirmed with "yes" when prompted
- [ ] Waited for apply to complete (5-10 minutes)
- [ ] No errors in output
- [ ] "Apply complete!" message displayed

### Post-Apply Verification
- [ ] `terraform output` executed
- [ ] All outputs captured:
  - [ ] `rds_host` = imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com
  - [ ] `rds_database_name` = imbobi_dev
  - [ ] `rds_username` = imbobimaster
  - [ ] `elasticache_endpoint` = imbobi-redis.xxxxx.cache.amazonaws.com
  - [ ] `elasticache_port` = 6379
  - [ ] `ses_from_email` = noreply@imbobi.com.br
  - [ ] `ses_region` = us-east-1
  - [ ] `cloudwatch_log_group` = /aws/imbobi/phase1
- [ ] Outputs saved to secure location (password manager, AWS Secrets Manager)
- [ ] `terraform-outputs.json` generated in terraform directory

## AWS Console Verification

### RDS PostgreSQL
- [ ] AWS RDS Console: https://console.aws.amazon.com/rds
- [ ] Instance found: "imbobi-postgres"
- [ ] Status: **Available** (not "Creating" or "Deleting")
- [ ] Instance class: **db.t2.micro**
- [ ] Storage: **20 GB** (free tier limit)
- [ ] Multi-AZ: **No** (free tier)
- [ ] Backup retention: **7 days**
- [ ] Encryption: **Enabled**
- [ ] Publicly accessible: **No**
- [ ] Can connect with psql:
  ```bash
  psql -h imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com \
       -U imbobimaster \
       -d imbobi_dev \
       -c "SELECT version();"
  ```

### ElastiCache Redis
- [ ] AWS ElastiCache Console: https://console.aws.amazon.com/elasticache
- [ ] Cluster found: "imbobi-redis"
- [ ] Status: **Available**
- [ ] Node type: **cache.t2.micro**
- [ ] Engine: **Redis 7.0**
- [ ] Nodes: **1** (no replication for free tier)
- [ ] Encryption at rest: **Enabled**
- [ ] Can connect with redis-cli:
  ```bash
  redis-cli -h imbobi-redis.xxxxx.cache.amazonaws.com -p 6379 ping
  # Expected: PONG
  ```

### SES Configuration
- [ ] AWS SES Console: https://console.aws.amazon.com/ses
- [ ] Region: **us-east-1** (free tier region)
- [ ] Verified Identities: `noreply@imbobi.com.br` shows **Verified**
- [ ] Sending Statistics section accessible (check quota)
- [ ] Email quota: **50,000/day** (free tier)
- [ ] Test email sent and received:
  ```bash
  aws ses send-email \
    --from noreply@imbobi.com.br \
    --to your-test-email@gmail.com \
    --subject "AWS SES Test" \
    --text "Hello from AWS SES" \
    --region us-east-1
  ```

### VPC & Networking
- [ ] AWS VPC Console: https://console.aws.amazon.com/vpc
- [ ] VPC found: "imbobi-vpc"
- [ ] CIDR: **10.0.0.0/16**
- [ ] 2x Private subnets created in different AZs
- [ ] 3x Security groups created and rules verified
- [ ] Internet Gateway: Not required (private subnets for security)

### CloudWatch & Monitoring
- [ ] AWS CloudWatch Console: https://console.aws.amazon.com/cloudwatch
- [ ] Log group found: `/aws/imbobi/phase1`
- [ ] RDS logs being written:
  ```bash
  aws logs tail /aws/rds/instance/imbobi-postgres --follow
  ```
- [ ] 2x SNS topics created:
  - [ ] "imbobi-elasticache-notifications"
  - [ ] "imbobi-ses-alerts"
- [ ] SNS subscriptions set up (optional: email notifications)

## Application Integration

### Environment Variables
- [ ] `.env.aws` file created with Terraform outputs
- [ ] `.env.local` updated with AWS connection strings:
  ```bash
  DATABASE_URL="postgresql://imbobimaster:PASSWORD@RDS_HOST:5432/imbobi_dev"
  REDIS_HOST="ELASTICACHE_ENDPOINT"
  REDIS_PORT=6379
  USE_AWS_SES=true
  SES_FROM_EMAIL="noreply@imbobi.com.br"
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  ```
- [ ] `services/api/.env` updated similarly
- [ ] No test credentials left in config files
- [ ] Secrets manager password NOT stored in plaintext

### Database Setup
- [ ] Changed to API directory: `cd services/api`
- [ ] `pnpm install` ran successfully
- [ ] `pnpm db:generate` regenerated Prisma client
- [ ] `pnpm prisma migrate deploy` applied all migrations
- [ ] No migration errors or conflicts
- [ ] Database schema exists in RDS:
  ```bash
  psql -U imbobimaster -d imbobi_dev -c "\dt"
  # Should list all tables from migrations
  ```
- [ ] Seed data loaded (if applicable):
  ```bash
  pnpm prisma db seed
  ```

### Email Service Testing
- [ ] API server started: `pnpm dev`
- [ ] Email service initialized with SES provider
- [ ] Test email endpoint called:
  ```bash
  curl -X POST http://localhost:4000/api/v1/email/test \
    -H "Content-Type: application/json" \
    -d '{
      "to": "your-test-email@gmail.com",
      "subject": "imbobi AWS SES Test",
      "html": "<h1>Success!</h1>"
    }'
  ```
- [ ] Email received within 5 minutes
- [ ] Email sent successfully logged in CloudWatch

### Redis Connection Testing
- [ ] Confirmed redis-cli can connect:
  ```bash
  redis-cli -h ELASTICACHE_ENDPOINT -p 6379 ping
  # Expected: PONG
  ```
- [ ] BullMQ job processor can connect
- [ ] Test job enqueued and processed successfully

## Cost & Billing

### AWS Billing Setup
- [ ] AWS Billing Console accessed: https://console.aws.amazon.com/billing
- [ ] Free Tier usage dashboard shows eligible services:
  - [ ] RDS PostgreSQL (750 hours free)
  - [ ] ElastiCache (free)
  - [ ] SES (50,000 emails/day)
- [ ] Budget alert set (optional): $0.01 minimum to catch overages
- [ ] Cost Anomaly Detection enabled (optional)
- [ ] Monthly cost estimate: **$0** (within free tier)

### Cost Verification
- [ ] No unexpected charges appeared
- [ ] Services operating within free tier:
  - [ ] RDS: < 750 hours/month
  - [ ] ElastiCache: < 750 hours/month
  - [ ] SES: < 50,000 emails/day
- [ ] Cost allocation tags applied correctly

## Backup & Disaster Recovery

### RDS Backup
- [ ] RDS automated backups enabled (7-day retention)
- [ ] First backup completed (check AWS console)
- [ ] Manual snapshot created: `imbobi-postgres-2026-06-02-initial`
- [ ] Backup restoration tested (optional):
  ```bash
  # Restore to a test instance to verify backup works
  ```

### Redis Backup
- [ ] Note: ElastiCache free tier doesn't support automatic backups
- [ ] Manual backup procedure documented for Phase 2
- [ ] Redis cluster can be recreated quickly if needed

### Disaster Recovery Plan
- [ ] Terraform code backed up (already in git)
- [ ] `terraform.tfvars` stored securely (NOT in git)
- [ ] Database passwords stored in AWS Secrets Manager (Phase 2)
- [ ] Runbook created for infrastructure recovery

## Documentation

### Internal Documentation
- [ ] `AWS_SETUP.md` completed and accessible
- [ ] `PHASE1_DEPLOYMENT_CHECKLIST.md` filled out (this file)
- [ ] Terraform outputs documented with sensitive values masked
- [ ] Connection strings documented in secure location

### Team Onboarding
- [ ] Team informed of Phase 1 deployment
- [ ] Environment setup instructions shared
- [ ] AWS console access provided to relevant team members
- [ ] Terraform state access configured (Phase 2: S3 backend)
- [ ] Secrets management process documented

## Security Review

### Security Group Validation
- [ ] RDS security group: Only accepts port 5432 from ECS/Lambda
- [ ] ElastiCache security group: Only accepts port 6379 from ECS/Lambda
- [ ] No public access to database or cache
- [ ] Outbound rules allow full egress (for monitoring)

### Access Control
- [ ] AWS credentials stored securely (NOT committed to git)
- [ ] IAM user has minimal required permissions
- [ ] RDS master password is strong (>= 32 random chars)
- [ ] SES email identity verified before use
- [ ] MFA enabled on AWS account (recommended)

### Encryption
- [ ] RDS encryption at rest: **Enabled** (AES-256)
- [ ] RDS encryption in transit: **Enabled** (SSL)
- [ ] ElastiCache encryption at rest: **Enabled**
- [ ] ElastiCache encryption in transit: **Disabled** (free tier limitation, OK for dev)
- [ ] S3 buckets encrypted (if used): **Enabled**

### Monitoring & Logging
- [ ] CloudWatch logs enabled for RDS
- [ ] CloudWatch log group created and retained (30 days)
- [ ] SNS topics created for alerts
- [ ] Email notifications configured for critical alarms (optional)

## Post-Deployment

### Hand-Off Documentation
- [ ] All outputs documented and validated
- [ ] Runbook created for common operations:
  - [ ] Database scaling
  - [ ] Redis backup/restore
  - [ ] Email troubleshooting
- [ ] Contact information for support documented
- [ ] Escalation procedure defined

### Monitoring Setup
- [ ] CloudWatch dashboards created (optional):
  - [ ] RDS CPU, connections, queries
  - [ ] ElastiCache eviction, CPU, bandwidth
  - [ ] SES send rate, bounces, complaints
- [ ] Alarms configured:
  - [ ] RDS high CPU (>80%)
  - [ ] ElastiCache eviction rate high
  - [ ] SES bounce rate high
- [ ] Log retention periods set:
  - [ ] RDS logs: 30 days
  - [ ] Application logs: 30 days

### Performance Baseline
- [ ] Database query performance measured
- [ ] Redis connection pool size optimized
- [ ] Email sending latency measured (should be <1s)
- [ ] API response times measured with AWS backend

## Compliance & Validation

### AWS Best Practices
- [ ] Infrastructure as Code (Terraform) used
- [ ] Version control for Terraform configs
- [ ] Resource tagging consistent (Environment, Project, Phase)
- [ ] Deletion protection enabled on critical resources (RDS)
- [ ] Automated backups enabled where supported

### Application Validation
- [ ] Application tests pass with AWS backend:
  ```bash
  pnpm test
  ```
- [ ] No environment-specific failures
- [ ] Both local and AWS backends supported
- [ ] Backward compatibility maintained

### Security Compliance
- [ ] No credentials in source code
- [ ] No secrets in Terraform state (if shared)
- [ ] GDPR compliance checked (if applicable)
- [ ] Data encryption verified
- [ ] Access logging enabled (optional)

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Deployment Engineer | _________________ | __________ | __________ |
| DevOps Lead | _________________ | __________ | __________ |
| Product Owner | _________________ | __________ | __________ |

## Issues & Resolution

Document any issues encountered and their resolutions:

| Issue | Root Cause | Resolution | Date Resolved |
|-------|-----------|-----------|----------------|
| | | | |
| | | | |
| | | | |

## Next Steps (Phase 2)

- [ ] Plan Phase 2 AWS services (Lambda, SQS/SNS, etc.)
- [ ] Set up Terraform state in S3 with DynamoDB locking
- [ ] Implement CloudWatch dashboards and alarms
- [ ] Set up automated cost optimization
- [ ] Document and automate disaster recovery procedures
- [ ] Plan Phase 3 services (Cognito, WAF, etc.)

---

**Deployment Status**: ☐ PENDING | ☐ IN PROGRESS | ☐ COMPLETE | ☐ ROLLED BACK

**Final Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Reviewed By**: _________________________ **Date**: __________

**Approved By**: _________________________ **Date**: __________
