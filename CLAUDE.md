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

## Estratégia de commits e deploy

### Agrupe antes de fazer push
- **Nunca fazer push de um arquivo isolado.** Reúna todas as mudanças relacionadas em um único commit antes de qualquer `git push`.
- Pergunte-se: "existe algo mais nesta área que deveria ser corrigido junto?" antes de commitar.
- Exemplos de agrupamentos naturais:
  - Todos os bugs de segurança de uma sessão → 1 commit `fix(security): ...`
  - Refactor de um módulo inteiro → 1 commit `refactor(modulo): ...`
  - Novos testes para features existentes → 1 commit `test: ...`
  - Ajustes de config/infra → 1 commit `chore: ...`

### Pipeline de produção
```
feature branch → PR review → staging deploy → smoke tests → merge main → produção
```
- **Nunca fazer push direto em `main`.**
- Branch de trabalho padrão: `claude/relaxed-goldberg-Bx6o1`
- Antes de qualquer deploy, rodar: `pnpm type-check && pnpm build`

### Prioridade de tarefas em uma sessão
1. **Segurança** — bugs que expõem dados ou bypass de auth
2. **Correção** — lógica de negócio errada (ex: liberar parcela sem evidência)
3. **Atomicidade** — race conditions, transações incompletas
4. **Qualidade** — constantes duplicadas, tipos `as never`, código morto
5. **Docs/infra** — CLAUDE.md, scripts, configs

### Regra de tokens
- Usar subagents só para extração paralela de grafo — custo alto
- Queries ao grafo (`graphify query`) são gratuitas, usar livremente
- Gemini requer billing ativo no projeto "Gemini imobi" (aistudio.google.com)
- Subagents têm limite semanal — reservar para tarefas que realmente precisam de paralelismo
