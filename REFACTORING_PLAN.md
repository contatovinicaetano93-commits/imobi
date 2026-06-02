# REFACTORING IMPLEMENTATION PLAN
**Status**: Ready for Implementation  
**Created**: 2026-06-02  
**Priority**: HIGH + MEDIUM (Phase 1-2)  

---

## QUICK START: Which Issues to Fix First?

```
IF you have 1-2 days:   Fix #1 (Button duplication) + #5 (GPS telemetry)
IF you have 1 week:     Complete Phase 1 (All HIGH items)
IF you have 2 weeks:    Complete Phase 1 + Phase 2 (HIGH + MEDIUM)
```

---

## DETAILED ISSUE BREAKDOWN

### ISSUE #1: DUPLICATE BUTTON COMPONENTS ⭐⭐⭐⭐⭐

**Severity**: HIGH | **Effort**: 2-3h | **Impact**: Bundle size + UX consistency

#### Problem
Two button implementations exist:
```
/apps/web/components/button.tsx        ← Custom variant system
/apps/web/components/ui/button.tsx     ← shadcn-like template
```

Both export a `Button` component but with different APIs:
```typescript
// button.tsx
<Button variant="primary" size="md" isLoading={false} />

// ui/button.tsx  
<Button variant="default" size="default" />
```

#### Why This Matters
- Team doesn't know which to import
- Design changes require updating both
- Bundle includes duplicate logic
- Mobile and Web can't share Button

#### Solution
1. **Consolidate to `@imbobi/ui`** (shared package for both web/mobile)
2. **Use single Button** with unified API
3. **Delete duplicate** in `/components/ui/button.tsx`
4. **Update all imports** in web/mobile to use shared Button

#### Implementation Steps
```bash
# Step 1: Create unified Button in @imbobi/ui
mkdir -p packages/ui/components
cat > packages/ui/components/Button.tsx << 'EOF'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = "primary", 
  size = "md", 
  isLoading, 
  children,
  ...props 
}) => {
  const variantStyles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-400",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
  }
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  }
  
  return (
    <button 
      {...props}
      disabled={props.disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-lg transition-colors
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${props.className || ''}
      `}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  )
}
EOF

# Step 2: Export from @imbobi/ui
cat >> packages/ui/web/index.ts << 'EOF'
export { Button, type ButtonProps } from "../components/Button"
EOF

# Step 3: Update apps/web/components/button.tsx to re-export
cat > apps/web/components/button.tsx << 'EOF'
export { Button, ButtonGroup } from "@imbobi/ui"
EOF

# Step 4: Delete duplicate
rm apps/web/components/ui/button.tsx

# Step 5: Find and update all imports in web/mobile
grep -r "from.*ui/button" apps/web apps/mobile | cut -d: -f1 | sort -u | while read file; do
  sed -i "s|from.*ui/button|from \"@imbobi/ui\"|g" "$file"
done

# Step 6: Test
pnpm type-check
pnpm build
```

#### Verification
```bash
# Should pass:
✓ No duplicate button exports
✓ Both web and mobile use @imbobi/ui Button
✓ All variants work (primary, secondary, danger, ghost)
✓ Size system consistent (sm, md, lg)
```

---

### ISSUE #2: UNOBSERVED FIRE-AND-FORGET PROMISES ⭐⭐⭐⭐⭐

**Severity**: HIGH | **Effort**: 4-6h | **Impact**: Lost notifications, no monitoring

#### Problem
Critical notifications are sent without guarantees:
```typescript
// kyc.service.ts:84-96
this.pushNotificacoes.enviarPush({...}).catch(() => {})  // Silent failure!
this.email.kycAprovadoEmail(...).catch(() => {})         // No logging!
```

If notification fails, user never knows. System thinks it succeeded.

#### Why This Matters
- User approved for credit but never gets notification
- Error traces lost → can't debug production issues
- No retry mechanism → transient failures are permanent
- Monitoring systems (Sentry, CloudWatch) see no errors

#### Solution
Implement queued notifications with retry logic using BullMQ:

#### Implementation Steps

**Step 1**: Create BullMQ job definitions
```bash
cat > services/api/src/modules/notifications/types.ts << 'EOF'
export interface NotificationJob {
  usuarioId: string
  tipo: "KYC_APROVADO" | "KYC_REJEITADO" | "ETAPA_APROVADA"
  titulo: string
  mensagem: string
  url?: string
  dados?: Record<string, any>
}

export interface EmailJob {
  to: string
  nome: string
  tipo: "KYC_APROVADO" | "KYC_REJEITADO"
  dados?: any
}
EOF
```

**Step 2**: Create notification worker
```bash
cat > services/api/src/modules/notifications/notification.worker.ts << 'EOF'
import { Processor, Process, OnModuleInit } from "@nestjs/bull"
import { Job } from "bull"
import { Logger } from "@nestjs/common"
import { NotificacoesService } from "./notificacoes.service"
import { EmailService } from "../email/email.service"
import { PushNotificacoesService } from "../push-notificacoes/push-notificacoes.service"

@Processor("notifications")
export class NotificationWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorker.name)

  constructor(
    private notificacoes: NotificacoesService,
    private email: EmailService,
    private push: PushNotificacoesService
  ) {}

  onModuleInit() {
    this.logger.log("Notification worker initialized")
  }

  @Process("kyc-approved")
  async handleKycApproved(job: Job<any>) {
    const { usuarioId, tipo } = job.data
    this.logger.debug(`Processing KYC approval for user ${usuarioId}`)

    try {
      // Send in parallel, but track individually
      const results = await Promise.allSettled([
        this.notificacoes.criar(
          usuarioId,
          "KYC_APROVADO",
          "Documentação Aprovada",
          `Seu documento "${tipo}" foi aprovado com sucesso!`,
          "/dashboard/perfil"
        ),
        this.push.enviarPush({
          usuarioId,
          titulo: "Documentação Aprovada",
          mensagem: `Seu documento foi aprovado!`,
          tipo: "KYC_APROVADO"
        }),
        this.email.kycAprovadoEmail(job.data.nome, job.data.email)
      ])

      const failed = results.filter((r) => r.status === "rejected")
      if (failed.length > 0) {
        this.logger.warn(
          `KYC approval job: ${failed.length} notifications failed`,
          failed
        )
        throw new Error(`${failed.length} notifications failed`)
      }

      return { success: true, notificationsCount: results.length }
    } catch (error) {
      this.logger.error(
        `Failed to send KYC approval notifications`,
        error
      )
      throw error // BullMQ will retry
    }
  }

  @Process("kyc-rejected")
  async handleKycRejected(job: Job<any>) {
    // Similar pattern for rejection
  }
}
EOF
```

**Step 3**: Update services to queue instead of fire-and-forget
```bash
cat > services/api/src/modules/kyc/kyc.service.ts << 'EOF'
// Replace old pattern:
// this.pushNotificacoes.enviarPush({...}).catch(() => {})

// With:
@Injectable()
export class KycService {
  constructor(
    @InjectQueue("notifications")
    private notificationQueue: Queue
  ) {}

  async aprovarDocumento(kycDocumentoId: string, gestorId: string) {
    const documento = await this.prisma.kycDocumento.update({...})

    // Queue notification with automatic retry
    await this.notificationQueue.add(
      "kyc-approved",
      {
        usuarioId: documento.usuarioId,
        tipo: documento.tipo,
        nome: documento.usuario.nome,
        email: documento.usuario.email,
        titulo: "Documentação Aprovada",
        mensagem: `Seu documento "${documento.tipo}" foi aprovado!`
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false // Keep failed jobs for inspection
      }
    )

    return documento
  }
}
EOF
```

**Step 4**: Add to module registration
```bash
# Update kyc.module.ts
cat >> services/api/src/modules/kyc/kyc.module.ts << 'EOF'
import { BullModule } from "@nestjs/bull"

@Module({
  imports: [
    BullModule.registerQueue({ name: "notifications" })
  ],
  providers: [KycService, NotificationWorker]
})
export class KycModule {}
EOF
```

#### Verification
```bash
✓ Notifications queued, not fire-and-forget
✓ Failed notifications logged with context
✓ Automatic retry with exponential backoff
✓ Failed jobs visible in BullMQ UI (bull-board)
✓ Errors tracked in Sentry/CloudWatch
```

---

### ISSUE #3: PRISMA SELECT/INCLUDE DUPLICATION ⭐⭐⭐⭐

**Severity**: HIGH | **Effort**: 6-8h | **Impact**: Type safety, consistency

#### Problem
Query shapes repeated manually across 67 service files:
```typescript
// usuarios.service.ts duplicates this select 3 times
select: { usuarioId: true, nome: true, cpf: true, email: true, ... }

// obras.service.ts has 5 different include shapes
include: { etapas: { orderBy: { ordem: "asc" } } }
include: { etapas: { select: { etapaId, nome, status } } }
include: { 
  etapas: {
    include: { evidencias: { where: { validada: true }, select: {...} } }
  }
}
```

No consistency = no way to enforce what data is fetched.

#### Solution
Create centralized Prisma query definitions:

#### Implementation Steps

**Step 1**: Create query delegate files
```bash
mkdir -p services/api/src/common/prisma
cat > services/api/src/common/prisma/usuario-queries.ts << 'EOF'
import { Prisma } from "@prisma/client"

// Public profile (visible in lists, APIs)
export const usuarioPublicSelect = {
  usuarioId: true,
  nome: true,
  email: true,
  tipo: true,
  kycStatus: true,
  criadoEm: true,
} as const

// Full profile (user's own data)
export const usuarioPerfilSelect = {
  ...usuarioPublicSelect,
  cpf: true,
  telefone: true,
  atualizadoEm: true,
} as const

// For admin views
export const usuarioAdminSelect = {
  ...usuarioPerfilSelect,
  creditosCount: { _count: true }
} as const

// Reusable in relationships
export const usuarioReferencia = {
  select: usuarioPublicSelect
} as const
EOF

cat > services/api/src/common/prisma/obra-queries.ts << 'EOF'
// Obra with etapas (for dashboard)
export const obraComEtapas = {
  include: {
    etapas: {
      orderBy: { ordem: "asc" as const },
      select: {
        etapaId: true,
        nome: true,
        status: true,
        ordem: true,
        percentualObra: true
      }
    }
  }
} as const

// Obra detailed (for einzelheit page)
export const obraDetalhada = {
  include: {
    etapas: {
      orderBy: { ordem: "asc" as const },
      include: {
        evidencias: {
          where: { validada: true },
          select: {
            evidenciaId: true,
            fotoUrl: true,
            criadoEm: true
          },
          take: 3
        }
      }
    },
    credito: {
      select: {
        creditoId: true,
        valorAprovado: true,
        valorLiberado: true,
        status: true
      }
    }
  }
} as const
EOF

cat > services/api/src/common/prisma/index.ts << 'EOF'
export * from "./usuario-queries"
export * from "./obra-queries"
EOF
```

**Step 2**: Update all services to use shared queries
```bash
# usuarios.service.ts
cat > services/api/src/modules/usuarios/usuarios.service.ts << 'EOF'
import { usuarioPerfilSelect } from "../../common/prisma"

@Injectable()
export class UsuariosService {
  async buscarPerfil(usuarioId: string) {
    return this.prisma.usuario.findUnique({
      where: { usuarioId },
      select: usuarioPerfilSelect // ✅ Reused!
    })
  }

  async atualizarPerfil(usuarioId: string, data: {...}) {
    return this.prisma.usuario.update({
      where: { usuarioId },
      data: { ...data, atualizadoEm: new Date() },
      select: usuarioPerfilSelect // ✅ Reused!
    })
  }
}
EOF

# obras.service.ts
cat > services/api/src/modules/obras/obras.service.ts << 'EOF'
import { obraComEtapas, obraDetalhada } from "../../common/prisma"

async listar(usuarioId: string) {
  return this.prisma.obra.findMany({
    where: { usuarioId },
    ...obraComEtapas, // ✅ Spreads include
    orderBy: { criadoEm: "desc" }
  })
}

async buscar(usuarioId: string, obraId: string) {
  return this.prisma.obra.findUnique({
    where: { obraId },
    ...obraDetalhada // ✅ Spreads full include
  })
}
EOF
```

**Step 3**: Type-safe version with Prisma validators
```bash
# For maximum type safety, use Prisma.validator:
cat > services/api/src/common/prisma/usuario-typed.ts << 'EOF'
import { Prisma } from "@prisma/client"

// Type-safe select
export const usuarioPublicSelect = Prisma.validator<Prisma.UsuarioSelect>()({
  usuarioId: true,
  nome: true,
  email: true,
  tipo: true,
  kycStatus: true,
  criadoEm: true
})

// This ensures TypeScript catches typos: "tippo: true" → ERROR
EOF
```

#### Verification
```bash
✓ All select/include centralized
✓ Type errors if field name wrong
✓ Easy to add/remove fields globally
✓ Consistent with architecture
✓ pnpm type-check passes
```

---

### ISSUE #4: API CLIENT TYPE SAFETY ⭐⭐⭐⭐

**Severity**: HIGH | **Effort**: 8-10h | **Impact**: Runtime validation, error handling

#### Problem
API client doesn't validate responses:
```typescript
// @imbobi/core/services/api-client.ts
return res.json() as Promise<T>  // ❌ No validation!

// Client could get invalid data:
const user: User = await apiClient.get("/usuarios/profile")
// What if server returns { id: "123" } instead of { usuarioId: "123" }?
// TypeScript won't catch it!
```

#### Solution
Integrate Zod validation at API boundaries:

#### Implementation
```bash
cat > packages/core/src/services/api-client.ts << 'EOF'
import { ZodSchema, ZodError } from "zod"

class ApiValidationError extends Error {
  constructor(
    public errors: ZodError["errors"],
    message = "API response validation failed"
  ) {
    super(message)
    this.name = "ApiValidationError"
  }
}

async function request<T>(
  path: string,
  schema: ZodSchema<T>,  // ✅ Require schema
  options: RequestOptions = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {...})

  if (!res.ok) {
    const error = await parseErrorResponse(res)
    throw new ApiError(res.status, error.message, error.code)
  }

  if (res.status === 204) {
    // ✅ Don't lie about return type
    if (schema.safeParse(null).success) return null as any
    throw new Error("Expected response body for 204")
  }

  const body = await res.json()
  
  // ✅ Validate with Zod
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiValidationError(result.error.errors)
  }

  return result.data
}

// Usage:
export const apiClient = {
  get: <T>(path: string, schema: ZodSchema<T>, token?: string) =>
    request(path, schema, { method: "GET", token }),

  post: <T>(path: string, schema: ZodSchema<T>, body: unknown, token?: string) =>
    request(path, schema, {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  // ... patch, delete
}

export { ApiError, ApiValidationError }
EOF

# Update usage:
cat > apps/web/app/(dashboard)/perfil/page.tsx << 'EOF'
import { apiClient } from "@imbobi/core"
import { UsuarioPerfilSchema } from "@imbobi/schemas"

export default async function PerfilPage() {
  // ✅ Response validated against schema
  const usuario = await apiClient.get(
    "/usuarios/perfil",
    UsuarioPerfilSchema
  )
  
  return <div>{usuario.nome}</div>
}
EOF
```

#### Verification
```bash
✓ Invalid responses rejected with clear error
✓ Type inference from schema
✓ Server changes caught immediately
✓ Error details logged for debugging
```

---

### ISSUE #5: MISSING GPS ERROR TELEMETRY ⭐⭐⭐

**Severity**: HIGH | **Effort**: 2-3h | **Impact**: Debugging, monitoring

#### Problem
GPS errors silently swallowed:
```typescript
// packages/core/src/hooks/useGPS.ts:95-99
} catch (err) {
  const errorMsg = err instanceof Error ? err.message : "..."
  setState({...})
  throw err  // ❌ Error exits but no one logs it!
}
```

#### Solution
Inject telemetry client into hooks:

#### Implementation
```bash
cat > packages/core/src/hooks/useGPS.ts << 'EOF'
import { useCallback, useState, useEffect } from "react"
import type { TelemetryClient } from "../services/telemetry" // You'll create this

let telemetry: TelemetryClient | null = null

export function initializeGPSWithTelemetry(
  requestPermissions: () => Promise<{ status: string }>,
  getPosition: () => Promise<Coordinates & { accuracy: number }>,
  telemetryClient?: TelemetryClient
) {
  permissionGetter = requestPermissions
  positionGetter = getPosition
  telemetry = telemetryClient || null  // ✅ Optional telemetry
}

export function useGPS() {
  const [state, setState] = useState<GPSState>({...})

  const getPositionInternal = useCallback(async () => {
    setState({ isLoading: true, error: null, coordinates: null })

    try {
      if (positionGetter) {
        if (permissionGetter) {
          const { status } = await permissionGetter()
          if (status !== "granted") {
            // ✅ Log permission denial
            telemetry?.captureMessage("GPS permission denied", {
              level: "warning",
              tags: { feature: "gps-capture" }
            })
            throw new Error("permission_denied")
          }
        }

        const position = await positionGetter()
        telemetry?.addBreadcrumb({
          message: "GPS position captured",
          level: "info",
          data: {
            accuracy: position.accuracy,
            platform: "mobile"
          }
        })
        setState({ isLoading: false, error: null, coordinates: position })
        return position
      }

      // ... navigator.geolocation fallback
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      
      // ✅ Report error with context
      telemetry?.captureException(err, {
        tags: {
          feature: "gps-capture",
          errorType: "position-fetch"
        },
        contexts: {
          gps: {
            hasGetter: !!positionGetter,
            hasPermissionGetter: !!permissionGetter,
            hasBrowserGeolocation: typeof navigator?.geolocation !== "undefined"
          }
        }
      })

      setState({ isLoading: false, error: errorMsg, coordinates: null })
      throw err
    }
  }, [])

  return { ...state, getPosition: getPositionInternal }
}
EOF

# Initialize in mobile layout:
cat > apps/mobile/app/_layout.tsx << 'EOF'
import * as Location from "expo-location"
import { useGPS, initializeGPSWithTelemetry } from "@imbobi/core"
import * as Sentry from "sentry-expo"

export default function RootLayout() {
  useEffect(() => {
    // Initialize GPS with Sentry telemetry
    initializeGPSWithTelemetry(
      () => Location.requestForegroundPermissionsAsync(),
      () => Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000
      }),
      Sentry  // ✅ Pass Sentry as telemetry client
    )
  }, [])

  return <RootNavigator />
}
EOF
```

---

## EXECUTION CHECKLIST

### Pre-Implementation
- [ ] Read full CODE_QUALITY.md report
- [ ] Create jira/notion tickets for each issue
- [ ] Assign owners to HIGH priority items
- [ ] Schedule code review pairing sessions
- [ ] Update PR template to reference code quality guidelines

### Phase 1 (Week 1-2)
- [ ] **Issue #1**: Consolidate Button components
  - [ ] Create unified Button in @imbobi/ui
  - [ ] Export from packages/ui/web/index.ts
  - [ ] Delete /components/ui/button.tsx
  - [ ] Update all imports
  - [ ] `pnpm type-check` passes
  - [ ] PR reviewed and merged

- [ ] **Issue #2**: Add error telemetry to GPS hooks
  - [ ] Add telemetry injection to useGPS/useGeoValidation
  - [ ] Initialize in mobile/web layouts
  - [ ] Test with Sentry integration
  - [ ] PR reviewed and merged

- [ ] **Issue #3**: Extract Prisma query delegates (start)
  - [ ] Create /common/prisma/usuario-queries.ts
  - [ ] Create /common/prisma/obra-queries.ts
  - [ ] Update first 10 services
  - [ ] PR reviewed (can be in multiple PRs)

### Phase 2 (Week 3-4)
- [ ] **Issue #3**: Complete Prisma query extraction
  - [ ] Update remaining 57 services
  - [ ] Type-safe validators with Prisma.validator
  - [ ] All references point to centralized queries

- [ ] **Issue #4**: Add Zod validation to API client
  - [ ] Update api-client.ts with schema parameter
  - [ ] Update all apiClient calls to include schema
  - [ ] Create ApiValidationError class
  - [ ] Integration test with mock server

- [ ] **Issue #2**: Implement notification queue workers
  - [ ] Create NotificationWorker with BullMQ
  - [ ] Update KycService to queue instead of fire-and-forget
  - [ ] Update EtapasService similarly
  - [ ] Test retry logic
  - [ ] PR reviewed and merged

---

## SUCCESS METRICS

Track these metrics after implementation:

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| Duplicate code lines | 200+ | <50 | `grep -r` for repeated patterns |
| Service logging coverage | 10% | 100% | All services have Logger |
| API validation errors caught | 0% | 100% | Zod catches invalid responses |
| Fire-and-forget patterns | 20+ | 0 | `grep -r "catch(() => {})"` |
| Prisma query reuse | 0% | 80%+ | All queries use centralized defs |
| Type-check passing | 100% | 100% | `pnpm type-check` |
| Error observability | 30% | 95% | Sentry integration coverage |

---

## ROLLBACK PLAN

Each change should have a rollback path:

**Button consolidation**: Revert to old files, update imports back
**GPS telemetry**: Remove telemetry injection, old error handling still works
**Prisma queries**: Switch back to inline selects, git history has old code
**API validation**: Revert schema parameter, remove Zod calls
**Notification queue**: Remove worker, old fire-and-forget restored

---

## TOOLS & COMMANDS

```bash
# Find all fire-and-forget patterns
grep -rn "\.catch.*{}" services/api/src/modules --include="*.ts"

# Count service files
find services/api/src/modules -name "*.service.ts" ! -path "*/test/*" | wc -l

# Find duplicate selects
grep -rn "select:.*{" services/api/src/modules --include="*.ts" | sort | uniq -d

# Type check everything
pnpm type-check

# Run tests for affected modules
pnpm test --filter=@imbobi/ui --filter=@imbobi/core

# Lint imports
pnpm lint --fix
```

---

## COMMON QUESTIONS

**Q: Can we do these in parallel?**  
A: Yes! #1 and #5 are independent. #3 can start independently. #4 requires #3 to be partially done.

**Q: What if we break something?**  
A: Each issue has a rollback. Git history is preserved. PRs go through review.

**Q: How long total?**  
A: Phase 1: 1 week (1 sprint). Phase 2: 1 week. Phase 3: 1 week. ~52-70 engineering hours total.

**Q: Do we need to pause feature work?**  
A: Not if we assign dedicated people. Can parallelize with feature team.

**Q: What about mobile?**  
A: Mobile benefits from shared @imbobi/ui components and @imbobi/core hooks. Same refactoring applies.

---

## NEXT STEPS

1. **Share this plan** with team
2. **Create tickets** in Jira/Notion
3. **Assign owners** to each item
4. **Start with #1** (Button) — quickest win, builds momentum
5. **Parallel: #5** (GPS) — also quick, improves observability
6. **Schedule pairing** for #3 (Prisma) — largest effort

**Owner to assign**: @senior-engineer or whoever owns quality

