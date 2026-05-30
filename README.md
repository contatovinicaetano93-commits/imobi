# iMobi — Plataforma de Crédito para Obras

> Fintech de crédito com valição KYC, microcréditos e simulador de empréstimos para obra.

## Stack Tecnológico

### Monorepo & Build
- **Turborepo** + **pnpm workspaces** — Gerenciamento de pacotes compartilhados
- **Node.js 18+** — Runtime

### Frontend
- **Web**: Next.js 14 (App Router) — `apps/web`
- **Mobile**: Expo 51 + Expo Router — `apps/mobile`

### Backend
- **API**: NestJS + Fastify — `services/api`
- **Workers**: BullMQ job queue — `services/workers`

### Data & Storage
- **Database**: PostgreSQL 14+ com PostGIS (geolocalização)
- **Cache/Filas**: Redis 7+ (cache, job queue)
- **Storage**: AWS S3 (fotos de obra)

### Pacotes Compartilhados
- `@imbobi/schemas` — Zod schemas (validação client + server)
- `@imbobi/core` — Hooks, utils, api-client (zero dependencies)
- `@imbobi/ui` — Componentes base (Web: shadcn/ui | Mobile: React Native)

---

## Quick Start

### Instalação

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar arquivo de ambiente
cp .env.example .env

# 3. Iniciar PostgreSQL e Redis (recomendado: Docker)
docker run -d --name imobi-postgres \
  -e POSTGRES_USER=imobi \
  -e POSTGRES_PASSWORD=imobi_dev \
  -e POSTGRES_DB=imobi_dev \
  -p 5432:5432 \
  postgres:15-alpine

docker run -d --name imobi-redis \
  -p 6379:6379 \
  redis:7-alpine

# 4. Setup banco de dados
pnpm db:generate    # Regenera Prisma client
pnpm db:migrate     # Roda migrations
```

### Desenvolvimento

```bash
# Iniciar web + api + workers em paralelo
pnpm dev

# Acessar:
# - Web: http://localhost:3000
# - API: http://localhost:4000
# - Docs: http://localhost:4000/docs
```

### Build & Produção

```bash
# Build de produção para todos os pacotes
pnpm build

# Typecheck em todos os pacotes
pnpm type-check

# Lint e formatação
pnpm lint
pnpm format
```

---

## Regras Críticas

### 1. Segurança
- ❌ **Nunca commitar `.env`** — Use `.env.example` apenas
- ✅ **GPS validation** ocorre em duas camadas: client (UX) + server (PostGIS)
- ✅ **Refresh tokens** são criptografados (AES-256-GCM) antes de salvar no DB
- ✅ **Rate limiting** é obrigatório em endpoints de auth

### 2. Validação de Dados
- 📋 **Schemas Zod** são a fonte de verdade (`@imbobi/schemas`)
- ❌ Nunca duplicar regras de validação em outros lugares
- ✅ Aplicar validação server-side sempre (PostGIS, Zod, custom)

### 3. Processos Assíncronos
- 💼 **Liberação de parcela** SEMPRE via BullMQ (`services/workers/liberacao-parcela.worker.ts`)
- 💼 Notificações via BullMQ + Firebase Cloud Messaging
- 💼 Processamento de evidence photos via job queue

### 4. Estrutura de Código
- 📦 Pacotes compartilhados em `packages/`
- 🎨 Componentes base em `@imbobi/ui`
- 🔧 Utilities zero-dependency em `@imbobi/core`
- 🗂️ Schemas Zod centralizados em `@imbobi/schemas`

---

## Estrutura de Diretórios

```
imobi/
├── apps/
│   ├── web/              # Next.js 14 frontend
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   └── public/       # Static assets
│   └── mobile/           # Expo + Expo Router
│       ├── app/          # Routing
│       └── screens/      # React Native screens
│
├── services/
│   ├── api/              # NestJS + Fastify API
│   │   ├── src/
│   │   │   ├── auth/     # Authentication
│   │   │   ├── kyc/      # KYC validation
│   │   │   ├── credito/  # Credit module
│   │   │   └── health/   # Health checks
│   │   └── dist/         # Build output
│   └── workers/          # BullMQ job processors
│       ├── liberacao-parcela/
│       └── notifications/
│
├── packages/
│   ├── schemas/          # Zod validation schemas
│   ├── core/             # Shared hooks & utils
│   └── ui/               # Component library
│
├── .env.example          # Template de variáveis
├── .env.staging          # Staging config (⚠️ .gitignore)
├── .gitignore            # Git ignore rules
└── pnpm-workspace.yaml   # Workspace config
```

---

## Variáveis de Ambiente Críticas

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/db` |
| `REDIS_HOST`/`REDIS_PORT` | Redis cache & queue | `localhost:6379` |
| `JWT_SECRET` | Auth secret (64+ chars) | `dRV/Jrv0+NY9AC/4DGccaOdPckvKu3Y1...` |
| `ENCRYPTION_KEY` | Refresh token encryption | `D+Tq00RvRIfTL66ZbEnn7iAEryHRVyYLu...` |
| `AWS_REGION`/`S3_BUCKET` | AWS S3 for evidence photos | `us-east-1` / `imobi-prod` |
| `CORS_ORIGIN` | Allowed domains | `http://localhost:3000` |

Veja `.env.example` para lista completa.

---

## Documentação de Deployment

### 📘 Quick Start (Local)
- Começar aqui → [**Quick Start**](#quick-start)

### 📚 Staging Deployment
- Guia completo → [`STAGING_DEPLOYMENT.md`](./STAGING_DEPLOYMENT.md)
- Checklist → [`STAGING_DEPLOYMENT_CHECKLIST.md`](./STAGING_DEPLOYMENT.md)
- Status → [`STAGING_DEPLOYMENT_READY.md`](./STAGING_DEPLOYMENT_READY.md)

### 🔐 Security & Validation
- Security checklist → [`SECURITY_VALIDATION_CHECKLIST.md`](./SECURITY_VALIDATION_CHECKLIST.md)
- Test suite → `test-security-validation.sh` (632 linhas)
- Report → [`SECURITY_VALIDATION_REPORT.md`](./SECURITY_VALIDATION_REPORT.md)

### 🚀 Production Deployment
- Deployment guide → [`AWS_DEPLOYMENT_GUIDE.md`](./AWS_DEPLOYMENT_GUIDE.md)
- Infrastructure → Consultar DevOps lead

### 📋 Readiness Index
- Status do projeto → [`DEPLOYMENT_READINESS_INDEX.md`](./DEPLOYMENT_READINESS_INDEX.md)

---

## Desenvolvimento Local

### 1. Configurar IDE
```bash
# Instalar extensões recomendadas
# VSCode: Prettier, ESLint, Prisma

# Configurar workspace settings
pnpm format       # Auto-format código
pnpm lint         # Verificar problemas
pnpm type-check   # TypeScript validation
```

### 2. Database
```bash
# Gerar Prisma client após mudanças no schema
pnpm db:generate

# Criar nova migration
pnpm db:migrate:create --name minha_migracao

# Aplicar migrations
pnpm db:migrate

# Seed com dados de teste (opcional)
pnpm seed
```

### 3. Testing
```bash
# Testes unitários (Jest)
pnpm test

# Testes E2E
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

### 4. Debugging API
```bash
# Ativar debug mode
DEBUG=imbobi:* pnpm dev

# Acessar swagger docs
curl http://localhost:4000/docs
```

---

## Deployment Workflow

```
Local Development
    ↓
Type-check + Lint (pnpm type-check && pnpm lint)
    ↓
Build (pnpm build)
    ↓
Security Validation (test-security-validation.sh)
    ↓
Deploy to Staging → STAGING_DEPLOYMENT.md
    ↓
Staging E2E Tests → TESTING_CHECKLIST.md
    ↓
Approve for Production
    ↓
Deploy to Production → AWS_DEPLOYMENT_GUIDE.md
    ↓
Production Monitoring → Set up alerts & logging
```

---

## Key Features

### 🔐 Authentication
- JWT-based auth com refresh tokens
- Refresh tokens criptografados (AES-256-GCM)
- Rate limiting (10 req/min no login)
- Token expiration: 15m (access), 7d (refresh)

### 👤 KYC (Know Your Customer)
- Validação de identidade via SERPRO
- Anti-fraude com Unico
- CPF validation client + server
- Profile picture upload para S3

### 💰 Crédito (Credit)
- Simulador de empréstimos
- Parcelas com liberação assíncrona (BullMQ)
- Extrato com histórico
- Validação PostGIS para localização

### 📸 Evidence Photos
- Upload para AWS S3
- Validação de imagem client + server
- Associação com obra/parcela

---

## Troubleshooting

### PostgreSQL não conecta
```bash
# Verificar se está rodando
docker ps | grep imobi-postgres

# Iniciar container
docker start imobi-postgres

# Ou criar novo
docker run -d --name imobi-postgres \
  -e POSTGRES_USER=imobi \
  -e POSTGRES_PASSWORD=imobi_dev \
  -p 5432:5432 \
  postgres:15-alpine
```

### Redis não conecta
```bash
# Verificar status
redis-cli ping

# Ou com Docker
docker start imobi-redis
```

### Build falha
```bash
# Limpar cache
rm -rf node_modules .next dist .turbo

# Reinstalar
pnpm install

# Rebuild
pnpm build
```

### Type errors
```bash
# Regenerar Prisma client
pnpm db:generate

# Recheck TypeScript
pnpm type-check --force
```

---

## CI/CD

Workflows disponíveis em `.github/workflows/`:
- `test.yml` — Tests em cada PR
- `deploy.yml` — Deploy automático para staging

---

## Segurança em Produção

✅ **Implementado:**
- HTTPS enforced
- HSTS headers
- CSRF protection
- Rate limiting
- SQL injection prevention
- XSS sanitization
- Refresh token encryption
- Authorization checks (role-based)
- IDOR prevention (ownership validation)

📋 **Validação:** Ver [`SECURITY_VALIDATION_CHECKLIST.md`](./SECURITY_VALIDATION_CHECKLIST.md)

---

## Support & Contact

**Project Lead:** contato.vinicaetano93@gmail.com

**Issues:**
- Deployment → Consulte [`STAGING_DEPLOYMENT.md`](./STAGING_DEPLOYMENT.md)
- Security → Ver [`SECURITY_VALIDATION_REPORT.md`](./SECURITY_VALIDATION_REPORT.md)
- Testing → Ver [`TESTING_CHECKLIST.md`](./TESTING_CHECKLIST.md)
- Database → Prisma docs: https://www.prisma.io

---

## Licenses & Attribution

- **Next.js** — MIT
- **NestJS** — MIT
- **Expo** — BSD-3-Clause
- **Prisma** — Apache 2.0
- **PostgreSQL** — PostgreSQL License
- **Redis** — Redis Source Available License

---

**Last Updated:** 2026-05-30  
**Status:** ✅ Ready for Staging Deployment (95% Complete)
