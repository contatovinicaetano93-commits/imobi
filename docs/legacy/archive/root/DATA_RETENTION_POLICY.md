# Data Retention Policy
**imbobi - Compliance & Operations**

**Effective Date**: May 30, 2026  
**Review Cycle**: Annual (May 2027)  
**Regulatory Framework**: LGPD, AML/KYC, Financial Services

---

## Executive Summary

This policy defines how long imbobi retains different categories of personal and operational data. Retention periods balance legal requirements, operational needs, and user rights.

**Key Principle**: Retain only what is necessary, delete safely and securely.

---

## 1. Active User Data

### 1.1 Usuario (Active Account)

**Retention**: Until account closure + 90 days

```
Data Retained:
- usuarioId, nome, email, cpf, telefone
- passwordHash (bcrypt)
- tipo (TOMADOR, GESTOR_OBRA, ADMIN)
- kycStatus
- criadoEm, atualizadoEm

Action After Closure:
- Soft delete: 30 days (account recovery window)
- Hard delete: After 30 days
- Exception: CPF indexed record for fraud detection (365 days)

Rationale: Active account management, fraud prevention
```

### 1.2 Credito (Credit Applications)

**Retention**: Active credit term + 5 years

```
Example Timeline:
- Credit approved: 2025-01-15
- Loan term: 24 months
- Maturity: 2027-01-15
- Final retention: 2032-01-15 (5 years after maturity)

Rationale:
- Active loan management
- Financial regulation (Central Bank requirement)
- Dispute resolution
- Fraud investigation

Storage Locations:
- Primary: PostgreSQL (immediate)
- Archive: Cold storage after 2 years (optional)
```

### 1.3 Obra (Construction Projects)

**Retention**: Active project + 7 years

```
Lifecycle:
- Created: 2025-02-15
- Completed: 2026-02-15
- Retained: Until 2033-02-15

Rationale:
- Project warranty periods (2-5 years)
- Dispute and liability (2-5 years)
- Tax audit requirements (5 years)
- Building code compliance records

Components:
- Project metadata: Full retention
- Photos (EvidenciaEtapa): Kept in S3 with 7-year lifecycle
- GPS data: Aggregated and anonymized after 2 years
```

---

## 2. KYC & Identity Documents

### 2.1 KycDocumento (Identity Documents)

**Retention**: 5 years from document upload

```
Documents Retained:
- RG, CNH, Passport copies
- Selfies (biometric verification)
- Proof of address
- Bank statements (if collected)

Retention Calculation:
- KYC uploaded: 2025-03-20
- Retention period: 5 years
- Delete after: 2030-03-20

Rationale:
- AML (Anti-Money Laundering) compliance (5 years statutory)
- COAF (Conselho de Atividades Financeiras) requirement
- Dispute resolution
- Regulatory audit

Access Controls:
- Only KYC managers can view
- All access logged and audited
- Automatic redaction of sensitive fields in logs
```

### 2.2 KycAuditLog (KYC Approval History)

**Retention**: 7 years

```
Contains:
- Who approved/rejected KYC
- When (timestamp)
- Reason/comments
- Decision details

Retention: 2025-03-25 → 2032-03-25 (7 years)

Rationale:
- Regulatory audit trail (ANPD, COAF)
- Accountability for compliance officers
- Dispute documentation
- Fraud investigation
```

---

## 3. Transaction & Audit Logs

### 3.1 EtapaAuditLog (Project Phase Approvals)

**Retention**: 7 years

```
Records:
- Phase approval/rejection
- Who approved and when
- Manager comments/observations
- Evidence photos referenced

Retention: 7 years from approval

Rationale:
- Regulatory requirement
- Builder-lender dispute resolution
- Work warranty claims
- Tax audit trail
```

### 3.2 SessaoToken (Login Sessions)

**Retention**: 90 days from creation

```
Retention Timeline:
- Token created: 2026-05-30
- Active session: 15 min (access) + 7 days (refresh)
- Revoked session: Kept 90 days for anomaly detection
- Hard delete: 2026-08-28

Why 90 days:
- Detect suspicious re-authentication patterns
- Account takeover investigation window
- After 90 days: No security value retained
```

### 3.3 Sistema Audit Trails (All API Access)

**Retention**: 7 years for sensitive operations, 1 year for routine

```
Sensitive Operations (7 years):
- KYC approvals/rejections
- Credit approvals
- Fund disbursements
- Data exports/deletions
- Account closures

Routine Operations (1 year):
- GET requests (reads)
- Dashboard views
- List paginations
- Profile updates (non-sensitive)

Implementation:
- Stored in PostgreSQL for 7 years
- Moved to cold storage (S3 Glacier) after 1 year
- Automatic deletion after retention expiry
```

---

## 4. Notifications & Communications

### 4.1 Notificacao (User Notifications)

**Retention**: 90 days

```
Records:
- Credit approved/rejected notifications
- Phase validated/rejected notifications
- Fund release confirmations
- Score updates
- KYC status changes

Timeline:
- Created: 2026-05-30
- Marked read: User dependent
- Retained: 90 days
- Auto-delete: 2026-08-28

Rationale:
- User reference period
- No long-term value
- Privacy benefit (cleanup)
```

### 4.2 Email Logs (SendGrid)

**Retention**: 1 year

```
Records Kept:
- Email address
- Template used
- Timestamp sent
- Delivery status
- User action (open, click)

Retention: 1 year from send

Rationale:
- Communication compliance
- Bounce handling (prevents resends)
- Marketing opt-out verification
- No long-term business value
```

---

## 5. Evidence & Media Files

### 5.1 EvidenciaEtapa (Construction Photos)

**Retention**: Project lifecycle + 2 years

```
Storage: AWS S3 (sa-east-1)
Lifecycle Policy:

Year 1 (Standard Storage):
- JPEG photos of phases
- GPS metadata
- Timestamp and location
- 1 copy in standard storage

Year 2-3 (Infrequent Access):
- Auto-transition to IA storage (40% cost savings)
- Still accessible for disputes
- Slower retrieval (acceptable)

After Year 3:
- Deleted automatically

Full Path:
- Project created: 2025-02-15
- Project completed: 2026-02-15
- Year 1: Standard storage
- Year 2-3: Infrequent access
- Deleted: 2028-02-15

Rationale:
- Project warranty period (2 years typical)
- Dispute resolution window (1 year common)
- Long-term cost efficiency
- No regulatory requirement beyond project
```

### 5.2 Presigned URLs (S3 Download Links)

**Retention**: 24 hours

```
Behavior:
- URL generated for photo access
- Expires after 24 hours
- Cannot be reused after expiration
- User must request new URL

Security Value:
- Prevents unauthorized sharing
- Time-limited access control
- Audit trail of access requests
```

---

## 6. Backup & Disaster Recovery

### 6.1 Database Backups

**Retention**: 30 days rolling window

```
AWS RDS Backup:
- Daily automated snapshots
- Retained for 30 days
- After 30 days: Deleted automatically
- Older data cannot be recovered (intentional)

Rationale:
- Disaster recovery (sufficient window)
- Cost optimization
- Compliance with "retention minimization"
- Users cannot request old backup recovery
```

### 6.2 Point-in-Time Recovery

**Retention**: 7 days

```
Automatic Backup Logs:
- Transaction logs for PITR
- Retained for 7 days
- Allows recovery to any point in last 7 days

Use Cases:
- Accidental data deletion
- Corruption detection
- Audit investigation

After 7 days:
- Logs deleted
- Only full daily snapshots available
```

---

## 7. Deletion & Anonymization Procedures

### 7.1 User-Initiated Deletion

**Request Flow**:
```
1. User requests deletion (DELETE /usuarios/meu-perfil)
   → Account marked with deletadoEm timestamp
   → All services disabled immediately
   → Cannot login for 30 days

2. Grace period (30 days)
   → User can undelete account
   → Data retained in database (inactive)
   → No processing occurs

3. Hard deletion (Day 31)
   → Automatic job: "excluir-usuario" from BullMQ
   → Data removed from:
     - Usuario table
     - Credito records (except linked to other users)
     - Obra records
     - Session tokens
     - Notifications
     - All non-audit data

4. Exceptions (NOT deleted):
   → KycDocumento (5-year AML requirement)
   → KycAuditLog (7-year audit requirement)
   → EtapaAuditLog (linked to other projects)
   → Financial records (5-year legal requirement)
```

### 7.2 Automated Anonymization

**After retention period expires**:
```typescript
// Scheduled daily job
const anonymizeExpiredData = async () => {
  // Anonymize old audit logs
  const oldLogs = await prisma.etapaAuditLog.findMany({
    where: {
      criadoEm: { lte: 7yearsAgo }
    }
  });

  for (const log of oldLogs) {
    await prisma.etapaAuditLog.update({
      where: { auditId: log.auditId },
      data: {
        usuarioId: "ANONYMIZED_USER",
        observacoes: "[Redacted for LGPD retention expiry]"
      }
    });
  }

  // Delete temporary data
  await deleteExpiredNotifications();
  await deleteExpiredSessionTokens();
  await deleteExpiredEmailLogs();
};
```

---

## 8. Data Subject Rights Requests

### 8.1 Access Request (LGPD Article 17)

**Processing Time**: 30 days (LGPD requirement)

**Retention of Export**:
- User can download JSON export
- No retention by imbobi
- User responsible for their copy

### 8.2 Deletion Request (LGPD Article 17)

**Processing Time**: Immediate (soft delete) → 30 days (hard delete)

**Timeline**:
1. Request submitted
2. Soft delete: 0-1 seconds
3. Grace period: 30 days
4. Hard delete: Automatic on day 31

### 8.3 Data Portability Request (LGPD Article 18)

**Delivery**: 30 days (LGPD requirement)

**Format**: JSON file with all associated data

**Retention by imbobi**: Not retained after delivery

---

## 9. Special Situations

### 9.1 Fraud Investigation Hold

**When**: Suspected fraudulent account

**Duration**: Investigation period (typically 30-90 days)

**Override**: Data deletion requests suspended while investigating

**After Clearance**: 
- If innocent: Normal deletion schedule resumes
- If confirmed fraud: Data retained per legal requirement

### 9.2 Active Legal Dispute

**When**: Lawsuit or arbitration involving account

**Duration**: Until dispute resolved + 5 years

**Example**:
- Dispute filed: 2026-05-30
- Case decided: 2027-06-15
- Data retention: Until 2032-06-15

### 9.3 Regulatory Investigation

**When**: ANPD, COAF, or other authority requests

**Duration**: Until investigation concludes + 7 years

**Hold Notification**: User notified if hold extends beyond normal retention

---

## 10. Data Minimization & Purpose Limitation

### 10.1 Collection Minimization

Only collect data necessary for stated purposes:

```
Purpose: Credit Assessment
Necessary: CPF, income, location, project details
NOT needed: Mother's name, middle names, religious beliefs

Purpose: Fraud Detection
Necessary: Transaction patterns, location anomalies
NOT needed: Full browsing history, communication logs

Purpose: Push Notifications
Necessary: FCM token, notification preferences
NOT needed: Full device IMEI, OS version, screen resolution
```

### 10.2 Processing Limitations

```
✅ Allowed: Process credit data for loan decisions
❌ NOT allowed: Sell credit data to third parties
❌ NOT allowed: Use location data for user tracking
❌ NOT allowed: Repurpose KYC photos for AI training
```

---

## 11. Compliance Checklist

- [ ] Retention periods documented (this policy)
- [ ] Deletion procedures automated (BullMQ jobs)
- [ ] Anonymization rules implemented (data masking)
- [ ] Access logging enabled (audit trails)
- [ ] Staff training completed (data handling)
- [ ] Third-party processor agreements signed (DPA)
- [ ] Backup procedures documented
- [ ] Disaster recovery tested (quarterly)
- [ ] Data classification complete
- [ ] Storage locations mapped
- [ ] Deletion procedures tested
- [ ] Compliance monitoring (monthly audits)

---

## 12. Retention Schedule Summary

| Data Category | Active | After Closure | Rationale |
|---------------|--------|---------------|-----------|
| Usuario | ✓ | 90 days | Recovery window + fraud detection |
| KycDocumento | ✓ | 5 years | AML/COAF compliance |
| Credito | ✓ | 5 years post-maturity | Financial regulation |
| Obra | ✓ | 7 years | Warranty + tax audit |
| EtapaAuditLog | ✓ | 7 years | Regulatory + disputes |
| KycAuditLog | ✓ | 7 years | Compliance audit trail |
| SessaoToken | ✓ | 90 days | Security monitoring |
| Notificacao | ✓ | 90 days | User reference only |
| EvidenciaEtapa | ✓ | 2 years | Warranty + disputes |
| EmailLogs | ✓ | 1 year | Bounce handling |

---

## 13. Updates & Review

**Last Updated**: 2026-05-30  
**Next Review**: 2027-05-30 (Annual)  
**Changes Trigger**: Material legal changes, new regulations

**Approval**: [Legal team signature required]

---

## 14. Contact

**Data Protection Officer**:
- Email: dpo@imbobi.com.br

**Compliance Team**:
- Email: compliance@imbobi.com.br

---

**Policy Status**: ✅ APPROVED FOR PRODUCTION

Ensures LGPD compliance while optimizing storage costs and user privacy.
