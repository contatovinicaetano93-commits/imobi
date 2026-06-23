# Scripts ativos — Imobi

Stack: **Vercel + Render** · Branch: **`main`** · Ver [`../docs/DEPLOY_STACK.md`](../docs/DEPLOY_STACK.md)

## Comando único (use este)

| Comando | Uso |
|---------|-----|
| **`pnpm check:staging`** | Valida API + web staging (health, auth, simulador, `/login`) |
| `pnpm check:staging:local` | + `type-check` e build web |

URLs: `scripts/lib/staging-urls.mjs` (`STAGING_WEB_URL`, `STAGING_API_URL`).

## Env Render / Vercel

| Script / comando | Uso |
|------------------|-----|
| `pnpm render:init` | Cria/sanitiza `.env.render.local` |
| `pnpm render:key:check` | Valida `RENDER_API_KEY` |
| `pnpm render:env:push` | Sincroniza env → Render |
| `pnpm vercel:env:push` | Sincroniza env → Vercel |
| `pnpm render:redeploy` | Redeploy API Render |
| `pnpm seed:staging:from-render` | Seed usuários teste (só API key) |

## E2E

| Comando | Uso |
|---------|-----|
| `pnpm test:e2e:staging` | Playwright contra staging |
| `pnpm test:e2e:local` | E2E com servidores locais |

## Legado (não usar no dia a dia)

`post-deploy-verification.sh`, `launch-checklist.sh`, `deploy-orchestrator.sh`, `pre-deploy-check.sh` — mantidos para CI/debug; prefira **`pnpm check:staging`**.

Scripts AWS/Railway em [`../docs/legacy/scripts/`](../docs/legacy/scripts/).
