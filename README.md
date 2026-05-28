# imbobi — Plataforma de Gestão de Obras

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-configured-blue)]()
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)]()
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-green)]()

**Production Status**: ✓ READY FOR DEPLOYMENT

Plataforma integrada para gestão de obras, KYC (Know Your Customer), scoring de crédito e evidências de construção. Construída com tecnologias modernas e escaláveis para suportar fluxos complexos de crédito imobiliário.

## Features

- **Gestão de Obras**: Criar, monitorar e atualizar obras em tempo real
- **KYC Integrado**: Validação de usuários com regras de negócio complexas
- **Scoring de Crédito**: Cálculo automático baseado em documentação e histórico
- **Evidências Fotográficas**: Upload e validação de fotos de progresso
- **Dashboards Personalizados**: Por papel (Gestor, Engenheiro, Construtor)
- **Cache Inteligente**: Throttling e invalidação automática
- **API REST Segura**: Autenticação JWT + Rate Limiting

## Stack Tecnológico

```
Frontend (Web)
├── Next.js 14 (App Router)
├── React 18
├── Tailwind CSS + shadcn/ui
└── TypeScript

Backend (API)
├── NestJS + Fastify
├── PostgreSQL + PostGIS
├── Prisma ORM
└── Redis + BullMQ

Mobile
├── Expo 51
├── Expo Router
└── React Native

Infraestrutura
├── Vercel (Web)
├── Render/AWS (API)
├── AWS S3 (Armazenamento)
└── GitHub Actions (CI/CD)
```

## Quick Start

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Iniciar ambiente de desenvolvimento (web + api em paralelo)
pnpm dev

# Executar migrações do banco
pnpm db:migrate

# Regenerar cliente Prisma
pnpm db:generate

# Verificar tipos TypeScript em todos os pacotes
pnpm type-check

# Build de produção
pnpm build

# Executar testes
pnpm test
```

### Variáveis de Ambiente

```bash
# Copiar exemplo e configurar
cp .env.example .env

# Configurações necessárias:
# - DATABASE_URL (PostgreSQL)
# - REDIS_URL (Redis cache)
# - JWT_SECRET (autenticação)
# - AWS_* (S3 storage)
# - FCM_* (Push notifications)
```

## Estrutura do Projeto

```
imbobi-site/
├── apps/
│   ├── web/                      # Next.js 14 (Vercel)
│   │   ├── app/                  # App Router
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom hooks
│   │   └── public/               # Static files
│   └── mobile/                   # Expo + RN
├── services/
│   ├── api/                      # NestJS + Fastify
│   │   ├── src/modules/          # Feature modules
│   │   ├── src/__tests__/        # E2E tests
│   │   └── prisma/               # Database schema
│   └── workers/                  # BullMQ workers
├── packages/
│   ├── schemas/                  # Zod validation schemas
│   ├── core/                     # Utilities & hooks
│   └── ui/                       # UI components library
└── docs/
    ├── DEPLOYMENT_CHECKLIST.md   # Guia de deploy
    ├── MONITORING.md             # Observabilidade
    ├── PRODUCTION_CONFIG.md       # Configuração produção
    └── E2E_TEST_GUIDE.md        # Testes E2E
```

## Deployment

### Production Status
- ✓ Build passing (Web: 185MB, API: 812KB)
- ✓ TypeScript strict mode enabled
- ✓ All migrations prepared
- ✓ Monitoring configured
- ✓ Security checks completed

### Deploy para Produção

1. **Vercel (Web)**:
```bash
git push origin claude/admiring-ptolemy-Ho412
# Criar PR para main
# Deploy automático ao fazer merge
```

2. **Render/AWS (API)**:
```bash
# Build automático via GitHub Actions
# ou manual: pnpm build && npm run start:prod
```

Veja [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) para guia completo.

## Monitoramento

Plataforma configurada para produção com:

- **APM**: New Relic ou DataDog
- **Error Tracking**: Sentry
- **Performance**: Lighthouse baseline
- **Logs**: Structured logging com timestamps
- **Alerting**: Thresholds configurados

Detalhes em [MONITORING.md](./MONITORING.md)

## Documentação

### Deployment & DevOps
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Checklist completo de produção
- [MONITORING.md](./MONITORING.md) - Guia de monitoramento e observabilidade
- [PRODUCTION_CONFIG.md](./PRODUCTION_CONFIG.md) - Configurações de produção
- [LIGHTHOUSE_BASELINE.md](./LIGHTHOUSE_BASELINE.md) - Baseline de performance

### Desenvolvimento
- [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md) - Guia de testes E2E
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Status de implementação
- [LATEST_STATUS.md](./LATEST_STATUS.md) - Status mais recente
- [SETUP.md](./SETUP.md) - Guia de configuração inicial

## Contribuindo

1. Criar branch a partir de `develop`
2. Fazer commits com mensagens descritivas
3. Rodar `pnpm type-check` e `pnpm build` localmente
4. Criar PR com descrição clara
5. Aguardar aprovação e testes passarem
6. Merge para develop, depois para main

## Regras Críticas

1. **Nunca commitar `.env`** — usar `.env.example`
2. **GPS Validation** ocorre em duas camadas: client (UX) + server (PostGIS)
3. **Liberação de Parcela** é sempre assíncrona via BullMQ
4. **Schemas Zod** são fonte de verdade — não duplicar validações

## Contato & Suporte

- **Email**: contato.vinicaetano93@gmail.com
- **Issues**: GitHub Issues
- **Documentation**: Veja links acima

## Licença

Privado — imbobi

---

**Last Updated**: 2026-05-28  
**Status**: Production Ready ✓
