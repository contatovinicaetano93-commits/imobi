# GitHub Secrets Configuration for Staging Deployment

Este arquivo documenta como configurar GitHub Secrets para o auto-deploy.

## Passos

1. **Ir para:** `https://github.com/seu-repo/settings/secrets/actions`

2. **Adicionar os seguintes secrets:**

### Se usando Vercel

```
VERCEL_TOKEN=<seu-vercel-token>
VERCEL_ORG_ID=<seu-vercel-org-id>
VERCEL_PROJECT_ID=<seu-vercel-project-id>
STAGING_API_URL=https://api-staging.imbobi.com (ou sua URL)
```

**Como obter:**

- **VERCEL_TOKEN:**
  ```bash
  vercel token create --name github-actions
  ```
  Copiar o token da saída

- **VERCEL_ORG_ID:**
  ```bash
  vercel whoami
  ```
  Copiar o team ID

- **VERCEL_PROJECT_ID:**
  Ir para Vercel dashboard → Project Settings → Project ID

### Se usando EC2 + GitHub Actions

```
AWS_ACCESS_KEY_ID=<sua-access-key>
AWS_SECRET_ACCESS_KEY=<sua-secret-key>
EC2_HOST=<seu-ec2-instance-ip>
EC2_USER=ec2-user
EC2_KEY=<sua-private-key-pem>
STAGING_API_URL=https://api-staging.imbobi.com
```

### Se usando AWS Amplify

```
AWS_ACCESS_KEY_ID=<sua-access-key>
AWS_SECRET_ACCESS_KEY=<sua-secret-key>
AMPLIFY_APP_ID=<seu-app-id>
STAGING_API_URL=https://api-staging.imbobi.com
```

## Exemplo: Adicionar Secret via CLI

```bash
gh secret set VERCEL_TOKEN --body "<seu-token>"
gh secret set STAGING_API_URL --body "https://api-staging.imbobi.com"
```

## Verificar Secrets Configurados

```bash
gh secret list
```

## Segurança

- ✓ Nunca commitar secrets em arquivos
- ✓ Usar GitHub Secrets para dados sensíveis
- ✓ Rotacionar tokens periodicamente
- ✓ Limitar scope dos tokens (Vercel, AWS, etc)

## Workflow ativação

O workflow `.github/workflows/deploy-web-staging.yml` será acionado automaticamente ao:

1. **Push para branch `claude/gifted-hawking-ULZTB`** com mudanças em:
   - `apps/web/**`
   - `packages/**`
   - `pnpm-lock.yaml`
   - `.github/workflows/deploy-web-staging.yml`

2. **Manual trigger** via GitHub UI:
   - Actions → Deploy Web to Staging → Run workflow

## Monitoramento

Ver status dos workflows:
- GitHub UI: `Actions` tab
- CLI: `gh run list --workflow=deploy-web-staging.yml`
- CLI log: `gh run view <run-id> --log`
