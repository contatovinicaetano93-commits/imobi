# Deploy stack — fonte única (Imobi)

**Última revisão:** junho 2026  
**Decisão:** apenas **Vercel + Render**. Railway, AWS EC2 e docs antigos são legado.

## Arquitetura

```
┌─────────────────┐     HTTPS      ┌──────────────────────────────┐
│  Vercel         │ ──────────────►│  Render: imobi-api-staging   │
│  imobi-web      │  NEXT_PUBLIC_  │  + Postgres (imobi_prod)     │
│  .vercel.app    │  API_URL       │  + Redis                     │
└─────────────────┘                └──────────────────────────────┘
```

## URLs canônicas

| Recurso | URL / ID |
|---------|----------|
| Web | https://imobi-web.vercel.app |
| API staging (usar no Vercel) | https://imobi-api-staging.onrender.com |
| Render service staging | `srv-d8fl07h9rddc73ajs7ag` |
| API prod alternativa | https://imobi-api-efgg.onrender.com |
| Render service prod | `srv-d8hnpmflk1mc73fc1h3g` |
| Vercel project | `imobi-web` (`prj_fluxM6jOm86QpNoMUY770c3q40Qc`) |

**Não usar como referência:** `imobi.vercel.app`, `imobi-web-ten.vercel.app`, `api.imobi.render.com` (docs antigos).

## Secrets locais (gitignored)

| Arquivo | Uso |
|---------|-----|
| `.env.vercel.local` | `VERCEL_TOKEN`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL` |
| `.env.render.local` | `RENDER_API_KEY`, `DATABASE_URL`, AWS, Firebase, Redis |
| `apps/web/.env.local` | dev local — `JWT_SECRET` alinhado com a API |

## Comandos

```bash
pnpm render:env:verify   # valida DATABASE_URL, REDIS_*, JWT, CORS (sem expor secrets)
pnpm render:env:push
pnpm vercel:env:push
```

## Health check

Esperado: HTTP 200 e `"status":"ok"`.

Se `"status":"error"` com `redis.host` terminando em `\n`, rode `pnpm render:env:push` (o script faz `trim` em `REDIS_HOST`) ou corrija no dashboard Render.

## Branch vs deploy

| Onde | Branch |
|------|--------|
| **GitHub (canônica)** | `main` |
| Render / Vercel (auto-deploy) | `main` |
| Feature work | `feature/*` → PR → `main` |
| Produção (futuro) | tag `v*` (manual) |

**Não usar para deploy:** branches `claude/*` (legado de agentes).

Após push em `main`, Vercel e Render disparam automaticamente (se configurados no dashboard).

## GitHub Secrets (opcional)

| Secret | Uso |
|--------|-----|
| `SLACK_WEBHOOK_URL` | Alertas do health gate no CI |
| `VERCEL_TOKEN` | Apenas se usar `pnpm vercel:env:push` local |
| `RENDER_API_KEY`, `RENDER_SERVICE_ID` | Apenas se usar `pnpm render:redeploy` local |

Deploy de código: **auto-deploy** no push em `main` (Vercel + Render dashboards). CI não dispara deploy.

**Remover se existirem (legado Railway):** `RAILWAY_TOKEN`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID`

## Legado (não seguir)

- `docs/legacy/RAILWAY_*.md`, `docs/legacy/railway.toml.deprecated` — Railway pausado/removido (PostGIS/P3009)
- `scripts/deploy-api.sh` — AWS EC2, não usado
- `PRODUCTION_INFRASTRUCTURE_GUIDE.md` — mistura Railway/AWS; usar este arquivo

## Vercel (web) — config obrigatória

Dashboard → projeto `imobi-web` → Settings → General:

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/web` |
| Production Branch | `main` |

Sem `apps/web` como root, o deploy retorna **404** (build não encontra as rotas Next.js).

## Checklist pós-push

1. `curl` health staging → `ok`
2. `curl -s -o /dev/null -w "%{http_code}\n" https://imobi-web.vercel.app/login` → `200`
3. Login em https://imobi-web.vercel.app/login (tomador@imobi.com.br)
4. Se API mudou JWT: `pnpm vercel:env:push` + redeploy Vercel
