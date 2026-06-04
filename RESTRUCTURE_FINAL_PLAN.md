# 🏗️ PLANO FINAL DE REESTRUTURAÇÃO - IMOBI

**Status**: Ready for Implementation  
**Data**: 2026-06-04  
**Escopo**: Centralizar e sincronizar estrutura do projeto 100%  
**Timeline**: ~3.5 horas (dividido em fases)

---

## 📋 RESUMO EXECUTIVO

O projeto IMOBI tem:
- ✅ **Estrutura de código core correta** (apps/, packages/, services/)
- ✅ **Fluxos funcionando** (web → api → db)
- ❌ **Muita documentação legada e desorganizada**
- ❌ **Arquivos fora do lugar** (terraform/, scripts/, api/handler.ts)
- ❌ **Diretórios experimentais/abandoned** (meu-exercito-agentes/, worktrees/)
- ❌ **Padrões inconsistentes** entre diretórios

**Objetivo**: Deixar a estrutura 100% clara e centralizada para que qualquer dev consiga navegar intuitivamente.

---

## 🎯 ESTRUTURA FINAL ESPERADA

```
imobi/
│
├── .github/                    # GitHub config
│   ├── workflows/              # CI/CD pipelines
│   └── ISSUE_TEMPLATE/
│
├── .claude/                    # Claude Code config
│   ├── CLAUDE.md              # ✅ Project instructions (KEEP)
│   ├── projects/              # ✅ Session artifacts
│   ├── reports/               # ✅ Audit reports (NEW)
│   └── docs/                  # ✅ Claude docs (NEW)
│
├── docs/                       # 📘 PROJECT DOCUMENTATION
│   ├── README.md              # Quick start
│   ├── ARCHITECTURE.md        # System design
│   ├── API.md                 # API endpoints
│   ├── DATABASE.md            # Schema & migrations
│   ├── DEPLOYMENT.md          # Production guide
│   ├── SECURITY.md            # Security guidelines
│   ├── TESTING.md             # Test strategy
│   ├── CONTRIBUTING.md        # Dev guidelines
│   └── CHANGELOG.md           # Version history
│
├── infrastructure/             # 🏗️ IaC & DEPLOYMENT
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── docker-compose.yml  # Local dev
│   │   ├── docker-compose.prod.yml
│   │   └── init-scripts/
│   │       ├── init-postgis.sql
│   │       ├── postgres.conf
│   │       └── redis.conf
│   ├── kubernetes/
│   │   ├── api-deployment.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── redis-deployment.yaml
│   │   └── ingress.yaml
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   ├── scripts/                # Infrastructure scripts
│   │   ├── database/
│   │   │   ├── backup-postgres.sh
│   │   │   └── restore-postgres.sh
│   │   ├── cache/
│   │   │   ├── backup-redis.sh
│   │   │   └── restore-redis.sh
│   │   └── setup.sh
│   ├── vercel/                # Vercel deployment
│   │   ├── vercel.json
│   │   └── handler.ts         # Moved from /api/
│   ├── render/                # Render deployment
│   │   └── render.yaml
│   └── docs/
│       ├── SETUP.md
│       ├── BACKUP_STRATEGY.md
│       └── MONITORING.md
│
├── apps/                      # 🎨 CLIENT APPLICATIONS
│   ├── web/                   # Next.js 14
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── mobile/                # Expo 51
│   │   ├── app/
│   │   ├── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── e2e/                   # Playwright tests
│       ├── tests/
│       ├── fixtures/
│       ├── page-objects/
│       ├── package.json
│       └── playwright.config.ts
│
├── packages/                  # 📦 SHARED PACKAGES
│   ├── core/                  # Core hooks, utils, api-client
│   │   ├── src/
│   │   │   ├── services/
│   │   │   │   └── api-client.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useGeoValidation.ts
│   │   │   │   ├── useComercialApi.ts
│   │   │   │   └── useSimuladorCredito.ts
│   │   │   ├── utils/
│   │   │   │   ├── haversine.ts
│   │   │   │   ├── credito.ts
│   │   │   │   └── formatters.ts
│   │   │   ├── __tests__/         # ✅ NEW: Jest tests
│   │   │   │   ├── api-client.test.ts
│   │   │   │   ├── useGeoValidation.test.ts
│   │   │   │   └── integration.test.ts
│   │   │   └── index.ts
│   │   ├── jest.config.js         # ✅ NEW: Test config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md              # ✅ NEW: Package documentation
│   ├── schemas/               # Zod validation
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/                    # UI components
│   │   ├── web/               # shadcn components
│   │   ├── native/            # React Native components
│   │   └── package.json
│   └── config/                # Shared configs
│       ├── eslint/
│       ├── tailwind/
│       └── package.json
│
├── services/                  # 🔧 BACKEND SERVICES
│   ├── api/                   # NestJS + Fastify
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   ├── role.guard.ts      # ✅ NEW: Role-based auth
│   │   │   │   │   └── throttler.guard.ts
│   │   │   │   ├── encryption/
│   │   │   │   │   └── encryption.service.ts  # ✅ NEW: Data encryption
│   │   │   │   ├── decorators/
│   │   │   │   └── middleware/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── vercel/            # ✅ NEW: Vercel handler
│   │   │   └── handler.ts     # Moved from /api/
│   │   ├── jest.config.js
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   └── workers/               # BullMQ workers
│       ├── src/
│       │   └── workers/
│       │       ├── liberacao-parcela.worker.ts
│       │       └── notificacoes.worker.ts
│       ├── package.json
│       └── tsconfig.json
│
├── .env.example               # Environment template
├── .env.production.example    # Production template
├── .env.staging               # Staging config
├── .gitignore                 # Git ignores
├── .npmrc                      # NPM config
├── pnpm-workspace.yaml        # pnpm workspace
├── package.json               # Root workspace
├── pnpm-lock.yaml             # Lock file
├── turbo.json                 # Turbo build config
├── tsconfig.json              # Root TypeScript config
└── README.md                  # Project overview

```

---

## 🚀 FASES DE IMPLEMENTAÇÃO

### FASE 1: Limpeza (30 min)

**Deletar arquivos/diretórios orphaned:**
```bash
rm -rf .claude/worktrees/agent-*
rm -rf meu-exercito-agentes/
rm /api/handler.ts  # será movido depois
```

**Commit:**
```
chore: cleanup abandoned agent worktrees and experimental directories
```

---

### FASE 2: Movimentação de Arquivos (1h)

**2.1: Mover handler.ts para services/api/vercel/**
```bash
mkdir -p services/api/vercel
mv api/handler.ts services/api/vercel/handler.ts
# Update import paths in handler.ts
```

**2.2: Mover terraform/**
```bash
mkdir -p infrastructure/terraform
mv terraform/* infrastructure/terraform/
rm -rf terraform/
```

**2.3: Mover scripts/**
```bash
mkdir -p infrastructure/scripts
mv scripts/* infrastructure/scripts/
# Keep only pnpm scripts in root if needed
```

**2.4: Mover docker-compose & render.yaml**
```bash
mkdir -p infrastructure/docker
mkdir -p infrastructure/render
mv docker-compose*.yml infrastructure/docker/
mv render.yaml infrastructure/render/
# Update references in root
```

**2.5: Consolidar documentação**
```bash
# Manter apenas documentação ativa em /docs
# Arquivar legado
mkdir docs/archive
mv docs/*_INCIDENT_*.md docs/archive/  # Exemplo
mv docs/*_DISASTER_*.md docs/archive/
# Criar docs/ limpo com apenas essencial
```

**Commits por step:**
```
chore: move vercel handler to services/api/vercel
chore: move terraform to infrastructure/terraform
chore: reorganize scripts under infrastructure
chore: consolidate deployment configs
chore: archive legacy documentation
```

---

### FASE 3: Implementar Testes & Documentação do Core (45 min)

**3.1: Criar jest.config.js em packages/core**
```
packages/core/jest.config.js
```

**3.2: Criar __tests__ structure**
```
packages/core/src/__tests__/
├── api-client.test.ts       (30+ testes)
├── useGeoValidation.test.ts (61+ testes)
└── integration.test.ts      (11+ testes)
```

**3.3: Criar README.md**
```
packages/core/README.md      (800+ linhas)
```

**Commit:**
```
feat(core): add jest configuration and comprehensive test suite

- Add jest.config.js with TypeScript support
- Implement 102+ tests for api-client, useGeoValidation, integration
- Document usage patterns and testing strategy
```

---

### FASE 4: Implementar Security Fixes (1h)

**4.1: Criar role.guard.ts**
```
services/api/src/common/guards/role.guard.ts
```

**4.2: Integrar em etapas.controller.ts**
```
Adicionar @UseGuards(RoleGuard)
Adicionar @Roles(['GESTOR_OBRA', 'ADMIN'])
```

**4.3: Criar encryption.service.ts**
```
services/api/src/common/encryption/encryption.service.ts
```

**4.4: Integrar em prisma.service.ts**
```
Adicionar encryption middleware
```

**Commits:**
```
feat(security): implement role-based authorization guard
feat(security): implement aes-256 encryption for sensitive fields
```

---

### FASE 5: Verificação Final (30 min)

**5.1: Type checking em todos os packages**
```bash
pnpm type-check
```

**5.2: Build de cada pacote**
```bash
pnpm build
```

**5.3: Testes do core**
```bash
pnpm --filter @imbobi/core test
```

**5.4: E2E verification**
```bash
pnpm --filter @imbobi/api test:e2e
```

**Commit final:**
```
chore: complete project restructuring and centralization

Summary of changes:
- Reorganized infrastructure under single directory
- Consolidated documentation
- Removed abandoned agent worktrees and experimental dirs
- Implemented missing security features (RoleGuard, encryption)
- Added comprehensive test suite for core package
- Updated all imports and configurations

All type checks passing, builds successful, tests passing.
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### Estrutura
- [ ] Deletado: .claude/worktrees/*
- [ ] Deletado: meu-exercito-agentes/
- [ ] Deletado: /api/ (vazio agora)
- [ ] Criado: infrastructure/ (consolidado)
- [ ] Movido: terraform/ → infrastructure/terraform/
- [ ] Movido: scripts/ → infrastructure/scripts/
- [ ] Movido: handler.ts → services/api/vercel/
- [ ] Consolidado: /docs/ (apenas essencial)

### Core Package
- [ ] Criado: jest.config.js
- [ ] Criado: __tests__/ com 102+ testes
- [ ] Criado: README.md (800+ linhas)
- [ ] Atualizado: package.json com jest scripts
- [ ] Test coverage: 85%+

### Security
- [ ] Criado: role.guard.ts
- [ ] Integrado: @UseGuards em etapas.controller
- [ ] Criado: encryption.service.ts
- [ ] Integrado: encryption middleware em prisma
- [ ] Atualizado: auth.service.ts com replay detection

### Code Quality
- [ ] ✅ pnpm type-check (all packages)
- [ ] ✅ pnpm build (all packages)
- [ ] ✅ pnpm test (core + api)
- [ ] ✅ Sem console.log left in code
- [ ] ✅ Sem imports quebrados

### Documentation
- [ ] docs/README.md (quick start)
- [ ] docs/ARCHITECTURE.md (system design)
- [ ] docs/API.md (endpoints)
- [ ] docs/DATABASE.md (schema)
- [ ] docs/DEPLOYMENT.md (production)
- [ ] docs/SECURITY.md (security guidelines)

### Git
- [ ] ✅ Sem untracked files
- [ ] ✅ Branch clean
- [ ] ✅ Commits bem estruturados
- [ ] ✅ Pushado para origin

---

## 📊 IMPACTO ESPERADO

| Métrica | Antes | Depois |
|---------|-------|--------|
| Diretórios desorganizados | 6 | 0 |
| Documentação legada | 100+ files | 10 essenciais |
| Security vulnerabilities | 5 | 0 |
| Core package tests | 0 | 102+ |
| Abandoned worktrees | 2 | 0 |
| Imports conflicts | 3+ | 0 |
| Time to navigate project | 15 min | 2 min |

---

## 🎯 PRÓXIMAS AÇÕES

1. **Revisar este plano** - Está alinhado com visão?
2. **Executar Fase 1** (Limpeza) - 30 min
3. **Executar Fase 2** (Movimentação) - 1h
4. **Executar Fase 3** (Testes) - 45 min
5. **Executar Fase 4** (Security) - 1h
6. **Executar Fase 5** (Verificação) - 30 min

**Total: ~3.5 horas**

---

## 💡 NOTAS

- Cada fase pode ser revertida com `git reset --hard`
- Manter backup de commits importantes
- Testar localmente antes de cada merge
- Documentação é executada em paralelo conforme avança

---

**Status**: ✅ Plano finalizado e pronto para execução  
**Aprovação necessária**: Sim - proceder com Fase 1?
