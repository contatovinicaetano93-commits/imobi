# Staging Deployment - Quick Reference

## 🚀 Início Rápido (5 minutos)

```bash
# 1. Instalar dependências
pnpm install

# 2. Deploy automático (inclui build, containers, migrations)
bash scripts/deploy-staging.sh

# 3. Testar
curl http://localhost:4000/api/v1/health
open http://localhost:3000
```

## 📚 Documentação Completa

- **STAGING_DEPLOYMENT_GUIDE.md** — Passo-a-passo detalhado com troubleshooting
- **STAGING_VALIDATION_CHECKLIST.md** — 42 testes funcionais para validar staging
- **docker-compose.staging.yml** — Configuração de containers
- **.env.staging** — Variáveis de ambiente (pronto para usar)

## 🔧 Arquivos Criados/Modificados

| Arquivo | Descrição |
|---------|-----------|
| `docker-compose.staging.yml` | Orquestra PostgreSQL, Redis, API, Web |
| `scripts/deploy-staging.sh` | Script automatizado de deployment |
| `services/api/Dockerfile` | Build multi-stage da API NestJS |
| `apps/web/Dockerfile` | Build multi-stage do Web Next.js |
| `.env.staging` | Variáveis de ambiente completas |
| `STAGING_DEPLOYMENT_GUIDE.md` | Documentação passo-a-passo |
| `STAGING_VALIDATION_CHECKLIST.md` | 42 testes de validação |

## 🎯 Verificações Principais

### Health Check Simples
```bash
curl http://localhost:4000/api/v1/health
```

### Health Check Completo
```bash
bash scripts/staging-health-check.sh http://localhost:4000
```

### Ver Logs
```bash
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f
```

## 🛑 Parar e Limpar

```bash
# Parar (dados persistem)
docker-compose -f docker-compose.staging.yml -p imbobi_staging stop

# Remover containers (dados persistem em volumes)
docker-compose -f docker-compose.staging.yml -p imbobi_staging down

# Remover tudo incluindo dados (⚠️ não reverter)
docker-compose -f docker-compose.staging.yml -p imbobi_staging down -v
```

## 📋 Checklist Pré-Deployment

- [ ] `pnpm install` executado
- [ ] `.env.staging` presente
- [ ] Docker e Docker Compose instalados
- [ ] Portas 4000 (API), 3000 (Web), 5432 (DB), 6379 (Redis) disponíveis
- [ ] No `.gitignore`: `.env`, `.env.local`, `.env.staging` (secretos)

## 🔍 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Port already in use | `lsof -i :PORTA \| grep LISTEN \| kill -9 PID` |
| Docker not found | `curl -fsSL https://get.docker.com \| sh` |
| Build fails | `pnpm install && pnpm type-check` |
| DB connection fails | `docker logs imbobi_postgres_staging` |
| API não responde | Aguardar 30s (health check), depois `docker logs imbobi_api_staging` |

## 📞 Comandos Úteis

```bash
# Terminal 1: Logs em tempo real
docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f

# Terminal 2: Reexecutar migrations
cd services/api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  pnpm prisma migrate deploy

# Terminal 3: Testar endpoints
curl http://localhost:4000/api/v1/health
curl http://localhost:3000
```

## 🔄 CI/CD Integration

Para integrar com GitHub Actions:

1. Criar `.github/workflows/staging-deploy.yml`
2. Usar variáveis secretas para credenciais
3. Executar `bash scripts/deploy-staging.sh` na pipeline

## 📊 Validação Pós-Deploy

Usar `STAGING_VALIDATION_CHECKLIST.md` para:
- 11 seções de validação
- 42 testes funcionais
- Assinatura de aprovação

## 📈 Próximos Passos

1. **Testar manualmente** — Seguir validation checklist
2. **Integrar em CI/CD** — Automatizar em pull requests
3. **Monitorar** — Adicionar Sentry, logging, alertas
4. **Documentar** — Manter guias atualizados

## 🎓 Stack Utilizado

- **Infraestrutura:** Docker, Docker Compose
- **Database:** PostgreSQL 15 + PostGIS 3.3
- **Cache/Queue:** Redis 7 + BullMQ
- **API:** NestJS + Fastify
- **Web:** Next.js 14 + React 18
- **ORM:** Prisma 5
- **Validação:** Zod
- **CI/CD:** GitHub Actions (pronto para integração)

---

**Última atualização:** 2024-05-28
**Status:** ✅ Production-Ready
**Branch:** `claude/nifty-davinci-ZyCGx`
