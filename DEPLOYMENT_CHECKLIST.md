# AWS Phase 1 Deployment Checklist

## Pre-Deployment

- [ ] Review `/CLAUDE.md` for project architecture
- [ ] Review `infrastructure/terraform/PHASE1_STATUS.md` for current status
- [ ] Ensure AWS account created and free tier verified
- [ ] Ensure IAM user created with appropriate permissions

## Credential Setup

- [ ] Read `infrastructure/terraform/aws-phase1/AWS_CREDENTIALS_SETUP.md`
- [ ] Create AWS IAM user: `imbobi-terraform-deployer`
- [ ] Generate access keys (copy to secure location)
- [ ] Copy `.env.aws.example` to `.env.aws`
- [ ] Edit `.env.aws` with your actual credentials
- [ ] Load credentials: `source .env.aws`
- [ ] Run validation: `./validate-aws-credentials.sh`
- [ ] Confirm all permission checks pass

## Terraform Preparation

- [ ] `cd infrastructure/terraform/aws-phase1`
- [ ] Review `terraform.tfvars` for variable values
- [ ] Review `main.tf` for RDS, ElastiCache, SES configuration
- [ ] Review `outputs.tf` for what will be exported after deployment

## Deployment

- [ ] Run: `terraform init`
- [ ] Review output (should show provider downloaded)
- [ ] Run: `terraform plan -out=phase1.tfplan`
- [ ] Review plan carefully (resource creation/modification)
- [ ] Run: `terraform apply phase1.tfplan`
- [ ] Monitor AWS console for resource creation (5-15 minutes)

## Post-Deployment

- [ ] Verify RDS instance is "available" in AWS Console
- [ ] Verify ElastiCache cluster is "available" in AWS Console
- [ ] Test RDS connection: `psql -h <rds-endpoint> -U imbobimaster -d imbobi_staging`
- [ ] Test Redis connection: `redis-cli -h <redis-endpoint> PING`
- [ ] Capture RDS endpoint from Terraform output
- [ ] Capture ElastiCache endpoint from Terraform output
- [ ] Capture SES email from Terraform output

## Application Configuration

- [ ] Create `.env.production` file
- [ ] Set `DATABASE_URL` with RDS endpoint and password
- [ ] Set `REDIS_URL` with ElastiCache endpoint
- [ ] Set `SES_REGION=us-east-1`
- [ ] Set `SES_FROM_EMAIL=noreply@imbobi.com.br`
- [ ] Review other environment variables for staging setup

## Database Setup

- [ ] Run: `pnpm db:migrate` (apply Prisma migrations)
- [ ] Run: `pnpm db:generate` (regenerate Prisma client)
- [ ] Verify migration status in database

## Email Service Setup

- [ ] Verify email identity in SES console
- [ ] (Optional) Verify domain with DKIM records
- [ ] Test SES with a test email
- [ ] Subscribe to SNS topics for alerts

## Monitoring & Logging

- [ ] Navigate to CloudWatch console
- [ ] Verify log group `/aws/imbobi/phase1` exists
- [ ] Subscribe to SNS topics:
  - `imbobi-elasticache-notifications`
  - `imbobi-ses-alerts`
- [ ] Set up email notifications for SNS topics

## Application Launch

- [ ] Start API server: `pnpm dev`
- [ ] Start web app: `pnpm dev`
- [ ] Verify database connection works
- [ ] Verify Redis cache works
- [ ] Test email sending functionality
- [ ] Run application tests

## Post-Launch Validation

- [ ] Check CloudWatch logs for errors
- [ ] Verify all services are running
- [ ] Test critical user flows
- [ ] Monitor SNS alerts for any issues
- [ ] Check RDS backups are being created
- [ ] Document any issues found

## Cleanup (If Needed)

If deployment fails and needs rollback:

- [ ] Run: `terraform destroy`
- [ ] Confirm resource deletion in AWS Console
- [ ] Delete `.env.aws` (contains credentials)
- [ ] Fix any issues in Terraform code
- [ ] Retry deployment from "Credential Setup"

## Documentation

- [ ] Document any customizations made
- [ ] Update `.env.example` if defaults changed
- [ ] Document AWS account ID and region used
- [ ] Document any DNS records added (if SES domain verified)
- [ ] Create deployment notes for future reference

## Success Criteria

- [ ] Terraform `apply` completed successfully
- [ ] RDS instance is healthy and accepting connections
- [ ] ElastiCache cluster is healthy and responding to PING
- [ ] Application can read/write to both databases
- [ ] Email sending works via SES
- [ ] CloudWatch logs are collecting data
- [ ] All pre-launch tests pass

## Rollback Plan

If issues occur after deployment:

1. **Database Issues:**
   - Check RDS security group allows inbound on port 5432
   - Verify RDS subnet group includes proper subnets
   - Check database credentials in `.env.production`

2. **Cache Issues:**
   - Check ElastiCache security group allows inbound on port 6379
   - Verify ElastiCache subnet group includes proper subnets
   - Check Redis connection string format

3. **Email Issues:**
   - Verify email identity is verified in SES
   - Check SES daily limit not exceeded
   - Check bounce rate in CloudWatch

4. **Full Rollback:**
   - Run `terraform destroy` to remove all infrastructure
   - Delete `.env.aws` file
   - Fix issues and retry from start

## Support & Resources

- **Terraform Docs:** https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- **AWS Credentials Guide:** `infrastructure/terraform/aws-phase1/AWS_CREDENTIALS_SETUP.md`
- **Deployment Instructions:** `infrastructure/terraform/aws-phase1/DEPLOYMENT_INSTRUCTIONS.md`
- **Project Guide:** `/CLAUDE.md`

## Timeline

| Phase | Time | Task |
|-------|------|------|
| Setup | 10 min | Credential setup and validation |
| Init | 5 min | `terraform init` |
| Plan | 5 min | `terraform plan` review |
| Deployment | 15 min | RDS + ElastiCache + SES provisioning |
| Testing | 10 min | Connection testing and validation |
| **Total** | **~45 min** | Complete AWS Phase 1 deployment |

## Notes

- Free tier includes all Phase 1 services at $0/month
- Monitor AWS console for resource status during deployment
- RDS/ElastiCache provisioning is longest step
- Terraform state stored locally (can migrate to S3 later)
- All sensitive data is gitignored

---

**Created:** 2026-06-02
**Project:** imbobi - AWS Phase 1
**Status:** Ready for deployment
