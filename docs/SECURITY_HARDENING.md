# Security Hardening — Phase 3E

**Status**: Production-Ready Patterns Provided  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`  
**Date**: June 2026

---

## Overview

Phase 3E implements comprehensive security for handling PII, financial data, and user authentication:

1. **Zero-Trust Authentication** — Never trust, always verify
2. **Database Encryption at Rest** — AES-256-GCM for sensitive data
3. **Immutable Audit Logs** — Tamper-proof event tracking
4. **Secret Rotation** — Automated credential lifecycle

All patterns assume breach: encrypt everything, audit all actions, minimize blast radius.

---

## 1. Zero-Trust Authentication

### ZeroTrustService

Located at: `services/api/src/common/security/zero-trust.service.ts`

Implements zero-trust principles:
- **Never trust**: Verify every request with cryptographic proof
- **Assume breach**: Minimize token lifetime, require re-verification
- **Least privilege**: Minimal permissions by default, explicit grants

### Token Architecture

```typescript
// Short-lived JWT token (15 minutes)
const token = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "joao@example.com",
  tier: "PREMIUM",
  roles: ["user", "developer"],
  permissions: ["read:propiedades", "create:solicitar-credito"],
  tenantId: "tenant-123",
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  tokenIssuedAt: 1719052800000,
  lastVerifiedAt: 1719052800000,
  expiresIn: 900  // 15 minutes
};

// Refresh token (7 days, used to get new JWT)
const refreshToken = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  type: "refresh",
  expiresIn: 604800  // 7 days
};
```

### Usage Pattern

```typescript
@Injectable()
export class AuthService {
  constructor(private zeroTrust: ZeroTrustService) {}

  async login(email: string, password: string) {
    // ... validate credentials ...

    const context: ZeroTrustContext = {
      userId: user.id,
      email: user.email,
      tier: user.tier,
      roles: user.roles,
      permissions: user.permissions,
      tenantId: user.tenantId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      tokenIssuedAt: Date.now(),
      lastVerifiedAt: Date.now(),
    };

    const token = this.zeroTrust.issueToken(context);
    const refreshToken = this.zeroTrust.issueRefreshToken(user.id);

    return {
      token,
      refreshToken,
      expiresIn: 900,
    };
  }

  async verifyToken(token: string) {
    const context = this.zeroTrust.verifyToken(token);
    if (!context) {
      throw new UnauthorizedException('Token invalid or expired');
    }
    return context;
  }
}
```

### Tier-Based Policies

Different security levels per subscription tier:

```typescript
// ENTERPRISE: Strictest
{
  requireMfa: true,              // Multi-factor authentication mandatory
  maxTokenAge: 300000,           // 5 minutes (frequent re-auth)
  allowedIpRanges: [...],        // Whitelist of IPs
  allowedDevices: [...],         // Whitelist of devices
  requireEncryption: true,       // All data encrypted
  auditAllActions: true,         // Every action logged
}

// PREMIUM: Balanced
{
  requireMfa: false,
  maxTokenAge: 900000,           // 15 minutes
  allowedIpRanges: [],           // No IP restriction
  allowedDevices: [],
  requireEncryption: true,
  auditAllActions: true,
}

// FREE: Relaxed
{
  requireMfa: false,
  maxTokenAge: 900000,           // 15 minutes
  allowedIpRanges: [],
  allowedDevices: [],
  requireEncryption: false,      // Only for sensitive data
  auditAllActions: false,        // Sample actions logged
}
```

### Additional Verification for Sensitive Operations

```typescript
// Some operations require additional verification (MFA, code via email, etc)
const isSensitive = this.zeroTrust.requiresAdditionalVerification(
  'delete_account',
  context
);

if (isSensitive) {
  // Send verification code via email
  // Require code + MFA before proceeding
  // Log attempt regardless of success
}
```

### Request Signing (Prevent Tampering)

```typescript
// Client signs request with secret
const body = { amount: 500000, obraId: '123' };
const signature = zeroTrust.generateRequestSignature(body, clientSecret);

// Send: body + signature header
fetch('/api/credito/solicitar', {
  method: 'POST',
  body: JSON.stringify(body),
  headers: {
    'X-Signature': signature
  }
});

// Server verifies signature
const isValid = zeroTrust.verifyRequestSignature(body, signature, clientSecret);
if (!isValid) {
  throw new BadRequestException('Request tampered with');
}
```

---

## 2. Database Encryption at Rest

### EncryptionService

Located at: `services/api/src/common/security/encryption.service.ts`

Encrypts sensitive data before storing in database.

### Algorithm

- **Cipher**: AES-256-GCM (authenticated encryption)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes, random per encryption)
- **Auth Tag**: 128 bits (prevents tampering)

### Supported Fields

```typescript
// Encrypt (PII, financial data):
- CPF (Cadastro de Pessoas Físicas)
- Passport / document numbers
- Bank account numbers
- Credit card numbers (never store full, encrypt if needed)
- Phone numbers (searchable)
- Email (searchable)
- Driver's license numbers
- Biometric data

// Don't encrypt (better to use bcrypt):
- Passwords (use bcrypt instead)
- API keys (use secret manager instead)
- Audit logs (use immutable audit service instead)
```

### Usage Pattern

```typescript
import { EncryptionService } from './common/security/encryption.service';

@Injectable()
export class UsuariosService {
  constructor(private encryption: EncryptionService) {}

  async createUsuario(data: any) {
    // Encrypt sensitive fields
    const usuario = {
      email: data.email,
      cpf: this.encryption.encrypt(data.cpf),
      nomeCompleto: this.encryption.encrypt(data.nomeCompleto),
      telefone: this.encryption.encrypt(data.telefone),
    };

    // Save to database (encrypted)
    return this.db.usuario.create({ data: usuario });
  }

  async getUsuario(usuarioId: string) {
    const usuario = await this.db.usuario.findUnique({
      where: { id: usuarioId }
    });

    // Decrypt sensitive fields on read
    return {
      ...usuario,
      cpf: this.encryption.decrypt(usuario.cpf),
      nomeCompleto: this.encryption.decrypt(usuario.nomeCompleto),
      telefone: this.encryption.decrypt(usuario.telefone),
    };
  }
}
```

### Database Middleware (Automatic)

Encrypt/decrypt transparently in Prisma middleware:

```typescript
// In app.module.ts during app initialization
const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
  // Encrypt on create/update
  if (['create', 'update', 'upsert'].includes(params.action)) {
    if (params.args.data?.cpf) {
      params.args.data.cpf = encryptionService.encrypt(params.args.data.cpf);
    }
    if (params.args.data?.nomeCompleto) {
      params.args.data.nomeCompleto = encryptionService.encrypt(
        params.args.data.nomeCompleto
      );
    }
  }

  const result = await next(params);

  // Decrypt on read
  if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
    if (result?.cpf) {
      result.cpf = encryptionService.decrypt(result.cpf);
    }
    if (result?.nomeCompleto) {
      result.nomeCompleto = encryptionService.decrypt(result.nomeCompleto);
    }
  }

  return result;
});
```

### Key Management

```bash
# Generate encryption key (run once, save securely)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a1b2c3d4e5f6...

# Store in secret manager (AWS Secrets Manager, HashiCorp Vault)
# Or environment variable in production:
export ENCRYPTION_KEY=a1b2c3d4e5f6...

# Verify encryption works
node -e "
  const { EncryptionService } = require('./dist/common/security/encryption.service');
  const svc = new EncryptionService();
  const encrypted = svc.encrypt('test-cpf-123');
  const decrypted = svc.decrypt(encrypted);
  console.assert(decrypted === 'test-cpf-123', 'Encryption failed!');
  console.log('✅ Encryption working');
"
```

### Performance Considerations

Encryption/decryption adds latency (~1-5ms per field). Strategies:

```typescript
// 1. Batch encrypt/decrypt
const usuarios = await db.usuario.findMany({ take: 1000 });
const decrypted = usuarios.map(u => ({
  ...u,
  cpf: encryption.decrypt(u.cpf),
  nomeCompleto: encryption.decrypt(u.nomeCompleto),
}));

// 2. Cache decrypted values (carefully)
const cache = new Map();
const decryptAndCache = (usuarioId: string, cpf: string) => {
  const cached = cache.get(usuarioId);
  if (cached) return cached.cpf;
  
  const decrypted = encryption.decrypt(cpf);
  cache.set(usuarioId, { cpf: decrypted });
  return decrypted;
};

// 3. Only decrypt when needed
const usuario = await db.usuario.findUnique({ where: { id } });
// Don't decrypt cpf unless it's actually displayed/used
if (needsCpf) {
  usuario.cpf = encryption.decrypt(usuario.cpf);
}
```

---

## 3. Immutable Audit Logs

### ImmutableAuditService

Located at: `services/api/src/common/security/immutable-audit.service.ts`

Maintains tamper-proof log of all sensitive operations.

### Features

- **Append-only**: Never delete, only add
- **Cryptographically chained**: Each entry references previous hash
- **Tamper detection**: Can verify integrity of entire chain
- **Searchable**: By resource, actor, action, timestamp

### What to Log

```typescript
// Log these operations:
- User registration
- User login/logout
- Password change
- Permission change
- Credit approval
- Credit disbursement
- Document upload
- Sensitive data access
- Account deletion
- Configuration change

// Include in audit:
- What: operation/action
- Who: actor (usuarioId)
- When: timestamp
- Where: resource + resourceId
- How: before/after state
- Result: success/failure
- Context: IP, user agent, device
```

### Usage Pattern

```typescript
@Injectable()
export class CreditoService {
  constructor(private audit: ImmutableAuditService) {}

  async aprovarCredito(usuarioId: string, creditoId: string, data: any) {
    const credito = await this.db.credito.findUnique({
      where: { id: creditoId }
    });

    // Approve
    const updated = await this.db.credito.update({
      where: { id: creditoId },
      data: { status: 'APROVADO', ...data }
    });

    // Audit log (immutable)
    await this.audit.log(
      'credito_aprovado',           // action
      usuarioId,                    // actor
      'credito',                    // resource
      creditoId,                    // resourceId
      {
        before: {
          status: credito.status,
          valorAprovado: credito.valorAprovado,
        },
        after: {
          status: updated.status,
          valorAprovado: updated.valorAprovado,
        }
      },
      'SUCCESS',                    // status
      req.ip,                       // ipAddress
      req.headers['user-agent'],    // userAgent
      {
        motivo: data.motivo,
        analista: req.user.name,
      }
    );

    return updated;
  }
}
```

### Verify Audit Chain Integrity

```typescript
// Verify audit logs haven't been tampered with
const entries = await audit.getLogsForResource('credito', creditoId);
const isIntact = await audit.verifyChainIntegrity(entries);

if (!isIntact) {
  // Alert: audit logs have been tampered with
  Sentry.captureMessage('Audit log tampering detected', 'critical');
}
```

### Storage Options

- **PostgreSQL**: audit_logs table (simplest)
- **AWS CloudTrail**: Managed audit service
- **Elasticsearch**: For large-scale audit
- **Dedicated service**: CloudFlare Audit, DataDog, etc

---

## 4. Secret Rotation

### SecretRotationService

Located at: `services/api/src/common/security/secret-rotation.service.ts`

Automates rotation of credentials on schedule.

### What to Rotate

```typescript
// Rotate these secrets:
Rotation Interval
JWT_SECRET             90 days
DATABASE_PASSWORD      30 days
API_KEYS (3rd party)   90 days
ENCRYPTION_KEY         180 days
ENCRYPTION_SALT        180 days

// Keep multiple versions during grace period (7 days typically)
// This allows services to update without downtime
```

### JWT Secret Rotation

```typescript
// Before rotation (all services use old secret)
Old Secret: a1b2c3d4...
JWT Tokens: Signed with old secret

// Rotation happens
// 1. Generate new secret
// 2. Update JWT_SECRET in environment
// 3. Issue NEW tokens with new secret
// 4. Keep old secret for 7 days (validate old tokens)

New Secret: x9y8z7w6...
Both secrets VALID for 7 days:
  - New tokens signed with new secret
  - Old tokens still validated with old secret
  
After grace period (7 days):
  - Old secret removed
  - Only new secret used
  - Old tokens become invalid
```

### Database Password Rotation

```typescript
// PostgreSQL example
async rotateDatabasePassword() {
  // 1. Generate new password
  const newPassword = this.generateSecret(32);
  
  // 2. Add new password (keep old)
  // ALTER ROLE db_user PASSWORD 'new-password';
  
  // 3. Update connection string
  process.env.DATABASE_URL = `postgresql://user:${newPassword}@host/db`;
  
  // 4. Verify connection works
  await db.$queryRaw`SELECT 1`;
  
  // 5. After grace period, remove old password
  // ALTER ROLE db_user PASSWORD 'new-password' REPLACE 'old-password';
}
```

### API Key Rotation (Third-Party)

```typescript
// For AWS, Stripe, SendGrid, etc:
async rotateApiKey(service: string) {
  // 1. Call API to generate new key
  const newKey = await externalService.generateApiKey();
  
  // 2. Update config
  process.env[`${service}_API_KEY`] = newKey;
  
  // 3. Verify API calls work
  await externalService.verify();
  
  // 4. Disable old key (usually has grace period)
  // Most services: keys expire automatically, or manual disable
  
  // 5. Monitor for failures
  // If old key was used recently, alert
}
```

### Schedule Automatic Rotation

```typescript
// In app.module.ts
const secretRotation = new SecretRotationService();

// Rotate JWT secret every 90 days
secretRotation.scheduleRotation('JWT_SECRET', 90);

// Rotate DB password every 30 days
secretRotation.scheduleRotation('DATABASE_PASSWORD', 30);

// Rotate API keys every 90 days
secretRotation.scheduleRotation('SENDGRID_API_KEY', 90);
```

---

## Security Checklist

### Before Production

- [ ] Encryption key generated and stored in secret manager
- [ ] All sensitive fields encrypted (CPF, names, etc)
- [ ] JWT token expiry set to 15 minutes max
- [ ] Refresh token expiry set to 7 days
- [ ] Audit logging enabled for all sensitive operations
- [ ] Audit log storage configured (DB or external service)
- [ ] Secret rotation scheduled for:
  - [ ] JWT secret (90 days)
  - [ ] Database password (30 days)
  - [ ] API keys (90 days)
- [ ] Zero-trust policies configured per tier
- [ ] MFA enabled for ENTERPRISE tier
- [ ] IP whitelisting available (optional per tenant)
- [ ] Request signing enabled for sensitive APIs
- [ ] Sentry configured for security alerts
- [ ] WAF (Web Application Firewall) configured
- [ ] DDoS protection enabled
- [ ] TLS 1.3 enforced (no TLS 1.2)
- [ ] Security headers configured:
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security: max-age=31536000
  - [ ] Content-Security-Policy: strict

### Runtime Monitoring

- [ ] Track token validation failures (may indicate attacks)
- [ ] Monitor audit log chain integrity (daily)
- [ ] Alert on failed decryption (key rotation issues)
- [ ] Monitor secret access patterns (unusual activity)
- [ ] Track IP changes (may indicate compromise)
- [ ] Monitor permission changes (audit unauthorized changes)

---

## Environment Configuration

```bash
# Required for encryption
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8...  # 64 hex chars (32 bytes)
HASH_SALT=salt123                    # Random salt for hashing

# Required for JWT
JWT_SECRET=jwt-secret-value
JWT_REFRESH_SECRET=refresh-secret

# Optional: Zero-trust policies
ZERO_TRUST_REQUIRE_MFA=true          # For ENTERPRISE
ZERO_TRUST_IP_WHITELIST=192.168.1.0/24

# Optional: Audit logging
AUDIT_LOG_DESTINATION=postgresql://...
AUDIT_LOG_RETENTION_DAYS=2555        # 7 years

# Optional: Secret rotation
SECRET_ROTATION_ENABLED=true
JWT_ROTATION_INTERVAL_DAYS=90
DB_PASSWORD_ROTATION_INTERVAL_DAYS=30
```

---

## Compliance

This implementation supports:

- **LGPD** (Lei Geral de Proteção de Dados - Brazilian GDPR)
  - Encryption at rest
  - Audit logs
  - Right to deletion (with audit trail)
  
- **PCI DSS** (Payment Card Industry Data Security Standard)
  - Encryption of card data
  - Access control
  - Regular security testing
  
- **SOC 2 Type II**
  - Immutable audit logs
  - Access controls
  - Encryption
  - Monitoring

---

**Status**: Ready for Production  
**Phase**: 3E — Security Hardening  
**Next**: Phase 3F — Deployment Automation
