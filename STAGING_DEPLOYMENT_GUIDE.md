# Guia Completo de Deploy Staging - imbobi

## 📋 Visão Geral

Este guia descreve o processo passo-a-passo para fazer deploy da aplicação imbobi em ambiente de staging usando Docker, PostgreSQL, Redis, NestJS e Next.js.

**Tempo estimado:** 20-30 minutos  
**Requisitos:** Docker, Docker Compose, Node.js, pnpm, PostgreSQL CLI (psql), Redis CLI

---

## 🛠 Pré-requisitos

### 1. Instalação de dependências

Certifique-se de que você tem instalado:

```bash
# Verificar instalações
node --version        # v20+
pnpm --version       # v8+
docker --version     # 20+
docker-compose --version  # 2+
git --version        # 2+

# Instalar globalmente (se necessário)
npm install -g pnpm
```

### 2. Clonar o repositório

```bash
git clone https://github.com/seu-org/imbobi.git
cd imbobi
git checkout claude/nifty-davinci-ZyCGx  # Branch de staging
```

### 3. Instalar dependências do projeto

```bash
pnpm install
```

---

## 📁 Estrutura do Projeto

```
imbobi/
├── apps/
│   ├── web/              # Next.js (frontend)
│   └── mobile/           # Expo (mobile)
├── services/
│   └── api/              # NestJS (backend)
├── packages/
│   ├── schemas/          # Zod validation
│   ├── core/             # Shared utilities
│   └── ui/               # Component library
├── docker-compose.staging.yml
├── .env.staging
├── scripts/
│   ├── deploy-staging.sh
│   ├── staging-health-check.sh
│   └── ...
└── STAGING_DEPLOYMENT_GUIDE.md  (este arquivo)
```

---

## 🔧 Configuração do Ambiente (Local → Staging)

### Step 1: Criar `.env.staging`

O arquivo já existe em `.env.staging`, mas você pode customizar se necessário:

```bash
# Mostrar conteúdo atual
cat .env.staging

# Editar se necessário
nano .env.staging
```

**Variáveis críticas:**

```ini
# Core API
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbobi_staging

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Secrets (já validadas - mínimo 64 chars para JWT, 32 para encryption)
JWT_SECRET=test_jwt_secret_this_must_be_longer_than_64_characters_for_hmac_sha256_security_requirements_ok
ENCRYPTION_SECRET=test_encryption_secret_must_be_32_chars_long

# S3 (teste com valores locais)
S3_BUCKET=imbobi-staging-evidencias
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

### Step 2: Validar configuração

```bash
# Verificar que .env.staging existe
test -f .env.staging && echo "✓ .env.staging encontrado" || echo "✗ Criar .env.staging primeiro"

# Verificar variáveis críticas
grep "^NODE_ENV\|^DATABASE_URL\|^JWT_SECRET" .env.staging
```

---

## 🚀 Processo de Deploy

### Opção A: Script Automatizado (Recomendado)

```bash
# Executar o script completo de deploy
bash scripts/deploy-staging.sh
```

Este script automaticamente:
1. ✓ Faz type check do TypeScript
2. ✓ Build de todos os pacotes (API, Web)
3. ✓ Inicia containers (PostgreSQL, Redis, API, Web)
4. ✓ Executa Prisma migrations
5. ✓ Roda health checks

### Opção B: Manual (Passo-a-passo)

#### 1. Type Check

```bash
pnpm type-check
```

**Esperado:** Sem erros de TypeScript em todo o monorepo.

#### 2. Build

```bash
# Build completo do monorepo
pnpm build

# Ou builds individuais
cd services/api && pnpm build && cd ../..
cd apps/web && pnpm build && cd ../..
```

**Esperado:** 
- API: Pasta `dist/` criada
- Web: Pasta `.next/` criada

#### 3. Iniciar Containers

```bash
# Usando docker-compose
docker-compose -f docker-compose.staging.yml -p imbobi_staging up -d

# Verificar status
docker-compose -f docker-compose.staging.yml -p imbobi_staging ps

# Ver logs
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f api
```

**Esperado:**
- `postgres`: Running (healthy)
- `redis`: Running (healthy)
- `api`: Running (health check starting)
- `web`: Running (optional)

#### 4. Executar Migrations

```bash
cd services/api

# Verificar status
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  pnpm prisma migrate status

# Executar migrations pendentes
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  pnpm prisma migrate deploy

# (Opcional) Seed database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  pnpm prisma db seed
```

**Esperado:** Mensagem "All migrations have been successfully applied" ou "Already at the latest migration"

#### 5. Health Checks

```bash
# Health check simples
curl http://localhost:4000/api/v1/health

# Suite completa de health checks
bash scripts/staging-health-check.sh "http://localhost:4000"
```

**Esperado:** Resposta HTTP 200 com JSON:
```json
{
  "status": "ok",
  "timestamp": "2024-05-28T...",
  "environment": "staging"
}
```

---

## 📊 Endpoints de Teste

Após deploy bem-sucedido, testar estes endpoints:

```bash
# API Health
curl http://localhost:4000/api/v1/health

# API Status
curl http://localhost:4000/api/v1/status

# Database check
curl http://localhost:4000/api/v1/health/database

# Redis check
curl http://localhost:4000/api/v1/health/redis

# Web Frontend (se container web estiver rodando)
curl http://localhost:3000

# Health detalhado (full checks)
curl http://localhost:4000/api/v1/health/full
```

---

## 🔍 Troubleshooting

### Problema: "Port 5432 already in use"

```bash
# Listar processos usando porta 5432
lsof -i :5432

# Ou usar porta diferente no docker-compose
# Editar docker-compose.staging.yml:
#   postgres:
#     ports:
#       - "5433:5432"  # Muda para 5433
# Atualizar DATABASE_URL em .env.staging
```

### Problema: "docker: command not found"

```bash
# Instalar Docker
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Linux: https://docs.docker.com/engine/install/

# Ou usar instalador direto
curl -fsSL https://get.docker.com | sh
```

### Problema: "pnpm: command not found"

```bash
npm install -g pnpm
pnpm --version  # Verificar
```

### Problema: Migrations falhando

```bash
# Verificar conexão com database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" psql

# Droppar database inteira (⚠️ cuidado!)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  dropdb imbobi_staging

# Recriar database
psql -U postgres -c "CREATE DATABASE imbobi_staging;"

# Reexecutar migrations
cd services/api
pnpm prisma migrate deploy
```

### Problema: "Cannot find module @imbobi/schemas"

```bash
# Regenerar Prisma client e dependências
pnpm install
pnpm db:generate

# Se persistir:
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Problema: Web container não inicia

```bash
# Verificar logs
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs web

# Se problema for porta 3000:
# Editar docker-compose.staging.yml ports ou usar porta alternativa
# Limpar container
docker-compose -f docker-compose.staging.yml -p imbobi_staging rm web
```

---

## 🧪 Testes Pós-Deploy

### 1. Testes de Smoke (rápido)

```bash
bash scripts/run-smoke-tests.sh
```

### 2. Testes E2E (completo)

```bash
bash scripts/staging-e2e.sh
```

### 3. Validação Manual

Ver `STAGING_VALIDATION_CHECKLIST.md` para checklist completo de funcionalidades.

---

## 📊 Monitoramento e Logs

### Ver logs em tempo real

```bash
# Todos os serviços
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f

# Apenas API
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f api

# Apenas database
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f postgres

# Com timestamps
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f --timestamps
```

### Inspecionar containers

```bash
# Entrar no container da API
docker-compose -f docker-compose.staging.yml -p imbobi_staging exec api sh

# Entrar no PostgreSQL
docker-compose -f docker-compose.staging.yml -p imbobi_staging exec postgres psql -U postgres

# Verificar variáveis de ambiente
docker-compose -f docker-compose.staging.yml -p imbobi_staging exec api env | grep -E "NODE_ENV|DATABASE_URL"
```

### Arquivo de log completo

Todos os deploys salvam logs em:
```
logs/staging-deploy-<timestamp>.log
```

---

## 🛑 Parar e Limpar

### Parar containers (sem remover dados)

```bash
docker-compose -f docker-compose.staging.yml -p imbobi_staging stop
```

### Remover containers (mantém volumes)

```bash
docker-compose -f docker-compose.staging.yml -p imbobi_staging down
```

### Remover tudo (⚠️ deleta dados!)

```bash
docker-compose -f docker-compose.staging.yml -p imbobi_staging down -v
```

### Limpar disco (remover imagens não usadas)

```bash
docker image prune -a
docker volume prune
```

---

## 📝 Checklist de Deploy

- [ ] Node.js 20+ instalado
- [ ] pnpm instalado
- [ ] Docker e Docker Compose instalados
- [ ] `.env.staging` criado e validado
- [ ] `pnpm install` executado
- [ ] Type check passou (`pnpm type-check`)
- [ ] Build passou (`pnpm build`)
- [ ] Containers iniciados (`docker-compose up -d`)
- [ ] Migrations executadas com sucesso
- [ ] Health checks passaram
- [ ] API respondendo em http://localhost:4000
- [ ] Web respondendo em http://localhost:3000
- [ ] Validation checklist concluído

---

## 🔗 Recursos Adicionais

- **STAGING_VALIDATION_CHECKLIST.md** — Lista de testes funcionais
- **docker-compose.staging.yml** — Configuração dos containers
- **scripts/deploy-staging.sh** — Script automatizado
- **scripts/staging-health-check.sh** — Health check suite
- **CLAUDE.md** — Instruções do projeto

---

## 💡 Dicas

1. **Sempre começar com `pnpm install`** para garantir dependências sincronizadas
2. **Usar `docker-compose logs -f`** para debug em tempo real
3. **Type check antes de build** economiza tempo de troubleshooting
4. **Health checks revelam problemas rapidamente** — leia as respostas detalhadas
5. **Manter .env.staging seguro** — nunca commitar, usar `.env.example` como template
6. **Testar endpoints HTTP** com curl antes de testes mais complexos

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar arquivo de log: `logs/staging-deploy-*.log`
2. Executar `docker-compose logs -f` para logs em tempo real
3. Consultar troubleshooting acima
4. Abrir issue no repositório com logs

---

**Última atualização:** 2024-05-28  
**Status:** ✅ Produção-ready
