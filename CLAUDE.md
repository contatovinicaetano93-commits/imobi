# imbobi — Guia do Projeto

## Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Web**: Next.js 14 (App Router) — `apps/web`
- **Mobile**: Expo 51 + Expo Router — `apps/mobile`
- **API**: NestJS + Fastify — `services/api`
- **DB**: PostgreSQL + PostGIS via Prisma ORM
- **Cache/Filas**: Redis + BullMQ
- **Storage**: AWS S3 (fotos de obra)

## Comandos essenciais
```bash
pnpm install          # instala tudo
pnpm dev              # inicia web + api em paralelo
pnpm db:migrate       # roda migrations Prisma
pnpm db:generate      # regenera Prisma client
pnpm type-check       # checagem TypeScript em todos os pacotes
pnpm build            # build de produção
```

## Pacotes compartilhados
- `@imbobi/schemas` — Zod schemas (validação web + mobile + api)
- `@imbobi/core` — hooks, utils, api-client (zero deps nativas)
- `@imbobi/ui` — componentes base (web: shadcn | native: RN)

## Regras críticas
1. **Nunca commitar `.env`** — use `.env.example`
2. **GPS validation** ocorre em duas camadas: client (UX) + server (PostGIS). A validação server é incontornável.
3. Liberação de parcela é sempre assíncrona via BullMQ (`services/workers/liberacao-parcela.worker.ts`)
4. Schemas Zod são a fonte de verdade para validação — não duplicar regras em outros lugares

## Guia de modelo por tarefa

Use esta tabela para escolher o modelo certo ao abrir uma nova aba/sessão:

| Tarefa | Modelo |
|--------|--------|
| Fix de schema / ajustes Zod | Sonnet 4.6 |
| E2E Testing (Playwright) | Sonnet 4.6 |
| Fix Terraform ALB duplicado | Sonnet 4.6 |
| Migração Nodemailer → SES | Sonnet 4.6 |
| Bugs de frontend / API isolados | Sonnet 4.6 |
| Arquitetura Phase 2 AWS (ECS, RDS, ElastiCache) | Opus 4.7 |
| Refactor de lógica de negócio complexa | Opus 4.7 |
| Bug difícil de rastrear cross-service | Opus 4.7 |
| Design de sistema / decisões de trade-off | Opus 4.7 |

**Regra geral:** Sonnet para execução, Opus para raciocínio arquitetural ou debugging não-óbvio.
