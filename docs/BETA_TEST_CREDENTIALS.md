# Beta / test credentials (não versionar secrets)

**Este arquivo não contém senhas.** Credenciais de teste ficam fora do git.

## Usuários de desenvolvimento (fonte canônica)

Gerados por `pnpm seed:dev` — ver `services/api/src/seeds/dev-seed.ts`:

| Perfil | Email | Onde ver a senha |
|--------|-------|------------------|
| Tomador | tomador@imobi.com.br | Saída do seed / `apps/e2e/.env.e2e.example` |
| Gestor | gestor@imobi.com.br | idem |
| Engenheiro | eng@imobi.com.br | idem |
| Admin | admin@imobi.com.br | idem |

Copie `apps/e2e/.env.e2e.example` → `apps/e2e/.env.e2e` (gitignored) para E2E local.

## Staging (Render + Vercel)

**Seed (desbloqueia E2E)** — só precisa de `RENDER_API_KEY` real:

1. [Render → API Keys](https://dashboard.render.com/u/settings#api-keys) → Create
2. `.env.render.local` → `RENDER_API_KEY=rnd_…` (sem caractere `…` unicode)
3. `pnpm seed:staging:from-render`
4. `pnpm test:e2e:staging`

Deploy completo da API: preencher `.env.render.local` → `pnpm render:env:check` → `pnpm render:env:push`

## Stripe (test mode)

Não commitar números de cartão. Use a documentação oficial:  
https://stripe.com/docs/testing

Chaves `sk_test_` / `pk_test_` apenas em variáveis de ambiente (Render/Vercel).

## Armazenamento seguro

- Password manager da equipe para credenciais beta ad-hoc
- Nunca commitar `.env.*.local`, senhas ou cartões de teste em markdown
