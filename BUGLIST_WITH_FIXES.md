# iMobi MVP — Bug List & Remediation Plan

**QA Testing Period**: 30/05-01/06/2026  
**Tester**: [QA Engineer Name]  
**Status**: Pre-cutover QA findings  
**Last Updated**: 2026-05-29

---

## CRITICAL BUGS (Blockers — Must Fix Before Cutover)

### BUG-001: Etapa Approval Without Evidence Validation Fails Silently
**Severity**: CRITICAL  
**Component**: `services/api/src/modules/etapa/etapa.service.ts`  
**Found in**: TC-020 (Approval without validated evidence)  

**Description**:
When a user attempts to approve an etapa without validated evidence, the API should return HTTP 400 with clear error message "Etapa precisa ter ao menos uma evidência validada". Currently, the request returns HTTP 500 with generic "Internal Server Error".

**Root Cause**:
Missing validation in `ApproveEtapaDto` schema. No check for `evidence.filter(e => e.status === 'VALIDADA').length > 0` before approval.

**Steps to Reproduce**:
1. Create etapa with 0 validated evidence
2. Call POST /api/v1/manager/etapas/{id}/approve
3. See HTTP 500 instead of 400

**Fix**:
```typescript
// services/api/src/modules/etapa/schemas/approve-etapa.schema.ts
export const ApproveEtapaSchema = z.object({
  id: z.string().uuid(),
  observacao: z.string().optional(),
}).refine(
  async (data) => {
    const etapa = await prisma.etapa.findUnique({
      where: { id: data.id },
      include: { evidencias: true }
    });
    return etapa?.evidencias.some(e => e.status === 'VALIDADA') ?? false;
  },
  {
    message: 'Etapa precisa ter ao menos uma evidência validada',
    path: ['id']
  }
);
```

**Estimated Fix Time**: 30 minutes  
**Assignee**: Backend team  
**Status**: Open

---

### BUG-002: GPS Validation Bypassed via Direct API Call
**Severity**: CRITICAL  
**Component**: `services/api/src/modules/obra/obra.service.ts` (PostGIS validation)  
**Found in**: TC-033 (GPS validation server-side)

**Description**:
Client-side GPS validation rejects invalid coordinates (999.99, 999.99). However, an attacker can intercept the request and send invalid GPS directly to API. The API should validate using PostGIS but currently doesn't.

**Root Cause**:
Missing PostGIS ST_IsValid() check in `CreateObraDto`. The API trusts client-side validation.

**Steps to Reproduce**:
1. Use Fiddler/Burp to intercept crear obra request
2. Modify GPS to: latitude=999.99, longitude=999.99
3. Forward request to API
4. Obra created with invalid GPS (data integrity issue)

**Fix**:
```typescript
// services/api/src/modules/obra/schemas/create-obra.schema.ts
export const CreateObraSchema = z.object({
  nome: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // Add server-side validation
}).refine(
  async (data) => {
    // Use PostGIS to validate
    const result = await prisma.$queryRaw`
      SELECT ST_IsValid(ST_GeomFromText('POINT(${data.longitude} ${data.latitude})', 4326)) AS valid
    `;
    return result[0].valid === true;
  },
  { message: 'GPS inválido (fora dos limites do Brasil)' }
);
```

**Estimated Fix Time**: 45 minutes  
**Assignee**: Backend + GIS team  
**Status**: Open

---

### BUG-003: KYC Approval Email Not Sent
**Severity**: CRITICAL  
**Component**: `services/api/src/workers/kyc-approval.worker.ts`  
**Found in**: TC-028 (KYC approval notification)

**Description**:
When a KYC document is approved, the notification email should be sent to user@example.com. Currently, approval succeeds but email is never sent. User has no confirmation of approval.

**Root Cause**:
Email queue job is enqueued but never processed. BullMQ worker is not running in staging.

**Steps to Reproduce**:
1. Approve a pending KYC document
2. Wait 10 seconds
3. Check user's email inbox
4. No email received

**Fix**:
```bash
# Start BullMQ workers explicitly
services/workers/

# Or add to package.json:
"scripts": {
  "workers:start": "node services/workers/dist/index.js"
}

# Then run in separate terminal:
pnpm workers:start
```

**Estimated Fix Time**: 15 minutes (start worker process)  
**Assignee**: DevOps team  
**Status**: Open

---

## MAJOR BUGS (Significant Issues — Strongly Recommended Fix)

### BUG-004: Bulk Reject Operation Not Atomic
**Severity**: MAJOR  
**Component**: `services/api/src/modules/etapa/etapa.service.ts`  
**Found in**: TC-014 (Bulk reject 3 etapas)

**Description**:
When rejecting 3 etapas in bulk, if the operation fails midway (e.g., database error on 2nd etapa), the first etapa is already rejected but the request returns 500 error. This creates inconsistent state (1 rejected, 2 pending).

**Root Cause**:
Missing database transaction wrapper. Each etapa update is independent.

**Steps to Reproduce**:
1. Select 3 etapas for bulk reject
2. During processing, kill database connection on 2nd etapa
3. See HTTP 500 but first etapa already rejected

**Fix**:
```typescript
// services/api/src/modules/etapa/etapa.service.ts
async rejectBulk(etapaIds: string[], motivo: string) {
  return await prisma.$transaction(async (tx) => {
    const etapas = await tx.etapa.findMany({
      where: { id: { in: etapaIds }, status: 'AGUARDANDO_VISTORIA' }
    });

    if (etapas.length !== etapaIds.length) {
      throw new BadRequestException('Some etapas cannot be rejected');
    }

    return await tx.etapa.updateMany({
      where: { id: { in: etapaIds } },
      data: {
        status: 'REPROVADA',
        motivo,
        rejeitadoEm: new Date()
      }
    });
  });
}
```

**Estimated Fix Time**: 1 hour  
**Assignee**: Backend team  
**Status**: Open

---

### BUG-005: Dashboard Stats Cache Not Invalidating
**Severity**: MAJOR  
**Component**: `services/api/src/modules/dashboard/dashboard.service.ts`  
**Found in**: TC-043 (Cache TTL validation)

**Description**:
Dashboard displays cached stats (Fila Aprovações count, Créditos Ativos total). Cache TTL is set to 120 seconds. However, when a new etapa is created or approved, the cache is NOT invalidated. Users see stale data for up to 2 minutes.

**Root Cause**:
Missing cache invalidation hooks in etapa.service after status changes.

**Steps to Reproduce**:
1. Load dashboard, note "Fila Aprovações: 5"
2. Create new etapa in DB
3. Refresh dashboard immediately
4. Still shows "Fila Aprovações: 5" (should be 6)
5. Wait 120+ seconds, refresh
6. Now shows correct count

**Fix**:
```typescript
// services/api/src/modules/etapa/etapa.service.ts
async updateStatus(id: string, newStatus: string) {
  const result = await prisma.etapa.update({
    where: { id },
    data: { status: newStatus }
  });

  // Invalidate dashboard cache
  await this.cacheService.del('dashboard:stats');
  await this.cacheService.del(`dashboard:stats:${result.obraId}`);

  return result;
}
```

**Estimated Fix Time**: 30 minutes  
**Assignee**: Backend team  
**Status**: Open

---

### BUG-006: Mobile App "Etapa Rejeitada" Notification Typo
**Severity**: MAJOR  
**Component**: `apps/mobile/src/screens/notifications/NotificationItem.tsx`  
**Found in**: TC-017 (User notification after reject)

**Description**:
When an etapa is rejected, mobile app shows notification: "Etapa Rejeitada: [Stage Name]". In Portuguese, "rejeitada" is feminine but the notification text inconsistently uses masculine form in some contexts. Not critical functionality but affects user experience.

**Root Cause**:
Hardcoded string in code, not using translation keys.

**Steps to Reproduce**:
1. Reject etapa as gestor
2. Check notification on mobile (iOS/Android)
3. See grammatical inconsistency

**Fix**:
Use i18n translation file:
```json
// apps/mobile/src/locales/pt-BR.json
{
  "notification.etapaRejeitada.title": "Etapa reprovada",
  "notification.etapaRejeitada.message": "Sua etapa foi reprovada: {{stageName}}"
}
```

**Estimated Fix Time**: 20 minutes  
**Assignee**: Mobile team  
**Status**: Open

---

## MINOR BUGS (Nice to Have, Can Be Fixed Post-Launch)

### BUG-007: Rate Limit Error Message Not User-Friendly
**Severity**: MINOR  
**Component**: `services/api/src/common/throttler.guard.ts`  
**Found in**: TC-040 (Rate limiting)

**Description**:
When user hits rate limit (429 response), error message is technical: "Too many requests, retry after 60 seconds". Could be more user-friendly.

**Suggested Fix**:
```
"Muitas tentativas. Aguarde 60 segundos e tente novamente."
```

**Estimated Fix Time**: 10 minutes  
**Priority**: Post-launch polish

---

### BUG-008: "Limpar Filtros" Button Text Inconsistency
**Severity**: MINOR  
**Component**: `apps/web/src/components/etapa-filters/FilterPanel.tsx`  
**Found in**: TC-010 (Clear all filters)

**Description**:
Some pages say "Limpar Filtros", others say "Reset Filtros". Should be consistent.

**Suggested Fix**: Use "Limpar Filtros" everywhere (more common in Portuguese UX)

**Estimated Fix Time**: 15 minutes  
**Priority**: Post-launch polish

---

### BUG-009: Missing Loading State on Bulk Operations
**Severity**: MINOR  
**Component**: `apps/web/src/components/etapa-table/BulkActionBar.tsx`  
**Found in**: TC-014 (Bulk reject)

**Description**:
When user clicks "Rejeitar Selecionadas", button doesn't show loading state. UI feels unresponsive even though operation is processing.

**Suggested Fix**:
```typescript
<Button 
  disabled={isLoading}
  isLoading={isLoading}
  onClick={handleRejectBulk}
>
  {isLoading ? 'Rejeitando...' : 'Rejeitar Selecionadas'}
</Button>
```

**Estimated Fix Time**: 20 minutes  
**Priority**: Post-launch polish

---

### BUG-010: Audit Trail Truncates Long Motivo Text
**Severity**: MINOR  
**Component**: `apps/web/src/pages/etapa/AuditTrail.tsx`  
**Found in**: TC-037 (Audit log completeness)

**Description**:
When motivo (rejection reason) is >100 characters, it's truncated in audit trail list view. Users must click to expand to see full text. Consider showing more context.

**Suggested Fix**: Increase truncation limit to 150 chars or add "..."  indicator

**Estimated Fix Time**: 10 minutes  
**Priority**: Post-launch polish

---

## BUGS DEFERRED TO POST-LAUNCH

### BUG-011: Performance — Dashboard Stats Endpoint < 2s (P95)
**Severity**: LOW  
**Component**: Database query optimization  

**Context**: Currently takes 2.1–2.5s in staging. Likely due to missing indexes on etapa.status + obra.userId.

**Deferred Reason**: Does not block cutover; can optimize post-launch.

**Future Fix**: Add database indexes:
```sql
CREATE INDEX idx_etapa_status_obra ON etapa(status, obra_id);
CREATE INDEX idx_obra_gestor ON obra(gestor_id);
```

---

### BUG-012: Missing "Impressão" (Print) Feature
**Severity**: LOW  
**Component**: Report generation  

**Deferred Reason**: Not in MVP scope; can be added in v1.1.

---

## SUMMARY TABLE

| ID | Title | Severity | Status | Est. Fix |
|----|-------|----------|--------|----------|
| BUG-001 | Etapa approval validation missing | CRITICAL | Open | 30m |
| BUG-002 | GPS server-side validation missing | CRITICAL | Open | 45m |
| BUG-003 | KYC email not sent | CRITICAL | Open | 15m |
| BUG-004 | Bulk reject not atomic | MAJOR | Open | 1h |
| BUG-005 | Cache not invalidating | MAJOR | Open | 30m |
| BUG-006 | Mobile notification typo | MAJOR | Open | 20m |
| BUG-007 | Rate limit message unclear | MINOR | Open | 10m |
| BUG-008 | Button text inconsistent | MINOR | Open | 15m |
| BUG-009 | Missing loading state | MINOR | Open | 20m |
| BUG-010 | Audit text truncated | MINOR | Open | 10m |
| BUG-011 | Performance slow | LOW | Deferred | TBD |
| BUG-012 | Print feature missing | LOW | Deferred | N/A |

---

## REMEDIATION ROADMAP

### Before Cutover (02/06 02:00 BRT)
- [ ] Fix BUG-001, BUG-002, BUG-003 (CRITICAL)
- [ ] Fix BUG-004, BUG-005, BUG-006 (MAJOR)
- [ ] Re-run QA on fixed items
- [ ] Sign-off from QA team

### Week 1 After Launch
- [ ] Fix BUG-007, BUG-008, BUG-009, BUG-010 (MINOR polish)
- [ ] Monitor production for regressions

### Post-Launch Backlog
- [ ] Investigate BUG-011 (performance)
- [ ] Plan BUG-012 (new feature for v1.1)

---

## CONTACT

**QA Tester**: [Name] | vinicaetano93@gmail.com  
**Engineering Lead**: [Backend Lead]  
**DevOps Lead**: [DevOps Lead]

---

*Document version 1.0 | Generated 2026-05-29 | Valid until 2026-06-02*
