# Deploy stack — fonte única (Imobi)

**Última revisão:** jul 2026
**Decisão:** apenas **Vercel + Neon**. Render, Railway, AWS EC2 e Docker são legado.

## Arquitetura

```
┌──────────────────────────────────┐      ┌─────────────┐
│  Vercel — imobi-web              │─────►│  Neon       │
│  Next.js: páginas + app/api/v1/* │      │  Postgres   │
└──────────────────────────────────┘      └─────────────┘
```

Não existe mais serviço de API separado — `apps/web/app/api/v1/*` (route handlers) roda
dentro do mesmo deploy Next.js no Vercel. `packages/db` é a fonte única do schema Prisma.

## URLs canônicas

| Recurso | URL / ID |
|---------|----------|
| Web + API | https://imobi-web-ten.vercel.app |
| Vercel project | `imobi-web` (`prj_fluxM6jOm86QpNoMUY770c3q40Qc`) |
| Neon project | `imobi` |

## Secrets locais (gitignored)

| Arquivo | Uso |
|---------|-----|
| `.env.vercel.local` | `VERCEL_TOKEN` — só pra rodar `pnpm vercel:env:push` local |
| `apps/web/.env.local` | dev local — `JWT_SECRET`, `DATABASE_URL` (Neon), AWS, `EMAIL_PROVIDER` |

Todas as env vars de produção (DATABASE_URL, AWS_*, EMAIL_PROVIDER, JWT_SECRET, APP_URL)
ficam no Vercel (Production + Preview) — dashboard ou `pnpm vercel:env:push`.

## Comandos

```bash
pnpm db:generate          # gera Prisma Client (packages/db)
pnpm db:migrate           # nova migration em dev
pnpm db:migrate:deploy    # aplica migrations pendentes no Neon
pnpm db:studio            # abre Prisma Studio
pnpm seed:dev             # popula Neon com 1 usuário por papel
pnpm vercel:env:push      # sincroniza env vars locais pro Vercel
```

## Health check

```bash
curl https://imobi-web-ten.vercel.app/api/v1/health
```

Esperado: HTTP 200 e `"status":"ok"`, `database.status: "connected"`.

## Branch vs deploy

| Onde | Branch |
|------|--------|
| **GitHub (canônica)** | `main` |
| Vercel (auto-deploy Production) | `main` |
| Vercel (auto-deploy Preview) | qualquer branch/PR |

Push em `main` dispara deploy automático no Vercel — sem etapa manual.

## Vercel — config obrigatória

Dashboard → projeto `imobi-web` → Settings → General:

| Campo | Valor |
|-------|-------|
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && pnpm --filter @imbobi/schemas build && pnpm --filter @imbobi/core build && pnpm --filter @imbobi/db generate && pnpm --filter @imbobi/web build` |
| Production Branch | `main` |

O `pnpm --filter @imbobi/db generate` é obrigatório no build — o Prisma Client não é
gerado automaticamente via `postinstall` num pacote de workspace pnpm.

## Checklist pós-push

1. `curl` health → `"status":"ok"`
2. Login em https://imobi-web-ten.vercel.app/login (`admin@imobi.com.br` / `Admin@123`)
3. Se mudou o schema Prisma: `pnpm db:migrate:deploy` contra o Neon antes/depois do push

## Legado (não seguir)

- `docs/legacy/` — Railway, AWS EC2, Docker, NestJS/Render. Decomissionado jul/2026.
