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
| Web | https://imobi-web-ten.vercel.app |
| API staging (usar no Vercel) | https://imobi-api-staging.onrender.com |
| Render service staging | `srv-d8fl07h9rddc73ajs7ag` |
| API prod alternativa | https://imobi-api-efgg.onrender.com |
| Render service prod | `srv-d8hnpmflk1mc73fc1h3g` |
| Vercel project | `imobi-web` (`prj_fluxM6jOm86QpNoMUY770c3q40Qc`) |

**Não usar como referência:** `imobi.vercel.app`, `imobi-web.vercel.app` (alias antigo), `api.imobi.render.com`

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

Após push em `main`, Vercel e **imobi-api-staging** disparam automaticamente. **imobi-api** (prod) é deploy manual — ver seção abaixo.

## Render — pipeline minutes e auto-deploy

O workspace Render tem cota mensal de **pipeline minutes** (build/deploy). Ao esgotar ou atingir o **spend limit**, novos builds são bloqueados (Manual Deploy e auto-deploy param; a API em execução continua na versão anterior).

### Tempos médios observados (jun/2026)

| Serviço | Runtime | ~minutos/deploy |
|---------|---------|-----------------|
| `imobi-api-staging` | Node | **~3,6 min** |
| `imobi-api` (prod) | Docker | **~1,2 min** |

Cada push em `main` com auto-deploy nos **dois** serviços consome ~**5 min**. No plano Hobby (~500 min/mês), isso dá ~100 pushes/mês.

### Política vigente (não atrapalha o negócio)

| Serviço | Auto-deploy em `main` | Por quê |
|---------|----------------------|---------|
| **imobi-api-staging** | **Sim** | É a API que o Vercel usa (`NEXT_PUBLIC_API_URL` / fallback em `apps/web/lib/api-base.ts`) |
| **imobi-api** (prod) | **Não** (manual) | URL alternativa / reserva; usuários do app **não** dependem dela hoje |

Desligar auto-deploy só na prod **não quebra** login, dashboard, assistente nem fluxos de crédito — o web em https://imobi-web-ten.vercel.app fala com **staging**.

### Quando usar prod manual

- Release formal (tag `v*`) ou cutover futuro para domínio/API dedicada
- Testar paridade Docker antes de promover
- Comando: Render → `imobi-api` → **Manual Deploy**, ou `RENDER_SERVICE_ID=srv-d8hnpmflk1mc73fc1h3g pnpm render:redeploy`

### Se builds bloquearem de novo

1. Render → **Billing** → uso de pipeline minutes
2. Aumentar **monthly spend limit** (com cartão) ou aguardar reset do ciclo
3. Validar local antes do push: `pnpm build --filter=@imbobi/api`
4. Evitar vários pushes pequenos no mesmo dia; agrupar commits

## GitHub Secrets (opcional)

| Secret | Uso |
|--------|-----|
| `SLACK_WEBHOOK_URL` | Alertas do health gate no CI |
| `VERCEL_TOKEN` | Apenas se usar `pnpm vercel:env:push` local |
| `RENDER_API_KEY`, `RENDER_SERVICE_ID` | Apenas se usar `pnpm render:redeploy` local |

Deploy de código: **auto-deploy** no push em `main` (Vercel + **imobi-api-staging**). **imobi-api** prod: manual.

**Remover se existirem (legado Railway):** `RAILWAY_TOKEN`, `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID`

## Legado (não seguir)

- `docs/legacy/RAILWAY_*.md`, `docs/legacy/railway.toml.deprecated` — Railway pausado/removido (PostGIS/P3009)
- `docs/legacy/scripts/deploy-api.sh` — AWS EC2, não usado
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
2. `curl -s -o /dev/null -w "%{http_code}\n" https://imobi-web-ten.vercel.app/login` → `200`
3. Login em https://imobi-web-ten.vercel.app/login (tomador@imobi.com.br)
4. Se API mudou JWT: `pnpm vercel:env:push` + redeploy Vercel
