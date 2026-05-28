# Secrets Management Guide

## Overview

This guide explains how to securely manage production secrets for the Imobi application across different deployment platforms.

## Core Principles

1. **Never commit secrets to git** — `.env`, `.env.production`, etc. should always be in `.gitignore`
2. **Use environment variables** — Never hardcode credentials in code
3. **Rotate credentials regularly** — Update API keys, database passwords, etc. periodically
4. **Use strong credentials** — Generate long, random passwords and API keys
5. **Principle of least privilege** — Give services only the permissions they need
6. **Audit access** — Monitor who accesses what secrets

## Files & Gitignore

### .gitignore Rules
```gitignore
# Environment variables (NEVER COMMIT)
.env
.env.local
.env.*.local
.env.production
.env.staging
.env.development

# IDE and build artifacts
node_modules/
dist/
.next/
# ... other build artifacts
```

### Safe Files (Can be Committed)
```
.env.example                    # Template for required vars
.env.development.example        # Development defaults
.env.production.example         # Production template
services/api/PRODUCTION_VALIDATION.md
```

## Secrets by Service

### Database Credentials
**Variable**: `DATABASE_URL`

**Security**:
- Use strong passwords (32+ characters, mixed case, numbers, symbols)
- Database should only be accessible from API server
- Use SSL/TLS connections (`sslmode=require` in PostgreSQL)
- Rotate credentials quarterly
- Use read-only credentials for backups

**Example**:
```
DATABASE_URL="postgresql://api_user:random_strong_password@db.internal:5432/imobi_prod?sslmode=require"
```

### Redis Credentials
**Variables**: `REDIS_URL` or (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)

**Security**:
- Upstash and similar services provide URL with embedded credentials
- Only share URL in secure channels (not Slack, email, etc.)
- Change password if exposed
- Redis should not be publicly accessible

**Example (Upstash)**:
```
REDIS_URL="redis://default:your_random_password@your-host.upstash.io:6379"
```

### SendGrid API Key
**Variable**: `SENDGRID_API_KEY`

**Security**:
- API key grants full email sending permissions
- Should be rotated quarterly
- Can restrict to specific IPs if needed
- If exposed, revoke immediately and create new key

**How to Generate**:
1. Go to https://app.sendgrid.com/settings/api_keys
2. Create "Full Access" key
3. Copy and store securely
4. Never share in logs or error messages

### AWS Credentials
**Variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

**Security**:
- Create IAM user with minimal permissions:
  - S3: List, Get, Put objects only for evidence bucket
  - SES: SendEmail, SendRawEmail only (if using SES for email)
  - CloudWatch: PutMetricData (if using CloudWatch)
- Use different credentials for different services
- Enable MFA if possible
- Rotate credentials annually

**Policy Example for S3 (Attach to IAM user)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::imobi-prod-evidence",
        "arn:aws:s3:::imobi-prod-evidence/*"
      ]
    }
  ]
}
```

### Firebase Service Account
**Variables**: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

**Security**:
- Private key is extremely sensitive — grants full Firebase access
- Download from Firebase Console only, never share via chat
- Rotate periodically (create new service account)
- Can restrict permissions via Custom Claims
- If exposed, immediately generate new service account

**How to Get**:
1. Go to Firebase Console → Project Settings
2. Service Accounts tab → Generate new private key
3. Extract JSON values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

**Format Note**: Private key in env var must escape newlines:
```
# JSON file has:
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"

# In .env file:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----"
```

## Deployment Platform Secrets

### Vercel
1. Go to Project Settings → Environment Variables
2. Add each secret (don't use Development environment for production secrets)
3. Secrets are encrypted at rest
4. Cannot be read back after saving (by design)

```bash
# Via Vercel CLI
vercel env add DATABASE_URL
vercel env add REDIS_URL
# ... etc
```

### Railway
1. Go to your project → Variables
2. Add raw environment variables
3. Railway encrypts them
4. Can manage via CLI:
```bash
railway variables set DATABASE_URL "postgresql://..."
```

### Heroku
1. Go to Settings → Config Vars
2. Add each secret
3. Redeploy after adding secrets

```bash
# Via CLI
heroku config:set DATABASE_URL="postgresql://..."
heroku config:set REDIS_URL="redis://..."
```

### Self-Hosted / Docker
Use secrets management tools:

**Option 1: Docker Secrets** (Swarm)
```bash
echo "postgresql://..." | docker secret create db_url -
docker service create \
  --secret db_url \
  --env DATABASE_URL=/run/secrets/db_url \
  imobi-api
```

**Option 2: Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: imobi-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  REDIS_URL: "redis://..."
---
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: api
    image: imobi-api:latest
    envFrom:
    - secretRef:
        name: imobi-secrets
```

**Option 3: HashiCorp Vault**
```bash
vault kv put secret/imobi \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..." \
  ...

# Then in app startup, fetch from Vault
```

## Credential Rotation

### Quarterly Rotation Checklist
- [ ] Generate new SendGrid API key
- [ ] Revoke old key
- [ ] Update SENDGRID_API_KEY in all environments
- [ ] Generate new AWS credentials
- [ ] Revoke old credentials
- [ ] Update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- [ ] Rotate database password
- [ ] Update DATABASE_URL
- [ ] Generate new Firebase service account
- [ ] Revoke old service account
- [ ] Update Firebase environment variables

### Annual Rotation
- [ ] Rotate all credentials above
- [ ] Review and update IAM policies
- [ ] Review access logs for suspicious activity
- [ ] Update disaster recovery procedures

## Incident Response

### If a Credential is Exposed

1. **Immediately Revoke**: Disable/delete the exposed credential
   - SendGrid: Delete API key
   - AWS: Deactivate access key
   - Firebase: Delete service account
   - Database: Change password

2. **Generate New Credential**: Create replacement immediately

3. **Update Everywhere**:
   - Development environment
   - Staging environment
   - Production environment
   - CI/CD secrets
   - Backup/DR systems

4. **Monitor**: Watch for unauthorized access attempts

5. **Document**: Create incident report with timeline

### Example: SendGrid Leak
```bash
# 1. Revoke in UI
# Go to SendGrid → Settings → API Keys → delete exposed key

# 2. Generate new key
# Copy new key value

# 3. Update environments
vercel env add SENDGRID_API_KEY "SG.new_key_value"  # Prod
railway variables set SENDGRID_API_KEY "SG.new_key_value"  # Staging

# 4. Verify
# Deploy and test email sending works
```

## Audit Trail

### What to Log
```typescript
// Good: Log that action happened
logger.info('Email sent to user', { userId, emailAddress, provider: 'sendgrid' });

// Bad: Never log credentials
logger.info('Email sent with API key: SG.xyz123...');

// Good: Log errors without sensitive data
logger.error('SendGrid API error', { error: 'Auth failed', code: 401 });

// Bad: Don't log API responses that might contain secrets
logger.debug('SendGrid response', { response: apiResponse });
```

### Services with Good Audit
- SendGrid: Email Activity tab
- AWS: CloudTrail
- Firebase: Audit Logs
- PostgreSQL: Query logs (if enabled)
- Redis: Upstash dashboard

## Development Workflow

### Local Development
1. Copy `.env.production.example` to `.env.local`
2. Get development credentials from team lead (securely)
3. Fill in `.env.local`
4. Never commit `.env.local`
5. When done, consider clearing secrets from `.env.local`

### Sharing Credentials with Team
**Do NOT**:
- Share via Slack, email, or chat
- Paste full credentials
- Share in screenshot

**Do**:
- Use secure password manager (Bitwarden, 1Password, LastPass)
- Use encrypted file transfer (Signal, Keybase)
- Rotate credentials after sharing
- Keep access logs

### Testing with Real Credentials
```bash
# 1. Create separate test credentials (API keys, IAM user, etc.)
# 2. Use only for testing, not production
# 3. Rotate test credentials frequently
# 4. Monitor test credentials for leaks

# Example: SendGrid test API key
SENDGRID_API_KEY_DEV="SG.test_key_with_limited_volume"
```

## Best Practices Summary

1. **Use environment variables**, never hardcode
2. **Never commit credentials**, use `.gitignore`
3. **Rotate quarterly** at minimum
4. **Encrypt in transit** (HTTPS, TLS)
5. **Encrypt at rest** (platform-managed or Vault)
6. **Audit access** regularly
7. **Use service-specific credentials** (different key for each service)
8. **Principle of least privilege** (minimal IAM permissions)
9. **Monitor for leaks** (GitHub secret scanning, git-secrets)
10. **Have incident plan** (how to revoke and rotate quickly)

## Links

- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Railway Secrets](https://docs.railway.app/develop/variables)
- [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Firebase Security](https://firebase.google.com/docs/projects/iam/security-best-practices)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
