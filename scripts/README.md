# Scripts ativos — Imobi

Stack: **Vercel + Render** · Branch: **`main`** · Ver [`../docs/DEPLOY_STACK.md`](../docs/DEPLOY_STACK.md)

## Deploy e env

| Script / comando | Uso |
|------------------|-----|
| `pnpm render:init` | Cria/sanitiza `.env.render.local` |
| `pnpm render:key:check` | Valida `RENDER_API_KEY` |
| `pnpm render:env:push` | Sincroniza env → Render |
| `pnpm vercel:env:push` | Sincroniza env → Vercel |
| `pnpm render:redeploy` | Redeploy API Render |
| `pnpm seed:staging:from-render` | Seed usuários teste (só API key) |

## Verificação pós-deploy

| Script | Uso |
|--------|-----|
| `scripts/post-deploy-verification.sh` | Smoke API (health, auth, simulador) |
| `scripts/deploy-orchestrator.sh [--yes]` | Orquestrador local |
| `scripts/launch-checklist.sh` | Checklist pré-launch |
| `scripts/pre-deploy-check.sh` | Gate antes de push |

## Legado

Scripts AWS/Railway em [`../docs/legacy/scripts/`](../docs/legacy/scripts/) — **não executar**.
