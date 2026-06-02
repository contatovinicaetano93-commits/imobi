# AWS Phase 1 Deployment - Credentials Setup Guide

## Current Status
- **Terraform Configuration**: ✓ Validated
- **AWS Credentials**: ❌ Not configured
- **Network**: Ready for deployment
- **Services**: RDS, ElastiCache, SES ready for provisioning

## Prerequisites
1. AWS Account (free tier eligible)
2. AWS CLI installed: `pip install awscli`
3. IAM User with appropriate permissions

## Step 1: Create AWS IAM User

1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Username: `imbobi-terraform-deployer`
4. Attach policy: `AdministratorAccess` (or custom policy below)

### Minimal IAM Policy (Recommended)
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "rds:*",
                "elasticache:*",
                "ses:*",
                "sns:*",
                "cloudwatch:*",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## Step 2: Generate Access Keys

1. In IAM User settings → Security credentials
2. Create access key (choose "Other")
3. Copy the Access Key ID and Secret Access Key

## Step 3: Configure Local Credentials

1. Copy `.env.aws.example` to `.env.aws`:
   ```bash
   cd infrastructure/terraform/aws-phase1
   cp .env.aws.example .env.aws
   ```

2. Edit `.env.aws` with your credentials:
   ```bash
   AWS_ACCESS_KEY_ID=AKIA_XXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   AWS_REGION=us-east-1
   ```

3. Load credentials into shell:
   ```bash
   source .env.aws
   ```

## Step 4: Validate Credentials

Run the validation script:
```bash
./validate-aws-credentials.sh
```

Expected output:
```
✓ Credentials are valid!
Account ID: 123456789012
ARN: arn:aws:iam::123456789012:user/imbobi-terraform-deployer

✓ EC2 access OK
✓ RDS access OK
✓ ElastiCache access OK
✓ SES access OK
```

## Step 5: Deploy Infrastructure

Once credentials are validated:

```bash
cd infrastructure/terraform/aws-phase1

# Initialize Terraform
terraform init

# Preview deployment
terraform plan

# Deploy Phase 1 services
terraform apply
```

## Security Notes

- **NEVER commit `.env.aws`** to git (it's in .gitignore)
- Store credentials in `.env.aws` locally only
- Rotate IAM access keys periodically
- Use AWS Secrets Manager for sensitive data in production

## Troubleshooting

### Error: "Forbidden" connecting to Terraform Registry
- This is a network/environment issue
- Terraform will work once `terraform init` succeeds
- Try: `terraform validate` after init completes

### Error: "InvalidUserID.Malformed"
- Credentials are not valid
- Check Access Key ID format (should start with AKIA)
- Verify in AWS Console that user exists and is active

### Error: "UnauthorizedOperation" for RDS/ElastiCache
- IAM user lacks required permissions
- Attach policy from Step 1 above
- Wait 1-2 minutes for IAM changes to propagate

## Quick Reference

| File | Purpose |
|------|---------|
| `.env.aws.example` | Template for credentials |
| `.env.aws` | Your actual credentials (local only, gitignored) |
| `validate-aws-credentials.sh` | Credential validation script |
| `terraform.tfvars` | Terraform variables (sensitive data) |

## Next Steps

1. Create IAM user and generate access keys
2. Configure `.env.aws` with credentials
3. Run `./validate-aws-credentials.sh`
4. Execute `terraform init && terraform apply`
