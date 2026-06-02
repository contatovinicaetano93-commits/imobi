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
2. **GPS validation** ocorre em duas camadas: client (UX) + server (aplicação). A validação server é incontornável.
3. Liberação de parcela é sempre assíncrona via BullMQ (`services/workers/liberacao-parcela.worker.ts`)
4. Schemas Zod são a fonte de verdade para validação — não duplicar regras em outros lugares

## Arquitetura AWS - Centralização de Ferramentas
**Princípio**: Tudo que for possível, deve estar centralizado em AWS (empresa/grupo). Usar modelo free até a validade.

### Roadmap de Migração AWS
**FASE 1 (MVP - Free Tier)**: Meses 1-3
- ✅ S3 (já implementado)
- ➕ SES (email) em vez de Nodemailer — 50k emails/dia grátis
- ➕ RDS PostgreSQL em vez de local — 750h/mês t2.micro
- ➕ ElastiCache (Redis) em vez de local — cache.t2.micro free
- Nodemailer → SES: Update `services/api/src/modules/email/email.service.ts`

**FASE 2 (Escalabilidade Inteligente)**: Meses 6-12
- ➕ ECS Fargate + ALB em vez de NestJS local (servidor 24/7, escalável, ~70% mais barato que Lambda)
- ➕ Vercel em vez de Next.js local ✅ (Next.js nativo)
- ➕ RDS PostgreSQL (~20-30% economia)
- ➕ ElastiCache Redis (~80% economia)
- ➕ **Keep BullMQ + Redis** (escala bem até 10k jobs/dia, depois EventBridge Phase 3)
- ➕ CloudWatch + X-Ray (observabilidade centralizada, replace Sentry)

**FASE 3 (Compliance & Enterprise)**: Meses 12+
- ➕ EventBridge (async cross-service, replace BullMQ depois escalar)
- ➕ Cognito (autenticação, MFA, social login)
- ➕ Lambda (apenas para webhooks/triggers, não servidor principal)
- ➕ WAF + Shield (segurança)
- ➕ Cost Optimization & RI (Reserved Instances)

### Roadmap de Migração AWS (Revisado)
| Ferramenta | Atual | Phase 1 | Phase 2 | Phase 3 | Effort | Economia |
|-----------|-------|---------|---------|---------|--------|----------|
| Email | Nodemailer | **SES** ✅ | — | — | 2h | 90% ⬆️ |
| Banco de dados | PostgreSQL local | RDS | — | — | 4h | 20-30% ⬆️ |
| Cache/Sessão | Redis local | ElastiCache | — | — | 3h | 80% ⬆️ |
| **API Server** | NestJS local | — | **ECS Fargate+ALB** | — | 8h | 40% ⬆️ |
| Filas | BullMQ+Redis | — | **Keep BullMQ** | EventBridge | 0h | 0% (já pago) |
| Observabilidade | Sentry | — | **CloudWatch+X-Ray** | — | 4h | 50% ⬆️ |
| Frontend Web | Next.js local | — | **Vercel** | — | 2h | 60% ⬆️ |
| Autenticação | JWT | — | — | **Cognito** | 12h | Enterprise |

### Notas Importantes (Atualizado)
- ✅ **Manter Expo Mobile externo** — é a opção padrão, não precisa migração
- ✅ **Prisma ORM é agnóstico** — funciona com RDS sem mudanças
- ✅ **Keep BullMQ em Phase 2** — escala bem, apenas migrar para EventBridge em Phase 3 se necessário
- ✅ **CloudWatch + X-Ray** — substitui Sentry, integrado com AWS, economiza custos
- ⚠️ **Lambda NÃO é adequado para NestJS** — usar ECS Fargate (servidor 24/7, melhor custo para workload contínuo)
- ⚠️ **SQS/SNS para BullMQ é prematuro** — manter BullMQ, usar EventBridge apenas para comunicação cross-service em Phase 3

### Custo Estimado por Phase
**Phase 1 (Current)**: ~$150/mês (S3, SES, local resources)
**Phase 2 (Scalable)**: ~$195/mês (RDS, ElastiCache, ECS Fargate, Vercel, CloudWatch)
**Phase 3 (Enterprise)**: ~$300-400/mês (EventBridge, Cognito, WAF, RI discounts)
