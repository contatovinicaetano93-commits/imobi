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

## Fluxo de trabalho inteligente

### Quando fazer push
Não faça push após cada correção isolada. Acumule mudanças até fechar uma **unidade lógica completa**:
- Uma sessão de revisão de bugs → 1 commit com todos os fixes da sessão
- Uma feature nova do início ao fim → 1 ou poucos commits organizados por camada
- Uma tarefa de refactor → 1 commit quando o módulo estiver completo

Antes de commitar, pergunte: *"Tem mais algo relacionado que seria natural incluir aqui?"*

### Pipeline de produção
```
feature branch → PR review → staging → smoke tests → merge main → produção
```
- Branch de trabalho: `claude/relaxed-goldberg-Bx6o1`
- Nunca push direto em `main`
- Antes de deploy: `pnpm type-check && pnpm build`

### Prioridade de revisão por sessão
1. **Segurança** — auth bypass, vazamento de dados, cache sem isolamento
2. **Correção de negócio** — lógica errada que afeta fluxo financeiro ou de aprovação
3. **Atomicidade** — race conditions, transações incompletas, filas sem rollback
4. **Qualidade** — duplicações, tipos `as never`, constantes soltas

### Uso eficiente de tokens
- `graphify query` — gratuito, usar para navegar o código antes de ler arquivos
- Subagents — caro e limitado semanalmente; só para extração paralela de grafo
- Ler arquivos diretamente só após confirmar via grafo qual arquivo é relevante
