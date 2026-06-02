# imbobi AWS Phase 1 Terraform Configuration

Terraform infrastructure-as-code for provisioning imbobi's AWS Phase 1 services (RDS, ElastiCache, SES).

## Quick Start

### 1. Prerequisites
```bash
# Install Terraform (>= 1.0)
brew install terraform  # macOS
# or see: https://developer.hashicorp.com/terraform/install

# Configure AWS credentials
aws configure  # or export AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

# Verify
terraform version
aws sts get-caller-identity
```

### 2. Configure Variables
```bash
# Copy and customize
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
# IMPORTANT:
#   - aws_region MUST be "us-east-1" (free tier region)
#   - db_password MUST be strong (>= 8 chars, alphanumeric + special)
#   - ses_from_email MUST be pre-verified in AWS SES console
```

### 3. Deploy
```bash
# Initialize Terraform (download AWS provider)
terraform init

# Validate configuration
terraform validate

# Plan changes
terraform plan -out=tfplan

# Apply (creates resources in AWS)
terraform apply tfplan

# Get outputs
terraform output
```

### 4. Cleanup (if needed)
```bash
# Destroy all resources
terraform destroy

# Or destroy specific resource
terraform destroy -target=aws_db_instance.postgres
```

## Directory Structure

```
aws-phase1/
├── main.tf                    # Main resource definitions
│   ├── VPC & networking       # aws_vpc, aws_subnet, aws_security_group
│   ├── RDS PostgreSQL         # aws_db_instance, aws_db_subnet_group
│   ├── ElastiCache Redis      # aws_elasticache_cluster, notifications
│   ├── SES Email              # aws_sesv2_email_identity, sending limits
│   └── CloudWatch             # aws_cloudwatch_log_group, alarms
├── variables.tf               # Input variable definitions
├── outputs.tf                 # Output definitions (connection strings, etc.)
├── versions.tf                # Terraform version & provider requirements
├── terraform.tfvars.example   # Example configuration (copy & customize)
├── terraform.tfstate          # State file (generated, DO NOT COMMIT)
├── .terraform/                # Terraform cache (generated, in .gitignore)
└── README.md                  # This file
```

## Configuration Files

### terraform.tfvars (Required - NOT COMMITTED)
```hcl
aws_region        = "us-east-1"           # Free tier region (REQUIRED)
environment       = "dev"                 # dev | staging | prod
vpc_cidr          = "10.0.0.0/16"         # VPC network range
db_name           = "imbobi_dev"          # Database name
db_username       = "imbobimaster"        # Master username
db_password       = "GENERATED_PASSWORD"  # Min 8 chars (REQUIRED)
ses_from_email    = "noreply@imbobi.com.br"  # Must be verified in SES
ses_mail_from_domain = "bounce.imbobi.com.br" # Optional, for production
```

**Important**: 
- Generate secure password: `openssl rand -base64 32 | tr -d '=' | cut -c1-32`
- Verify SES email before deployment: https://console.aws.amazon.com/ses

### variables.tf
Defines all input variables with types, defaults, and validation rules.

### outputs.tf
Exports connection information after deployment:
- RDS endpoint, hostname, port, database name
- ElastiCache endpoint, port, URL
- SES verified email address
- CloudWatch log group
- VPC and security group IDs

### versions.tf
Specifies required Terraform version (>= 1.0) and AWS provider version (~> 5.0).

## Resource Overview

### VPC & Networking
| Resource | Count | Details |
|----------|-------|---------|
| aws_vpc | 1 | CIDR 10.0.0.0/16, DNS enabled |
| aws_subnet | 2 | Private subnets in different AZs |
| aws_security_group | 3 | RDS, ElastiCache, ECS/Lambda |
| aws_internet_gateway | 0 | N/A (private infrastructure) |
| aws_nat_gateway | 0 | N/A (not needed for Phase 1) |

### RDS PostgreSQL
| Resource | Details |
|----------|---------|
| Instance Type | db.t2.micro (Free Tier) |
| Engine Version | PostgreSQL 15.4 |
| Storage | 20 GB gp2 (Free Tier) |
| Multi-AZ | No (single AZ free tier) |
| Backup Retention | 7 days |
| Encryption | At rest (AES-256) & in transit (SSL) |
| Public Access | No (security best practice) |
| Deletion Protection | Yes |

### ElastiCache Redis
| Resource | Details |
|----------|---------|
| Node Type | cache.t2.micro (Free Tier) |
| Engine Version | Redis 7.0 |
| Number of Nodes | 1 (no replication for free tier) |
| Port | 6379 |
| Encryption at Rest | Yes |
| Encryption in Transit | No (free tier limitation) |
| Backup | Not supported (single node) |
| Auto-Failover | No (single node) |

### SES (Email Service)
| Resource | Details |
|----------|---------|
| Email Identity | noreply@imbobi.com.br (verified) |
| Daily Quota | 50,000 emails/day (Free Tier) |
| Sending Rate | 1 email/second (Free Tier) |
| Region | us-east-1 (Free Tier) |

### Monitoring & Logging
| Resource | Details |
|----------|---------|
| CloudWatch Logs | `/aws/imbobi/phase1` (30-day retention) |
| RDS Logs | PostgreSQL query logs exported to CloudWatch |
| SNS Topics | ElastiCache notifications, SES alerts |
| Alarms | SES bounce rate threshold |

## Outputs

After `terraform apply`, retrieve connection information:

```bash
# Get all outputs
terraform output

# Get specific output
terraform output rds_host
terraform output elasticache_url
terraform output ses_from_email

# Get output as JSON
terraform output -json
```

### Example Outputs
```
rds_endpoint = "imbobi-postgres.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432"
rds_host = "imbobi-postgres.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com"
rds_port = 5432
rds_database_name = "imbobi_dev"
rds_username = "imbobimaster"

elasticache_endpoint = "imbobi-redis.xxxxxxxxxxxxx.cache.amazonaws.com"
elasticache_port = 6379
elasticache_url = "redis://imbobi-redis.xxxxxxxxxxxxx.cache.amazonaws.com:6379"

ses_from_email = "noreply@imbobi.com.br"
ses_region = "us-east-1"

cloudwatch_log_group = "/aws/imbobi/phase1"
vpc_id = "vpc-xxxxx"
private_subnet_ids = ["subnet-xxxxx", "subnet-xxxxx"]
```

## State Management

### Local State (Development)
```
terraform.tfstate              # Current state (DO NOT COMMIT)
terraform.tfstate.backup       # Previous state backup
.terraform/                    # Provider cache
```

### S3 Backend (Production - Phase 2)
Uncomment the `backend "s3"` block in `versions.tf` after first deployment:

```bash
# Create S3 bucket for state
aws s3 mb s3://imbobi-terraform-state --region us-east-1

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1

# Uncomment backend block in versions.tf
# Re-init to migrate state
terraform init
```

## Customization

### Change Environment
```bash
# Production deployment
terraform apply -var="environment=prod" \
                 -var="db_password=YOUR_PROD_PASSWORD" \
                 tfplan
```

### Change AWS Region
⚠️ **WARNING**: Free Tier only available in `us-east-1`. Other regions will incur charges.

```bash
# (Not recommended unless you have non-free-tier account)
terraform apply -var="aws_region=eu-west-1" tfplan
```

### Modify Sizes
```bash
# Change database size (not recommended—may lose free tier eligibility)
terraform apply -var="db_instance_class=db.t3.small" tfplan
```

### Add Resources
1. Define new resource in `main.tf`
2. Add variables in `variables.tf`
3. Add outputs in `outputs.tf`
4. Run `terraform plan` to validate
5. Run `terraform apply` to deploy

## Troubleshooting

### "InvalidParameterValue: Invalid db instance identifier"
**Cause**: Region doesn't support t2.micro  
**Solution**: Ensure `aws_region = "us-east-1"`

### "Terraform lock wait timeout"
**Cause**: Another `terraform apply` is running  
**Solution**: Wait or check AWS console for in-progress changes

### "API rate exceeded"
**Cause**: Rapid repeated terraform commands  
**Solution**: Wait 30 seconds before retrying

### "Security group invalid"
**Cause**: Stale security group reference  
**Solution**: `terraform destroy` and redeploy

### Database password contains special characters
**Solution**: Escape in connection string or use AWS Secrets Manager

## Cost Optimization

### Free Tier Limits
- RDS: 750 hours/month + 20 GB storage (free for 12 months)
- ElastiCache: t2.micro (free for 12 months)
- SES: 50,000 emails/day (free forever)

### Cost Estimation
| Service | Usage | Cost |
|---------|-------|------|
| RDS | < 750 hours/month | $0 |
| ElastiCache | < 750 hours/month | $0 |
| SES | < 50,000 emails/day | $0 |
| Data Transfer | < 1 GB/month | $0 |
| **Total** | | **$0** |

### Monitoring Costs
```bash
# Check AWS Billing Dashboard
https://console.aws.amazon.com/billing

# Or use AWS CLI
aws ce get-cost-and-usage \
  --time-period Start=2026-06-01,End=2026-07-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

## Common Operations

### Check Resource Status
```bash
# List all resources
terraform state list

# Inspect specific resource
terraform state show aws_db_instance.postgres

# Check remote resources
aws rds describe-db-instances --db-instance-identifier imbobi-postgres
aws elasticache describe-cache-clusters --cache-cluster-id imbobi-redis
```

### Refresh State
```bash
# Update state from AWS (if changed outside Terraform)
terraform refresh

# Or apply without changes (validation only)
terraform apply -refresh-only
```

### Recreate Resource
```bash
# Mark resource for recreation
terraform taint aws_db_instance.postgres

# Apply changes (will recreate)
terraform apply
```

### Update Configuration
```bash
# Validate syntax
terraform fmt main.tf variables.tf outputs.tf

# Validate logic
terraform validate

# Plan changes
terraform plan

# Apply
terraform apply tfplan
```

## Documentation

- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [imbobi AWS_SETUP.md](../../../AWS_SETUP.md) - Full deployment guide
- [AWS Free Tier FAQ](https://aws.amazon.com/free/faq/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices.html)

## Support

For issues:
1. Check Terraform logs: `TF_LOG=DEBUG terraform apply`
2. Review AWS console for service status
3. Check [AWS Status Page](https://status.aws.amazon.com/)
4. Contact: contato.vinicaetano93@gmail.com

---

**Version**: 1.0  
**Last Updated**: 2026-06-02  
**Maintainer**: AWS Solutions Architect
