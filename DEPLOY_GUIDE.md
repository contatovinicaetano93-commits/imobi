# 🚀 Guia de Deploy: Vercel + Railway

**Data:** 31 de Maio de 2026  
**Status:** Pronto para Deploy  
**Branch:** `claude/happy-goldberg-AFQPj`

---

## 📋 Visão Geral

| Serviço | Plataforma | Custo | Link |
|---------|-----------|-------|------|
| Frontend (Next.js) | Vercel | Free | vercel.com |
| Backend (NestJS) | Railway | ~$7/mês | railway.app |
| Database (PostgreSQL) | Railway | Incluído | - |
| Redis Cache | Railway | Incluído | - |

---

## ✅ Pré-requisitos

1. **Conta Vercel** (gratuita em vercel.com)
2. **Conta Railway** (gratuita em railway.app)
3. **Git conectado** a GitHub/GitLab
4. **Variáveis de ambiente** preparadas

---

## 🎯 PASSO 1: Deploy Frontend (Vercel)

### 1.1 Conectar Repositório

1. Vá para [vercel.com](https://vercel.com)
2. Clique em **"New Project"**
3. Selecione seu repositório (GitHub/GitLab)
4. Selecione branch: `claude/happy-goldberg-AFQPj`

### 1.2 Configurar Build

Vercel detecta automaticamente Next.js:
- **Framework Preset:** Next.js ✅
- **Build Command:** `pnpm build --filter @imbobi/web`
- **Output Directory:** `apps/web/.next`
- **Install Command:** `pnpm install`

### 1.3 Environment Variables

Adicione em **"Environment Variables":**

```
NEXT_PUBLIC_API_URL=https://imobi-api.railway.app
```

(Substitua `imobi-api` pelo seu domínio Railway)

### 1.4 Deploy

Clique em **"Deploy"** — Vercel faz tudo automaticamente ✅

**Resultado:**
- URL: `https://seu-projeto.vercel.app`
- Domínio customizado: `seu-dominio.com` (opcional, pago)

---

## 🎯 PASSO 2: Deploy Backend (Railway)

### 2.1 Criar Projeto Railway

1. Vá para [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub"**
4. Selecione seu repositório e branch `claude/happy-goldberg-AFQPj`
5. Selecione as pastas a monitorar: `services/api`

### 2.2 Adicionar PostgreSQL

1. No painel Railway, clique em **"Add Service"**
2. Selecione **"PostgreSQL"** (versão 14+)
3. Conecta automaticamente ao seu projeto

### 2.3 Adicionar Redis

1. Clique em **"Add Service"**
2. Selecione **"Redis"** (versão 7+)
3. Conecta automaticamente

### 2.4 Configurar Environment Variables

Railway injeta automaticamente:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_HOST` e `REDIS_PORT`

Adicione manualmente:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=<sua-secret->64-chars>
ENCRYPTION_KEY=<sua-chave-base64>
CORS_ORIGIN=https://seu-projeto.vercel.app
```

**Gerar segredos seguros:**

```bash
# JWT_SECRET (>64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.5 Deploy

1. Clique em **"Deploy"**
2. Railway constrói e deploy automaticamente
3. Monitora logs em tempo real

**Resultado:**
- URL: `https://imobi-api-prod.railway.app`
- Domínio customizado: seu-api.com (opcional)

---

## 🗄️ PASSO 3: Migrations no Banco

### 3.1 Rodando Migrations

Railroad fornece acesso shell. Via Railway CLI:

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Conectar ao projeto
railway link

# Rodar migrations
DATABASE_URL=$(railway variables get DATABASE_URL) pnpm db:migrate
```

Ou direto no painel Railway:
1. Selecione o serviço API
2. Clique em **"Shell"**
3. Execute: `pnpm db:migrate`

---

## 🔗 PASSO 4: Conectar Frontend ao Backend

### 4.1 Atualizar NEXT_PUBLIC_API_URL

Em Vercel:
1. Vá para **"Settings"** → **"Environment Variables"**
2. Adicione/atualize:
   ```
   NEXT_PUBLIC_API_URL=https://sua-api-railway.app
   ```
3. Redeploy: vai usar a nova URL

### 4.2 Verificar Conectividade

Frontend faz requests para backend:

```bash
curl -s https://sua-api-railway.app/api/v1/health | jq .
```

Deve retornar:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

---

## ✅ Checklist de Deploy

```
FRONTEND (Vercel):
├─ [  ] Conta Vercel criada
├─ [  ] Repositório conectado
├─ [  ] Build command configurado
├─ [  ] NEXT_PUBLIC_API_URL definida
├─ [  ] Deploy completado
└─ [  ] URL funcionando (https://seu-projeto.vercel.app)

BACKEND (Railway):
├─ [  ] Conta Railway criada
├─ [  ] Projeto criado e conectado
├─ [  ] PostgreSQL adicionado
├─ [  ] Redis adicionado
├─ [  ] Variáveis de ambiente configuradas
├─ [  ] Deploy completado
├─ [  ] Migrations rodadas
└─ [  ] Health check passando

INTEGRAÇÃO:
├─ [  ] CORS_ORIGIN apontando para Vercel
├─ [  ] Frontend consegue chamar backend
├─ [  ] Login funciona end-to-end
├─ [  ] Dashboard carrega dados do banco
└─ [  ] Calculadora de crédito funciona
```

---

## 🧪 Testes Pós-Deploy

### 1. Health Check
```bash
curl https://sua-api-railway.app/api/v1/health
```

### 2. Signup Flow
```bash
curl -X POST https://sua-api-railway.app/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "email": "test@example.com",
    "cpf": "11144477735",
    "telefone": "11999999999",
    "senha": "TestPass@2026",
    "tipo": "TOMADOR"
  }'
```

### 3. Login Flow
```bash
curl -X POST https://sua-api-railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "senha": "TestPass@2026"
  }'
```

### 4. Acessar Dashboard
Vá para: `https://seu-projeto.vercel.app/cadastro`
- Signup ou login
- Dashboard deve carregar com user info
- KYC profile deve carregar
- Calculadora de crédito deve funcionar

---

## 🔧 Troubleshooting

### "CORS error" ou "Cannot reach API"

**Solução:**
1. Verifique `CORS_ORIGIN` no Railway (deve ser URL do Vercel)
2. Verifique `NEXT_PUBLIC_API_URL` no Vercel
3. Health check do backend: `curl https://api-url/api/v1/health`

### "Database connection failed"

**Solução:**
1. Verifique `DATABASE_URL` em Railway
2. Execute migrations: `pnpm db:migrate`
3. Verifique logs do Railway

### "Build failed on Vercel"

**Solução:**
1. Verifique logs de build
2. Certifique-se que `pnpm install` está rodando
3. Verifique se dependencies estão no `package.json`

---

## 📊 Monitoramento

### Vercel
- Dashboard mostra deployments e logs
- Metrics: performance, requests, errors

### Railway
- Metrics: CPU, Memory, Network
- Logs em tempo real
- Database metrics

---

## 💰 Custos Esperados

| Serviço | Free | Pago |
|---------|------|------|
| Vercel Next.js | ✅ Sempre free | Pro: $20/mês |
| Railway API | ✅ $5 créditos/mês | $0.50/hora excesso |
| Railway Database | ✅ Incluído | - |
| Railway Redis | ✅ Incluído | - |

**Total:** ~$7/mês após free tier expirar (muito barato!)

---

## 🎉 Próximos Passos

1. ✅ Deploy frontend em Vercel
2. ✅ Deploy backend em Railway
3. ✅ Rodar migrations
4. ✅ Testar flows end-to-end
5. ✅ Monitorar logs e performance
6. ⏳ Setup domínio customizado (opcional)
7. ⏳ Setup CI/CD pipeline (GitHub Actions)

---

**Tempo total:** ~30 minutos para setup completo

**Suporte:** Consulte documentação de Vercel e Railway em seus sites oficiais.

