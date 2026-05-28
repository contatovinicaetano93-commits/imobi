# 🔒 Security & Compliance Guide — Production Deployment

**Version:** 1.0  
**Last Updated:** 2026-05-28  
**Classification:** Internal - Security Sensitive  

---

## Table of Contents

1. [Data Protection & Privacy](#data-protection--privacy)
2. [Application Security](#application-security)
3. [Infrastructure Security](#infrastructure-security)
4. [API Security](#api-security)
5. [Secrets Management](#secrets-management)
6. [Audit & Logging](#audit--logging)
7. [Compliance Frameworks](#compliance-frameworks)
8. [Security Incident Response](#security-incident-response)
9. [Security Testing](#security-testing)

---

## Data Protection & Privacy

### Data Classification

**Public Data:**
- Non-identifying marketing content
- Public company information
- General product information

**Internal Data:**
- Employee information
- Internal metrics
- System configurations

**Confidential Data:**
- User credentials (passwords, tokens)
- Financial information
- Transaction details
- Personal identification numbers (CPF)

**Restricted Data:**
- Encryption keys
- Private API keys
- Admin credentials
- Backup files

### GDPR Compliance (if EU users)

**Data Subject Rights:**
- Right to Access: Implement `/api/v1/users/me` endpoint
- Right to Erasure: Implement soft-delete with cascade
- Right to Rectification: User profile update endpoint
- Right to Data Portability: `/api/v1/users/export` endpoint
- Right to Restrict Processing: Implement data processing flags

**Implementation Checklist:**
- [ ] Data processing agreements (DPA) in place
- [ ] Privacy policy published (https://imbobi.com/privacy)
- [ ] Cookie consent (only with user consent)
- [ ] Data retention policy defined
- [ ] GDPR request process documented
- [ ] Data breach notification procedure (72-hour requirement)
- [ ] Privacy impact assessment (PIA) completed

### Data Retention Policies

```
Deleted User Data:
├─ User Account: Soft-delete + hard-delete after 90 days
├─ Transactions: Retain for 7 years (tax/audit)
├─ Evidences: Delete after 90 days (or per user request)
├─ Audit Logs: Retain for 1 year
├─ Payment Records: Retain for 6 years
└─ Backup Files: Retain for 30 days

Cookies & Session Data:
├─ Session Tokens: 7 days (refresh token TTL)
├─ Access Tokens: 15 minutes
└─ Tracking Cookies: 30 days (with user consent)
```

### Encryption Standards

**Data at Rest:**
- Database: PostgreSQL SSL connections (`sslmode=require`)
- S3: AES-256 encryption
- RDS: AWS KMS encryption
- Secrets: AWS Secrets Manager (AWS managed CMK)

**Data in Transit:**
- All APIs: HTTPS/TLS 1.2+
- Database connections: SSL/TLS
- Cache: Redis TLS (optional)
- Certificate pinning: Implement on mobile for critical APIs

**Field-Level Encryption:**
```typescript
// Encrypt sensitive fields before storage
ENCRYPTION_SECRET -> AES-256-GCM
Fields encrypted: CPF, Phone, Refresh tokens, SSN (if applicable)

// Never log encrypted values
// Never transmit unencrypted
// Key rotation: Yearly (with migration period)
```

---

## Application Security

### Authentication & Authorization

**JWT Implementation:**
```
Access Token:
├─ Algorithm: HS256 (HMAC SHA-256)
├─ Payload: { sub, email, role, iat, exp }
├─ Expiration: 15 minutes
├─ Secrets: > 64 characters (256 bits)
└─ Storage: In-memory (never localStorage)

Refresh Token:
├─ Algorithm: HS256
├─ Payload: { sub, email, iat, exp, version }
├─ Expiration: 7 days
├─ Secrets: > 64 characters
├─ Storage: HttpOnly cookie (secure flag)
└─ Rotation: On each refresh
```

**Implementation Checklist:**
- [ ] JWT_SECRET > 64 characters, cryptographically random
- [ ] JWT_REFRESH_SECRET > 64 characters, cryptographically random
- [ ] Tokens never logged
- [ ] Token validation on all protected routes
- [ ] Token refresh implemented with version tracking
- [ ] Password hashing: bcrypt with salt rounds = 12
- [ ] MFA implementation (optional but recommended)
- [ ] Session timeout: 15 minutes of inactivity
- [ ] Account lockout: 5 failed attempts, 15-minute lockout

### Input Validation & Sanitization

**Validation Strategy:**
```typescript
// All inputs validated with Zod schemas
// Schemas are single source of truth

├─ Email: RFC 5322 regex + DNS verification
├─ Password: Min 8 chars, uppercase, lowercase, number, special
├─ Phone: Country-specific format validation
├─ CPF: MOD-11 algorithm validation
├─ Coordinates: Valid latitude (-90 to 90), longitude (-180 to 180)
├─ File Upload: 
│  ├─ Max size: 10MB
│  ├─ Allowed types: JPEG, PNG, PDF
│  ├─ Magic number verification (not extension)
│  └─ Virus scan via VirusTotal or ClamAV
└─ URL: Valid URL format, whitelist hostnames
```

**Sanitization:**
```typescript
// All string inputs sanitized against injection
├─ SQL Injection: Parameterized queries (Prisma)
├─ NoSQL Injection: Input validation + Prisma ORM
├─ XSS: Output encoding + DOMPurify
├─ LDAP Injection: Input validation
├─ Command Injection: Avoid shell execution
└─ Path Traversal: Validate file paths
```

### Cross-Site Request Forgery (CSRF) Protection

**Implementation:**
```typescript
// CSRF token strategy
├─ Token Generation: Random 32-byte value per session
├─ Storage: HttpOnly cookie (double-submit pattern)
├─ Validation: All state-changing requests (POST/PUT/DELETE)
├─ Header: X-CSRF-Token required
└─ Exception: Authenticated APIs via Bearer token
```

**Configuration:**
```typescript
// NestJS middleware
import { CsrfMiddleware } from '@nestjs/csrf';

app.use(new CsrfMiddleware({
  secret: process.env.ENCRYPTION_SECRET,
  headerName: 'X-CSRF-Token',
}));
```

### Rate Limiting

**Implementation:**
```
API Endpoints:
├─ Authentication: 5 requests/hour per IP
├─ Password Reset: 3 requests/hour per email
├─ File Upload: 100 requests/day per user
├─ General API: 1000 requests/hour per user
└─ Search: 100 requests/minute per IP
```

**Redis-backed rate limiting:**
```typescript
// Using @nestjs/throttler
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
})
```

---

## Infrastructure Security

### Network Security

**VPC Configuration:**
```
┌─────────────────────────────────────────┐
│         Internet Gateway                │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
 [Public Subnet]  [Public Subnet]
    │                 │
    ├─ ALB            ├─ NAT Gateway
    │                 │
    └─────────┬───────┘
              │
    ┌─────────┴────────────┐
    │                      │
[Private Subnet A]    [Private Subnet B]
    │                      │
    ├─ ECS Cluster        ├─ ECS Cluster
    │                      │
    └──────────┬───────────┘
               │
         ┌─────┴─────┐
         │            │
       [RDS]      [Redis]
```

**Security Groups:**

```
ALB Security Group:
├─ Inbound: 80/tcp from 0.0.0.0/0 (redirect to HTTPS)
├─ Inbound: 443/tcp from 0.0.0.0/0
└─ Outbound: All

API Security Group:
├─ Inbound: 4000/tcp from ALB security group only
└─ Outbound: To RDS, Redis, S3, Secrets Manager

RDS Security Group:
├─ Inbound: 5432/tcp from API security group only
└─ Outbound: None

Redis Security Group:
├─ Inbound: 6379/tcp from API security group only
└─ Outbound: None
```

**DDoS Protection:**
- [ ] AWS Shield Standard (free, included)
- [ ] AWS Shield Advanced ($3000/month) - optional
- [ ] AWS WAF with rate-based rules
- [ ] CloudFlare DDoS protection (optional CDN)

### Infrastructure Hardening

**EC2/ECS:**
- [ ] Non-root user for container execution
- [ ] Read-only root filesystem
- [ ] No privileged containers
- [ ] Security scanning on container startup
- [ ] Secrets injected via AWS Secrets Manager (not ENV)
- [ ] CloudWatch logging enabled
- [ ] IMDSv2 enforced (prevent metadata leakage)

**RDS PostgreSQL:**
- [ ] Multi-AZ enabled for HA
- [ ] Automated backups: 30-day retention
- [ ] Encryption at rest: AWS KMS CMK
- [ ] Encryption in transit: SSL required
- [ ] Enhanced monitoring enabled
- [ ] CloudWatch alarm on suspicious activity
- [ ] Parameter group: No weak passwords
- [ ] No public accessibility
- [ ] IAM database authentication optional

**S3 Bucket:**
- [ ] Versioning enabled
- [ ] Block Public Access enabled
- [ ] Server-side encryption: AWS KMS CMK
- [ ] Bucket policy: Least privilege
- [ ] Logging to CloudTrail
- [ ] Lifecycle policies for old versions
- [ ] MFA Delete enabled (optional)
- [ ] No public ACLs

---

## API Security

### CORS Configuration

```typescript
// Only whitelist production domains
const corsOptions = {
  origin: [
    'https://app.imbobi.com',
    'https://www.imbobi.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 3600,
};
```

### Security Headers

```typescript
// Helmet.js middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Additional headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-when-cross-origin');
  next();
});
```

### Dependency Vulnerability Scanning

```bash
# Check npm dependencies
npm audit

# Use Snyk for continuous monitoring
npm install -g snyk
snyk auth
snyk test

# GitHub dependency scanning (automatic)
# Settings > Security & analysis > Dependabot
```

**Maintenance:**
- [ ] Weekly vulnerability scans
- [ ] Monthly dependency updates
- [ ] Security patches applied within 24 hours
- [ ] CVE monitoring enabled

---

## Secrets Management

### Environment Variables Hierarchy

**Never in .env files (committed to git):**
- API Keys
- Passwords
- Encryption keys
- Database credentials
- JWT secrets
- OAuth tokens

**Storage Strategy:**
```
Development:
├─ Local .env file (in .gitignore)
└─ Docker secrets (if using Docker Compose)

Staging:
└─ AWS Secrets Manager

Production:
├─ AWS Secrets Manager (primary)
├─ ECS task definition (references Secrets Manager)
└─ CloudWatch logs (never log secret values!)
```

### AWS Secrets Manager

**Create secrets:**

```bash
# Create API secrets
aws secretsmanager create-secret \
  --name imbobi/prod/api \
  --secret-string '{
    "JWT_SECRET": "...",
    "JWT_REFRESH_SECRET": "...",
    "ENCRYPTION_SECRET": "...",
    "DATABASE_URL": "...",
    "AWS_SECRET_ACCESS_KEY": "..."
  }' \
  --kms-key-id alias/aws/secretsmanager

# Rotate secrets
aws secretsmanager rotate-secret \
  --secret-id imbobi/prod/api \
  --rotation-rules AutomaticallyAfterDays=30
```

**Rotation Policy:**
```
Secret Type          Rotation Frequency    Process
────────────────────────────────────────────────────
JWT_SECRET           Yearly                Dual-key validation
API_KEYS             Quarterly             Blue-green deployment
Database Password    Yearly                RDS parameter update
Encryption Secret    Yearly                Gradual migration
OAuth Tokens         Per provider          Check provider policy
```

**Audit Secrets Access:**
```bash
# Monitor secret access via CloudTrail
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=imbobi/prod/api
```

---

## Audit & Logging

### Application Logging

**Log Levels:**
```
DEBUG:   Only in development
INFO:    Normal operations (logins, uploads)
WARN:    Recoverable issues (rate limits hit)
ERROR:   Exceptions (database errors)
CRITICAL: System failures
```

**What to Log:**
```typescript
✓ Login attempts (with IP, user agent)
✓ API requests (endpoint, user, response code)
✓ File uploads (user, file hash, size)
✓ Database errors (without connection strings!)
✓ Authorization failures
✓ Configuration changes
✓ Suspicious patterns (rate limit violations, etc)

✗ Do NOT log:
✗ Passwords or credentials
✗ Full API keys or tokens
✗ Personal data (CPF, credit cards)
✗ Encrypted field values
✗ Request body (if it contains sensitive data)
```

**Log Retention:**
```
Logs                 Retention    Storage
────────────────────────────────────────
Application Logs     1 year       CloudWatch/S3
Audit Logs          2 years       S3 (immutable)
Security Events     3 years       SIEM/S3
```

### Database Audit Trail

```sql
-- Create audit table
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create trigger to auto-audit
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, record_id, operation, old_values, new_values, user_id)
  VALUES (TG_TABLE_NAME, NEW.id::text, TG_OP, to_jsonb(OLD), to_jsonb(NEW), current_user);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to sensitive tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger();
CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### CloudTrail & VPC Flow Logs

```bash
# Enable CloudTrail
aws cloudtrail create-trail \
  --name imbobi-prod-trail \
  --s3-bucket-name imbobi-cloudtrail-logs \
  --is-multi-region-trail

aws cloudtrail start-logging --trail-name imbobi-prod-trail

# Enable VPC Flow Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-12345 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flow-logs
```

---

## Compliance Frameworks

### GDPR (European users)

**Checklist:**
- [ ] Privacy policy updated and accessible
- [ ] Data processing agreement with users
- [ ] Consent mechanism for marketing emails
- [ ] Cookie consent banner (if tracking)
- [ ] Data subject request process (access, erasure, etc)
- [ ] Data breach notification procedure (72 hours)
- [ ] DPA with data processors (AWS, SendGrid, etc)
- [ ] Privacy impact assessment (PIA) completed
- [ ] Right to export data (GDPR Article 20)

### PCI-DSS (if handling credit cards)

**NOT recommended:** Don't store credit cards yourself
**RECOMMENDED:** Use tokenization via Stripe, Square, etc

If you must handle cards:
- [ ] Network segmentation
- [ ] Encryption of cardholder data
- [ ] Vulnerability scanning (quarterly)
- [ ] Penetration testing (annual)
- [ ] Access controls & audit logs
- [ ] Secure deletion of card data
- [ ] Employee security awareness

### SOC 2 (Security, Availability, Processing Integrity, Confidentiality, Privacy)

**Preparation:**
- [ ] Information security policy documented
- [ ] Access controls implemented
- [ ] Change management process
- [ ] Risk assessment completed
- [ ] Incident response plan
- [ ] Monitoring & alerting
- [ ] Business continuity plan
- [ ] Third-party assessments (annual Type II audit)

### LGPD (Brazilian GDPR equivalent)

**Additional Requirements:**
- [ ] Data protection officer designated
- [ ] Processing agreement in Portuguese
- [ ] User consent for marketing (opt-in)
- [ ] Right to erasure within reasonable time
- [ ] Breach notification within 30 days
- [ ] Cross-border transfers documented

---

## Security Incident Response

### Incident Classification

```
Severity 1 (CRITICAL): 
└─ Data breach affecting all users
└─ Complete system outage
└─ Ransomware/malware detected
└─ Unauthorized root access

Severity 2 (HIGH):
└─ Data leak affecting subset of users
└─ Significant API degradation
└─ Unauthorized database access
└─ Compromised API key

Severity 3 (MEDIUM):
└─ Single user account compromised
└─ Minor information disclosure
└─ Service partial outage

Severity 4 (LOW):
└─ Failed authentication attempt
└─ Rate limit abuse
└─ Suspicious activity pattern
```

### Incident Response Plan

**Immediate Actions (T+0 minutes):**
1. Alert incident commander
2. Assess severity and impact
3. Notify affected users if needed
4. Isolate affected systems
5. Preserve evidence

**Assessment Phase (T+0-30 minutes):**
1. Determine scope of breach
2. Identify entry point/vulnerability
3. Check for lateral movement
4. Review logs for suspicious activity
5. Engage forensics team if needed

**Containment (T+30-120 minutes):**
1. Revoke compromised credentials
2. Force password resets if needed
3. Block suspicious IP addresses
4. Rotate API keys
5. Apply security patch

**Recovery (T+120+ minutes):**
1. Restore from clean backup
2. Apply security patches
3. Monitor for re-exploitation
4. Verify system integrity
5. Communicate status to users

**Post-Incident (T+1-7 days):**
1. Conduct full forensic analysis
2. Document lessons learned
3. Update security controls
4. Notify regulators if required (GDPR 72-hour rule)
5. Update incident response playbook

**Example: API Key Compromised**

```bash
# 1. Revoke compromised key immediately
aws apigateway delete-api-key --api-key $COMPROMISED_KEY_ID

# 2. Force logout all users
UPDATE sessions SET revoked_at = NOW() WHERE api_key_id = $COMPROMISED_KEY_ID;

# 3. Generate new key
NEW_KEY=$(openssl rand -base64 48)
aws secretsmanager update-secret --secret-id imbobi/prod/api --secret-string "{...}"

# 4. Update deployments
aws ecs update-service --cluster imbobi-prod --service imbobi-api-prod --force-new-deployment

# 5. Review logs for unauthorized use
aws logs filter-log-events --log-group-name /ecs/imbobi-api-prod --filter-pattern "\"$COMPROMISED_KEY\""

# 6. Notify users of security incident (if needed)
```

---

## Security Testing

### Automated Security Scanning

**SAST (Static Application Security Testing):**

```bash
# ESLint security plugin
npm install --save-dev eslint-plugin-security
# .eslintrc.json: extends ["plugin:security/recommended"]

# npm audit
npm audit

# Snyk
npm install -g snyk
snyk test
```

**Dependency Scanning:**

```bash
# GitHub Dependabot (automatic)
# Settings > Security & analysis > Dependabot alerts

# Manual scan
npm outdated
npm audit fix
```

### DAST (Dynamic Application Security Testing)

**OWASP ZAP Testing:**

```bash
docker pull owasp/zap2docker-stable
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.imbobi.com \
  -r /app/zap-report.html
```

### Penetration Testing

**Recommendations:**
- [ ] Annual penetration test (external)
- [ ] Quarterly vulnerability assessment
- [ ] Post-incident penetration test
- [ ] Before major releases

### Security Awareness Training

- [ ] OWASP Top 10
- [ ] Secure coding practices
- [ ] Password management
- [ ] Phishing awareness
- [ ] Social engineering prevention
- [ ] Incident reporting process

---

## Security Contacts & Escalation

**Security Team:**
- Security Lead: security@imbobi.com
- Incident Commander: oncall@imbobi.com
- Legal/Compliance: legal@imbobi.com

**Vulnerability Disclosure:**
- Email: security@imbobi.com
- Include: Vulnerability description, impact, reproduction steps
- Timeline: We aim to respond within 24 hours

**Reporting Incidents:**
1. Contact security@imbobi.com immediately
2. Provide initial assessment of impact
3. Document all findings
4. Preserve evidence (logs, files)
5. Follow incident response plan

---

## Quick Reference

**Critical Files & Locations:**
- Environment: `/home/user/alagami-site/.env.production`
- Secrets: AWS Secrets Manager → `imbobi/prod/*`
- SSL Certificates: AWS Certificate Manager
- Logs: CloudWatch → `/ecs/imbobi-api-prod`
- Backups: S3 → `imbobi-evidencias-prod`
- Policies: IAM Console → Service roles

**Regular Maintenance:**
- Daily: Check error logs, security alerts
- Weekly: Review CloudWatch metrics, Sentry
- Monthly: Update dependencies, security patches
- Quarterly: Penetration testing, access review
- Yearly: Key rotation, compliance audit
