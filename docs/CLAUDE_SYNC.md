# Sync com Claude — branch `main` (junho 2026)

**Use este arquivo** quando precisar alinhar Claude Code / outro agente com o estado atual do repo.

---

## Comando Git (sempre antes de trabalhar)

```bash
git checkout main && git pull origin main
```

---

## Prompt para colar no Claude

Copie o bloco abaixo inteiro:

```
Contexto Imobi — atualização de fluxo (junho 2026)

TUDO está na branch main. Não criar nem usar branches claude/* para deploy ou entrega.

Stack canônica (única):
- Web: Vercel → https://imobi-web-ten.vercel.app (projeto imobi-web, Root Directory: apps/web)
- API staging: Render → https://imobi-api-staging.onrender.com
- API prod: Render → https://imobi-api-efgg.onrender.com

Fonte única de deploy: docs/DEPLOY_STACK.md
Entrada rápida: START_HERE.md

Legado bloqueado (não sugerir nem reativar):
- Railway, AWS EC2, Terraform para API
- docs/legacy/scripts/deploy-api.sh
- URLs antigas: imobi.vercel.app, api.imbobi.com.br, imobi-staging.vercel.app

CI/CD:
- Push em main → Vercel + Render fazem auto-deploy
- GitHub Actions: quality gate + health check pós-merge (ci-cd.yml, deploy-api.yml)
- Não duplicar deploy no CI

Comandos locais:
pnpm render:init
pnpm render:key:check
pnpm seed:staging:from-render
pnpm test:e2e:staging

Confirme que leu docs/DEPLOY_STACK.md e que vai trabalhar apenas em main.
```

---

## Verificação rápida pós-sync

```bash
curl -s https://imobi-api-staging.onrender.com/api/v1/health | jq .
curl -s -o /dev/null -w "web-login:%{http_code}\n" https://imobi-web-ten.vercel.app/login
```

Esperado: API `"status":"ok"` e web `/login` HTTP 200.
