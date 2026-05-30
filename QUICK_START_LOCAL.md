# 🚀 iMobi — Quick Start Local

**Objetivo**: Rodar o projeto inteiro em 5 minutos (Web + API + DB)  
**Público**: Founder/CTO/Developers  
**Tempo**: ~5 minutos  
**Plataforma**: macOS / Linux / Windows (WSL)

---

## ⚡ 4 PASSOS (Copy & Paste)

### 1️⃣ Instalar dependências
```bash
cd /home/user/imobi
pnpm install
```
**Tempo**: ~2 minutos (depende de internet)

---

### 2️⃣ Configurar variáveis de ambiente
```bash
# Copiar exemplo
cp .env.example .env.local

# Abrir arquivo e ajustar (APENAS para desenvolvimento local):
# NODE_ENV=development
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbobi_dev
# REDIS_URL=redis://localhost:6379
```

**Nota**: Arquivo `.env.local` será ignorado por Git. Nunca commitar `.env`!

---

### 3️⃣ Preparar banco de dados
```bash
# Criar database + aplicar migrations
pnpm db:migrate

# Gerar Prisma client
pnpm db:generate
```

---

### 4️⃣ Iniciar tudo (Web + API em paralelo)
```bash
pnpm dev
```

**Espere até ver**:
```
> web ready started server on 0.0.0.0:3000
> api running on port 4000
```

---

## 🌐 ACESSAR APLICAÇÃO

Abra no navegador:

| App | URL | Descrição |
|-----|-----|-----------|
| **Web** | http://localhost:3000 | Dashboard web (Next.js) |
| **API** | http://localhost:4000 | REST API (NestJS) |
| **API Docs** | http://localhost:4000/api/docs | Swagger (se habilitado) |

---

## 🔐 CREDENCIAIS PARA LOGIN

Use essas credenciais para testar (mock user em dev):

```
Email:  founder@test.local
Senha:  Senha123
Tipo:   TOMADOR (construtor/tomador de crédito)
```

**Ou crie novo usuário** em `/cadastro`:
- Nome: Seu Nome
- CPF: 12345678901 (válido no Zod: 11 dígitos)
- Email: seu@email.com
- Telefone: 11987654321 (10-11 dígitos)
- Senha: SuaSenha123 (mín. 8 chars, 1 maiúscula, 1 número)

---

## ⚙️ VARIÁVEIS ESSENCIAIS (.env.local)

Para **desenvolvimento local**, use:

```bash
# API
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbobi_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-minimum-64-chars-for-local-testing-only
JWT_EXPIRES_IN=15m

# Web
NEXT_PUBLIC_API_URL=http://localhost:4000

# Desabilitar features de produção (opcional)
NEXT_PUBLIC_SENTRY_DSN=
EMAIL_PROVIDER=console  # Ou smtp se quiser testar email
```

**Tudo que não listar aqui**: use valores padrão do `.env.example`

---

## 🐘 BANCO DE DADOS (PostgreSQL)

Precisa de PostgreSQL rodando. Opções:

### Opção 1: Via Docker (Recomendado)
```bash
docker run --name imbobi-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=imbobi_dev \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### Opção 2: Instalado localmente
```bash
# macOS (Homebrew)
brew install postgresql

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Criar database
createdb imbobi_dev
```

### Verificar conexão
```bash
psql postgresql://postgres:postgres@localhost:5432/imbobi_dev -c "SELECT 1"
```

---

## ⚙️ REDIS (Cache + Queue)

Redis é necessário para BullMQ (worker de liberação de parcela).

### Opção 1: Via Docker
```bash
docker run --name imbobi-redis \
  -p 6379:6379 \
  -d redis:7-alpine
```

### Opção 2: Instalado localmente
```bash
# macOS
brew install redis

# Linux
sudo apt-get install redis-server

# Iniciar
redis-server
```

### Verificar conexão
```bash
redis-cli ping  # Resposta: PONG
```

---

## 🛠️ TROUBLESHOOTING RÁPIDO

### ❌ Erro: "Cannot find module '@imbobi/schemas'"
```bash
pnpm install
pnpm db:generate
```

### ❌ Erro: "ECONNREFUSED (PostgreSQL)"
```bash
# Verificar se PostgreSQL está rodando
psql --version

# Se não estiver, iniciar
docker start imbobi-postgres  # Se usar Docker
# OU
pg_ctl start                   # Se instalado localmente
```

### ❌ Erro: "ECONNREFUSED (Redis)"
```bash
# Verificar se Redis está rodando
redis-cli ping

# Se não estiver, iniciar
docker start imbobi-redis      # Se usar Docker
# OU
redis-server                   # Se instalado localmente
```

### ❌ Erro: "Port 3000/4000 already in use"
```bash
# Kill processo
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9

# Ou usar portas diferentes
PORT=3001 VITE_API_PORT=4001 pnpm dev
```

### ❌ Erro: "Database migrations failed"
```bash
# Resetar banco (⚠️ perderá dados)
pnpm db:reset

# Ou manual
dropdb imbobi_dev && createdb imbobi_dev
pnpm db:migrate
```

### ❌ Lentidão / Freezing
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Ou por workspace específico
pnpm --filter=@imbobi/core install
```

---

## 📁 ESTRUTURA DE PASTAS

```
/home/user/imobi/
├── apps/
│   ├── web/          ← Next.js 14 (http://localhost:3000)
│   └── mobile/       ← Expo (não roda com `pnpm dev`)
├── services/
│   └── api/          ← NestJS (http://localhost:4000)
├── packages/
│   ├── schemas/      ← Zod schemas (validação)
│   ├── core/         ← Hooks, utils, API client
│   └── ui/           ← Componentes compartilhados
└── .env.example      ← Template de variáveis
```

---

## 🧪 TESTAR QUE TUDO FUNCIONA

Após `pnpm dev`, execute:

```bash
# 1. Abrir Web
open http://localhost:3000
# Deve ver página de login ou homepage

# 2. Testar API (em outro terminal)
curl http://localhost:4000/api/health
# Resposta: {"status":"ok"}

# 3. Executar type check
pnpm type-check
# Deve passar sem erros

# 4. Executar testes (se houver)
pnpm test
```

---

## 📋 CHECKLIST PRÉ-SMOKE TEST

Antes de rodar smoke test (SMOKE_TEST_CHECKLIST.md):

- [ ] `pnpm dev` rodando sem erros
- [ ] Web acessível em http://localhost:3000
- [ ] API respondendo em http://localhost:4000
- [ ] Login funciona (tente com founder@test.local)
- [ ] Dashboard carrega com dados
- [ ] Console do navegador sem erros 4xx/5xx
- [ ] DevTools Network mostra requests 200 OK

---

## 🚀 PRÓXIMOS PASSOS

1. **Testar funcionalidades**: Execute `SMOKE_TEST_CHECKLIST.md`
2. **Investigar código**: Use VS Code com Prettier + ESLint habilitados
3. **Ler documentação**: Consulte `/home/user/imobi/CLAUDE.md` para regras críticas
4. **Preparar produção**: Verifique `MONITORING_DASHBOARD_SETUP.md`

---

## 📞 HELP

Se preso:

1. **Leia erros no console** (F12 → Console tab)
2. **Verifique `.env.local`** — todas as vars definidas?
3. **Docker/DB rodando?** — `docker ps` e `psql --version`
4. **Último recurso**: `pnpm clean && pnpm install && pnpm dev`

---

## ✅ VOCÊ ESTÁ PRONTO!

Se chegou aqui, o projeto está rodando. Agora:

```
→ Faça smoke test (SMOKE_TEST_CHECKLIST.md)
→ Ou comece a desenvolver
→ Ou estude o código em apps/web ou services/api
```

**Boa sorte! 🚀**

---

*Última atualização: 2026-05-29*  
*Valid for: iMobi MVP Branch (claude/serene-pasteur-mB72T)*
