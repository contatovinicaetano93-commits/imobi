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

1. Copie `.env.render.example` → `.env.render.local` com `DATABASE_URL` real do Render
2. Rode `pnpm seed:staging` (ou `pnpm seed:staging -- --setup` se `SETUP_SECRET` estiver no Render)
3. Valide: `pnpm test:e2e:staging`

Não use placeholders como `postgresql://…` ou `SEU_SETUP_SECRET` no curl — são só exemplos na documentação.

## Stripe (test mode)

Não commitar números de cartão. Use a documentação oficial:  
https://stripe.com/docs/testing

Chaves `sk_test_` / `pk_test_` apenas em variáveis de ambiente (Render/Vercel).

## Armazenamento seguro

- Password manager da equipe para credenciais beta ad-hoc
- Nunca commitar `.env.*.local`, senhas ou cartões de teste em markdown
