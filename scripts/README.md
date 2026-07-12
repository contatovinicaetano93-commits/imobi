# Scripts ativos — Imobi

Stack: **Vercel + Neon** · Branch: **`main`** · Ver [`../docs/DEPLOY_STACK.md`](../docs/DEPLOY_STACK.md)

## Deploy / env

| Comando | Uso |
|---------|-----|
| `pnpm vercel:env:push` | Sincroniza env local → Vercel (`scripts/vercel-push-env.mjs`) |
| `pnpm db:migrate:deploy` | Aplica migrations pendentes no Neon |
| `pnpm seed:dev` | Popula 1 usuário por papel (admin/fundo/eng/cliente) |

## E2E

| Comando | Uso |
|---------|-----|
| `pnpm test:e2e:local` | E2E com servidor Next.js local (`scripts/run-e2e-local.mjs`) |

## Legado (não usar)

Scripts de Render/Railway/AWS EC2 e Docker foram removidos (decomissionado jul/2026).
Scripts AWS/Railway antigos em [`../docs/legacy/scripts/`](../docs/legacy/scripts/).
