# 🏛️ Imobi — Guia Completo do Projeto

**Status**: MVP Fintech Resiliente, Escalável, API First  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`  
**Última atualização**: Junho 2026

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
- **Workers**: BullMQ (async jobs) → `services/workers`

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
│   ├── web/                    # Next.js 14 frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   ├── lib/                # Utilities (api client, sentry, etc)
│   │   └── next.config.js      # Build config
│   └── mobile/                 # Expo app
├── services/
│   ├── api/                    # NestJS main API
│   │   ├── src/modules/        # Modular structure
│   │   ├── prisma/             # Migrations + schema
│   │   └── nest-cli.json
│   └── workers/                # BullMQ async jobs
├── packages/                   # Shared packages
│   ├── @imbobi/schemas/        # Zod validation
│   ├── @imbobi/core/           # Hooks, utils, api-client
│   └── @imbobi/ui/             # Components (shadcn + RN)
├── docs/                       # Documentação
├── ARCHITECTURE_RESILIENCE_API_FIRST.md  # Master architecture guide
├── CLAUDE.md                   # Este arquivo
└── .cursorrules               # Cursor IDE rules

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
pnpm db:setup                   # PostgreSQL + migrations + seed

# Desenvolvimento
pnpm dev                        # Inicia web + api + mobile
pnpm dev:web                    # Apenas frontend
pnpm dev:api                    # Apenas backend

# Build & Type check
pnpm type-check                 # TypeScript em todos os packages
pnpm lint                       # ESLint
pnpm build                      # Build de produção (72/72 páginas)

# Database
pnpm db:migrate                 # Roda migrations Prisma
pnpm db:generate                # Regenera Prisma client
pnpm db:seed                    # Popula dados de teste

# Testing
pnpm test                       # Testes (ainda em implementação)
pnpm test:e2e                   # E2E tests (54+ assertions prontos)
```

---

## 📦 PACOTES COMPARTILHADOS

### `@imbobi/schemas`
- Zod validation schemas
- **Uso**: Validação client + server (fonte de verdade)
- **Nunca duplicar** regras de validação fora desse package

```typescript
import { usuarioSchema, obraSchema } from '@imbobi/schemas';

// Server
const usuario = usuarioSchema.parse(req.body);

// Client
const { register } = useForm({ resolver: zodResolver(usuarioSchema) });
```

### `@imbobi/core`
- React hooks (useAuth, useApi, etc)
- API client (tipo-seguro)
- Utilities (formatters, parsers)
- **Zero native dependencies** (funciona em web + mobile)

### `@imbobi/ui`
- Componentes base
- **Web**: shadcn/ui (Tailwind)
- **Mobile**: React Native equivalentes
- Design tokens (cores, tipografia, spacing)

---

## 🔐 REGRAS CRÍTICAS

### 1. Secrets & Environment
```bash
❌ NUNCA commitar .env
✅ Use .env.example com placeholders
✅ Credenciais apenas em Vercel/Railway dashboards
✅ Arquivo local: .env.vercel.local (git ignored)
```

### 2. Validação em Camadas
```typescript
// ✅ Sempre validar em AMBOS os lugares:

// Client (UX)
const { register } = useForm({ resolver: zodResolver(obraSchema) });

// Server (segurança)
const obra = obraSchema.parse(req.body);  // Throw se inválido

// GPS é especial: PostGIS no servidor é incontornável
```

### 3. Operações Assíncronas
```typescript
// ❌ NUNCA fazer sync em operações longas
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

// Nunca pular camadas!
```

---

## 🎯 ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: SOFT LAUNCH (2-3 semanas)
- ✅ OpenAPI 3.0 specification
- ✅ Circuit breaker em serviços críticos
- ✅ Observability básica (logs + alertas)
- ✅ Deploy blue-green em Vercel

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
- [ ] Load testing (1000+ usuarios)
- [ ] Security audit profissional
- [ ] Performance tuning
- [ ] Mobile app optimization

---

## 📊 ARQUITETURA DETALHADA

**Veja arquivo completo**: `ARCHITECTURE_RESILIENCE_API_FIRST.md`

Inclui:
- Padrões de resiliência (Circuit Breaker, Retry, Timeout, Bulkhead)
- Estratégias de escalabilidade (Sharding, Caching, Horizontal Scaling)
- API First design (OpenAPI, versionamento, rate limiting)
- Observabilidade (Structured Logging, Distributed Tracing, Metrics)
- Segurança (Zero Trust, Encryption, Audit Logs)
- Deployment (Blue-Green, Canary, Feature Flags)
- Data Management (Read Replicas, Backups, Event Sourcing)

---

## 👥 PAPÉIS E RESPONSABILIDADES

### Frontend Developer (Cursor/Human)
- Implementar componentes React/React Native
- Consumir APIs do backend
- Manter tipos sincronizados com Zod schemas
- Otimizar performance (bundle size, render)

### Backend Developer (Claude/Human)
- Implementar serviços NestJS
- Manter OpenAPI spec atualizada
- Implementar resiliência + observabilidade
- Otimizar queries PostgreSQL

### Architect (Claude)
- Desenhar arquitetura resiliente
- Definir padrões de design
- Revisar PRs para conformidade
- Documentar decisões

---

## 📚 DOCUMENTAÇÃO

- `CODE_REVIEW_AUDIT.md` — Análise de qualidade (7.8/10)
- `DETAILED_REVIEW_REPORT.md` — Review completo com recomendações
- `QUICK_START_PROVISIONING.md` — Setup de infraestrutura (Railway, Upstash, AWS, Firebase, SendGrid)
- `VERCEL_DEPLOYMENT_GUIDE.md` — Deploy em produção
- `ARCHITECTURE_RESILIENCE_API_FIRST.md` — Master architecture guide
- `API_ENDPOINTS.md` — Documentação REST (em `docs/`)

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
      // 1. Cache
      const cached = await this.cache.get(`obra:${id}`);
      if (cached) return cached;

      // 2. Database
      const obra = await this.db.obra.findUnique({
        where: { id },
        include: { etapas: true, creditos: true },
      });

      if (!obra) throw new NotFoundException('Obra not found');
      if (obra.usuarioId !== usuarioId) throw new ForbiddenException();

      // 3. Cache result
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

```typescript
import { obraSchema } from '@imbobi/schemas';
import { useApi } from '@imbobi/core';

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

### Build fails
```bash
pnpm install --force
rm -rf node_modules packages/*/node_modules
pnpm install
```

### Type errors
```bash
pnpm type-check
pnpm db:generate  # Regenera tipos Prisma
```

### API not responding
```bash
# Check logs
tail -f ~/.pm2/logs/imobi-api-error.log

# Check database
psql $DATABASE_URL -c "SELECT 1;"

# Check Redis
redis-cli ping
```

---

## 📞 CONTATOS & ESCALAÇÕES

- **Code Quality Issues**: Revisar `CODE_REVIEW_AUDIT.md`
- **Architecture Questions**: Ver `ARCHITECTURE_RESILIENCE_API_FIRST.md`
- **Security Concerns**: Implementar patterns em `docs/SECURITY.md`
- **Performance Issues**: Monitorar via Sentry/New Relic

---

## 🎯 PRÓXIMOS PASSOS

1. **Immediate** (hoje): Definir qual arquitetura implementar primeiro
2. **This week**: Começar Fase 1 (OpenAPI + Circuit Breaker + Observability)
3. **Next 2 weeks**: Integração com Vercel + primeiro soft launch
4. **Next month**: Escalabilidade + Security hardening

---

**Última atualização**: Junho 2026  
**Responsável**: Claude + Cursor (trabalho colaborativo)  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`
