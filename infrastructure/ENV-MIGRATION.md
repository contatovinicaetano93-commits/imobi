# Environment Variables Migration Guide

**Status:** Production-ready  
**Last Updated:** 2026-06-02  
**Target:** AWS Secrets Manager migration for imobi project

## Overview

This guide documents the migration of 26 environment variables from local `.env` files to AWS Secrets Manager for secure, centralized secrets management.

## Environment Variables Reference

### 1. API Configuration (3 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `PORT` | number | `4000` | HTTP server port | Yes |
| `NODE_ENV` | enum | `development` | Environment mode (development, staging, production) | Yes |
| `CORS_ORIGIN` | URL | `http://localhost:3000` | CORS allowed origin | Yes |

### 2. Database Configuration (1 variable)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `DATABASE_URL` | PostgreSQL URL | `postgresql://imbobi:senha@localhost:5432/imbobi_dev` | Full PostgreSQL connection string | Yes |

### 3. Redis/Cache Configuration (2 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `REDIS_HOST` | hostname | `localhost` | Redis server hostname | Yes |
| `REDIS_PORT` | number | `6379` | Redis server port | Yes |

### 4. Authentication & Encryption (4 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `JWT_SECRET` | string (64+ chars) | N/A | JWT signing secret key | Yes |
| `JWT_EXPIRES_IN` | duration | `15m` | JWT token expiration time | Yes |
| `JWT_REFRESH_EXPIRES_IN` | duration | `7d` | Refresh token expiration time | Yes |
| `ENCRYPTION_KEY` | base64 (32 bytes) | `D+Tq00RvRIfTL66ZbEnn7iAEryHRVyYLuCfUzY49pJM=` | AES-256-GCM encryption key | Yes |

### 5. AWS Configuration (3 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `AWS_REGION` | AWS region | `us-east-1` | AWS region for services | Yes |
| `AWS_ACCESS_KEY_ID` | string | N/A | AWS IAM access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | string | N/A | AWS IAM secret key | Yes |

### 6. Storage Configuration (1 variable)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `S3_BUCKET` | AWS bucket name | `imbobi-evidencias` | S3 bucket for evidence photos | Yes |

### 7. Email Configuration (6 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `USE_AWS_SES` | boolean | `false` | Use AWS SES instead of SMTP | Yes |
| `SES_FROM_EMAIL` | email | `noreply@imbobi.com.br` | Verified email for SES sending | No* |
| `SMTP_HOST` | hostname | `smtp.sendgrid.net` | SMTP server hostname | No* |
| `SMTP_PORT` | number | `587` | SMTP server port | No* |
| `SMTP_USER` | string | `apikey` | SMTP authentication username | No* |
| `SMTP_PASS` | string | N/A | SMTP authentication password | No* |

*Required only if not using AWS SES

### 8. Application URLs (2 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | URL | `https://api.imbobi.com.br` | API base URL for web frontend | Yes |
| `APP_URL` | URL | `http://localhost:3000` | Application base URL | Yes |

### 9. Mobile App Configuration (2 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `EXPO_PUBLIC_API_URL` | URL | `http://localhost:4000` | API URL for Expo mobile app | Yes |
| `EAS_PROJECT_ID` | string | N/A | Expo Application Services project ID | No |

### 10. External APIs (2 variables)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `UNICO_API_KEY` | string | N/A | Unico API key for identity validation | No |
| `SERPRO_TOKEN` | string | N/A | SERPRO API token for gov't certificate queries | No |

### 11. Email Delivery (1 variable)

| Variable | Type | Default | Description | Required |
|----------|------|---------|-------------|----------|
| `SMTP_FROM` | email | `noreply@imbobi.com` | Email from address for SMTP | No |

---

## Migration Strategy

### Phase 1: Local Development (No changes required)
- Continue using `.env` files
- `secrets.service.ts` falls back to `ConfigService` in development
- No AWS credentials needed

### Phase 2: Staging Deployment
1. Create AWS Secrets Manager secret: `imobi/staging`
2. Populate with all 26 environment variables in JSON format
3. Deploy with IAM role granting `secretsmanager:GetSecretValue` permission
4. Set `NODE_ENV=staging` to activate Secrets Manager loading

### Phase 3: Production Deployment
1. Create AWS Secrets Manager secret: `imobi/production`
2. Populate with production values for all 26 variables
3. Deploy with production IAM role
4. Set `NODE_ENV=production` to activate Secrets Manager loading

---

## Step-by-Step Migration Guide

### Prerequisites
- AWS account with appropriate IAM permissions
- AWS CLI v2 installed and configured
- Terraform v1.5.0+ (from `infrastructure/terraform/versions.tf`)
- Access to current `.env` file values

### Step 1: Prepare Secrets JSON

Create a JSON file with all 26 environment variables:

```bash
cat > /tmp/imobi-secrets.json << 'EOF'
{
  "PORT": "4000",
  "NODE_ENV": "staging",
  "CORS_ORIGIN": "https://staging-app.imbobi.com.br",
  "DATABASE_URL": "postgresql://imbobimaster:PASSWORD@imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com:5432/imbobi_staging",
  "REDIS_HOST": "imbobi-redis.xxxxx.cache.amazonaws.com",
  "REDIS_PORT": "6379",
  "JWT_SECRET": "YOUR_64CHAR_MIN_JWT_SECRET_HERE",
  "JWT_EXPIRES_IN": "15m",
  "JWT_REFRESH_EXPIRES_IN": "7d",
  "ENCRYPTION_KEY": "BASE64_ENCODED_32_BYTES_KEY",
  "AWS_REGION": "us-east-1",
  "AWS_ACCESS_KEY_ID": "AKIAIOSFODNN7EXAMPLE",
  "AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "S3_BUCKET": "imobi-evidencias-staging",
  "USE_AWS_SES": "true",
  "SES_FROM_EMAIL": "noreply@imbobi.com.br",
  "SMTP_HOST": "smtp.sendgrid.net",
  "SMTP_PORT": "587",
  "SMTP_USER": "apikey",
  "SMTP_PASS": "SG.YOUR_SENDGRID_KEY",
  "NEXT_PUBLIC_API_URL": "https://api-staging.imbobi.com.br",
  "APP_URL": "https://staging-app.imbobi.com.br",
  "EXPO_PUBLIC_API_URL": "https://api-staging.imbobi.com.br",
  "EAS_PROJECT_ID": "YOUR_EAS_PROJECT_ID",
  "UNICO_API_KEY": "YOUR_UNICO_KEY",
  "SERPRO_TOKEN": "YOUR_SERPRO_TOKEN",
  "SMTP_FROM": "noreply@imbobi.com"
}
EOF
```

### Step 2: Create Secret in AWS Secrets Manager

Using AWS CLI:

```bash
aws secretsmanager create-secret \
  --name imobi/staging \
  --description "Staging environment secrets for imobi application" \
  --secret-string file:///tmp/imobi-secrets.json \
  --region us-east-1
```

Or using Terraform (via `infrastructure/terraform/aws-phase1/secrets.tf`):

```bash
cd infrastructure/terraform/aws-phase1
terraform apply -target=aws_secretsmanager_secret.imbobi_staging
```

### Step 3: Deploy SecretsService

The `SecretsService` is already implemented in:
```
services/api/src/common/secrets.service.ts
```

**Module integration required:**

```typescript
// app.module.ts
import { SecretsService } from './common/secrets.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [SecretsService],
  exports: [SecretsService],
})
export class AppModule {}
```

**Usage in services:**

```typescript
@Injectable()
export class MyService {
  constructor(
    private secrets: SecretsService,
    private config: ConfigService,
  ) {}

  async init() {
    const dbUrl = this.secrets.getRequired('DATABASE_URL');
    const jwtSecret = this.secrets.getRequired('JWT_SECRET');
  }
}
```

### Step 4: Assign IAM Permissions

Attach the `imobi-secrets-manager-access` policy to your ECS task role:

```bash
aws iam attach-role-policy \
  --role-name imbobi-ecs-task-execution-role \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/imobi-secrets-manager-access
```

### Step 5: Deploy Application

```bash
# Set environment to activate Secrets Manager loading
export NODE_ENV=staging

# Deploy ECS task with updated image
pnpm build
docker build -t imbobi-api:latest services/api/
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag imbobi-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest
```

### Step 6: Verify Secrets Loading

Check CloudWatch logs:

```bash
aws logs tail /ecs/imobi --follow
```

Expected output:
```
[SecretsService] AWS Secrets Manager initialized successfully
[SecretsService] Loaded 26 secrets from AWS Secrets Manager
```

---

## Rollback Procedures

### If Secrets Manager Fails

1. **Immediate:** Application falls back to `.env` or ConfigService
2. **Diagnostic:** Check CloudWatch logs for error details
3. **Recovery:** 
   - Verify IAM role has `secretsmanager:GetSecretValue` permission
   - Check secret exists: `aws secretsmanager describe-secret --secret-id imobi/staging`
   - Verify secret values: `aws secretsmanager get-secret-value --secret-id imobi/staging`

### If Need to Revert to Local .env

1. Set `NODE_ENV=development`
2. Ensure `.env` file exists in application root
3. Redeploy application
4. SecretsService automatically uses local env vars

### If Secret Values Are Corrupted

1. Create new secret version:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id imobi/staging \
     --secret-string file:///tmp/backup-secrets.json
   ```

2. Refresh application secrets:
   ```bash
   # API endpoint (if implemented)
   curl -X POST https://api.imbobi.com.br/health/secrets-refresh \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

3. Or redeploy ECS task to reload on startup

---

## Deployment Checklist

### Pre-Deployment
- [ ] All 26 environment variables documented in `/tmp/imobi-secrets.json`
- [ ] Production values confirmed with team
- [ ] AWS credentials configured locally (`aws configure`)
- [ ] Terraform state backend configured (S3 + DynamoDB)
- [ ] Backup of current `.env` file created

### During Deployment
- [ ] Terraform plan reviewed: `terraform plan -out=phase1.tfplan`
- [ ] Secrets Manager secret created successfully
- [ ] IAM policy attached to ECS task role
- [ ] Application deployed with updated image
- [ ] `NODE_ENV` set to `staging` or `production`

### Post-Deployment
- [ ] CloudWatch logs show successful initialization
- [ ] Application responds to health checks
- [ ] Database connections working
- [ ] Redis cache connections working
- [ ] Email sending functional
- [ ] No errors in CloudWatch Logs for SecretsService

### Monitoring
- [ ] CloudWatch alarms configured for secret access failures
- [ ] SNS notifications enabled for suspicious activity
- [ ] Audit logging enabled for Secrets Manager API calls
- [ ] Regular secret rotation scheduled (90 days recommended)

---

## Security Best Practices

### Secret Rotation
Implement automated secret rotation (Phase 3):

```bash
# Enable automatic rotation for production
aws secretsmanager rotate-secret \
  --secret-id imobi/production \
  --rotation-rules '{"AutomaticallyAfterDays": 90}'
```

### Access Control
Limit who can view/manage secrets:

```bash
# Create IAM policy for developers (read-only)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:imobi/*"
    }
  ]
}
```

### Audit & Compliance
- Enable CloudTrail for all Secrets Manager API calls
- Store logs in S3 with versioning + MFA delete
- Implement alert on failed secret access attempts
- Regular security audit of secret access logs

### Sensitive Data Handling
- Never log secret values (SecretsService does not)
- Always use `sensitive = true` in Terraform outputs
- Rotate secrets if accidentally exposed
- Use short-lived temporary credentials where possible

---

## Troubleshooting

### Problem: "Failed to load secrets from AWS"
**Solution:** Check IAM role permissions
```bash
aws iam get-role-policy --role-name imbobi-ecs-task-execution-role \
  --policy-name imobi-secrets-manager-access
```

### Problem: "Secret not found: imobi/staging"
**Solution:** Verify secret exists
```bash
aws secretsmanager list-secrets --filters Key=name,Values=imobi
```

### Problem: "KMS key not found"
**Solution:** Verify KMS key has proper permissions
```bash
aws kms describe-key --key-id arn:aws:kms:us-east-1:ACCOUNT:key/KEY-ID
```

### Problem: Secrets cache not updating
**Solution:** Manual refresh endpoint
```bash
# Restart ECS task to reload on startup, or
curl -X POST https://api.imbobi.com.br/admin/secrets-refresh \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Timeline & Milestones

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **Phase 1: Setup** | Week 1 | Terraform backend, S3 + DynamoDB |
| **Phase 2: Staging** | Week 2 | SecretsService deployed, Staging secret created |
| **Phase 3: Production** | Week 3 | Production secret, IAM policies, monitoring |
| **Phase 4: Automation** | Week 4 | Secret rotation, audit logging, alerts |

---

## Support & Escalation

For issues during migration:

1. **Check logs:** `aws logs tail /ecs/imobi --follow`
2. **Verify permissions:** `aws sts get-caller-identity`
3. **Review guide:** This document
4. **Contact DevOps:** Create issue in #infrastructure channel

---

**Status:** Ready for Deployment  
**Created:** 2026-06-02  
**Branch:** claude/gifted-hawking-ULZTB  
**Reviewer:** Infrastructure Agent
