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

## Remotion Setup

### Instalação
```bash
# Para usar no Next.js web app
pnpm --filter @imbobi/web add remotion

# Ou para criar um pacote compartilhado (recomendado)
pnpm --filter @imbobi/remotion add remotion
```

### Uso em Claude Code
- Remotion precisa de **FFmpeg instalado** no environment (executado automaticamente em SessionStart)
- Renderização de vídeos é computacionalmente pesada → use em workers/jobs via BullMQ
- Compositions devem ficar em `apps/web/src/remotion/` ou `packages/remotion/src/compositions/`
- Não commitar outputs de vídeo (`*.mp4`, `*.webm`) — usar S3

### Desenvolvimento
```bash
# Renderizar preview (requer Node.js 18+)
pnpm remotion render src/Composition.tsx output.mp4

# Studio interativo (apenas web, não funciona via SSH)
pnpm remotion studio
```

## Regras críticas
1. **Nunca commitar `.env`** — use `.env.example`
2. **GPS validation** ocorre em duas camadas: client (UX) + server (PostGIS). A validação server é incontornável.
3. Liberação de parcela é sempre assíncrona via BullMQ (`services/workers/liberacao-parcela.worker.ts`)
4. Schemas Zod são a fonte de verdade para validação — não duplicar regras em outros lugares
5. **Remotion em produção** → sempre via workers, nunca síncrono. Output vai para S3.
