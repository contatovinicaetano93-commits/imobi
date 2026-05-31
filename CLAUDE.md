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

**FASE 2 (Escalabilidade)**: Meses 4-6
- ➕ Lambda/API Gateway em vez de NestJS local
- ➕ Vercel em vez de Next.js local
- ➕ SQS/SNS em vez de BullMQ + Redis
- ➕ CloudWatch centralizado (logs, métricas, alertas)

**FASE 3 (Compliance)**: Meses 7+
- ➕ Cognito (autenticação, MFA, social login)
- ➕ Secrets Manager (credenciais)
- ➕ WAF + Shield (segurança)
- ➕ Cost Optimization

### Ferramentas NÃO alinhadas com AWS (TODO)
| Ferramenta | Atual | AWS | Prioridade | Effort |
|-----------|-------|-----|-----------|--------|
| Email | Nodemailer | SES | 🔴 ALTA | 2h |
| Banco de dados | PostgreSQL local | RDS | 🔴 ALTA | 4h |
| Cache/Sessão | Redis local | ElastiCache | 🔴 ALTA | 3h |
| Filas | BullMQ + Redis | SQS/SNS | 🟡 MÉDIA | 8h |
| Observabilidade | Sentry | CloudWatch | 🟡 MÉDIA | 4h |
| Autenticação | JWT | Cognito | 🟢 BAIXA | 12h |
| API Server | NestJS local | Lambda | 🟡 MÉDIA | 12h |
| Web Frontend | Next.js local | Vercel | 🟢 BAIXA | 6h |

### Notas Importantes
- Manter Expo Mobile externo (OK — é a opção padrão)
- Prisma ORM é agnóstico, compatível com RDS
- BullMQ pode coexistir com SQS durante migração
- CloudWatch substitui Sentry mantendo mesma funcionalidade
