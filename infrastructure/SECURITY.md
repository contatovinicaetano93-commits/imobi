# imobi Security Checklist & Best Practices

**Version:** 3.0  
**Last Updated:** 2026-06-02  
**Target Audience:** Security Team, DevOps, Backend Engineers  
**Classification:** Internal Use Only

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Database Security](#database-security)
4. [API Security](#api-security)
5. [AWS Security](#aws-security)
6. [Data Protection & Privacy](#data-protection--privacy)
7. [Infrastructure Security](#infrastructure-security)
8. [Incident Response](#incident-response)
9. [Security Compliance Checklist](#security-compliance-checklist)

---

## Security Overview

### Security Layers

The imobi platform implements defense-in-depth with multiple security layers:

```
┌─────────────────────────────────────────────────┐
│ 1. Network Security (AWS VPC, Security Groups) │
├─────────────────────────────────────────────────┤
│ 2. Transport Security (HTTPS/TLS)              │
├─────────────────────────────────────────────────┤
│ 3. Application Security (Input Validation)     │
├─────────────────────────────────────────────────┤
│ 4. Authentication & Authorization (JWT/RBAC)  │
├─────────────────────────────────────────────────┤
│ 5. Data Security (Encryption at Rest/Transit) │
├─────────────────────────────────────────────────┤
│ 6. Secrets Management (AWS Secrets Manager)    │
├─────────────────────────────────────────────────┤
│ 7. Logging & Monitoring (CloudWatch, Sentry)  │
└─────────────────────────────────────────────────┘
```

### Key Security Principles

- **Principle of Least Privilege:** Every service/user gets minimum required permissions
- **Defense in Depth:** Multiple security layers prevent single point of failure
- **Shift Left:** Security checks in development, not just production
- **Zero Trust:** Verify every request, no implicit trust

---

## Authentication & Authorization

### 1. JWT Authentication

**Implementation:** Passport.js + JWT strategy  
**Location:** `/services/api/src/modules/auth/jwt.strategy.ts`

#### Token Structure

```typescript
JWT Payload:
{
  sub: "user-id",       // Subject (user ID)
  iat: 1234567890,      // Issued at timestamp
  exp: 1234571490,      // Expiration timestamp (15 min)
  type: "access"        // Token type
}
```

#### JWT Security Requirements

- [ ] **Secret Key Strength**
  - Minimum: 64 characters (512 bits)
  - Type: Cryptographically random
  - Storage: AWS Secrets Manager (never in .env)
  - Rotation: Every 90 days minimum
  - Check: `echo $JWT_SECRET | wc -c` should be >= 65

- [ ] **Token Expiration**
  - Access Token: 15 minutes (JWT_EXPIRES_IN)
  - Refresh Token: 7 days (JWT_REFRESH_EXPIRES_IN)
  - Verify: `/services/api/src/modules/auth/auth.service.ts`

- [ ] **Token Storage (Client-Side)**
  - Web: Memory (not localStorage to prevent XSS attacks)
  - Mobile: Secure storage (Expo SecureStore)
  - Never: localStorage (vulnerable to XSS)

- [ ] **Token Transmission**
  - Method: Bearer token in Authorization header
  - Format: `Authorization: Bearer {token}`
  - HTTPS Only: Never transmit over HTTP

#### JWT Secret Rotation Procedure

```bash
# Generate new JWT secret (64+ chars)
NEW_SECRET=$(openssl rand -base64 48)
echo "New JWT_SECRET: $NEW_SECRET"

# 1. Update Secrets Manager with new secret (keep old as fallback)
aws secretsmanager update-secret \
  --secret-id imobi/production \
  --secret-string "{...\"JWT_SECRET\":\"$NEW_SECRET\"...}"

# 2. Restart API service (no downtime with token validation)
systemctl restart imbobi-api

# 3. Invalidate all active tokens (optional, forces re-login)
# This requires token blacklist implementation

# 4. After 24 hours, remove old secret
# (allow time for clients to refresh tokens)

# 5. Monitor Sentry for auth errors
# Verify no increase in UnauthorizedException
```

### 2. Passport.js Strategy

**Location:** `/services/api/src/modules/auth/jwt.strategy.ts`

#### Current Implementation

```typescript
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env["JWT_SECRET"] ?? "",
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuarioId: payload.sub },
      select: { usuarioId: true, tipo: true },
    });
    if (!usuario) throw new UnauthorizedException();
    return { id: usuario.usuarioId, tipo: usuario.tipo };
  }
}
```

#### Security Verification Checklist

- [ ] Bearer token extraction correct (fromAuthHeaderAsBearerToken)
- [ ] User record verified on each request (findUnique with DB query)
- [ ] Invalid tokens reject with UnauthorizedException
- [ ] User type (role) included in validated context
- [ ] No sensitive data in JWT payload (passwords, API keys)
- [ ] Token signature verified before payload access

### 3. Role-Based Access Control (RBAC)

**Location:** `/services/api/src/common/guards/`

#### User Types

```typescript
enum TipoUsuario {
  PESSOA_FISICA = "PF",      // Individual
  EMPREITEIRO = "EMPREITEIRO", // Contractor
  GERENTE = "GERENTE",         // Manager
  ADMIN = "ADMIN"
}
```

#### Authorization Guards

```typescript
// JWT Auth Guard - ensures token is valid
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile() { ... }

// Manager Guard - ensures user is GERENTE or ADMIN
@UseGuards(ManagerGuard)
@Post('manager/approve-credit')
approveCreditDecision() { ... }
```

#### RBAC Security Checklist

- [ ] Each endpoint has appropriate guard applied
- [ ] Manager operations check `usuarioId` matches manager
- [ ] Admin operations only accessible to ADMIN type
- [ ] User cannot modify another user's data
- [ ] Cross-tenant access prevented (if multi-tenant)

### 4. Session Management

#### Session Timeout

- Access tokens expire after: **15 minutes**
- Refresh tokens expire after: **7 days**
- Session invalidation on logout: **Implemented** ✓

#### Session Security Checklist

- [ ] Tokens blacklisted on logout
- [ ] Refresh token invalidated on password change
- [ ] Concurrent session limit (if configured)
- [ ] Session activity tracking (Sentry traces)
- [ ] Idle timeout enforced

---

## Database Security

### 1. PostgreSQL Security

**Location:** PostgreSQL 15+ with PostGIS extension  
**Managed by:** AWS RDS

#### Connection Security

- [ ] **Encrypted Connection (SSL/TLS)**
  - Required: `sslmode=require` in DATABASE_URL
  - Verify: `psql "sslmode=require" $DATABASE_URL -c "SELECT 1;"`
  - Certificate validation: Automatic with AWS RDS

- [ ] **Network Isolation**
  - Database in VPC (private subnet, no internet access)
  - Security group allows only API server connection
  - Inbound rule: Port 5432 from API security group only
  - Verify: `aws ec2 describe-security-groups --group-ids {RDS_SG_ID}`

- [ ] **Database User Privileges**
  - Application user: `imbobi` with limited permissions
  - Privilege: CONNECT, CREATE, USAGE on schema
  - Password: Strong (64+ chars), rotated every 90 days
  - Never: SELECT * privileges on sensitive tables

#### Data Security Queries

```sql
-- View user permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='usuarios';

-- Verify SSL enabled
SHOW ssl;  -- Should show 'on'

-- Check failed login attempts
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%failed%' 
ORDER BY calls DESC;
```

### 2. Sensitive Data Tables

#### User Data Protection

**Table:** `usuario`  
**Sensitive Columns:** email, cpf, rg, pis

```sql
-- Verify columns encrypted (if using column encryption)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='usuario' 
AND column_name IN ('email', 'cpf', 'rg');

-- PII Query Audit Trail (should log to Sentry)
-- All queries on usuario table logged with user ID
```

#### GPS/Location Data Protection

**Table:** `evidencia` (location field)  
**Contains:** Latitude, longitude of evidence photos

```sql
-- PostGIS validation
SELECT postgis_version();

-- Example: Query evidencias within 1km of work site
SELECT id, ST_Distance(
  location::geography, 
  ST_GeogFromText('POINT(lat lng)')::geography
) as distance
FROM evidencia
WHERE obra_id = $1
ORDER BY distance ASC
LIMIT 10;

-- Access Control: Only obra creators can query their location data
```

**Security Controls:**
- [ ] GPS data only accessible to obra owner/gerente
- [ ] Location queries logged to Sentry for audit
- [ ] Batch location export restricted (max 100 records)
- [ ] GPS accuracy validated before storage (±10m)

### 3. Backup & Recovery Security

#### Backup Configuration

- [ ] **RDS Automated Backups**
  - Retention period: 35 days
  - Encryption: AWS KMS (default key)
  - Backup window: 02:00-03:00 UTC daily
  - Verify: `aws rds describe-db-instances --query 'DBInstances[0].BackupRetentionPeriod'`

- [ ] **Encryption at Rest**
  - Storage: AES-256 (AWS KMS)
  - Backups: Encrypted with same key
  - Verify: `aws rds describe-db-instances --query 'DBInstances[0].StorageEncrypted'`

#### Backup Access Control

```bash
# Only infrastructure team can restore backups
aws iam get-user-policy --user-name {user} --policy-name rds-access | grep rds

# Backup restoration requires:
# 1. SNS approval (2+ approvers)
# 2. CloudTrail audit log entry
# 3. 24-hour notification period
```

#### Disaster Recovery Validation

```bash
# Test backup restoration monthly
SNAPSHOT_ID="imbobi-backup-$(date +%Y%m%d)"

# Create test instance from snapshot (non-production)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-test-restore \
  --db-snapshot-identifier $SNAPSHOT_ID

# Verify data integrity
psql "postgresql://imbobi:pass@test-restore.aws.com/imbobi" \
  -c "SELECT COUNT(*) FROM usuario;"

# Delete test instance
aws rds delete-db-instance \
  --db-instance-identifier imbobi-test-restore \
  --skip-final-snapshot
```

---

## API Security

### 1. Input Validation & Sanitization

**Framework:** Zod schemas (source of truth)  
**Location:** `/packages/schemas/src/`

#### Validation Layers

```
Client (UX) ──> API Input Validation ──> Database Storage
   ↓                    ↓
 Zod              Zod + Prisma ORM
(UX feedback)  (Security + Consistency)
```

#### Zod Schema Example

```typescript
// /packages/schemas/src/usuario.schema.ts
export const SignUpSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(12)
    .regex(/[A-Z]/, "Must have uppercase")
    .regex(/[0-9]/, "Must have digit")
    .regex(/[!@#$%^&*]/, "Must have special char"),
  nome: z.string().min(2).max(100),
  cpf: z.string().regex(/^\d{11}$/, "Invalid CPF format"),
});
```

#### Validation Security Checklist

- [ ] Email format validated (RFC 5322 compliant)
  - Max length: 255 chars
  - Allowed characters: a-z, 0-9, ._-+@
  - No spaces or special Unicode characters

- [ ] Password requirements enforced
  - Min length: 12 characters
  - Uppercase: At least 1 (A-Z)
  - Lowercase: At least 1 (a-z)
  - Numbers: At least 1 (0-9)
  - Special: At least 1 (!@#$%^&*)
  - No dictionary words (checked against OWASP list)

- [ ] GPS coordinates validated
  - Latitude: -90 to +90
  - Longitude: -180 to +180
  - Max decimal places: 6 (±0.1m accuracy)
  - Validation on client AND server (incontornável no servidor)

- [ ] File uploads validated
  - Max size: 10MB per image
  - Allowed types: JPEG, PNG only
  - Metadata stripped (remove EXIF)
  - Virus scan: AWS Lambda + ClamAV (optional)

- [ ] Array inputs limited
  - Max array length: Defined per endpoint
  - Duplicate checking if required
  - Batch operations: Max 100 items per request

### 2. Rate Limiting

**Framework:** NestJS Throttler  
**Configuration:** `/services/api/src/app.module.ts`

#### Rate Limit Rules

```typescript
ThrottlerModule.forRoot([
  { ttl: 60000, limit: 100 },    // General: 100 req/min
  { ttl: 60000, limit: 10, name: "auth" }, // Auth: 10 req/min
  { ttl: 60000, limit: 5, name: "upload" }, // Upload: 5 req/min
  { ttl: 60000, limit: 20, name: "manager" }, // Manager: 20 req/min
])
```

#### Rate Limit Security Checklist

- [ ] Auth endpoints limited (prevent brute force)
  - Signup: 10 requests per minute per IP
  - Login: 10 requests per minute per IP
  - Password reset: 5 requests per minute per IP

- [ ] Upload endpoints limited (prevent DOS)
  - Image upload: 5 requests per minute per user
  - Batch upload: 1 request per minute per user

- [ ] API endpoints monitored
  - Sudden spike in requests -> Alert on-call
  - Sustained rate limit hits -> Ban IP for 1 hour

- [ ] IP-based rate limiting (in addition to user-based)
  - Single IP: Max 1000 requests per minute
  - Detect distributed attacks (multiple IPs same user)

### 3. CORS Configuration

**Location:** `/services/api/src/main.ts`

#### CORS Security

```typescript
app.enableCors({
  origin: corsOrigins,  // From CORS_ORIGIN env var
  credentials: true,    // Allow cookies/auth
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600,         // Cache CORS response 1 hour
});
```

#### CORS Checklist

- [ ] **Allowed Origins** strictly defined
  - Development: http://localhost:3000
  - Staging: https://app-staging.imbobi.com.br
  - Production: https://app.imbobi.com.br
  - Never: * (wildcard)

- [ ] **Credentials Handling**
  - Cookies sent with requests: credentials=true
  - SameSite: Strict (prevent CSRF)
  - HttpOnly: true (prevent XSS)
  - Secure: true (HTTPS only)

- [ ] **Preflight Requests**
  - Cached for: 3600 seconds (1 hour)
  - Methods: Only necessary ones (GET, POST, etc.)
  - Headers: Only necessary ones (Content-Type, Authorization)

#### Update CORS for Production

```bash
# Before deployment, verify CORS_ORIGIN
aws secretsmanager get-secret-value --secret-id imobi/production \
  | jq '.SecretString | fromjson | .CORS_ORIGIN'

# Expected: https://app.imbobi.com.br
# If wrong, update immediately:
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string $(aws secretsmanager get-secret-value \
    --secret-id imobi/production \
    --query 'SecretString' --output text | \
    jq '.CORS_ORIGIN = "https://app.imbobi.com.br"')
```

### 4. Helmet Security Headers

**Framework:** Helmet.js  
**Location:** `/services/api/src/main.ts`

#### Security Headers Applied

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],      // Only same-origin
      styleSrc: ["'self'"],        // Only self stylesheets
      scriptSrc: ["'self'"],       // Only self scripts (no inline)
      imgSrc: ["'self'", "data:", "https:"], // Images + CDN
      fontSrc: ["'self'"],         // Only self fonts
      connectSrc: ["'self'"],      // Only same-origin API
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }, // HSTS 1 year
})
```

#### Header Security Checklist

- [ ] **Content-Security-Policy (CSP)**
  - Prevents inline script execution (XSS protection)
  - Restricts image/font sources
  - Restricts API calls to same-origin only

- [ ] **Strict-Transport-Security (HSTS)**
  - Enforces HTTPS for 1 year (31536000 seconds)
  - Subdomains included
  - Preload list: Submit to https://hstspreload.org/

- [ ] **X-Content-Type-Options: nosniff**
  - Prevents MIME type sniffing attacks

- [ ] **X-Frame-Options: DENY**
  - Prevents clickjacking (if not embedded)

- [ ] **X-XSS-Protection: 1; mode=block**
  - Legacy XSS protection (for old browsers)

---

## AWS Security

### 1. IAM Policies

#### Principle of Least Privilege

Each role gets only required permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GetSecrets",
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:imobi/*"
    },
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::imbobi-evidencias/*"
    },
    {
      "Sid": "RDSAccess",
      "Effect": "Allow",
      "Action": ["rds:DescribeDBInstances"],
      "Resource": "arn:aws:rds:*:*:db/imbobi-production"
    }
  ]
}
```

#### IAM Security Checklist

- [ ] **API Service Role**
  - Secrets Manager: GetSecretValue only (specific secret)
  - S3: GetObject, PutObject, DeleteObject (specific bucket)
  - RDS: No direct access (via connection string)
  - No AdministratorAccess or PowerUserAccess

- [ ] **Lambda/Scheduled Tasks**
  - SQS: SendMessage, ReceiveMessage (specific queue)
  - DynamoDB: PutItem, GetItem (specific table)
  - SNS: Publish (specific topic)
  - CloudWatch: PutMetricData

- [ ] **Human Users**
  - Require MFA (multi-factor authentication)
  - Access key rotation every 90 days
  - Console access restricted to office IP range
  - Permissions reviewed quarterly

### 2. Secrets Manager

**Location:** AWS Secrets Manager  
**Secret Name:** `imobi/{environment}`

#### Secrets Configuration

```bash
# View current secrets (replace values shown)
aws secretsmanager get-secret-value --secret-id imobi/production

# Output:
{
  "JWT_SECRET": "...(64+ chars)...",
  "DATABASE_URL": "postgresql://user:pass@host:port/db",
  "REDIS_HOST": "redis-instance.aws.com",
  "AWS_ACCESS_KEY_ID": "AKIA...",
  "AWS_SECRET_ACCESS_KEY": "...",
  "S3_BUCKET": "imbobi-evidencias",
  "ENCRYPTION_KEY": "...(base64)...",
  // ... 20 more variables
}
```

#### Secrets Rotation Policy

```bash
# Automated rotation every 60 days (recommended every 90)
aws secretsmanager rotate-secret \
  --secret-id imobi/production \
  --rotation-rules AutomaticallyAfterDays=90

# Manual rotation (if needed immediately)
aws secretsmanager update-secret \
  --secret-id imobi/production \
  --secret-string '{"JWT_SECRET":"NEW_SECRET",...}'

# Verify no failed rotations
aws secretsmanager describe-secret --secret-id imobi/production \
  | jq '.RotationEnabled, .LastRotatedDate'
```

#### Secrets Access Logging

```bash
# Enable CloudTrail logging of Secrets Manager access
aws cloudtrail start-logging --trail-name imbobi-audit

# Query who accessed secrets
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --max-results 10
```

#### Secrets Security Checklist

- [ ] **No Secrets in Code**
  - Automated scanning: `npm run scan:secrets`
  - Pre-commit hook prevents git commit of secrets
  - GitHub Secret Scanning enabled

- [ ] **No Secrets in Logs**
  - API logs redact JWT tokens
  - Database passwords replaced with "***" in logs
  - Error messages don't expose secrets

- [ ] **Secrets Rotation**
  - JWT_SECRET: Every 90 days
  - Database password: Every 180 days
  - AWS keys: Every 90 days (dev/staging), every 365 days (prod - rotate off-peak)

- [ ] **Access Control**
  - Only API service can read Secrets Manager
  - Only infrastructure team can update secrets
  - All access logged to CloudTrail

### 3. S3 Bucket Security

**Bucket Name:** `imbobi-evidencias`  
**Contents:** Evidence photos (encrypted at rest)

#### S3 Security Configuration

```bash
# Bucket encryption enabled (AES-256)
aws s3api head-bucket-encryption --bucket imbobi-evidencias

# Versioning enabled (recovery)
aws s3api get-bucket-versioning --bucket imbobi-evidencias

# Public access blocked (critical!)
aws s3api get-public-access-block --bucket imbobi-evidencias
# Expected: BlockPublicAcls=true, IgnorePublicAcls=true

# Logging enabled (audit trail)
aws s3api get-bucket-logging --bucket imbobi-evidencias
```

#### S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencrypted",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::imbobi-evidencias/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::imbobi-evidencias/*",
        "arn:aws:s3:::imbobi-evidencias"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

#### S3 Security Checklist

- [ ] **Encryption**
  - At-rest: AES-256 (enabled)
  - In-transit: HTTPS only (SecureTransport=true)
  - Verify: Uploads using HTTPS only

- [ ] **Access Control**
  - Public access blocked (all options = true)
  - Bucket policy denies unencrypted uploads
  - File ACLs: private (no public read)
  - Presigned URLs used for temporary access

- [ ] **Audit Trail**
  - S3 access logging enabled
  - CloudTrail captures API calls
  - S3 Object Lock (optional, for compliance)

- [ ] **Data Lifecycle**
  - Old photos archived after 1 year (Glacier)
  - Backups retained for 7 years (compliance)
  - Deletion logged to Sentry

---

## Data Protection & Privacy

### 1. Sensitive Data Classification

#### Classification Levels

| Level | Examples | Protection | Retention |
|-------|----------|-----------|-----------|
| **Public** | Logo, documentation | Standard | Indefinite |
| **Internal** | Internal docs, process flows | Restricted access | 1 year |
| **Confidential** | User emails, names | Encrypted at rest | 3 years |
| **Secret** | Passwords, API keys, CPF | Secrets Manager + key rotation | 7 years (audit logs) |
| **PII** | Phone, address, GPS location | Encrypted + access audit | LGPD compliant |

#### PII Data Handled by imobi

```
User PII:
- Email (login identifier)
- CPF (tax ID)
- RG (national ID)
- Phone (contact)
- Address (residential)
- Bank account (payment)

Evidence PII:
- GPS coordinates (work site location)
- Photo metadata (EXIF - removed)
- Timestamp (when taken)
```

### 2. LGPD Compliance (Brazil)

**Regulation:** Lei Geral de Proteção de Dados (LGPD)  
**Enforced:** August 2020 onwards  
**Penalties:** Up to 2% of revenue or R$50M

#### LGPD Requirements

- [ ] **Lawful Basis for Processing**
  - Explicit consent obtained (signup form)
  - Purpose clearly stated (credit evaluation)
  - Consent withdrawal mechanism available
  - Verify: `/modules/usuarios/controllers/consent.controller.ts`

- [ ] **Data Subject Rights (Article 18)**
  - Right to access: Endpoint `/api/v1/usuarios/me/data-export`
  - Right to correct: Endpoint `/api/v1/usuarios/me/update`
  - Right to delete: Endpoint `/api/v1/usuarios/me/delete` (soft-delete)
  - Right to data portability: Export in JSON format

- [ ] **Data Retention Limits**
  - Active user data: Kept while account active
  - Inactive user: Deleted after 24 months
  - Audit logs: 7 years (legal requirement)
  - Automated deletion: Cron job runs monthly

- [ ] **Privacy Policy**
  - Available at: `/privacy` (web)
  - Updated with all processing activities
  - Includes: Purpose, retention, recipient, rights
  - Versioning: Changelog for users

#### LGPD Data Export Endpoint

```typescript
// GET /api/v1/usuarios/me/data-export
// Returns: ZIP file with user's personal data

Response:
{
  "profile.json": { email, nome, cpf, rg, phone, address },
  "credit-history.json": [{ ... }],
  "evidence.json": [{ ... }],
  "transactions.json": [{ ... }],
  "access-logs.json": [{ timestamp, action }],
  "export-date": "2026-06-02T10:30:00Z"
}
```

### 3. Encryption

#### At-Rest Encryption

**Database:**
```bash
# RDS encrypted with AWS KMS (default key)
aws rds describe-db-instances \
  --query 'DBInstances[0].[DBInstanceIdentifier,StorageEncrypted]'

# Verify: StorageEncrypted = true
```

**S3:**
```bash
# All objects encrypted with AES-256
aws s3api get-bucket-encryption --bucket imbobi-evidencias
# Expected: SSE-S3 with AES256
```

**Sensitive Columns (Optional - Column-Level):**
```typescript
// If using column encryption:
// Column: usuario.cpf - encrypted with ENCRYPTION_KEY
// Column: usuario.rg - encrypted with ENCRYPTION_KEY
// Column: usuario.bank_account - encrypted with ENCRYPTION_KEY

class EncryptionService {
  encrypt(plaintext: string): string {
    // Uses ENCRYPTION_KEY from Secrets Manager
    // Algorithm: AES-256-GCM
    // Returns: base64-encoded ciphertext
  }

  decrypt(ciphertext: string): string {
    // Decrypts using same ENCRYPTION_KEY
    // Returns: plaintext
  }
}
```

#### In-Transit Encryption

**TLS Configuration:**
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] TLS version: 1.2 or higher
- [ ] Certificate: Valid, not self-signed
- [ ] HSTS enabled (1 year, includeSubDomains)
- [ ] Cipher suites: Strong (no RC4, DES, MD5)

**Verification:**
```bash
# Test TLS version
openssl s_client -connect api.imbobi.com.br:443 -tls1_2

# Check certificate validity
openssl x509 -in /path/to/cert.crt -noout -dates

# Verify HSTS header
curl -I https://api.imbobi.com.br/api/v1/health | grep Strict-Transport
```

### 4. Data Deletion Policy

#### User Data Deletion (LGPD Article 17 - Right to be Forgotten)

```typescript
// Soft-delete on demand
POST /api/v1/usuarios/me/delete
Response: { status: "deleted", dataDeletedAt: "2026-06-02T..." }

// Data behavior after deletion:
- Account: Soft-deleted (hidden from queries)
- Email: Hashed, no longer usable for login
- PII: Redacted but not deleted (audit trail)
- Evidence photos: Marked as deleted in S3
- Credit history: Retained (legal requirement)
- Audit logs: Retained (7 years)
```

#### Automated Deletion (Inactive Accounts)

```bash
# Cron job runs monthly (2:00 AM UTC)
# Deletes accounts inactive for 24+ months

SELECT usuario_id, last_login 
FROM usuario 
WHERE last_login < NOW() - INTERVAL 24 MONTHS
AND deleted_at IS NULL;

-- Count: Should be < 100 per month (normal)
-- Alert if > 1000 (possible deletion bug)
```

---

## Infrastructure Security

### 1. Network Security

#### VPC Configuration

```
                                   ┌─────────────────┐
                                   │   Internet      │
                                   │   Gateway       │
                                   └────────┬────────┘
                                            │
┌─────────────────────────────────────────────────────────┐
│                     AWS VPC (10.0.0.0/16)              │
│                                                         │
│  ┌──────────────────┐     ┌──────────────────┐         │
│  │ Public Subnet    │     │ Private Subnet   │         │
│  │ (Load Balancer)  │     │ (RDS, ElastCache)│         │
│  └──────────────────┘     └──────────────────┘         │
│                                                         │
│  ┌──────────────────┐                                   │
│  │ Private Subnet   │                                   │
│  │ (EC2 API)        │                                   │
│  └──────────────────┘                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Inbound Rules:
- Load Balancer SG: Port 443 (HTTPS) from 0.0.0.0/0
- API SG: Port 4000 from Load Balancer SG only
- RDS SG: Port 5432 from API SG only
- Redis SG: Port 6379 from API SG only
```

#### Security Group Rules

```bash
# API Security Group
aws ec2 describe-security-groups --group-ids {API_SG_ID} \
  | jq '.SecurityGroups[0].IpPermissions'

# Expected:
# - Inbound: Port 4000 from Load Balancer SG
# - No inbound: Port 22 (SSH) from 0.0.0.0/0
# - Outbound: All traffic to RDS/Redis/S3 SGs
```

#### Network Security Checklist

- [ ] **VPC Configuration**
  - Database in private subnet (no internet access)
  - API in private subnet (no direct internet access)
  - Load Balancer in public subnet (internet-facing)

- [ ] **Security Groups**
  - Minimal inbound rules (deny by default)
  - Minimal outbound rules (explicitly allow)
  - No 0.0.0.0/0 on port 5432 (database)
  - No 0.0.0.0/0 on port 6379 (Redis)

- [ ] **Network ACLs**
  - Standard AWS defaults (stateful)
  - Ephemeral port range allowed (1024-65535)
  - No custom ACL rules needed (use Security Groups)

### 2. SSH & Remote Access Security

#### SSH Configuration

```bash
# Disable password authentication (key-only)
# /etc/ssh/sshd_config
PasswordAuthentication no
PermitRootLogin no
Protocol 2
PubkeyAuthentication yes

# Reload SSH daemon
sudo systemctl reload sshd
```

#### SSH Key Management

```bash
# Generate SSH key (if needed)
ssh-keygen -t ed25519 -C "devops@imbobi.com" -f ~/.ssh/imbobi

# Upload public key to AWS EC2
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-0123456789abcdef0 \
  --os-user ec2-user \
  --ssh-public-key file://~/.ssh/imbobi.pub \
  --availability-zone us-east-1a

# Connect
ssh -i ~/.ssh/imbobi ec2-user@api.imbobi.com.br
```

#### Bastion Host (Jump Box)

For production access:

```bash
# Use bastion host to access private instances
ssh -i ~/.ssh/imbobi -J ec2-user@bastion.imbobi.com.br \
  ec2-user@api-internal.imbobi.com.br
```

#### SSH Security Checklist

- [ ] **Key Security**
  - Keys stored in ~/.ssh/ with 600 permissions
  - No keys in code repositories
  - Key rotation every 6 months
  - Lost keys revoked immediately

- [ ] **Access Logging**
  - All SSH connections logged to CloudTrail
  - Shell history retained (7 days)
  - Failed login attempts monitored

### 3. DDoS & WAF Protection

#### AWS Shield & WAF

```bash
# Enable AWS Shield Standard (included)
# Provides DDoS protection for AWS resources

# Enable AWS WAF (optional, recommended)
aws wafv2 create-web-acl \
  --name imbobi-web-acl \
  --region us-east-1 \
  --default-action Block \
  --rules file://waf-rules.json
```

#### WAF Rules

```json
{
  "Rules": [
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Action": {"Block": {}},
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      }
    },
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 2,
      "OverrideAction": {"None": {}},
      "Statement": {
        "ManagedRuleGroupStatement": {
          "Vendor": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      }
    }
  ]
}
```

---

## Incident Response

### 1. Security Incident Classification

| Severity | Examples | Response Time | Action |
|----------|----------|---------------|----|
| **Critical** | Data breach, active attack, unauthorized access | 15 min | Declare incident, isolate systems, notify authorities |
| **High** | Suspicious activity, elevated error rates | 1 hour | Investigate, increase monitoring |
| **Medium** | Failed auth attempts, rate limit hits | 4 hours | Review logs, check for patterns |
| **Low** | Deprecated TLS versions used, outdated dependencies | 1 week | Plan remediation, schedule update |

### 2. Security Incident Response Plan

#### Step 1: Detection & Triage (0-15 minutes)

```bash
# Automated alerts trigger
# Sentry: Error rate > 5% or > 100 errors/min
# CloudWatch: Database connection lost, memory > 90%
# WAF: > 1000 requests/min from single IP

# On-call engineer notified via Slack @here

# Triage questions:
1. What is the affected system? (API, DB, S3)
2. How many users impacted? (% of user base)
3. Is data exposed? (Check S3 logs, DB access)
4. Is it ongoing? (Check error rate trend)
```

#### Step 2: Initial Response (15-30 minutes)

```bash
# 1. Declare incident in Slack #incidents
"SECURITY INCIDENT: Possible unauthorized API access detected
Severity: HIGH | Affected: Authentication module | Users impacted: Unknown"

# 2. Start war room (Zoom/conference)
# Participants: On-call, Security Lead, DevOps, Backend Lead

# 3. Gather data
# - Review CloudTrail logs
aws cloudtrail lookup-events --max-results 50 | jq '.Events[] | {EventTime, EventSource, UserIdentity}'

# - Check Sentry errors
# Dashboard: https://sentry.io/organizations/{org}/issues/

# - Verify system status
curl http://api.imbobi.com.br/api/v1/health/ready

# 4. Take action (if confirmed security incident)
# - Isolate affected system (if needed)
# - Revoke compromised credentials
# - Notify affected users (if data exposed)
```

#### Step 3: Investigation (30 min - 2 hours)

```bash
# 1. Review access logs
aws s3 sync s3://imbobi-logs/access-logs ./logs/
grep "SUSPICIOUS_PATTERN" logs/* > suspicious-access.log

# 2. Database audit
psql $DATABASE_URL -c "
  SELECT * FROM _prisma_migrations 
  ORDER BY finished_at DESC LIMIT 20;"

psql $DATABASE_URL -c "
  SELECT * FROM usuario 
  WHERE created_at > NOW() - INTERVAL 1 HOUR 
  ORDER BY created_at DESC LIMIT 20;"

# 3. Network analysis
tcpdump -i any -w capture.pcap 'port 5432 or port 6379'
# Analyze capture in Wireshark

# 4. Evidence collection
# Screenshot logs, dashboards
# Archive logs to S3: s3://imbobi-incident-archive/incident-{date}/
```

#### Step 4: Containment (ongoing)

```bash
# 1. Revoke compromised credentials
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string '{"JWT_SECRET":"NEW_SECRET",...}'

# 2. Kill active sessions (if possible)
# Restart API to invalidate all JWT tokens
systemctl restart imbobi-api

# 3. Block suspicious IP
aws ec2 authorize-security-group-ingress \
  --group-id {WAF_SG_ID} \
  --ip-permissions IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{IpCidr=ATTACKER_IP/32,Description=BLOCKED}]'

# 4. Enable enhanced logging
# Increase log verbosity temporarily (1 hour)
# Log all database queries
# Log all API requests

# 5. Increase monitoring
# Refresh Sentry dashboard
# Monitor memory, CPU, connections in CloudWatch
```

#### Step 5: Recovery & Restoration

```bash
# 1. Restore from clean backup (if data corrupted)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-production-restored \
  --db-snapshot-identifier imbobi-snapshot-clean

# 2. Validate restored data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuario;"
# Compare with expected count

# 3. Restart services
systemctl restart imbobi-api
systemctl restart imbobi-web

# 4. Verify all systems
curl http://api.imbobi.com.br/api/v1/health/ready
```

#### Step 6: Communication

```bash
# Timeline:
# T+30 min: Notify affected users (if data exposed)
# Subject: "Security Incident Notification - imobi"
# Content:
# - What happened (simple terms)
# - When it was discovered
# - What data was affected
# - What we're doing about it
# - Action users should take (password reset)
# - Contact for questions

# T+2 hours: Status update to stakeholders
# T+24 hours: Post-incident review meeting
```

### 3. Post-Incident Procedures

```bash
# 1. Post-Mortem Meeting (24 hours after)
# Attendees: On-call, Security, DevOps, Engineering Lead, Product
# Duration: 1 hour
# Outcome: Root cause, action items, timeline

# 2. Root Cause Analysis
# - What was the root cause?
# - Why wasn't it detected earlier?
# - What controls failed?

# 3. Corrective Actions
# - Implement missing security control
# - Update monitoring/alerting
# - Change process to prevent recurrence
# - Timeline: Critical (< 24 hours), Important (< 1 week), Nice-to-have (< 1 month)

# 4. Documentation
# - Incident report: /incidents/incident-{date}-{id}.md
# - Post-mortem: /incidents/postmortem-{date}-{id}.md
# - Action items: Link in GitHub issue #incident-{id}

# 5. Notification to Authorities (if required by LGPD)
# - Data protection authority must be notified within 72 hours
# - Users notified without undue delay
```

---

## Security Compliance Checklist

### Pre-Launch Security Checklist

- [ ] **Access Control**
  - [ ] All endpoints require JWT authentication (except public endpoints)
  - [ ] Rate limiting enabled (100 req/min default)
  - [ ] CORS properly configured (no wildcard origin)
  - [ ] Manager endpoints check user type
  - [ ] Admin endpoints restricted to ADMIN users

- [ ] **Data Protection**
  - [ ] Database encrypted at rest (AWS RDS KMS)
  - [ ] S3 encrypted at rest (AES-256)
  - [ ] TLS 1.2+ enforced for all connections
  - [ ] Sensitive columns encrypted (CPF, RG, bank account)
  - [ ] EXIF data stripped from uploaded images

- [ ] **Secrets Management**
  - [ ] No secrets in code (automated check)
  - [ ] No secrets in logs (redacted)
  - [ ] All secrets in AWS Secrets Manager
  - [ ] Secrets rotation enabled (90-day cycle)
  - [ ] IAM role limits secret access

- [ ] **Logging & Monitoring**
  - [ ] API requests logged (JSON format)
  - [ ] Authentication events logged
  - [ ] Failed login attempts tracked (alert > 5 in 5 min)
  - [ ] Database query audit logging
  - [ ] Sentry integration active
  - [ ] CloudWatch dashboards created

- [ ] **LGPD Compliance**
  - [ ] Privacy policy published
  - [ ] Consent obtained for data processing
  - [ ] Right to access endpoint works
  - [ ] Right to delete endpoint works
  - [ ] Data retention policy documented
  - [ ] Automated deletion cron configured

- [ ] **Vulnerability Management**
  - [ ] Dependencies scanned (npm audit)
  - [ ] No critical vulnerabilities
  - [ ] Outdated packages updated
  - [ ] Dependency updates automated (Dependabot)

- [ ] **Incident Response**
  - [ ] Incident response plan documented
  - [ ] On-call contact list created
  - [ ] Slack #incidents channel created
  - [ ] War room procedure documented
  - [ ] Backup restoration tested

- [ ] **Infrastructure**
  - [ ] VPC configuration correct (private subnets for DB/Redis)
  - [ ] Security groups restricted (no 0.0.0.0/0 on DB ports)
  - [ ] SSH key-based auth enabled (no password)
  - [ ] WAF enabled (rate limiting)
  - [ ] DDoS protection active (Shield)

- [ ] **Testing**
  - [ ] Penetration test performed (optional)
  - [ ] Security review completed
  - [ ] Load test completed (validates rate limiting)
  - [ ] Backup/restore tested

### Ongoing Security Maintenance

**Daily:**
- [ ] Check Sentry for new security errors
- [ ] Monitor CloudWatch for anomalies
- [ ] Review failed login attempts

**Weekly:**
- [ ] Review security group changes
- [ ] Check for outdated dependencies (Dependabot)
- [ ] Review AWS CloudTrail logs

**Monthly:**
- [ ] Dependency update cycle (npm update)
- [ ] Security patch assessment
- [ ] Backup restoration test
- [ ] Access review (IAM users)

**Quarterly:**
- [ ] Security audit
- [ ] Penetration test
- [ ] Secrets rotation (JWT, DB password, AWS keys)
- [ ] Privacy policy review

**Annually:**
- [ ] Full security assessment
- [ ] LGPD compliance audit
- [ ] Disaster recovery drill
- [ ] Incident response training

---

## Security Contacts

| Role | Name | Email | On-Call |
|------|------|-------|---------|
| Security Lead | TBD | security@imbobi.com.br | Yes |
| DevOps Lead | TBD | devops@imbobi.com.br | Yes |
| Backend Lead | TBD | backend@imbobi.com.br | Yes |
| Incident Commander | TBD | incidents@imbobi.com.br | Escalation |

---

**Last Updated:** 2026-06-02  
**Next Review:** 2026-09-02  
**Classification:** Internal - Security

For security vulnerabilities, email: security@imbobi.com.br (do not create public issues)
