# Web IMOBI — dev local

**Stack oficial:** Vercel (web) + Render (API + Postgres + Redis). Railway não é usado.

| Ambiente | URL |
|----------|-----|
| Web (produção) | https://imobi-web.vercel.app |
| API staging (padrão Vercel/E2E) | https://imobi-api-staging.onrender.com |
| API alternativa | https://imobi-api-efgg.onrender.com (`imobi-api` no Render) |

Guia completo: [`docs/DEPLOY_STACK.md`](../../docs/DEPLOY_STACK.md)

## Setup local

```bash
cd imobi
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
# JWT_SECRET = mesmo valor da API (local ou staging)
pnpm dev:web
```

Abra http://localhost:3000

## Modos de API

| Modo | `NEXT_PUBLIC_API_URL` | Quando |
|------|------------------------|--------|
| Staging | `https://imobi-api-staging.onrender.com` | Padrão sem API local |
| Local | `http://localhost:4000` | Com `pnpm dev:api` |

## Login teste (staging / seed)

| Perfil | Email | Senha |
|--------|-------|-------|
| Tomador | tomador@imobi.com.br | Tomador@123 |
| Gestor | gestor@imobi.com.br | Gestor@123 |
| Admin | admin@imobi.com.br | Admin@123 |

## Comandos úteis

```bash
pnpm vercel:env:push          # JWT + API URL → Vercel (secrets em .env.vercel.local)
pnpm render:env:push          # env API → Render staging
pnpm render:redeploy          # redeploy API staging
curl https://imobi-api-staging.onrender.com/api/v1/health
```

## Render — se gestor der 403

1. [Render Dashboard](https://dashboard.render.com) → `imobi-api-staging`
2. Manual Deploy → latest commit
3. Health: `GET …/api/v1/health` → `"status":"ok"`
4. Logout/login no site (JWT antigo pode ter role desatualizada)

Com `SETUP_SECRET` no Render:

```
GET https://imobi-api-staging.onrender.com/api/v1/setup?secret=SEU_SETUP_SECRET
```
