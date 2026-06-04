# Plano de Deploy — imobi
**Criado**: 2026-06-04

---

## FASE 1 — Dev (1-2 dias)

### 1.1 Migration LGPD (2h)
- [x] Adicionar campos ao schema Prisma
- [x] Migration SQL criada (`migrations/6_add_lgpd_consent_fields`)
- [ ] Rodar `pnpm db:migrate` em produção

### 1.2 Formulário de cadastro com consentimento (3h)
- [x] Adicionar 4 checkboxes em `apps/web/app/(auth)/cadastro/page.tsx`
- [x] Bloquear submit se Termos/Privacidade/KYC não marcados (Zod `z.literal(true)`)
- [x] Enviar `consentidoEm: new Date()` para a API

### 1.3 Segurança (2h)
- [x] Pre-commit hook anti-secrets (`scripts/setup-git-hooks.sh`)
- [ ] Rotação de secrets: trimestral — anotar no calendário do time
- [x] Sentry já integrado na API — só setar `SENTRY_DSN` no `.env` de produção

---

## FASE 2 — Infraestrutura (1 dia)

### 2.1 Banco de dados de produção
- [ ] Provisionar PostgreSQL + PostGIS (AWS RDS ou Supabase)
- [ ] Rodar migrations: `pnpm db:migrate`
- [ ] Rodar seed inicial (usuários admin, estágios)
- [ ] Testar backup automático

### 2.2 Redis de produção
- [ ] Provisionar Redis (AWS ElastiCache ou Upstash)
- [ ] Testar conexão BullMQ

### 2.3 AWS S3
- [ ] Criar bucket `imbobi-evidencias-prod`
- [ ] Configurar CORS do bucket
- [ ] Criar IAM user com permissão mínima (só esse bucket)

---

## FASE 3 — Variáveis de ambiente (2h)

Configurar no Vercel (web) e servidor/Railway (API):

**API (services/api):**
```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=          # 64+ chars aleatórios
CORS_ORIGIN=https://seudominio.com.br
APP_URL=https://seudominio.com.br
AWS_S3_BUCKET=imbobi-evidencias-prod
AWS_S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SENDGRID_API_KEY=    # ou SMTP_HOST/SMTP_PORT
SMTP_FROM=noreply@seudominio.com.br
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
SENTRY_DSN=
NODE_ENV=production
```

**Web (apps/web) — Vercel:**
```
NEXT_PUBLIC_API_URL=https://api.seudominio.com.br
```

---

## FASE 4 — Deploy (1 dia)

### 4.1 API
- [ ] Subir com Docker Compose: `docker compose -f infrastructure/docker/docker-compose.prod.yml up -d`
- [ ] Verificar health check: `GET /health`
- [ ] Verificar logs de startup (sem erros de env)

### 4.2 Web
- [ ] Conectar repositório no Vercel
- [ ] Setar env vars no painel Vercel
- [ ] Deploy automático via `git push`
- [ ] Verificar build sem erros

### 4.3 DNS
- [ ] Apontar domínio para Vercel (web)
- [ ] Apontar subdomínio `api.` para servidor da API
- [ ] Aguardar propagação SSL (Let's Encrypt automático no Vercel)

---

## FASE 5 — Validação (1 dia)

### 5.1 Testes funcionais (manual)
- [ ] Login / logout funciona
- [ ] Cadastro com consentimento salva flags no banco
- [ ] Upload de evidência com GPS funciona (S3)
- [ ] E-mail de boas-vindas chega
- [ ] Push notification FCM chega no mobile

### 5.2 Testes de carga
- [ ] 100 usuários simultâneos (k6 ou Artillery)
- [ ] Verificar p99 < 500ms nas rotas principais

### 5.3 Segurança
- [ ] Verificar HTTPS em todos os endpoints
- [ ] Verificar CORS bloqueando origens não autorizadas
- [ ] Verificar rate limiting (10 tentativas de login → 429)

---

## FASE 6 — Pós-deploy (1 semana)

- [ ] Monitorar Sentry por 7 dias
- [ ] Verificar filas BullMQ (liberação de parcelas)
- [ ] Iniciar processo de assinatura DPA (Unico, SERPRO) — **jurídico**
- [ ] Configurar alertas de uptime (UptimeRobot ou Vercel Analytics)

---

## Resumo de tempo estimado

| Fase | Tempo |
|------|-------|
| Dev (LGPD + segurança) | 1-2 dias |
| Infraestrutura | 1 dia |
| Env vars | 2h |
| Deploy | 1 dia |
| Validação | 1 dia |
| **Total** | **~5 dias úteis** |

---

## Go/No-Go checklist final

Só fazer deploy quando tudo marcado:

- [ ] Migration LGPD aplicada em produção (`migrations/6_add_lgpd_consent_fields`)
- [x] Formulário de cadastro com consentimento
- [ ] Todos env vars configurados
- [ ] Health check da API retorna 200
- [ ] Build do Next.js sem erros
- [ ] Teste de login manual funcionando
- [ ] Upload de foto (evidência) funcionando
- [ ] E-mail de boas-vindas chegando
- [ ] HTTPS ativo no domínio
