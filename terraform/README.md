# imobi Terraform Infrastructure

Automated AWS infrastructure provisioning for imobi staging and production environments.

## Quick Start

```bash
# 1. Initialize Terraform
terraform init

# 2. Create variables file for your environment
cp staging.tfvars.example staging.tfvars
nano staging.tfvars

# 3. Plan infrastructure
terraform plan -var-file=staging.tfvars -out=tfplan

# 4. Apply changes
terraform apply tfplan

# 5. Get output values
terraform output
```

## Files

- **main.tf** — Core infrastructure (VPC, RDS, ElastiCache, S3)
- **variables.tf** — Input variables with validation
- **outputs.tf** — Output values for use in deployments
- **staging.tfvars.example** — Example staging configuration

## Configuration

### Staging Deployment
```bash
terraform plan -var-file=staging.tfvars -out=tfplan
terraform apply tfplan
```

### Production Deployment
```bash
terraform plan -var-file=production.tfvars -out=tfplan-prod
terraform apply tfplan-prod
```

## Infrastructure Components

### VPC and Networking
- VPC with public and private subnets across 2 AZs
- Internet Gateway for public internet access
- NAT Gateway for private subnet egress

### Database (RDS PostgreSQL)
- PostgreSQL 14+ with PostGIS extension
- Automated backups with 7-day retention (staging) / 30-day (production)
- Encrypted storage
- Parameter group with pg_stat_statements enabled

### Cache (ElastiCache Redis)
- Redis 7.0 cluster
- Single node (staging) or Multi-AZ (production)
- Automatic snapshots enabled
- 512MB memory limit

### Storage (S3)
- S3 bucket for file uploads and assets
- Versioning enabled
- Server-side encryption (AES256)
- Lifecycle policy to delete old versions after 30 days

## Outputs

The Terraform configuration outputs:
- VPC ID
- RDS endpoint (host and connection string)
- Redis endpoint
- S3 bucket name
- Database password secret ARN

## State Management

By default, Terraform state is stored locally. For team environments, enable S3 backend:

```bash
# 1. Create S3 bucket and DynamoDB table (one-time setup)
aws s3api create-bucket --bucket imobi-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket imobi-terraform-state --versioning-configuration Status=Enabled
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# 2. Uncomment backend in main.tf
# 3. Re-initialize Terraform
terraform init
```

## Cost Estimation

### Staging ($165/month)
- RDS t3.micro: $23/month
- ElastiCache t3.micro: $15/month
- Data transfer: $20/month
- S3 storage: $5/month
- Other (ALB, bandwidth): ~$102/month

### Production (~$800/month)
- RDS t3.small + Multi-AZ: $100/month
- ElastiCache t3.small: $50/month
- Read replica: $50/month
- ECS Fargate: $300/month
- ALB + NAT Gateway: $200/month
- Data transfer + S3: $100/month

## Common Operations

### View Current State
```bash
terraform show
terraform state list
terraform state show aws_db_instance.postgres
```

### Update Instance Type
```bash
# 1. Update variables file
nano staging.tfvars
# Change: rds_instance_class = "db.t3.small"

# 2. Plan changes
terraform plan -var-file=staging.tfvars

# 3. Apply (will cause downtime)
terraform apply
```

### Scale Database Storage
```bash
# 1. Update allocated_storage in tfvars
# 2. Plan and apply
terraform apply

# Note: RDS applies change during maintenance window to minimize impact
```

### Force Destroy Resources
```bash
# Destroy all resources
terraform destroy -var-file=staging.tfvars

# Destroy specific resource
terraform destroy -target=aws_db_instance.postgres -var-file=staging.tfvars
```

## Troubleshooting

### Terraform State Conflicts
```bash
# Refresh state from AWS
terraform refresh -var-file=staging.tfvars

# If state is corrupted, pull clean state
terraform state pull > backup.tfstate
rm terraform.tfstate*
terraform init
```

### Resource Creation Timeout
```bash
# Increase timeout for specific resource in main.tf
timeouts {
  create = "60m"
  delete = "60m"
}
```

### IAM Permissions Issues
Required IAM permissions:
- ec2:* (VPC, subnets, security groups)
- rds:* (RDS instances, parameter groups)
- elasticache:* (ElastiCache clusters)
- s3:* (S3 buckets)
- secretsmanager:* (Secrets Manager)
- iam:* (IAM roles for monitoring)

## References

- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest
- AWS RDS Best Practices: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/
- Terraform Best Practices: https://www.terraform.io/docs/cloud/guides/recommended-practices
