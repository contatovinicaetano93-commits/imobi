# 🚀 START HERE — Vercel + Neon

**Stack canônica:** web + API no **Vercel** (route handlers em `apps/web/app/api/v1`), banco no **Neon**.
**Fonte única:** [`docs/DEPLOY_STACK.md`](docs/DEPLOY_STACK.md)

Render, Railway, AWS EC2 e Docker estão **descontinuados** (legado em `docs/legacy/`).

---

## URLs em produção

| Serviço | URL |
|---------|-----|
| Web + API | https://imobi-web-ten.vercel.app |

---

## STEP 0: Branch canônica

Todo deploy usa **`main`**. Após merge, Vercel dispara automaticamente.

```bash
git checkout main && git pull origin main
```

---

## STEP 1: Verificar API (2 min)

```bash
curl -s https://imobi-web-ten.vercel.app/api/v1/health | jq .
# Esperado: "status": "ok"
```

---

## STEP 2: Dev local

```bash
pnpm install
pnpm db:generate     # gera Prisma Client
cp apps/web/.env.local.example apps/web/.env.local  # se não existir, criar com DATABASE_URL do Neon + JWT_SECRET
pnpm dev              # sobe o Next.js (web + API) em localhost:3000
pnpm seed:dev          # popula 1 usuário por papel (admin/fundo/eng/cliente@imobi.com.br)
```

---

## STEP 3: Vercel — se web retorna 404 ou erro de build

No dashboard Vercel → projeto **`imobi-web`** → Settings → General:

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/web` |
| Framework | Next.js |
| Production Branch | `main` |
| Build Command | *(deixar vazio — usa `apps/web/vercel.json`)* |

Env vars obrigatórias (Production + Preview): `DATABASE_URL`, `JWT_SECRET`, `AWS_*`, `EMAIL_PROVIDER`, `APP_URL`.

```bash
pnpm vercel:env:push
# Redeploy: Deployments → ... → Redeploy (ou push em main)
```

Validar: `curl -s -o /dev/null -w "%{http_code}\n" https://imobi-web-ten.vercel.app/login` → `200`

---

## STEP 4: Deploy de código

Push em `main` → Vercel auto-deploy. CI (`ci-cd.yml`) roda type-check, lint, build e health gate pós-deploy.

---

## Comandos úteis

```bash
pnpm dev              # web + API local (mesmo processo)
pnpm db:migrate       # nova migration em dev
pnpm db:migrate:deploy # aplica migrations pendentes no Neon
pnpm type-check       # antes de push
```

---

## Legado (não usar)

- `docs/legacy/` — Railway, AWS EC2, Docker, NestJS/Render (decomissionado jul/2026)

---

## Próximo passo após checklist verde

1. Login em https://imobi-web-ten.vercel.app/login
2. Seguir roadmap em `CLAUDE.md`
