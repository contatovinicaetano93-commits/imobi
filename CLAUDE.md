# imobi — Guia do Projeto

**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab` (use `main` se a branch não existir localmente)  
**Última atualização**: Junho 2026

**Local path (Windows)**: `C:\Users\Usuário\Desktop\vini Claude\imobi`

---

## 📋 VISÃO GERAL

**Imobi** é uma plataforma fintech para crédito imobiliário com arquitetura profissional para:

- ✅ **Resiliência**: Circuit breaker, retry, timeout, bulkhead patterns
- ✅ **Escalabilidade**: Sharding, caching em 3 camadas, horizontal scaling
- ✅ **API First**: OpenAPI 3.0, versionamento, rate limiting
- ✅ **Observabilidade**: Structured logging, distributed tracing, metrics
- ✅ **Segurança**: Zero trust, encryption, audit logs

---

## 🏗️ STACK

### Frontend

- **Web**: Next.js 14 (App Router, SSR) → `apps/web`
- **Mobile**: Expo 51 + Expo Router (iOS/Android) → `apps/mobile`

### Backend

- **API**: NestJS + Fastify (modular, DI) → `services/api`
- **Workers**: BullMQ (async jobs) → `services/api/src/workers` (ou processo `main.worker.js`)

### Data Layer

- **Database**: PostgreSQL + PostGIS (geo queries)
- **Cache**: Redis (3-tier caching)
- **Storage**: AWS S3 (evidências, documentos)
- **ORM**: Prisma (type-safe)

### Infrastructure

- **Monorepo**: Turborepo + pnpm workspaces
- **Deployment**: Vercel (web), Render/Railway (api)
- **Monitoring**: Sentry, New Relic, UptimeRobot
- **CI/CD**: GitHub Actions

---

## 📁 ESTRUTURA DO PROJETO

```
imobi/
├── apps/
│   ├── web/              # Next.js 14 frontend
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities (api client, sentry, etc)
│   │   └── next.config.js
│   └── mobile/           # Expo app
├── services/
│   └── api/              # NestJS main API
│       ├── src/modules/  # Modular structure
│       ├── src/workers/  # BullMQ workers
│       └── prisma/       # Migrations + schema
├── packages/
│   ├── schemas/          # @imbobi/schemas — Zod validation
│   ├── core/             # @imbobi/core — Hooks, utils, api-client
│   └── ui/               # @imbobi/ui — Components
├── docs/
├── ARCHITECTURE_RESILIENCE_API_FIRST.md
├── COLLABORATIVE_WORKSPACE.md
├── CURSOR_PROMPT.md
├── CLAUDE.md             # Este arquivo
└── .cursorrules
```

---

## 🔑 PRINCÍPIOS DE DESIGN

### 1. Type Safety First

```typescript
// ✅ Sempre usar tipos específicos, nunca `any`
// ✅ TypeScript strict mode em todos os packages
// ✅ Zod schemas como fonte de verdade
```

### 2. API First

```typescript
// ✅ OpenAPI 3.0 specification antes de código
// ✅ Versionamento semântico (v1, v2, v3)
// ✅ Sem breaking changes
```

### 3. Resilient by Default

```typescript
// ✅ Circuit breaker em serviços externos
// ✅ Retry com exponential backoff
// ✅ Timeout + fallback em todas as operações
```

### 4. Observable Everything

```typescript
// ✅ Structured logging (JSON)
// ✅ Distributed tracing em operações críticas
// ✅ Prometheus metrics
```

---

## 🚀 COMANDOS ESSENCIAIS

```bash
# Setup
pnpm install                    # Instala tudo
pnpm db:setup                   # PostgreSQL + migrations + seed (se disponível)

# Desenvolvimento
pnpm dev                        # Inicia web + api
pnpm dev:web                    # Apenas frontend
pnpm dev:api                    # Apenas backend

# Build & Type check
pnpm type-check                 # TypeScript em todos os packages
pnpm lint                       # ESLint
pnpm build                      # Build de produção

# Database
pnpm db:migrate                 # Roda migrations Prisma
pnpm db:generate                # Regenera Prisma client
pnpm db:seed                    # Popula dados de teste

# Testing
pnpm test                       # Testes unitários
pnpm test:e2e                   # E2E tests

# Workers (produção)
cd services/api && pnpm start:worker
```

---

## 📦 PACOTES COMPARTILHADOS

### `@imbobi/schemas`

Zod validation schemas — fonte de verdade. Nunca duplicar regras fora deste package.

```typescript
import { usuarioSchema, obraSchema } from '@imbobi/schemas';

// Server
const usuario = usuarioSchema.parse(req.body);

// Client
const { register } = useForm({ resolver: zodResolver(usuarioSchema) });
```

### `@imbobi/core`

- React hooks (`useAuth`, `useApi`, etc)
- API client tipo-seguro
- Utilities (formatters, parsers)
- Zero native dependencies (web + mobile)

### `@imbobi/ui`

- Web: shadcn/ui (Tailwind)
- Mobile: React Native equivalentes
- Design tokens

---

## 🔐 REGRAS CRÍTICAS

### 1. Secrets & Environment

- ❌ NUNCA commitar `.env`
- ✅ Use `.env.example` com placeholders
- ✅ Credenciais em Vercel/Railway dashboards
- ✅ Arquivo local: `.env.local` (git ignored)

### 2. Validação em Camadas

```typescript
// Client (UX)
const { register } = useForm({ resolver: zodResolver(obraSchema) });

// Server (segurança)
const obra = obraSchema.parse(req.body);

// GPS: PostGIS no servidor é incontornável
```

### 3. Operações Assíncronas

```typescript
// ✅ SEMPRE usar BullMQ para:
// - Liberação de parcela
// - Aprovação KYC
// - Envio de notificações
// - Relatórios pesados

await this.queue.add('liberacao-parcela', { creditoId }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

### 4. Arquitetura em Camadas

```
Controller (HTTP endpoint)
    ↓
Service (lógica de negócio)
    ↓
Repository (Prisma/DB)
    ↓
Database
```

---

## 🎯 ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: SOFT LAUNCH (2-3 semanas)

- [x] OpenAPI 3.0 specification (documentado)
- [x] Circuit breaker em serviços críticos (parcial)
- [x] Observability básica (logs + Sentry parcial)
- [ ] Deploy blue-green em Vercel

### Fase 2: ESCALABILIDADE (3-4 semanas)

- [ ] Data sharding por usuário/obra
- [ ] Read replicas PostgreSQL
- [ ] Horizontal scaling (K8s/Docker)
- [ ] Cache distribuído (Redis)

### Fase 3: HARDENING (2-3 semanas)

- [ ] Distributed tracing completo
- [ ] Audit logs imutáveis (Event Sourcing)
- [ ] Encryption at rest + transit
- [ ] Rate limiting por tier

### Fase 4: OPTIMIZATION (2-4 semanas)

- [ ] Load testing (1000+ usuários)
- [ ] Security audit profissional
- [ ] Performance tuning
- [ ] Mobile app optimization

---

## 📊 ARQUITETURA DETALHADA

Veja: `ARCHITECTURE_RESILIENCE_API_FIRST.md`

---

## 👥 PAPÉIS E RESPONSABILIDADES

| Papel | Quem | Foco |
|-------|------|------|
| Frontend | Cursor | React, React Native, UI/UX |
| Backend | Claude | NestJS, DB, APIs, resiliência |
| Architect | Claude | Padrões, revisão, documentação |

---

## 📚 DOCUMENTAÇÃO

| Arquivo | Conteúdo |
|---------|----------|
| `CURSOR_PROMPT.md` | Onboarding Cursor, prioridades A–E |
| `COLLABORATIVE_WORKSPACE.md` | Tracker de progresso |
| `.cursorrules` | Padrões de código |
| `ARCHITECTURE_RESILIENCE_API_FIRST.md` | Arquitetura master |
| `docs/API_ENDPOINTS.md` | REST API |
| `CODE_REVIEW_AUDIT.md` | Qualidade (7.8/10) |
| `DETAILED_REVIEW_REPORT.md` | Review completo |

---

## 🔍 PADRÕES DE CÓDIGO

### NestJS Service com Resiliência

```typescript
@Injectable()
export class ObraService {
  constructor(
    private db: PrismaService,
    private cache: RedisService,
    private logger: LoggerService,
  ) {}

  async getObra(id: string, usuarioId: string) {
    try {
      const cached = await this.cache.get(`obra:${id}`);
      if (cached) return cached;

      const obra = await this.db.obra.findUnique({
        where: { id },
        include: { etapas: true, creditos: true },
      });

      if (!obra) throw new NotFoundException('Obra not found');
      if (obra.usuarioId !== usuarioId) throw new ForbiddenException();

      await this.cache.set(`obra:${id}`, obra, 'EX', 600);
      return obra;
    } catch (error) {
      this.logger.error('getObra failed', { obraId: id, error });
      throw error;
    }
  }
}
```

### React Component com Type Safety

```tsx
import { obraSchema } from '@imbobi/schemas';
import { useApi } from '@imbobi/core';
import type { z } from 'zod';

export function ObraCard({ obra }: { obra: z.infer<typeof obraSchema> }) {
  const { data: detalhes, loading } = useApi(
    () => fetch(`/api/obras/${obra.id}`),
    [obra.id]
  );

  if (loading) return <Skeleton />;
  return <div>{detalhes?.nome}</div>;
}
```

---

## 🛠️ DEBUGGING & TROUBLESHOOTING

**Build fails**

```bash
pnpm install --force
rm -rf node_modules packages/*/node_modules
pnpm install
```

**Type errors**

```bash
pnpm type-check
pnpm db:generate
```

**API not responding**

- Verificar `DATABASE_URL`, `REDIS_URL`
- Health: `GET /api/v1/health`
- Logs do processo API / Render dashboard

---

## 🎯 PRÓXIMOS PASSOS

1. **Cursor**: Escolher prioridade A–E em `CURSOR_PROMPT.md`
2. **Esta semana**: Fase 2 build + primeira feature frontend
3. **Soft launch**: Env vars + Vercel + validação E2E

---

**Última atualização**: Junho 2026  
**Responsável**: Claude + Cursor (trabalho colaborativo)  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`
