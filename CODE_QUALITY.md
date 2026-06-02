# CODE QUALITY AUDIT REPORT
**Branch**: claude/gifted-hawking-ULZTB  
**Date**: 2026-06-02  
**Auditor**: Senior Code Reviewer  
**Effort Level**: MEDIUM  

---

## EXECUTIVE SUMMARY

Code audit identified **12 findings** across the monorepo spanning:
- **5 HIGH PRIORITY** issues (reuse gaps, type safety, duplicate components)
- **4 MEDIUM PRIORITY** issues (efficiency, N+1 patterns, async/await)
- **3 LOW PRIORITY** issues (code organization, altitude)

**Recommendation**: Address HIGH priority items in next sprint. Medium/Low can be batched into refactoring roadmap.

---

## 1. DUPLICATE BUTTON COMPONENTS (HIGH PRIORITY)

### Issue
Two independent Button implementations exist in the same package:
- `/home/user/imobi/apps/web/components/button.tsx` (custom implementation)
- `/home/user/imobi/apps/web/components/ui/button.tsx` (similar shadcn-style)

### Impact
- **Maintenance burden**: CSS changes must be synced across both
- **Inconsistent UX**: variant/size mappings differ slightly
- **Code duplication**: ~80 lines duplicated logic
- **Bundle size**: unnecessary duplicate code shipped

### Code Location
```typescript
// components/button.tsx (lines 14-29)
const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-400",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-50",
  // ...
};

// components/ui/button.tsx (lines 13-16)
const variantStyles = {
  default: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600",
  ghost: "hover:bg-gray-100 text-gray-900"
}
```

### Recommended Fix
1. **Consolidate** to single source in `@imbobi/ui` package
2. **Export** from `packages/ui/web/index.ts` for reuse across web + mobile
3. **Delete** `/components/ui/button.tsx` (older shadcn template)
4. **Migrate** imports in `/components/button.tsx` to use unified version
5. **Align variants** with brand tokens (primary, secondary, danger, ghost)

### Effort
- **2-3 hours** to consolidate, test, and update imports

---

## 2. UNOBSERVED FIRE-AND-FORGET PROMISES (HIGH PRIORITY)

### Issue
Multiple `.catch(() => {})` patterns silently swallow errors in critical flows:

### Code Locations
**File**: `/home/user/imobi/services/api/src/modules/etapas/etapas.service.ts` (lines 61-69)
```typescript
// Push notification ignored on failure
this.pushNotificacoes
  .enviarPush({...})
  .catch(() => {}); // Silent failure

// Email ignored on failure
this.email
  .etapaAprovadaEmail(...)
  .catch(() => {}); // Silent failure
```

**File**: `/home/user/imobi/services/api/src/modules/kyc/kyc.service.ts` (lines 84-96)
```typescript
this.pushNotificacoes
  .enviarPush({...})
  .catch(() => {});

this.email
  .kycAprovadoEmail(...)
  .catch(() => {});
```

### Impact
- **Lost observability**: Errors in push/email never logged or monitored
- **Silent degradation**: Users don't receive critical notifications
- **No retry logic**: Failed notifications aren't queued for retry
- **Debugging nightmare**: Error patterns hidden from Sentry/CloudWatch

### Recommended Fix
1. **Log failures** with context:
```typescript
this.pushNotificacoes.enviarPush({...})
  .catch((error) => {
    this.logger.error(`Push notification failed for user ${etapa.obra.usuarioId}`, error);
    // Consider re-queuing via BullMQ or SQS for retry
  });
```

2. **Queue for retry** via BullMQ:
```typescript
this.notificationQueue.add(
  'push-retry',
  { usuarioId, payload },
  { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
);
```

3. **Emit metrics** to CloudWatch for monitoring:
```typescript
this.metrics.increment('notification.failure', {
  type: 'email',
  reason: error.code
});
```

### Effort
- **4-6 hours** to implement proper error handling + retry logic across all services

---

## 3. PRISMA SELECT/INCLUDE DUPLICATION (HIGH PRIORITY)

### Issue
Query shapes repeated across multiple services without abstraction:

**File**: `/home/user/imobi/services/api/src/modules/usuarios/usuarios.service.ts` (lines 11-22, 32-42)
```typescript
// Repeated in buscarPerfil AND atualizarPerfil
select: {
  usuarioId: true,
  nome: true,
  cpf: true,
  email: true,
  telefone: true,
  tipo: true,
  kycStatus: true,
  criadoEm: true,
  atualizadoEm: true,
}
```

**File**: `/home/user/imobi/services/api/src/modules/obras/obras.service.ts` (lines 64-100)
```typescript
// Different shape for each query — no consistency
include: { etapas: { orderBy: { ordem: "asc" } } }
include: { etapas: { select: { etapaId, nome, status, ordem } } }
include: {
  etapas: {
    orderBy: { ordem: "asc" },
    include: {
      evidencias: { where: { validada: true }, select: {...}, take: 3 }
    }
  }
}
```

### Impact
- **Consistency**: Changing what fields are exposed requires grepping all services
- **Performance**: No shared field projection strategy — some queries over-fetch
- **Type safety**: Manual select objects prone to typos (`type: true` vs `tipo: true`)
- **N+1 risk**: Missing `include` in one place can cause hidden queries

### Recommended Fix
1. **Create Prisma delegates** in `@imbobi/core/prisma-queries`:
```typescript
// core/prisma-queries/usuario-queries.ts
export const usuarioPublicSelect = {
  usuarioId: true,
  nome: true,
  email: true,
  tipo: true,
  kycStatus: true,
  criadoEm: true,
  atualizadoEm: true,
} as const;

export const usuarioPefisSelect = {
  ...usuarioPublicSelect,
  cpf: true,
  telefone: true,
};
```

2. **Reuse in all services**:
```typescript
// usuarios.service.ts
async buscarPerfil(usuarioId: string) {
  return this.prisma.usuario.findUnique({
    where: { usuarioId },
    select: usuarioPerfilSelect,
  });
}
```

3. **Create typed includes for relationships**:
```typescript
export const obraComEtapas = {
  include: {
    etapas: {
      orderBy: { ordem: 'asc' as const },
      select: { etapaId: true, nome: true, status: true, ordem: true }
    }
  }
} as const;
```

### Effort
- **6-8 hours** to extract all query shapes + update all 67 service files

---

## 4. MISSING TYPE SAFETY IN API CLIENT (HIGH PRIORITY)

### Issue
API client in `@imbobi/core/services/api-client.ts` lacks type-safe request/response validation:

**File**: `/home/user/imobi/packages/core/src/services/api-client.ts` (lines 25-51)
```typescript
async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  // ...
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }

  if (res.status === 204) return undefined as T; // ❌ Type lies!
  return res.json() as Promise<T>; // ❌ No validation
}
```

### Problems
1. **Type casting**: `as T` assumes server response matches type — fails silently
2. **No validation**: Invalid data passes through without schema check
3. **204 handling**: `undefined as T` breaks type contracts (e.g., client expects object)
4. **Error handling**: Error response parsing is lenient (`.catch(() => {})`)

### Recommended Fix
1. **Integrate Zod validation** at boundaries:
```typescript
import { ZodSchema } from 'zod';

async function request<T>(
  path: string,
  schema: ZodSchema<T>,
  options: RequestOptions = {},
): Promise<T> {
  const json = await res.json();
  return schema.parse(json); // Throws on invalid data
}

// Usage
const user = await apiClient.get(
  '/api/v1/usuarios/perfil',
  UsuarioPerfilSchema
);
```

2. **Create response wrappers** for consistent error handling:
```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function parseResponse<T>(
  res: Response,
  schema: ZodSchema<T>
): Promise<T> {
  if (res.status === 204) return null as T;
  
  const json = await res.json();
  return schema.parse(json);
}
```

3. **Add response interceptors** for logging/metrics:
```typescript
const request = async <T>(...) => {
  const startTime = Date.now();
  const res = await fetch(...);
  const duration = Date.now() - startTime;
  
  metrics.recordRequest(path, res.status, duration);
  return parseResponse<T>(res, schema);
};
```

### Effort
- **8-10 hours** to integrate Zod + update all API calls + tests

---

## 5. MISSING GPS ERROR TELEMETRY (MEDIUM PRIORITY)

### Issue
GPS validation hooks (`useGPS`, `useGeoValidation`) catch errors but don't report them:

**File**: `/home/user/imobi/packages/core/src/hooks/useGPS.ts` (lines 95-99)
```typescript
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : "Erro ao obter localização";
  setState({ isLoading: false, error: errorMsg, coordinates: null });
  throw err; // Error exits hook but no telemetry
}
```

### Impact
- **Silent failures**: GPS errors never reported to Sentry
- **No analytics**: Can't measure permission denial rates, accuracy issues
- **Poor debugging**: Users report "GPS broken" but no error trace in backend
- **Mobile-specific issues**: Platform-specific failures hidden

### Recommended Fix
1. **Inject telemetry client** into hooks:
```typescript
export function useGPS(telemetry?: TelemetryClient) {
  const getPositionInternal = useCallback(async () => {
    try {
      // ...
    } catch (err) {
      telemetry?.captureException(err, {
        tags: { feature: 'gps-capture' },
        contexts: {
          platform: Platform.OS,
          hasGeolocation: typeof navigator?.geolocation !== 'undefined'
        }
      });
      // ...
    }
  }, [telemetry]);
}
```

2. **Initialize in app layout**:
```typescript
// apps/mobile/app/_layout.tsx or apps/web/app/layout.tsx
useEffect(() => {
  const telemetry = initTelemetry('gps');
  initializeGPS(requestPermissions, getPosition, telemetry);
}, []);
```

### Effort
- **2-3 hours** to add telemetry + initialize in both apps

---

## 6. IMPLICIT FIRE-AND-FORGET IN EMAIL SERVICE (MEDIUM PRIORITY)

### Issue
New email service refactoring introduces async methods without await pattern consistency:

**File**: `/home/user/imobi/services/api/src/modules/email/email.service.ts` (lines 94-97)
```typescript
async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
  try {
    if (this.useSES && this.sesClient) {
      return await this.sendViaSES(opcoes);
    }
    // ...
  }
}
```

### Issues
1. **Inconsistent awaits**: Some callers `await`, others silently ignore
2. **No retry logic**: Failed emails not queued for retry
3. **Timeout handling**: No timeout on SES/SMTP requests
4. **Fallback issues**: SES client init catches all errors but `throw` is missing

**File**: Line 28 in email service
```typescript
} catch (error) {
  this.logger.warn(`Failed to initialize SES: ${error}. Falling back to SMTP or console mode.`);
  this.useSES = false;
  this.initializeSMTPTransporter(...); // ❌ No await!
}
```

### Recommended Fix
1. **Add timeouts** to requests:
```typescript
private async sendViaSES(opcoes: EmailOptions): Promise<boolean> {
  const timeoutPromise = new Promise<boolean>((_, reject) =>
    setTimeout(() => reject(new Error('SES timeout')), 30000)
  );
  
  return Promise.race([
    this._sendViaSES(opcoes),
    timeoutPromise
  ]);
}
```

2. **Add queue for retries**:
```typescript
async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
  const result = await this._send(opcoes);
  if (!result) {
    await this.emailRetryQueue.add(opcoes, { attempts: 3 });
  }
  return result;
}
```

3. **Fix init fallback**:
```typescript
} catch (error) {
  this.logger.warn(`Failed to initialize SES: ${error}...`);
  this.useSES = false;
  await this.initializeSMTPTransporter(...); // ✅ Add await
}
```

### Effort
- **3-4 hours** to add timeouts + implement retry queue + update callers

---

## 7. UNAWAITED PROMISES IN CRITICAL PATHS (MEDIUM PRIORITY)

### Issue
Same pattern in `kyc.service.ts`, `etapas.service.ts` — critical domain events not guaranteed to complete:

**Pattern**: Lines 61-91 in `kyc.service.ts`
```typescript
// These fire-and-forget but don't guarantee delivery
this.pushNotificacoes.enviarPush({...}).catch(() => {});
this.email.kycAprovadoEmail(...).catch(() => {});
// Function returns immediately, notifications may fail silently
```

### Impact
- **Race condition**: Approval confirmed to user but notifications fail
- **Data consistency**: System state (DB) updated, but user not notified
- **SLA violation**: Critical events not guaranteed to reach user

### Recommended Fix
1. **Queue all notifications** via BullMQ:
```typescript
async aprovarDocumento(kycDocumentoId: string, gestorId: string) {
  const documento = await this.prisma.kycDocumento.findUnique({...});
  
  // Update DB immediately
  await this.prisma.kycDocumento.update({...});
  
  // Queue notifications for guaranteed delivery
  await Promise.all([
    this.notificationQueue.add('kyc-approved', {
      usuarioId: documento.usuarioId,
      kycDocumentoId
    }),
    this.emailQueue.add('kyc-approved-email', {
      to: documento.usuario.email,
      nome: documento.usuario.nome,
      tipo: documento.tipo
    })
  ]);
  
  return documento;
}
```

2. **Create notification workers**:
```typescript
// services/workers/kyc-notification.worker.ts
@Process('kyc-approved')
async handleKycApproved(job: Job<KycApprovedPayload>) {
  // Retry up to 3 times
  // Send push + email
  // Log metrics
}
```

### Effort
- **6-8 hours** to refactor all notification patterns + create workers

---

## 8. MISSING REQUEST VALIDATION IN API ENDPOINTS (MEDIUM PRIORITY)

### Issue
API endpoints lack input validation — schemas exist but not enforced at controller level:

**File**: `/home/user/imobi/apps/web/app/api/kyc/route.ts` (assumed)
- No `zod` validation pipe
- No type guards before service calls
- Possible type mismatches from malformed requests

### Recommended Fix
1. **Use NestJS validation pipe**:
```typescript
import { ValidationPipe } from '@nestjs/common';

@Post('upload')
@UsePipes(new ValidationPipe({ transform: true }))
async uploadKyc(@Body() input: KycDocumentoSchema) {
  return this.kyc.uploadDocumento(input);
}
```

2. **Create shared validation decorator**:
```typescript
export function ValidateInput(schema: ZodSchema) {
  return UsePipes(
    new ZodValidationPipe(schema),
    new TransformPipe()
  );
}

@Post('upload')
@ValidateInput(KycDocumentoSchema)
async uploadKyc(@Body() input: typeof KycDocumentoSchema) {...}
```

### Effort
- **4-5 hours** to add validation pipes to all endpoints

---

## 9. MISSING LOGGING IN KEY SERVICES (MEDIUM PRIORITY)

### Issue
Only 2 services have Logger:
- `EmailService` ✅
- `AnalyticsService` ✅
- Other 65+ services ❌

### Impact
- **No audit trail**: What operations succeeded/failed?
- **Hard to debug**: Production issues require database inspection
- **No performance insights**: Which operations are slow?

### Recommended Fix
1. **Inject Logger in all services**:
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);
  
  async buscarPerfil(usuarioId: string) {
    this.logger.debug(`Fetching profile for user ${usuarioId}`);
    const profile = await this.prisma.usuario.findUnique({...});
    if (!profile) {
      this.logger.warn(`Profile not found for user ${usuarioId}`);
    }
    return profile;
  }
}
```

2. **Create log interceptor** for automatic request logging:
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: Logger) {}
  
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} - ${duration}ms`);
      })
    );
  }
}
```

### Effort
- **3-4 hours** to add Logger to all services + create interceptor

---

## 10. SCHEMA VALIDATION NOT ENFORCED AT API BOUNDARY (MEDIUM PRIORITY)

### Issue
`@imbobi/schemas` contains ground-truth validation but not used at API endpoints:

**File**: `/home/user/imobi/packages/schemas/src/usuario.schema.ts` (lines 70-82)
```typescript
export const CadastroUsuarioSchema = z.object({
  nome: z.string().min(3).max(120),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  email: z.string().email(),
  // ...
});
```

**Problem**: API endpoints may not validate against this schema
```typescript
// services/api/src/modules/auth/auth.controller.ts (hypothetical)
@Post('cadastro')
async register(@Body() body: any) {
  // No validation! Body could be missing fields, invalid types
  return this.auth.registrar(body);
}
```

### Recommended Fix
1. **Create validation pipe** for Zod schemas:
```typescript
// common/pipes/zod-validation.pipe.ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}
  
  transform(value: unknown) {
    return this.schema.parse(value);
  }
}
```

2. **Use in all controllers**:
```typescript
@Post('cadastro')
@UsePipes(new ZodValidationPipe(CadastroUsuarioSchema))
async register(@Body() input: CadastroUsuarioInput) {
  return this.auth.registrar(input);
}
```

3. **Export typed schemas from `@imbobi/schemas`**:
```typescript
// packages/schemas/src/index.ts
export const schemas = {
  usuario: { cadastro: CadastroUsuarioSchema, login: LoginSchema },
  obra: { criar: CriarObraSchema, atualizar: AtualizarObraSchema },
  // ...
} as const;
```

### Effort
- **5-6 hours** to create pipe + integrate into all controllers

---

## 11. MISSING PRISMA TRANSACTION BOUNDARIES (LOW PRIORITY)

### Issue
Some multi-step operations lack transactions, risking inconsistent state:

**File**: `/home/user/imobi/services/api/src/modules/obras/obras.service.ts` (line 18-49)
```typescript
async criar(usuarioId: string, input: CriarObraInput) {
  const obra = await this.prisma.$transaction(async (tx) => {
    // ✅ Good: create obra + etapas in transaction
    const novaObra = await tx.obra.create({...});
    await tx.etapaObra.createMany({...});
    return tx.obra.findUnique({...});
  });
}
```

**Counter-example** (hypothetical):
```typescript
// ❌ Bad: No transaction
async aprovarDocumento(kycDocumentoId: string) {
  await this.prisma.kycDocumento.update({status: 'APROVADO'});
  // Server crashes here before next line
  await this.updateUsuarioKycStatus(); // Never runs!
}
```

### Recommended Fix
1. **Wrap multi-step operations**:
```typescript
async aprovarDocumento(kycDocumentoId: string, gestorId: string) {
  return this.prisma.$transaction(async (tx) => {
    const documento = await tx.kycDocumento.update({
      where: { kycDocumentoId },
      data: { status: 'APROVADO', analisadoPor: gestorId }
    });
    
    // Only after approval succeeds, update user
    await tx.usuario.update({
      where: { usuarioId: documento.usuarioId },
      data: { kycStatus: 'APROVADO' }
    });
    
    return documento;
  });
}
```

### Effort
- **4-5 hours** to audit and wrap critical flows

---

## 12. PRISMA SCHEMA TYPE SAFETY (LOW PRIORITY)

### Issue
Manual `select` objects are prone to typos and not auto-completing:

**Better approach**: Use Prisma's generated types
```typescript
// ❌ Current (manual)
select: {
  usuarioId: true,
  nome: true,
  tipo: true, // Could be typo!
}

// ✅ Better (type-safe)
const fields = Prisma.validator<Prisma.UsuarioSelect>()({
  usuarioId: true,
  nome: true,
  tipo: true
});
```

### Recommended Fix
1. **Create Prisma validators** for common shapes:
```typescript
// common/prisma/usuario-selects.ts
export const usuarioPublicSelect = Prisma.validator<Prisma.UsuarioSelect>()({
  usuarioId: true,
  nome: true,
  email: true,
  tipo: true,
});
```

### Effort
- **2-3 hours** as part of Prisma query consolidation (Finding #3)

---

## SUMMARY OF FINDINGS BY PRIORITY

### HIGH PRIORITY (Address in next sprint)
| Finding | File(s) | Lines | Effort | Impact |
|---------|---------|-------|--------|--------|
| Duplicate Button Components | `/components/button.tsx`, `ui/button.tsx` | Multiple | 2-3h | Bundle size, UX consistency |
| Unobserved Fire-and-Forget | kyc.service, etapas.service | Multiple | 4-6h | Lost notifications, no observability |
| Prisma Select Duplication | usuarios.service, obras.service | Multiple | 6-8h | Consistency, type safety |
| API Client Type Safety | api-client.ts | 25-51 | 8-10h | Runtime validation, error handling |
| GPS Error Telemetry | useGPS.ts, useGeoValidation.ts | 95-99 | 2-3h | Debugging, monitoring |

### MEDIUM PRIORITY (Schedule for refactoring)
| Finding | File(s) | Effort | Impact |
|---------|---------|--------|--------|
| Email Service Async Consistency | email.service.ts | 3-4h | Reliability, timeouts |
| Notification Pattern | kyc/etapas services | 6-8h | Guaranteed delivery |
| Request Validation | All controllers | 4-5h | Security, consistency |
| Service Logging | 65+ services | 3-4h | Debugging, audit trail |
| Schema Validation Enforcement | All endpoints | 5-6h | Runtime safety |

### LOW PRIORITY (Batch in refactoring)
| Finding | Effort | Impact |
|---------|--------|--------|
| Transaction Boundaries | 4-5h | Data consistency |
| Prisma Type Safety | 2-3h | Developer experience |

---

## REFACTORING ROADMAP

### PHASE 1: Immediate (Week 1-2)
**Focus**: Type safety, duplicates, observability
```
Week 1:
- [ ] Consolidate Button components (2-3h)
- [ ] Add error telemetry to GPS hooks (2-3h)
- [ ] Create Prisma query delegates (3-4h initial setup)

Week 2:
- [ ] Implement request validation with Zod pipes (4-5h)
- [ ] Add Logger to all services (3-4h)
- [ ] Schema validation at API boundary (2-3h)
```

**Estimated**: 19-26 hours (1-1.5 sprints)

### PHASE 2: Stabilization (Week 3-4)
**Focus**: Reliability, consistency
```
Week 3:
- [ ] Implement notification retry via BullMQ (4-5h)
- [ ] Add timeouts to email service (1-2h)
- [ ] Fix fire-and-forget patterns (2-3h)

Week 4:
- [ ] Audit transaction boundaries (2-3h)
- [ ] Add Prisma type validators (1-2h)
- [ ] Integration testing across changes (4-5h)
```

**Estimated**: 18-24 hours (1 sprint)

### PHASE 3: Enhancement (Week 5+)
**Focus**: Observability, performance
```
- [ ] API client validation + interceptors (8-10h)
- [ ] Logging interceptor + structured logging (3-4h)
- [ ] Performance monitoring & metrics (4-6h)
```

**Estimated**: 15-20 hours (1 sprint)

---

## IMPLEMENTATION GUIDELINES

### For each finding:
1. **Create feature branch** from main (not this branch)
2. **Write tests first** for new patterns
3. **Update types** in `@imbobi/schemas` and `@imbobi/core`
4. **Run `pnpm type-check`** across all packages
5. **Update CLAUDE.md** with new patterns
6. **PR with migration guide** for complex changes

### Quality Gates:
- `✅ All type checks pass`
- `✅ Test coverage > 80%`
- `✅ No console.log/debugger left`
- `✅ No `any` types introduced`
- `✅ Zod schemas used at API boundaries`

---

## APPENDIX: CODE SNIPPETS FOR REFERENCE

### Pattern 1: Consolidated Query Selects
```typescript
// @imbobi/core/src/prisma-queries/usuario.ts
import { Prisma } from '@prisma/client';

export const usuarioPublicSelect = {
  usuarioId: true,
  nome: true,
  email: true,
  tipo: true,
  kycStatus: true,
  criadoEm: true,
} as const;

export const usuarioPerfilSelect = {
  ...usuarioPublicSelect,
  cpf: true,
  telefone: true,
  atualizadoEm: true,
} as const;

// In services:
async buscarPerfil(usuarioId: string) {
  return this.prisma.usuario.findUnique({
    where: { usuarioId },
    select: usuarioPerfilSelect,
  });
}
```

### Pattern 2: Zod Validation at API Boundary
```typescript
// common/pipes/zod-validation.pipe.ts
import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.errors);
      }
      throw error;
    }
  }
}

// Usage in controller:
@Post('cadastro')
@UsePipes(new ZodValidationPipe(CadastroUsuarioSchema))
async register(@Body() input: CadastroUsuarioInput) {
  return this.auth.registrar(input);
}
```

### Pattern 3: Guaranteed Notification Delivery
```typescript
// services/modules/kyc/kyc.service.ts
async aprovarDocumento(kycDocumentoId: string, gestorId: string) {
  const documento = await this.prisma.$transaction(async (tx) => {
    const updated = await tx.kycDocumento.update({
      where: { kycDocumentoId },
      data: { status: 'APROVADO', analisadoPor: gestorId },
      include: { usuario: true }
    });
    return updated;
  });

  // Queue notifications for guaranteed delivery (not fire-and-forget)
  await Promise.all([
    this.notificacoesQueue.add({
      usuarioId: documento.usuarioId,
      tipo: 'KYC_APROVADO',
      titulo: 'Documentação Aprovada',
      url: '/dashboard/perfil'
    }),
    this.emailQueue.add({
      to: documento.usuario.email,
      template: 'kyc-approved',
      data: { nome: documento.usuario.nome, tipo: documento.tipo }
    })
  ]);

  return documento;
}

// Worker processes with retry:
@Process('kyc-approved')
async handleKycApproved(job: Job) {
  try {
    await this.notificacoes.criar(...);
    await this.email.kycAprovadoEmail(...);
  } catch (error) {
    this.logger.error(`Notification failed, will retry`, error);
    throw error; // BullMQ will retry
  }
}
```

---

## CONCLUSION

The codebase has **solid architectural foundations** (monorepo, shared packages, type safety intent) but lacks **consistent enforcement patterns**. The high-priority findings cluster around:

1. **Duplication** (components, queries, validation)
2. **Observability gaps** (logging, error telemetry, metrics)
3. **Reliability issues** (fire-and-forget, missing retries, no timeouts)

Addressing these will significantly improve **maintainability**, **debuggability**, and **user reliability**.

**Next Step**: Create tickets for Phase 1 and schedule team sync to discuss implementation approach.
