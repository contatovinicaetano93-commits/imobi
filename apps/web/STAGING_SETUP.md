# imbobi Web — Staging Setup Guide

Status: ✅ **COMPLETO** (aguardando URL da API staging do Agent 3)

## O que foi feito

### ✅ Task 1: Configurar .env.staging (30 min)
- [x] Criado `.env.staging.example` com template
- [x] Documentação de variáveis NEXT_PUBLIC_*
- [x] Instruções de setup
- **Próximo passo:** Copiar para `.env.staging` e preencher com API staging URL

### ✅ Task 2: Build Web Production (1h)
- [x] Compilação Next.js concluída com sucesso
- [x] Output gerado em `.next/`
- [x] Standalone mode ativado em `next.config.js` (output: "standalone")
- [x] `.next/standalone/` gerado com server.js pronto para rodar
- [x] Type-check passou em todos os pacotes
- **Status:** Build pronto para deploy

### ✅ Task 3: Opções de Deploy (2h)
- [x] **Opção A (Vercel):** Zero-config, auto-deploy, recomendado
- [x] **Opção B (EC2):** Dockerfile.staging já existe, manual control
- [x] **Opção C (AWS Amplify):** GitHub integration, managed
- [x] Documentação completa em `DEPLOYMENT.md`
- **Próximo passo:** Escolher opção e configurar secrets do GitHub

### ✅ Task 4: Validação Web Staging (1h)
- [x] Checklist pronto em `DEPLOYMENT.md`
- [x] Instruções para testar:
  - Health check (curl)
  - Navegação (browser)
  - API integration (DevTools)
  - CORS troubleshooting
- **Próximo passo:** Após deploy, executar checklist

### ✅ Task 5: GitHub Actions Auto-Deploy (30 min)
- [x] Workflow criado: `.github/workflows/deploy-web-staging.yml`
- [x] Acionado ao push em `claude/gifted-hawking-ULZTB` com mudanças em web/
- [x] Documentação de secrets: `.github/DEPLOYMENT_SECRETS.md`
- [x] Type-check automático
- [x] Build automático
- **Próximo passo:** Configurar GitHub Secrets (VERCEL_TOKEN, STAGING_API_URL, etc)

---

## Arquivos criados/modificados

```
apps/web/
├── next.config.js (✏️ modificado: output: "standalone")
├── .env.staging.example (✨ novo)
├── DEPLOYMENT.md (✨ novo: guia completo com 3 opções)
├── STAGING_SETUP.md (✨ novo: este arquivo)
└── .next/ (📦 gerado pelo build)

.github/
├── workflows/
│   └── deploy-web-staging.yml (✨ novo)
└── DEPLOYMENT_SECRETS.md (✨ novo)
```

---

## Fluxo de Trabalho Resumido

### 1️⃣ Preparação (Você está aqui ✓)

```bash
# Já feito:
pnpm build  # Build completo
pnpm type-check  # Type check passou
ls -lh apps/web/.next/standalone/  # Standalone pronto
```

### 2️⃣ Configurar Environment (DEPENDÊNCIA: Agent 3)

Quando Agent 3 fornecer a URL da API staging:

```bash
# Copiar template
cp apps/web/.env.staging.example apps/web/.env.staging

# Editar com URL da API
# NEXT_PUBLIC_API_URL=https://api-staging.imbobi.com
```

### 3️⃣ Escolher Deployment Option

**A) Vercel (Recomendado):**
```bash
# 1. Conectar repo ao Vercel
vercel link

# 2. Adicionar secrets no Vercel dashboard
# Settings → Environment Variables
# NEXT_PUBLIC_API_URL=<api-staging-url>

# 3. Deploy
vercel --prod
```

**B) EC2:**
```bash
# Usar Dockerfile.staging
docker build -f Dockerfile.staging -t imbobi-web:staging .
docker run -p 80:3000 imbobi-web:staging
```

**C) AWS Amplify:**
```bash
# GitHub → Amplify Console → Connect
# Auto-deploy ao push
```

### 4️⃣ Configurar Auto-Deploy (GitHub Actions)

```bash
# Adicionar secrets GitHub
gh secret set VERCEL_TOKEN --body "<token>"
gh secret set STAGING_API_URL --body "<url>"

# Workflow ativa automaticamente ao push
git push origin claude/gifted-hawking-ULZTB
```

### 5️⃣ Validar Deploy

```bash
# Abrir em browser
curl https://<staging-url>

# DevTools Console
fetch('/api/auth/me').then(r => r.json())

# Checklist em DEPLOYMENT.md
```

---

## Dependências

### ⏳ Aguardando Agent 3: API Staging

Preciso de:
- [ ] URL da API staging (ex: `https://api-staging.imbobi.com`)
- [ ] Porta da API (ex: `3001`, `4000`)
- [ ] CORS origin da web a adicionar na API

**Quando chegar:**
```
NEXT_PUBLIC_API_URL=https://api-staging.imbobi.com:3001
```

### 📋 Configurações Necessárias

1. **GitHub Secrets** (para auto-deploy):
   ```
   VERCEL_TOKEN
   VERCEL_ORG_ID
   VERCEL_PROJECT_ID
   STAGING_API_URL
   ```

2. **Vercel Dashboard** (se usando Vercel):
   ```
   Settings → Environment Variables
   NEXT_PUBLIC_API_URL=<url>
   NODE_ENV=staging
   ```

3. **API CORS** (no Agent 3):
   ```typescript
   app.enableCors({
     origin: 'https://imbobi-staging.vercel.app', // ou sua URL
     credentials: true,
   });
   ```

---

## Checklist pré-Deploy

- [x] Build Next.js completo
- [x] Type-check passou
- [x] Dockerfile.staging pronto
- [x] Standalone output ativado
- [x] .env.staging.example criado
- [x] Deployment guide escrito
- [x] GitHub Actions workflow criado
- [ ] ⏳ API staging URL recebida (Agent 3)
- [ ] Secrets configurados (GitHub/Vercel)
- [ ] Deploy executado
- [ ] Validação checklist completada

---

## Próximas Ações

1. **Aguardar Agent 3** com URL da API staging
2. **Copiar `.env.staging.example` → `.env.staging`** e preencher URL
3. **Escolher deployment option** (recomendado: Vercel)
4. **Configurar GitHub Secrets** se usar auto-deploy
5. **Deploy** usando:
   ```bash
   vercel --prod  # ou docker, ou amplify
   ```
6. **Validar** usando checklist em `DEPLOYMENT.md`

---

## Recursos Úteis

- 📖 [Next.js Deployment](https://nextjs.org/docs/deployment)
- 🚀 [Vercel Deployment](https://vercel.com/docs/deployments)
- 🐳 [Docker Deployment](https://docs.docker.com/)
- ⚙️ [GitHub Actions](https://docs.github.com/en/actions)
- 📝 Vide: `DEPLOYMENT.md` (guia detalhado)

---

## Questões & Suporte

### "Como saber quando Agent 3 finalizou?"
Procure por: "API staging URL:" ou "NEXT_PUBLIC_API_URL=" nos outputs

### "Qual deployment escolho?"
**Vercel:** Sem infraestrutura, auto-deploy, grátis
**EC2:** Controle total, integração com API no mesmo host
**Amplify:** Managed, GitHub integration, free tier

### "CORS error ao deployar?"
Verifique em Agent 3 que a API tem:
```typescript
app.enableCors({
  origin: 'https://imbobi-staging.vercel.app',
  credentials: true,
});
```

---

**Última atualização:** 2026-06-02
**Status:** ✅ Pronto para Agent 3
