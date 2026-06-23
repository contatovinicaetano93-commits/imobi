# Imobi

Fintech de crédito imobiliário — monorepo (`apps/web`, `services/api`, `packages/@imbobi/*`).

## Comece aqui

| Documento | Uso |
|-----------|-----|
| [**START_HERE.md**](START_HERE.md) | Deploy e operação (Vercel + Render) |
| [**docs/DEPLOY_STACK.md**](docs/DEPLOY_STACK.md) | Stack canônica — fonte única |
| [**CLAUDE.md**](CLAUDE.md) | Comandos, arquitetura, workflow |
| [**docs/CLAUDE_SYNC.md**](docs/CLAUDE_SYNC.md) | Alinhar agentes no branch `main` |

**Branch de trabalho:** `main` apenas.

## Comandos rápidos

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm type-check
git checkout main && git pull origin main
```

## Legado

Documentação e scripts antigos (Railway, AWS EC2, cutover) estão em [`docs/legacy/`](docs/legacy/) — **não usar** para deploy.
