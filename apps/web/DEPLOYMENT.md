# imbobi Web Frontend — Deployment Guide

Este documento descreve como deployar a web para staging.

## Pré-requisitos

1. **Build completo**: `pnpm build` (gera `.next/` e `.next/standalone/`)
2. **Arquivo .env.staging**: Cópia do `.env.staging.example` com URL da API staging
3. **CORS configurado na API**: A API deve aceitar requisições do domínio web

## Opções de Deployment

### Opção A: Vercel (Recomendado - Zero Config)

**Vantagens:**
- ✓ Deploy automático ao push
- ✓ Preview URLs para cada branch/PR
- ✓ Suporte nativo Next.js
- ✓ Free tier incluso
- ✓ CDN global automático
- ✓ Environment variables no dashboard

**Passos:**

1. **Conectar repositório ao Vercel:**
   ```bash
   npm i -g vercel
   vercel link
   ```

2. **Configurar ambiente no Vercel Dashboard:**
   - Ir para: https://vercel.com/dashboard
   - Selecionar projeto `imbobi-web`
   - Settings → Environment Variables
   - Adicionar:
     - `NEXT_PUBLIC_API_URL`: `https://api-staging.imbobi.com` (ou sua staging URL)
     - `NODE_ENV`: `staging`

3. **Deploy:**
   ```bash
   vercel --prod
   ```
   ou push para branch e Vercel auto-deploya

4. **Resultado:**
   - URL: `https://imbobi-web.vercel.app` ou custom domain
   - Logs: `vercel logs imbobi-web --follow`

---

### Opção B: EC2 + Next.js Standalone (Mais controle)

**Vantagens:**
- ✓ Controle completo
- ✓ Customizações avançadas
- ✓ Pode coexistir com API no mesmo host
- ✗ Requer gerenciamento manual

**Passos:**

1. **Launch EC2:**
   ```bash
   aws ec2 run-instances \
     --image-id ami-0c55b159cbfafe1f0 \
     --instance-type t2.small \
     --security-groups staging-web
   ```

2. **SSH no servidor:**
   ```bash
   ssh -i your-key.pem ec2-user@<instance-ip>
   ```

3. **Setup Node.js:**
   ```bash
   curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   npm install -g pnpm pm2
   ```

4. **Clone e build:**
   ```bash
   git clone <repo-url> /opt/imbobi
   cd /opt/imbobi/apps/web
   
   # Copiar .env.staging (manualmente ou via secrets)
   cp .env.staging.example .env.staging
   # Editar com URL da API staging
   
   pnpm install
   pnpm build
   ```

5. **Rodar com PM2:**
   ```bash
   pm2 start "node .next/standalone/server.js" --name imbobi-web
   pm2 save
   pm2 startup
   ```

6. **Nginx reverse proxy (porta 80):**
   ```bash
   sudo yum install nginx
   ```
   
   `/etc/nginx/conf.d/imbobi-web.conf`:
   ```nginx
   upstream imbobi_web {
     server 127.0.0.1:3000;
   }
   
   server {
     listen 80;
     server_name staging.imbobi.com;
     
     location / {
       proxy_pass http://imbobi_web;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

7. **Reiniciar Nginx:**
   ```bash
   sudo systemctl restart nginx
   ```

8. **Resultado:**
   - URL: `http://staging.imbobi.com` ou `http://<ec2-ip>`

---

### Opção C: AWS Amplify (Gerenciado)

**Vantagens:**
- ✓ GitHub integration automática
- ✓ Deploy preview automático
- ✓ Variáveis de ambiente no console
- ✓ Build e deploy automáticos

**Passos:**

1. **No console AWS Amplify:**
   - Host → Create app
   - Selecionar GitHub repository
   - Branch: `claude/gifted-hawking-ULZTB`

2. **Build settings:**
   ```yaml
   version: 1
   applications:
     web:
       appRoot: apps/web
       phases:
         preBuild:
           commands:
             - npm install -g pnpm
             - pnpm install
         build:
           commands:
             - pnpm build
       artifacts:
         files:
           - '**/*'
         baseDirectory: .next
   ```

3. **Environment variables:**
   - `NEXT_PUBLIC_API_URL`: `https://api-staging.imbobi.com`
   - `NODE_ENV`: `staging`

4. **Deploy:** Automático ao push

5. **Resultado:**
   - URL: `https://staging-web.amplify.com`

---

## Checklist pós-Deploy

- [ ] **Verificar landing page:**
  ```bash
  curl https://<staging-url>
  ```
  Deve retornar HTML com `<title>` e `<h1>` visíveis

- [ ] **Testar navegação:**
  - Abrir em browser: `https://<staging-url>`
  - Clicar em links (navbar, CTA buttons)
  - Verificar transições entre páginas

- [ ] **Testar API integration:**
  - Abrir DevTools (F12) → Console
  - Executar: `fetch('/api/auth/me').then(r => r.json())`
  - Esperado: Resposta da API ou erro autenticação (normal)
  - Se CORS error: Verificar `CORS_ORIGIN` na API

- [ ] **Verificar variáveis de ambiente:**
  ```javascript
  // No console do browser
  console.log(process.env.NEXT_PUBLIC_API_URL)
  ```

- [ ] **Verificar build artifacts:**
  ```bash
  ls -lh .next/static/
  ls -lh .next/standalone/
  ```

## Troubleshooting

### CORS error ao chamar API
**Problema:** `Access-Control-Allow-Origin` missing
**Solução:**
```typescript
// services/api/src/app.module.ts
app.enableCors({
  origin: 'https://<web-staging-url>',
  credentials: true,
});
```

### Port conflict
**Problema:** Porta 3000 ou 4000 já em uso
**Solução:**
```bash
lsof -i :3000
kill -9 <pid>
# ou usar porta diferente
NODE_PORT=3001 pnpm start
```

### Build falha com TypeScript errors
**Solução:**
```bash
pnpm type-check  # Diagnosticar
pnpm tsc --noEmit
```

---

## Monitoramento

### Logs

**Vercel:**
```bash
vercel logs imbobi-web --follow
```

**EC2:**
```bash
pm2 logs imbobi-web
tail -f /var/log/nginx/access.log
```

**Amplify:**
Cloudwatch → Logs → Amplify

### Health check

```bash
# Verificar se app está respondendo
curl -I https://<staging-url>

# Esperado: HTTP/1.1 200 OK
```

---

## Auto-Deploy com GitHub Actions

Ver: `.github/workflows/deploy-web.yml`

```yaml
on:
  push:
    branches: [claude/gifted-hawking-ULZTB]
    paths: [apps/web/**, packages/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm --filter @imbobi/web build
      - run: pnpm --filter @imbobi/web deploy
```

---

## Segurança

- ✓ Nunca commitá `.env.staging`
- ✓ Use secrets manager (AWS Secrets, GitHub Secrets)
- ✓ Rotate API keys periodicamente
- ✓ Enable HTTPS sempre em staging
- ✓ Validar CORS origin

---

## Documentação referência

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [AWS Amplify](https://aws.amazon.com/amplify/hosting/)
