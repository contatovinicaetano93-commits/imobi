# 🚀 START HERE — Vercel + Render

**Stack canônica:** web no **Vercel**, API no **Render**.  
**Fonte única:** [`docs/DEPLOY_STACK.md`](docs/DEPLOY_STACK.md)

Railway e AWS EC2 estão **bloqueados** (legado em `docs/legacy/`).

---

## URLs em produção

| Serviço | URL |
|---------|-----|
| Web | https://imobi-web.vercel.app |
| API staging | https://imobi-api-staging.onrender.com |
| API prod | https://imobi-api-efgg.onrender.com |

---

## STEP 0: Branch canônica

Todo deploy usa **`main`**. Após merge, Vercel e Render disparam automaticamente.

```bash
git checkout main && git pull origin main
```

---

## STEP 1: Verificar API (2 min)

```bash
curl -s https://imobi-api-staging.onrender.com/api/v1/health | jq .
# Esperado: "status": "ok"
```

Se falhar: cold start do Render (aguarde ~30s) ou `pnpm render:redeploy`.

---

## STEP 2: Secrets Render (5 min)

```bash
pnpm render:init          # cria/sanitiza .env.render.local (remove … inválido)
# Edite .env.render.local → RENDER_API_KEY=rnd_SUA_CHAVE_REAL (dashboard Render)
pnpm render:key:check     # deve mostrar OK
pnpm seed:staging:from-render
```

Secrets locais (gitignored):

- `.env.render.local` — `RENDER_API_KEY` (mínimo para seed) + demais vars para `render:env:push`
- `.env.vercel.local` — Web (`JWT_SECRET`, `NEXT_PUBLIC_API_URL`)

```bash
pnpm render:env:push
pnpm vercel:env:push
```

---

## STEP 3: Orquestrador + checklist (15 min)

```bash
bash scripts/deploy-orchestrator.sh
# ou com URL explícita:
bash scripts/deploy-orchestrator.sh https://imobi-api-staging.onrender.com

bash scripts/launch-checklist.sh https://imobi-api-staging.onrender.com
```

O orchestrator verifica health, roda smoke de auth e configura `apps/web/.env.local`.

---

## STEP 4: Vercel — se web retorna 404

No dashboard Vercel → projeto **`imobi-web`** → Settings → General:

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Production Branch | `main` |
| Build Command | *(deixar vazio — usa `apps/web/vercel.json`)* |

Depois:

```bash
pnpm vercel:env:push
# Redeploy: Deployments → ... → Redeploy (ou push em main)
```

Validar: `curl -s -o /dev/null -w "%{http_code}\n" https://imobi-web.vercel.app/login` → `200`

---

## STEP 5: Deploy de código

| Onde | Como |
|------|------|
| **Render** | Push em `main` (auto-deploy) ou `pnpm render:redeploy` |
| **Vercel** | Push em `main` no projeto `imobi-web` (auto-deploy) |
| **CI** | GitHub Actions: quality gate + health gate (`ci-cd.yml`, `deploy-api.yml`) |

**Sync com Claude:** [`docs/CLAUDE_SYNC.md`](docs/CLAUDE_SYNC.md)

---

## Comandos úteis

```bash
pnpm dev              # web + api local
pnpm dev:api          # só API
pnpm render:redeploy  # força redeploy Render
pnpm type-check       # antes de push
```

---

## Legado (não usar)

- `docs/legacy/RAILWAY_*.md`, `railway.toml`
- `scripts/deploy-api.sh` (AWS EC2)
- Secrets `RAILWAY_*` no GitHub

---

## Próximo passo após checklist verde

1. Login em https://imobi-web.vercel.app/login
2. `bash scripts/setup-monitoring.sh https://imobi-api-staging.onrender.com`
3. Seguir roadmap em `CLAUDE.md`
