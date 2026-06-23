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

## STEP 1: Verificar API (2 min)

```bash
curl -s https://imobi-api-staging.onrender.com/api/v1/health | jq .
# Esperado: "status": "ok"
```

Se falhar: cold start do Render (aguarde ~30s) ou `pnpm render:redeploy`.

---

## STEP 2: Sincronizar env vars (5 min)

Secrets locais (gitignored):

- `.env.render.local` — API (Postgres, Redis, JWT, AWS, SendGrid)
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

## STEP 4: Deploy de código

| Onde | Como |
|------|------|
| **Render** | Push na branch conectada no dashboard (ou `pnpm render:redeploy`) |
| **Vercel** | Push na branch do projeto `imobi-web` (auto-deploy) |
| **CI** | GitHub Actions valida build (`ci-cd.yml`, `deploy-api.yml` = quality gate) |

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
