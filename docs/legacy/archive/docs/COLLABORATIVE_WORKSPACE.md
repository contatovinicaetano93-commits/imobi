# 🤝 COLLABORATIVE WORKSPACE SETUP

> **Tracker vivo (roadmap + sync):** use `COLLABORATIVE_WORKSPACE.md` na **raiz do repo** — este arquivo é só guia de workflow git/paralelo.

Complete guide for parallel development between Claude (backend) and Cursor (frontend).

---

## TEAM STRUCTURE

**Claude (Backend)**
- Backend API (NestJS + Fastify)
- Database design (Prisma)
- Infrastructure & DevOps
- Integration testing
- API documentation

**Cursor/You (Frontend)**
- Frontend UI (Next.js)
- Mobile app (Expo)
- Dashboard implementation
- Form handling & validation
- End-to-end testing

---

## PARALLEL DEVELOPMENT FLOW

### Day 1: Setup
```
Claude                          Cursor
├─ Setup database              ├─ Setup Next.js env
├─ Create Prisma schema        ├─ Create page structure
├─ Define API endpoints (v1)   ├─ Create form components
└─ Push to branch              └─ Pull from Claude's branch
```

### Day 2: Core Features
```
Claude                          Cursor
├─ Implement auth endpoints    ├─ Create login form
├─ Implement obra CRUD         ├─ Create obras list page
├─ Implement credit endpoints  ├─ Create credits page
├─ Create @imbobi/api package  ├─ Wire up API client
└─ Push commits                └─ Pull & integrate
```

### Day 3: Integration & Testing
```
Claude                          Cursor
├─ Run post-deploy-verification  ├─ Test end-to-end flow
├─ Fix issues found in tests     ├─ Report bugs/issues
├─ Deploy to Railway             ├─ Verify in browser
└─ Monitor production            └─ Monitor frontend
```

---

## GIT WORKFLOW

### Branch Strategy

```
main                          (canônica — deploy Vercel + Render)
├─ feature/*                  (PR → main)
├─ claude/*                   (legado agentes — não usar para deploy)
└─ deploy/production          (tags v* para prod manual)
```

### Collaboration

**Fluxo:** feature branch → PR → `main`. Deploy automático em push para `main`.

**Daily workflow:**
```bash
# Claude: commit and push
git add services/api/src/...
git commit -m "feat: Implement obras CRUD endpoints"
git push origin main

# Cursor: pull latest
git pull origin main
# Implement frontend to match API
git add apps/web/...
git commit -m "feat: Create obras list page with API integration"
git push origin main
```

**Conflict resolution:**
- Conflicts in `services/api/**` → Claude resolves
- Conflicts in `apps/web/**` → Cursor resolves
- Conflicts in `packages/**` → Both discuss

---

## SHARED PACKAGES (@imbobi/*)

### @imbobi/schemas (Source of Truth)

Zod validation schemas shared by frontend & backend.

**Example**:
```typescript
// packages/@imbobi/schemas/src/usuario.ts
export const usuarioSchema = z.object({
  nome: z.string().min(3).max(100),
  email: z.string().email(),
  cpf: z.string().regex(/^\d{11}$/),
  telefone: z.string().regex(/^\d{10,11}$/),
  password: z.string().min(8),
});

// Usage in both frontend and backend
// Frontend: useForm({ resolver: zodResolver(usuarioSchema) })
// Backend: usuarioSchema.parse(req.body)
```

**Rules**:
- [ ] Never duplicate validation logic
- [ ] Update schemas when API changes
- [ ] Run `pnpm type-check` after schema changes

### @imbobi/core

Shared hooks, utilities, API client.

**Exports**:
- `useAuth()` - Authentication state
- `useApi()` - Data fetching wrapper
- `apiClient` - Typed HTTP client
- `formatters` - Date, currency, phone formatting

**Rules**:
- [ ] Zero native dependencies (works in web + mobile)
- [ ] Thoroughly tested
- [ ] Well-documented

---

## API CONTRACTS

### How They Work

1. **Claude** publishes endpoint spec in OpenAPI
2. **Cursor** implements form/page based on spec
3. **Claude** implements endpoint logic
4. **Cursor** integrates & tests in browser
5. Both fix issues together

### Example: Create Obra

**Day 1 Evening (Claude)**: Publishes API spec
```yaml
POST /api/v1/obras
Request:
  nome: string (3-100 chars)
  endereco: string (required)
  areaM2: number (optional)
  tipo: string (CONSTRUCAO | REFORMA | AMPLIACAO)

Response:
  201: { id, nome, endereco, status: AGUARDANDO_HOMOLOGACAO, createdAt }
  400: { error: validation_error, details: {...} }
  401: { error: unauthorized }
```

**Day 2 Morning (Cursor)**: Creates form
```typescript
// apps/web/components/CreateObraForm.tsx
const schema = obraSchema.pick({
  nome: true,
  endereco: true,
  areaM2: true,
  tipo: true,
});

export function CreateObraForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.obras.create(data),
    onSuccess: () => {
      toast.success('Obra created!');
      redirect('/dashboard/obras');
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <input {...register('nome')} />
      <input {...register('endereco')} />
      <textarea {...register('areaM2')} />
      <select {...register('tipo')}>
        <option>CONSTRUCAO</option>
      </select>
      <button>Create Obra</button>
    </form>
  );
}
```

**Day 2 Afternoon (Claude)**: Implements endpoint
```typescript
// services/api/src/modules/obras/obras.controller.ts
@Post()
async create(@Body() dto: CreateObraDto) {
  return this.obraService.create(dto);
}

// services/api/src/modules/obras/obras.service.ts
async create(data: CreateObraDto): Promise<ObraResponse> {
  const obra = await this.prisma.obra.create({
    data: {
      ...data,
      usuarioId: currentUser.id,
      status: 'AGUARDANDO_HOMOLOGACAO',
    },
  });
  return this.mapToResponse(obra);
}
```

**Day 3 Morning (Cursor)**: Tests end-to-end
- Opens http://localhost:3001/dashboard/obras/create
- Fills form
- Clicks "Create"
- Sees success toast
- Obra appears in list
- Reports success or bugs

---

## COMMUNICATION

### Daily Standup
```
Claude:
- Completed: Auth endpoints, jest tests
- In progress: Obra CRUD
- Blocked: Waiting on database schema approval

Cursor:
- Completed: Login form, register form
- In progress: Wiring API integration
- Blocked: Need CreateObraDto type definition
```

### Async Updates

**Git commit messages** = communication:
```bash
git commit -m "feat: Add obras.list endpoint

- Returns paginated list of user's obras
- Filters by status (optional query param)
- Includes etapas and creditos relations
- Response matches OpenAPI spec

Depends on: @imbobi/schemas (ObraResponse type)"
```

### Blockers & Escalation

**If Cursor is blocked**:
```
"I need CreateObraDto type to match API.
Can you export it from @imbobi/schemas?"

→ Claude exports it immediately
→ Cursor pulls & continues
```

**If Claude is blocked**:
```
"Database schema needs confirmation from product.
Shall I proceed with initial design or wait?"

→ Proceed with initial design
→ Document assumptions in code
→ Easy to refactor later
```

---

## ENVIRONMENT SYNCHRONIZATION

### Frontend Env
```bash
# apps/web/.env.local (managed by Claude's deploy script)
NEXT_PUBLIC_API_URL=https://imobi-api-xyz.railway.app
NEXT_PUBLIC_ENVIRONMENT=development
```

### Backend Env
```bash
# .env in services/api (managed by Railway dashboard)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
```

### Monorepo Root
```bash
# pnpm workspaces - automatic dependency resolution
# No additional env needed
```

---

## TESTING STRATEGY

### Unit Tests (Claude)
```typescript
// services/api/src/modules/obras/obras.service.spec.ts
describe('ObraService', () => {
  it('should create obra with default status', async () => {
    const result = await service.create(dto);
    expect(result.status).toBe('AGUARDANDO_HOMOLOGACAO');
  });
});
```

### Component Tests (Cursor)
```typescript
// apps/web/components/CreateObraForm.test.tsx
test('should submit form with valid data', async () => {
  render(<CreateObraForm />);
  await userEvent.type(screen.getByLabelText(/nome/i), 'My House');
  await userEvent.click(screen.getByRole('button', { name: /create/i }));
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### E2E Tests (Both)
```bash
# After both complete their tasks
pnpm test:e2e

# Tests:
# 1. User registers
# 2. User logs in
# 3. User creates obra
# 4. Obra appears in list
# 5. User can view obra details
```

---

## DEPLOYMENT FLOW

### Pre-launch (Day 1-2)

```
Claude                              Cursor
├─ Deploy API to Railway staging   ├─ Deploy frontend to Vercel staging
├─ Run migration tests             ├─ Run e2e tests
├─ Fix issues                      ├─ Fix issues
└─ Mark "ready for integration"    └─ Mark "ready for integration"
```

### Integration (Day 3 Morning)

```
Claude                              Cursor
├─ Run post-deploy-verification    ├─ Test in staging frontend
│  (checks all endpoints)          │  (against staging API)
├─ Generate metrics report         ├─ Report bugs/issues
└─ Approve for production          └─ Approve for production
```

### Go Live (Day 3 Afternoon)

```
Claude                              Cursor
├─ Run launch-checklist.sh         ├─ Test in production frontend
├─ Monitor API (Sentry alerts)     ├─ Monitor frontend (browser errors)
├─ Keep watch for 4 hours          ├─ Keep watch for 4 hours
└─ Announce soft launch            └─ Announce soft launch
```

---

## HANDOFF CHECKLIST

**Claude → Cursor**:
- [ ] API endpoints published (Swagger docs)
- [ ] Request/response schemas defined
- [ ] Error codes documented
- [ ] Rate limits configured
- [ ] All endpoints tested locally
- [ ] Deployed to staging

**Cursor → Claude**:
- [ ] UI designs finalized (Figma or screenshots)
- [ ] Forms validate with Zod schemas
- [ ] API integration tested locally
- [ ] Mobile responsive tested
- [ ] Accessibility checked (keyboard nav, screen reader)
- [ ] Deployed to Vercel staging

**Both**:
- [ ] E2E tests pass
- [ ] Performance targets met
- [ ] Security review complete
- [ ] Monitoring configured
- [ ] Runbooks written
- [ ] Launch announcement ready

---

## TROUBLESHOOTING

### "API endpoint not responding"
```bash
# Cursor: Check if Claude's API is running
curl https://imobi-api-xyz.railway.app/health

# Claude: Check Railway logs
# Railway dashboard → imobi-api → Logs
```

### "Type mismatch between frontend and API"
```bash
# Update @imbobi/schemas (both pull)
git pull origin main

# Regenerate Prisma types
pnpm db:generate

# Verify types
pnpm type-check
```

### "Form submission fails silently"
```bash
# Cursor: Check browser console (F12 → Console)
# Check network tab for API error response

# Claude: Check API logs
# Look for validation errors, database errors, etc.
```

---

## SUCCESS METRICS

**Technical**:
- [ ] 100% API endpoints implemented
- [ ] 100% test coverage (critical paths)
- [ ] Zero TypeScript errors
- [ ] Response time < 500ms p95
- [ ] Error rate < 1%

**Process**:
- [ ] Daily standups completed
- [ ] No blocked work (> 2 hours)
- [ ] All PRs reviewed within 30 min
- [ ] Zero production bugs

**User Experience**:
- [ ] Auth flow < 2 minutes (register to dashboard)
- [ ] All forms validate correctly
- [ ] Error messages are helpful
- [ ] Loading states clearly visible

---

**Status**: Ready for collaboration 🚀  
**Duration**: 3 days to soft launch  
**Go Live**: End of Day 3

Let's build together!
