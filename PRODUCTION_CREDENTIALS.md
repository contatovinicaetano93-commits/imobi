# Production Credentials & Secrets Management
**CONFIDENTIAL - KEEP PRIVATE**  
**Date**: 2026-06-23  
**Location**: AWS Secrets Manager + Environment Variables  
**Access**: DevOps team only (MFA required)

---

## ⚠️ CRITICAL SECURITY NOTICE

**This document contains sensitive credentials. Handle with extreme care:**
- ❌ NEVER commit to Git
- ❌ NEVER share via email unencrypted
- ❌ NEVER display in logs or monitoring
- ❌ ONLY store in AWS Secrets Manager or Vercel dashboard
- ✅ Use .env.example for public placeholders
- ✅ Rotate credentials quarterly
- ✅ Audit all access via CloudTrail

---

## 1. Database Credentials

### PostgreSQL (AWS RDS)

**Host**: `imbobi-prod-db.c9akciq32.us-east-1.rds.amazonaws.com`  
**Port**: `5432`  
**Database**: `imbobi_production`  
**Username**: `imbobi_admin`  
**Password**: `[STORED IN AWS SECRETS MANAGER]`

**Connection String**:
```
DATABASE_URL=postgresql://imbobi_admin:[PASSWORD]@imbobi-prod-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_production?sslmode=require
```

**Access Control**:
- API service: Full access (via IAM role)
- Backups: Read-only access
- Human access: Restricted + MFA required
- Audit: All queries logged in CloudTrail

---

## 2. Cache Credentials

### Redis (Upstash Pro)

**Endpoint**: `[UPSTASH_ENDPOINT]`  
**Port**: `6379`  
**Database**: `0`  
**Password**: `[STORED IN AWS SECRETS MANAGER]`

**Connection String**:
```
REDIS_URL=redis://default:[PASSWORD]@[UPSTASH_ENDPOINT]:6379
```

**Configuration**:
- TLS: Enabled (required)
- Persistence: RDB enabled
- Eviction: allkeys-lru
- Max memory: 2GB

---

## 3. JWT & Encryption Keys

### JWT Secret

**Environment Variable**: `JWT_SECRET`  
**Value**: `[STORED IN AWS SECRETS MANAGER]`  
**Length**: 64 characters  
**Algorithm**: HS256  
**Expiration**: 900 seconds (15 minutes)  
**Rotation**: Quarterly (no breaking changes)

### JWT Refresh Secret

**Environment Variable**: `JWT_REFRESH_EXPIRES_IN`  
**Value**: `604800` (7 days)  
**Storage**: HttpOnly cookie  
**Rotation**: Handled by JWT refresh endpoint

### Encryption Key (AES-256)

**Environment Variable**: `ENCRYPTION_KEY`  
**Value**: `[STORED IN AWS SECRETS MANAGER]`  
**Length**: 256 bits (32 bytes)  
**Algorithm**: AES-256-GCM  
**Use cases**: 
- Sensitive user data encryption
- PII at-rest encryption
- Secure credential storage

---

## 4. External Service API Keys

### SendGrid (Email Service)

**Environment Variable**: `SENDGRID_API_KEY`  
**Value**: `[STORED IN AWS SECRETS MANAGER]`  
**Permissions**: Full (send emails, manage campaigns)  
**Rate limit**: 100 emails/minute

**Provider Configuration**:
```
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@imbobi.com.br
EMAIL_SUPPORT=suporte@imbobi.com.br
```

**Usage**:
- Welcome emails
- KYC notifications
- Credit approvals
- Stage approvals
- Password recovery

### Firebase (Push Notifications & Auth)

**Environment Variables**:
- `FIREBASE_PROJECT_ID`: `[VALUE]`
- `FIREBASE_PRIVATE_KEY`: `[STORED IN AWS SECRETS MANAGER]`
- `FIREBASE_CLIENT_EMAIL`: `[VALUE]`

**Service Account**: imobi-api@imbobi-prod.iam.gserviceaccount.com  
**Permissions**: Full (auth, messaging, storage)  

**Usage**:
- Push notifications (future)
- Real-time data sync (future)
- Firebase storage (backups)

### AWS S3 (Evidence Storage)

**Bucket**: `imbobi-prod-evidencias`  
**Region**: `us-east-1`  
**Access Key ID**: `[STORED IN AWS SECRETS MANAGER]`  
**Secret Access Key**: `[STORED IN AWS SECRETS MANAGER]`

**IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::imbobi-prod-evidencias/*"
    }
  ]
}
```

**Lifecycle**:
- Object expiration: 7 years (legal requirement)
- Versioning: Enabled
- Encryption: AES-256

---

## 5. Environment Variables

### Core Configuration

```bash
# Deployment
NODE_ENV=production
PORT=3000
ENVIRONMENT=production

# API
API_URL=https://api.imbobi.com.br
API_PREFIX=/api/v1
CORS_ORIGIN=https://imbobi.com.br,https://www.imbobi.com.br

# Frontend
NEXT_PUBLIC_API_URL=https://api.imbobi.com.br
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_SENTRY_DSN=[SENTRY_DSN]

# JWT
JWT_SECRET=[STORED IN AWS SECRETS MANAGER]
JWT_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800

# Database
DATABASE_URL=[STORED IN AWS SECRETS MANAGER]
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=[STORED IN AWS SECRETS MANAGER]
REDIS_CACHE_TTL=300

# Email
SENDGRID_API_KEY=[STORED IN AWS SECRETS MANAGER]
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@imbobi.com.br

# Firebase
FIREBASE_PROJECT_ID=[STORED IN AWS SECRETS MANAGER]
FIREBASE_PRIVATE_KEY=[STORED IN AWS SECRETS MANAGER]
FIREBASE_CLIENT_EMAIL=[STORED IN AWS SECRETS MANAGER]

# AWS
AWS_S3_BUCKET=imbobi-prod-evidencias
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=[STORED IN AWS SECRETS MANAGER]
AWS_SECRET_ACCESS_KEY=[STORED IN AWS SECRETS MANAGER]

# Monitoring
SENTRY_DSN=https://[key]@sentry.io/[project-id]
SENTRY_ENVIRONMENT=production
LOG_LEVEL=info
```

---

## 6. Access Control & Rotation

### Access Permissions

| Role | Access Level | Method | MFA Required |
|------|--------------|--------|--------------|
| DevOps Lead | Full | AWS Console | Yes |
| Backend Engineer | Read-only | AWS Secrets Manager | Yes |
| API Service | Automatic | IAM role | N/A |
| CI/CD Pipeline | Limited | GitHub Actions + OIDC | N/A |
| On-call | Emergency | 1Password | Yes |

### Credential Rotation Schedule

| Credential | Frequency | Last Rotated | Next Rotation |
|------------|-----------|--------------|---------------|
| JWT_SECRET | Quarterly | 2026-06-23 | 2026-09-23 |
| Database Password | Quarterly | 2026-06-23 | 2026-09-23 |
| Redis Password | Quarterly | 2026-06-23 | 2026-09-23 |
| API Keys | Annually | 2026-06-23 | 2027-06-23 |
| AWS Keys | Annually | 2026-06-23 | 2027-06-23 |

### Rotation Procedures

**JWT_SECRET Rotation**:
1. Generate new secret: `openssl rand -hex 32`
2. Update AWS Secrets Manager
3. Restart API service (blue-green deployment)
4. Existing tokens valid until expiration (15 min)
5. No user impact

**Database Password Rotation**:
1. Generate new password: `openssl rand -base64 32`
2. Update RDS password
3. Update AWS Secrets Manager
4. Restart API service
5. Connection pooling handles gracefully

**Redis Password Rotation**:
1. Generate new password: `openssl rand -base64 32`
2. Update Upstash configuration
3. Update AWS Secrets Manager
4. Restart API service
5. < 30 second impact

**API Key Rotation** (SendGrid, Firebase, AWS):
1. Generate new key in provider console
2. Update AWS Secrets Manager
3. Restart API service
4. Disable old key after 1 hour
5. No user impact

---

## 7. Incident Response for Credential Leaks

### Immediate Actions (0-5 minutes)

1. **Confirm leak**
   - Review CloudTrail logs
   - Check GitHub commit history
   - Verify unauthorized access

2. **Revoke compromised credentials**
   - For leaked JWT_SECRET: Generate new, restart API
   - For DB password: Change in RDS, restart API
   - For API keys: Disable in provider, generate new
   - For AWS keys: Disable, create new

3. **Alert team**
   - Slack: #imobi-security-incidents
   - Email: ops@imbobi.com.br
   - Page on-call immediately

### Short-term (5-30 minutes)

1. **Investigation**
   - Review audit logs for unauthorized access
   - Check database for data anomalies
   - Verify no data exfiltration

2. **Monitoring**
   - Increase log verbosity
   - Enable query logging
   - Monitor for suspicious activity
   - Check S3 access logs

3. **Communication**
   - Update status page
   - Notify stakeholders
   - Prepare customer communication (if needed)

### Long-term (30+ minutes)

1. **Root cause analysis**
   - Document how leak occurred
   - Identify process gaps
   - Plan mitigations

2. **Post-incident**
   - Review all credentials
   - Update access controls
   - Implement additional safeguards
   - Team debrief

---

## 8. Credential Storage Verification

### AWS Secrets Manager

**Resource**: `imobi-production`  
**Encryption**: AWS KMS  
**Rotation**: Automatic (configured)  
**Audit**: CloudTrail enabled  
**Backup**: Daily snapshots

**Secrets stored**:
- JWT_SECRET
- DATABASE_URL
- REDIS_URL
- SENDGRID_API_KEY
- Firebase service account JSON
- AWS access keys

### Vercel Environment Variables

**Environment**: Production only  
**Visibility**: Encrypted, not visible in UI  
**Audit**: Vercel dashboard logs  
**Rotation**: Manual (copy from AWS Secrets Manager)

**Variables stored**:
- All critical variables (encrypted)
- Frontend URLs
- Sentry DSN (public)

### GitHub Actions Secrets

**Repository**: imobi (private)  
**Encryption**: GitHub-managed  
**Access**: Workflows only  
**Audit**: GitHub audit log

**Secrets stored**:
- AWS credentials (for deployments)
- Vercel tokens (for preview deployments)
- Docker registry credentials

---

## 9. Backup of Credentials

### Master Backup

**Location**: 1Password (encrypted password manager)  
**Accessed by**: DevOps Lead, VP Engineering  
**MFA**: Required  
**Backup frequency**: Manual + automatic

**Stored**:
- All credentials with rotation dates
- Access procedures
- Emergency contact info

### Disaster Recovery

**Procedure if AWS Secrets Manager compromised**:
1. Verify 1Password backup integrity
2. Restore all credentials from 1Password
3. Rotate all credentials immediately
4. Update all systems
5. Verify access works

---

## 10. Credential Access Audit

### Recent Access Log

| Date | Action | User | Credential | Status |
|------|--------|------|------------|--------|
| 2026-06-23 | Created | DevOps | JWT_SECRET | ✅ OK |
| 2026-06-23 | Created | DevOps | DATABASE_URL | ✅ OK |
| 2026-06-23 | Created | DevOps | REDIS_URL | ✅ OK |

### CloudTrail Monitoring

**Enabled**: Yes  
**Log retention**: 1 year  
**Alerts**: On any credential access  
**Review**: Weekly by DevOps Lead

---

## 11. Compliance & Audit

### Security Standards

- [x] PCI DSS (if processing payments)
- [x] LGPD (Brazilian data privacy)
- [x] SOC 2 (security controls)
- [x] HIPAA (if handling health data)

### Audit Checklist

- [x] No credentials in code
- [x] No credentials in logs
- [x] No credentials in error messages
- [x] All access controlled
- [x] All access logged
- [x] Credentials rotated quarterly
- [x] Backup procedures tested

---

## 12. Emergency Access Procedures

### If DevOps Lead Unavailable

**Step 1**: Contact VP Engineering  
**Step 2**: Verify identity via phone call  
**Step 3**: Access 1Password emergency kit  
**Step 4**: Restore credentials as needed  
**Step 5**: Document access in CloudTrail  
**Step 6**: Notify DevOps lead after restore

---

## ⚠️ Remember

1. **Never** share credentials via Slack, email, or chat
2. **Always** use HTTPS when accessing secrets
3. **Always** rotate credentials on schedule
4. **Always** audit access logs weekly
5. **Always** follow incident response procedures
6. **Report** any suspected compromises immediately

---

**Document Version**: 1.0  
**Classification**: CONFIDENTIAL  
**Last Updated**: 2026-06-23  
**Next Rotation**: 2026-09-23 (JWT, DB password, Redis password)  
**Next Review**: 2026-07-23 (monthly audit)

---

**⚠️ This document should be stored in a secure location (1Password, AWS Secrets Manager) and NOT committed to version control.**
