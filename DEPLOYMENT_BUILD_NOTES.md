# Deployment Build Notes — Imobi MVP

**Date**: June 23, 2026  
**Stack canônica**: Vercel (web) + Render (API). Ver `docs/DEPLOY_STACK.md`.

---

## Build Status

### Frontend (Next.js)

```bash
pnpm --filter @imbobi/web build
```

Vercel usa `apps/web/vercel.json` com `pnpm install --frozen-lockfile` na raiz do monorepo.

### Backend (NestJS)

```bash
pnpm build:api
# schemas → core → prisma generate → nest build
```

### Docker (Render)

```bash
docker build -f services/api/Dockerfile -t imobi-api:prod .
# Imagem usada pelo serviço imobi-api-staging no Render
```

---

## Deployment

### Vercel (web)

1. Push na branch conectada ao projeto `imobi-web`
2. Env: `pnpm vercel:env:push` (secrets em `.env.vercel.local`, gitignored)
3. URL: https://imobi-web.vercel.app

### Render (API)

1. Push na branch `main` (ou configurada no dashboard)
2. Env: `pnpm render:env:push` (secrets em `.env.render.local`, gitignored)
3. Health: `curl -s https://imobi-api-staging.onrender.com/api/v1/health`

---

## CI verification (local)

```bash
pnpm install --frozen-lockfile
pnpm --filter @imbobi/schemas build
pnpm --filter @imbobi/core build
pnpm db:generate
pnpm type-check
pnpm build:api
```

---

## Checklist

| Component | Command | Target |
|-----------|---------|--------|
| Web | `pnpm --filter @imbobi/web build` | Vercel |
| API | `pnpm build:api` | Render |
| Health | `curl …/api/v1/health` | `status: ok` |

**Railway e AWS EC2 não fazem parte do deploy ativo** — ver `.cursor/rules/deploy-stack.mdc`.
