# Documentação e scripts legados — NÃO USAR

**Stack ativa:** Vercel (web) + Render (API) na branch **`main`**.

## Fonte única (use só estes)

| Arquivo | Conteúdo |
|---------|----------|
| [`../../START_HERE.md`](../../START_HERE.md) | Fluxo de deploy passo a passo |
| [`../DEPLOY_STACK.md`](../DEPLOY_STACK.md) | URLs, secrets, CI, Vercel/Render |
| [`../CLAUDE_SYNC.md`](../CLAUDE_SYNC.md) | Prompt para alinhar Claude/Cursor |
| [`../../CLAUDE.md`](../../CLAUDE.md) | Guia do monorepo |

## O que foi arquivado (junho 2026)

| Pasta | Conteúdo |
|-------|----------|
| [`archive/root/`](archive/root/) | ~190 markdowns da raiz (status, cutover, AWS, beta duplicado) |
| [`archive/docs/`](archive/docs/) | ~80 markdowns em `docs/` (PHASE9/10, cutover, Railway/AWS) |
| [`archive/docs-subdirs/`](archive/docs-subdirs/) | Subpastas `PHASE*`, `RUNBOOKS` |
| [`scripts/`](scripts/) | Deploy AWS EC2 (`deploy-api.sh`, `deploy-web.sh`, …) |
| [`infrastructure-aws/`](infrastructure-aws/) | Terraform/AWS + `infrastructure/` legado |
| [`api-vercel-handler/`](api-vercel-handler/) | Handler NestJS em Vercel (API migrou para Render) |
| `RAILWAY_*.md`, `railway.toml.deprecated` | Railway pausado |

## Proibido reativar sem decisão do time

- Railway (`RAILWAY_*`)
- AWS EC2 (`deploy-api.sh`, `infrastructure-aws/`)
- Branches `claude/*` para deploy
- URLs antigas: `api.imbobi.com.br`, `imobi-staging.vercel.app`

## Scripts ativos

Ver [`../../scripts/README.md`](../../scripts/README.md).
