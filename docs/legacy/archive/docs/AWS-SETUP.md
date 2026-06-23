# AWS Deployment Guide — imobi

## Prerequisites

### 1. AWS Account Setup
- Create or use existing AWS account: https://aws.amazon.com/
- Go to **IAM Console** → **Users** → Create new user
- Enable **Access Keys** for the user
- Attach policy: `AdministratorAccess` (for setup) or use granular permissions:
  - `EC2FullAccess`
  - `RDSFullAccess`
  - `ElastiCacheFullAccess`
  - `S3FullAccess`
  - `CloudWatchLogsFullAccess`
  - `SecretsManagerReadWrite`

### 2. Install Required Tools

```bash
# Terraform (Infrastructure as Code)
# macOS with Homebrew
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.5.0/terraform_1.5.0_linux_amd64.zip
unzip terraform_1.5.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# AWS CLI
pip install awscli --upgrade --user

# Verify installations
terraform --version
aws --version
```

### 3. Configure AWS Credentials

```bash
# Interactive configuration
aws configure

# When prompted, enter:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region: sa-east-1
# Default output format: json
```

This creates `~/.aws/credentials` and `~/.aws/config`.

## Deployment Steps

### Phase 1: Infrastructure Setup (Terraform)

#### Step 1.1: Prepare Terraform Variables

```bash
cd /home/user/imobi/terraform

# Copy example template
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars

# CRITICAL: Generate a secure database password
openssl rand -base64 32
# Copy this output into terraform.tfvars as db_password
```

#### Step 1.2: Initialize Terraform

```bash
# Download required providers
terraform init

# Verify configuration
terraform validate
```

Expected output: `Success! The configuration is valid.`

#### Step 1.3: Review Infrastructure Plan

```bash
# Generate execution plan
terraform plan -out=tfplan

# Review output:
# - VPC with 2 subnets
# - RDS PostgreSQL instance (db.t3.micro - free tier)
# - ElastiCache Redis cluster (cache.t3.micro - free tier)
# - 2 EC2 instances (t3.micro - free tier)
# - Security groups for each service
# - S3 bucket for obra photos
# - CloudWatch log groups
```

#### Step 1.4: Apply Infrastructure

```bash
# Create all AWS resources
terraform apply tfplan

# Capture outputs - you'll need these values:
terraform output -json > infrastructure_outputs.json

# View specific outputs
terraform output api_instance_public_ip
terraform output rds_endpoint
terraform output redis_address
terraform output web_instance_public_ip
```

**⏱️ Estimated Time**: 5-10 minutes for all resources to be created

### Phase 2: EC2 Instance Configuration

#### Step 2.1: Connect to API Instance

```bash
# Get the API instance public IP
API_IP=$(terraform output -raw api_instance_public_ip)

# Create SSH key pair (if not already done)
aws ec2 create-key-pair --key-name imobi-api --region sa-east-1 \
  --query 'KeyMaterial' --output text > ~/.ssh/imobi-api.pem
chmod 600 ~/.ssh/imobi-api.pem

# Connect to instance
ssh -i ~/.ssh/imobi-api.pem ubuntu@$API_IP

# Once connected, run:
cd /opt/imobi
nano .env.production

# Update the file with actual endpoints:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@RDS_ENDPOINT:5432/imobi_prod
# REDIS_URL=redis://REDIS_ENDPOINT:6379
```

#### Step 2.2: Deploy NestJS API

```bash
# On the API instance:
cd /opt/imobi

# Clone repository or copy code via Git
git clone https://github.com/YOUR_REPO/imobi.git .

# Install dependencies
pnpm install

# Build the API
pnpm build

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
pnpm db:generate

# Start the API with PM2
pm2 start dist/main.js --name "imobi-api"
pm2 save
pm2 startup

# Verify it's running
curl http://localhost:3001/health
```

#### Step 2.3: Connect to Web Instance

```bash
# Get the Web instance public IP
WEB_IP=$(terraform output -raw web_instance_public_ip)

# Create SSH key pair
aws ec2 create-key-pair --key-name imobi-web --region sa-east-1 \
  --query 'KeyMaterial' --output text > ~/.ssh/imobi-web.pem
chmod 600 ~/.ssh/imobi-web.pem

# Connect to instance
ssh -i ~/.ssh/imobi-web.pem ubuntu@$WEB_IP

# Once connected, configure environment
cd /opt/imobi
nano .env.production

# Update API endpoint:
# NEXT_PUBLIC_API_URL=http://API_IP:3001
```

#### Step 2.4: Deploy Next.js Web

```bash
# On the Web instance:
cd /opt/imobi

# Clone repository
git clone https://github.com/YOUR_REPO/imobi.git .

# Install dependencies
pnpm install

# Build the application
pnpm build

# Start the web app
pm2 start "pnpm start --port 3000" --name "imobi-web"
pm2 save
pm2 startup

# Verify it's running
curl http://localhost:3000
```

### Phase 3: Database Setup

#### Step 3.1: Test RDS Connectivity

```bash
# From your local machine
RDS_ENDPOINT=$(terraform output -raw rds_address)

# Install PostgreSQL client
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Test connection
psql -h $RDS_ENDPOINT -U postgres -d imobi_prod -c "SELECT version();"

# When prompted for password, use the one from terraform.tfvars
```

#### Step 3.2: Enable PostGIS Extension

```bash
# Connect to the database
psql -h $RDS_ENDPOINT -U postgres -d imobi_prod

# Create PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

# Verify installation
SELECT ST_Version();

# Exit
\q
```

#### Step 3.3: Apply Database Migrations

```bash
# From API instance (or local with proper RDS connection)
cd /opt/imobi
npx prisma migrate deploy
```

### Phase 4: S3 Configuration

#### Step 4.1: Create S3 Bucket Lifecycle

```bash
# Get bucket name
S3_BUCKET=$(terraform output -raw s3_bucket_name)

# Create lifecycle policy for automatic cleanup
aws s3api put-bucket-lifecycle-configuration \
  --bucket $S3_BUCKET \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "DeleteOldUploads",
        "Status": "Enabled",
        "Prefix": "uploads/",
        "Expiration": {
          "Days": 90
        },
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 30
        }
      }
    ]
  }' \
  --region sa-east-1
```

#### Step 4.2: Configure CORS (if needed)

```bash
# Allow frontend to access S3 directly
aws s3api put-bucket-cors \
  --bucket $S3_BUCKET \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3000", "https://imobi.com.br"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }' \
  --region sa-east-1
```

### Phase 5: Monitoring & Logs

#### Step 5.1: View CloudWatch Logs

```bash
# List available log groups
aws logs describe-log-groups --region sa-east-1

# View API logs
aws logs tail /aws/ec2/imobi-api --follow --region sa-east-1

# View Web logs
aws logs tail /aws/ec2/imobi-web --follow --region sa-east-1

# View RDS logs
aws logs tail /aws/rds/imobi-postgres --follow --region sa-east-1
```

#### Step 5.2: Create CloudWatch Alarms

```bash
# High CPU on API instance
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-api-high-cpu \
  --alarm-description "Alert when API CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --region sa-east-1

# RDS database low storage
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-rds-low-storage \
  --alarm-description "Alert when RDS free storage is low" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 2147483648 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --region sa-east-1
```

## Verification Checklist

- [ ] RDS PostgreSQL accessible via psql
- [ ] PostGIS extension enabled in database
- [ ] NestJS API running on EC2 (curl http://API_IP:3001/health)
- [ ] Next.js frontend running on EC2 (curl http://WEB_IP:3000)
- [ ] Database migrations applied (check Prisma tables)
- [ ] ElastiCache Redis accessible (redis-cli -h REDIS_ENDPOINT)
- [ ] S3 bucket created and accessible
- [ ] CloudWatch logs visible for all services
- [ ] EC2 security groups allow required ports

## Connecting Locally

### From Your Computer

```bash
# Access RDS database
psql -h $(terraform output -raw rds_address) \
     -U postgres \
     -d imobi_prod

# Access Redis
redis-cli -h $(terraform output -raw redis_address)

# SSH to API instance
ssh -i ~/.ssh/imobi-api.pem ubuntu@$(terraform output -raw api_instance_public_ip)

# SSH to Web instance
ssh -i ~/.ssh/imobi-web.pem ubuntu@$(terraform output -raw web_instance_public_ip)
```

## Cost Optimization

### During Free Tier (First 12 Months)

- ✅ t3.micro EC2: 750 hours/month free (covers 1 instance)
- ✅ t3.micro RDS: 750 hours/month free
- ✅ cache.t3.micro Redis: 750 hours/month free
- ✅ 5GB S3 storage free
- ✅ 100GB data transfer OUT free
- **Total Monthly Cost**: ~$0 (validate before paying)

### After Free Tier

- EC2 t3.micro overages: ~$10/month
- RDS t3.micro: ~$35/month
- Redis cache.t3.micro: ~$20/month
- S3 storage: ~$1-5/month
- Data transfer: ~$0.09/GB after 100GB
- **Estimated Total**: $70-150/month

### Cost Reduction Strategies

1. **Use Reserved Instances** (34% discount) after validation
2. **Consolidate instances** if traffic allows
3. **Archive old S3 objects** to Glacier
4. **Use CloudFront** for data transfer (50% cheaper)
5. **Set up Auto-scaling** for variable workloads

## Troubleshooting

### RDS Connection Fails

```bash
# Check security group allows your IP
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw rds_security_group_id) \
  --region sa-east-1

# Add your IP if needed
aws ec2 authorize-security-group-ingress \
  --group-id $(terraform output -raw rds_security_group_id) \
  --protocol tcp \
  --port 5432 \
  --cidr YOUR_IP/32 \
  --region sa-east-1
```

### EC2 Instance Unreachable

```bash
# Check instance status
aws ec2 describe-instance-status \
  --instance-ids $(terraform output -raw api_instance_id) \
  --region sa-east-1

# Check security group
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw api_security_group_id) \
  --region sa-east-1
```

### Redis Connection Failed

```bash
# Verify Redis is running
aws elasticache describe-cache-clusters \
  --cache-cluster-id imobi-redis \
  --show-cache-node-info \
  --region sa-east-1

# Check security group
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw redis_security_group_id) \
  --region sa-east-1
```

## Cleanup (Destroy Infrastructure)

⚠️ **WARNING**: This will delete all resources including data!

```bash
# Backup your database first!
pg_dump -h $(terraform output -raw rds_address) \
        -U postgres \
        -d imobi_prod > backup.sql

# Destroy all infrastructure
cd /home/user/imobi/terraform
terraform destroy

# Confirm by typing: yes
```

## Next Steps

1. ✅ Infrastructure deployed via Terraform
2. ⏭️ Set up CI/CD pipeline (GitHub Actions → CodePipeline)
3. ⏭️ Configure domain via Route53
4. ⏭️ Set up CloudFront CDN
5. ⏭️ Enable automated backups & disaster recovery
6. ⏭️ Production monitoring & alerting

## Support

For issues:
- Check CloudWatch Logs: `aws logs tail /aws/ec2/* --follow`
- Review Terraform state: `terraform show`
- Check AWS Console: https://console.aws.amazon.com/
