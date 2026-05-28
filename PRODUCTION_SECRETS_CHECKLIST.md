# PRODUCTION SECRETS CHECKLIST — imbobi

**Last Audit Date:** _______________  
**Audited By:** _______________  
**Next Audit Due:** _______________

---

## Overview

This checklist ensures all production secrets meet security requirements before deployment and are properly rotated on schedule.

**Key Principles:**
1. All secrets must be > 64 characters (or > 32 for encryption keys) and cryptographically random
2. Secrets NEVER committed to Git (use `.env.example` with placeholders only)
3. Secrets stored in secure key management system (AWS Secrets Manager, HashiCorp Vault, etc.)
4. All secrets rotated every 90 days minimum
5. Secret rotation logged and audited

---

## Authentication Secrets

### JWT_SECRET (Access Token Signing Key)

- [ ] **Configuration**
  - [ ] Length: > 64 characters
  - [ ] Charset: Base64 (or hex) characters only
  - [ ] Generation method: `openssl rand -base64 48` or `openssl rand -hex 32`
  - [ ] Value verified: Last 8 chars: _______________

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Backup of secret location: _______________

- [ ] **Usage**
  - [ ] Used only for signing JWT access tokens
  - [ ] Token TTL (JWT_EXPIRATION): 900 seconds (15 minutes)
  - [ ] Token algorithm: HS256 (HMAC-SHA256)
  - [ ] Verified in code: `services/api/src/config/jwt.config.ts`

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 90 days
  - [ ] Next rotation due: _______________
  - [ ] Rotation procedure documented: [ ] Yes [ ] No
  - [ ] Old keys maintained for grace period: 7 days
  - [ ] Rotation log entry created: [ ] Yes [ ] No

### JWT_REFRESH_SECRET (Refresh Token Signing Key)

- [ ] **Configuration**
  - [ ] Length: > 64 characters
  - [ ] Charset: Base64 (or hex) characters only
  - [ ] DIFFERENT from JWT_SECRET: [ ] Verified
  - [ ] Value verified: Last 8 chars: _______________

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Backup of secret location: _______________

- [ ] **Usage**
  - [ ] Used only for signing JWT refresh tokens
  - [ ] Token TTL (JWT_REFRESH_EXPIRATION): 604800 seconds (7 days)
  - [ ] Token algorithm: HS256 (HMAC-SHA256)
  - [ ] Verified in code: `services/api/src/config/jwt.config.ts`
  - [ ] Refresh tokens stored securely (HttpOnly cookie): [ ] Yes [ ] No

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 90 days
  - [ ] Next rotation due: _______________
  - [ ] Rotation invalidates existing refresh tokens: [ ] Yes [ ] No
  - [ ] Users re-prompted to login after rotation: [ ] Yes [ ] No
  - [ ] Rotation log entry created: [ ] Yes [ ] No

---

## Encryption Secrets

### ENCRYPTION_SECRET (AES-256-GCM Key)

- [ ] **Configuration**
  - [ ] Length: 32 characters (256 bits for AES-256)
  - [ ] Generation method: `openssl rand -base64 24` (base64 encoded 256-bit key)
  - [ ] Charset: Base64 characters only
  - [ ] Value verified: Last 8 chars: _______________

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Backup of secret location: _______________

- [ ] **Usage**
  - [ ] Encryption algorithm: AES-256-GCM (authenticated encryption)
  - [ ] Used for encrypting: _______________
  - [ ] Verified in code: `services/api/src/utils/encryption.ts`
  - [ ] IV/Nonce generated randomly for each encryption: [ ] Yes [ ] No
  - [ ] Authentication tag verified on decryption: [ ] Yes [ ] No

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 90 days
  - [ ] Next rotation due: _______________
  - [ ] Old keys maintained for grace period: 30 days
  - [ ] Rotation procedure documented: [ ] Yes [ ] No
  - [ ] Rotation log entry created: [ ] Yes [ ] No
  - [ ] Note: Data encrypted with old key can still be decrypted: [ ] Yes

---

## Database Credentials

### DATABASE_URL (PostgreSQL Connection String)

- [ ] **Configuration**
  - [ ] Format: `postgresql://user:password@host:port/database?sslmode=require`
  - [ ] SSL Mode: `sslmode=require` (not `disable`)
  - [ ] Host: Production RDS endpoint (not localhost)
  - [ ] Port: 5432 (standard PostgreSQL port)
  - [ ] Database name: `imbobi_prod`
  - [ ] Connection pooling: Database_POOL_SIZE=20 (in separate env var)

- [ ] **Database User Security**
  - [ ] Database user: _______________
  - [ ] Password length: > 16 characters
  - [ ] Password complexity: [Mixed case] [Numbers] [Symbols]
  - [ ] User role: `LIMITED_ROLE` (not superuser)
  - [ ] User permissions: [SELECT] [INSERT] [UPDATE] [DELETE] [CREATE INDEX]
  - [ ] User cannot: [CREATE DATABASE] [CREATE USER] [DROP DATABASE]

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Rotation method: AWS RDS password reset
  - [ ] Backup of secret location: _______________

- [ ] **Network Security**
  - [ ] Database host: Only accessible from: [API subnet] [Bastion host]
  - [ ] Database port: 5432 (not exposed to internet)
  - [ ] Security group allows only: API service IP/subnet
  - [ ] Replication (if applicable): Uses separate credentials with limited permissions
  - [ ] Backups: Encrypted and stored in separate AWS account

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 180 days (twice yearly)
  - [ ] Next rotation due: _______________
  - [ ] Rotation procedure: RDS password reset (zero-downtime)
  - [ ] Rotation log entry created: [ ] Yes [ ] No

---

## Redis Credentials

### REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

- [ ] **Configuration**
  - [ ] Host: Redis endpoint (ElastiCache or self-hosted)
  - [ ] Port: 6379 (standard Redis port)
  - [ ] Password: > 32 characters if auth required
  - [ ] Password complexity: [Mixed case] [Numbers] [Symbols]
  - [ ] TLS/SSL enabled: [ ] Yes [ ] No
  - [ ] Requirepass configured: [ ] Yes [ ] No

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service + BullMQ workers
  - [ ] Backup of secret location: _______________

- [ ] **Network Security**
  - [ ] Redis host: Only accessible from: [API subnet] [Worker subnet]
  - [ ] Redis port: 6379 (not exposed to internet)
  - [ ] Security group allows only: API service + workers
  - [ ] Persistence enabled: AOF (Append-Only File)
  - [ ] Backups: Daily snapshots stored in S3

- [ ] **Usage**
  - [ ] Used for: [Caching] [BullMQ queue] [Session storage]
  - [ ] Database number: 0 (default) or specified
  - [ ] Key prefix: `imbobi:` (to avoid collisions in shared instances)
  - [ ] Expiration policy: Allkeys-lru (or appropriate policy)

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 180 days
  - [ ] Next rotation due: _______________
  - [ ] Rotation procedure: AWS ElastiCache modify command
  - [ ] Rotation log entry created: [ ] Yes [ ] No

---

## AWS S3 Credentials

### AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY

- [ ] **Configuration**
  - [ ] Access key format: `AKIA...` (20 chars)
  - [ ] Secret key length: 40 characters
  - [ ] IAM user: `imbobi-app-prod` (service account)
  - [ ] MFA delete protection: [ ] Enabled [ ] N/A

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Backup of secret location: _______________

- [ ] **Permissions**
  - [ ] IAM policy reviewed: [ ] Yes [ ] No
  - [ ] Permissions limited to S3 bucket: `imbobi-evidencias-prod`
  - [ ] Actions allowed: [s3:GetObject] [s3:PutObject] [s3:DeleteObject]
  - [ ] Actions denied: [s3:*] (not wildcard)
  - [ ] Deny bucket deletion: [ ] Yes [ ] No
  - [ ] Deny bucket policy modification: [ ] Yes [ ] No

- [ ] **Bucket Security**
  - [ ] Bucket name: `imbobi-evidencias-prod`
  - [ ] Public access blocked: [ ] Yes [ ] No
  - [ ] Versioning enabled: [ ] Yes [ ] No
  - [ ] Encryption: AWS KMS or S3-managed
  - [ ] Encryption key rotation: [ ] Yes [ ] No
  - [ ] Access logging enabled: [ ] Yes [ ] No
  - [ ] Server-side encryption: AES-256 or KMS
  - [ ] Bucket lifecycle policy: Delete old versions after 90 days

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 90 days
  - [ ] Next rotation due: _______________
  - [ ] Rotation procedure: Create new IAM user key, delete old
  - [ ] Rotation log entry created: [ ] Yes [ ] No

---

## Email Service Credentials

### SENDGRID_API_KEY

- [ ] **Configuration**
  - [ ] API key format: `SG.` prefix + base64 string
  - [ ] Key length: > 64 characters
  - [ ] API version: V3 (current)
  - [ ] Key name: `imbobi-production` (for identification)

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Backup of secret location: _______________

- [ ] **Permissions**
  - [ ] SendGrid dashboard reviewed: [ ] Yes [ ] No
  - [ ] Key permissions: [Mail Send] [API Key Read]
  - [ ] Key permissions (denied): [Email Activity Read] [Admin]
  - [ ] Restricted IP addresses: [ ] Yes [ ] No
  - [ ] Restricted IPs: _______________

- [ ] **Usage**
  - [ ] Sender email: `noreply@imbobi.com`
  - [ ] Sender name: `imbobi`
  - [ ] From domain verified: [ ] Yes [ ] No
  - [ ] SPF record configured: [ ] Yes [ ] No
  - [ ] DKIM configured: [ ] Yes [ ] No
  - [ ] Domain authentication: [ ] Complete [ ] Pending

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 90 days
  - [ ] Next rotation due: _______________
  - [ ] Rotation procedure: Generate new key in SendGrid dashboard
  - [ ] Old key deactivated after grace period: 7 days
  - [ ] Rotation log entry created: [ ] Yes [ ] No

---

## Firebase Cloud Messaging

### FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

- [ ] **Configuration**
  - [ ] Project ID: `imbobi-production`
  - [ ] Private key format: -----BEGIN PRIVATE KEY-----
  - [ ] Private key length: > 1500 characters (RSA key)
  - [ ] Client email: `firebase-adminsdk-xxxxx@imbobi-production.iam.gserviceaccount.com`
  - [ ] Key type: Service account key

- [ ] **Storage**
  - [ ] Stored in AWS Secrets Manager: [ ] Yes [ ] No
  - [ ] Or stored in HashiCorp Vault: [ ] Yes [ ] No
  - [ ] Or stored in: _______________
  - [ ] Access restricted to: API service only
  - [ ] Backup of secret location: _______________

- [ ] **Permissions**
  - [ ] Service account role: Firebase Cloud Messaging Admin
  - [ ] Service account permissions verified: [ ] Yes [ ] No
  - [ ] Roles: [cloudmessaging.admin] [serviceusage.serviceUsageConsumer]
  - [ ] Other roles denied: [ ] Yes [ ] No

- [ ] **Usage**
  - [ ] Used for: Push notifications to mobile app
  - [ ] FCM topic subscription: `imbobi-users-prod`
  - [ ] Message validation enabled: [ ] Yes [ ] No
  - [ ] TTL (message lifetime): 24 hours

- [ ] **Rotation**
  - [ ] Last rotated: _______________
  - [ ] Rotation frequency: Every 90 days
  - [ ] Next rotation due: _______________
  - [ ] Rotation procedure: Generate new service account key
  - [ ] Old key deactivated after grace period: 7 days
  - [ ] Rotation log entry created: [ ] Yes [ ] No

---

## Security Configuration

### CORS_ORIGIN

- [ ] **Configuration**
  - [ ] Format: Comma-separated list (no spaces)
  - [ ] Value: `https://app.imbobi.com,https://www.imbobi.com`
  - [ ] No wildcards (*): [ ] Verified
  - [ ] No localhost: [ ] Verified
  - [ ] No http:// (https only): [ ] Verified
  - [ ] All production domains included: [ ] Yes [ ] No

- [ ] **Validation**
  - [ ] Test CORS from app.imbobi.com: `curl -H "Origin: https://app.imbobi.com" ...`
  - [ ] Test CORS rejection from other domain: `curl -H "Origin: https://evil.com" ...`
  - [ ] Response includes Access-Control-Allow-Origin header
  - [ ] Response matches request origin exactly

---

## Secrets Audit Trail

### Rotation Log

| Secret | Last Rotated | Next Due | Rotated By | Status |
|--------|------------|----------|-----------|--------|
| JWT_SECRET | _____________ | _____________ | _____________ | [ ] OK |
| JWT_REFRESH_SECRET | _____________ | _____________ | _____________ | [ ] OK |
| ENCRYPTION_SECRET | _____________ | _____________ | _____________ | [ ] OK |
| DATABASE_PASSWORD | _____________ | _____________ | _____________ | [ ] OK |
| REDIS_PASSWORD | _____________ | _____________ | _____________ | [ ] OK |
| AWS_ACCESS_KEY | _____________ | _____________ | _____________ | [ ] OK |
| SENDGRID_API_KEY | _____________ | _____________ | _____________ | [ ] OK |
| FIREBASE_KEY | _____________ | _____________ | _____________ | [ ] OK |

---

## Security Best Practices

- [ ] **Storage Best Practices**
  - [ ] No secrets in git history: `git log -S "password" | head -20` returns nothing
  - [ ] No secrets in environment variables in code
  - [ ] No secrets in Docker image layers
  - [ ] No secrets in logs or error messages
  - [ ] No secrets in backup files or caches

- [ ] **Access Control**
  - [ ] Least privilege principle applied to all credentials
  - [ ] API service can access: [Auth secrets] [DB creds] [Redis creds] [AWS creds]
  - [ ] Humans can access (read-only) in emergency: Only on-call engineer + manager approval
  - [ ] Secrets Manager access logged: [ ] Yes [ ] No
  - [ ] Access audit completed: _______________

- [ ] **Monitoring & Alerts**
  - [ ] Secret access logged in AWS CloudTrail: [ ] Yes [ ] No
  - [ ] Alerts configured for: [Secret rotation overdue] [Failed authentication] [Key export attempts]
  - [ ] Alert recipients: _______________
  - [ ] Alert tested and working: [ ] Yes [ ] No

---

## Incident Response

### If Secret is Compromised

1. **Immediate Actions** (< 5 minutes)
   - [ ] Disable/invalidate the compromised secret
   - [ ] Generate new secret (cryptographically random)
   - [ ] Update all services using the old secret
   - [ ] Verify all services restarted with new secret

2. **Investigation** (< 1 hour)
   - [ ] Determine scope: Which secret, how long exposed
   - [ ] Check logs for unauthorized access: `grep -i "unauthorized\|failed\|error" logs/*`
   - [ ] Review API usage logs for anomalies
   - [ ] Check database audit logs for unauthorized queries

3. **Notification** (< 1 hour)
   - [ ] Notify security team
   - [ ] Notify affected users (if data accessed)
   - [ ] Document incident with date, time, impact
   - [ ] Create incident ticket with tracking

---

## Compliance & Audit

- [ ] **GDPR Compliance**
  - [ ] Secrets stored securely (no plaintext): [ ] Yes [ ] No
  - [ ] Access logged and auditable: [ ] Yes [ ] No
  - [ ] User data encrypted at rest: [ ] Yes [ ] No
  - [ ] User data encrypted in transit (TLS): [ ] Yes [ ] No

- [ ] **SOC 2 Compliance** (if applicable)
  - [ ] Secrets rotated every 90 days: [ ] Yes [ ] No
  - [ ] Access control documented: [ ] Yes [ ] No
  - [ ] Incident response plan documented: [ ] Yes [ ] No
  - [ ] Audit trail maintained: [ ] Yes [ ] No

---

## Sign-Off

**Secrets Audit Completed By:**  
Name: _______________  
Title: _______________  
Date: _______________  

**Approved By:**  
Name: _______________  
Title: _______________  
Date: _______________  

---

**Notes:**  
________________________________________________________________  
________________________________________________________________  
________________________________________________________________
