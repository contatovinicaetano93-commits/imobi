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
- [x] PostGIS init SQL: `infrastructure/docker/init-postgis.sql`
- [x] Docker Compose monta init automaticamente no primeiro start
- [ ] **VOCÊ**: Provisionar servidor (VPS/Railway/Render) e rodar `docker compose -f infrastructure/docker/docker-compose.prod.yml up -d postgres`
- [ ] **VOCÊ**: Rodar migrations: `DATABASE_URL=... npx prisma migrate deploy`
- [ ] **VOCÊ**: Rodar seed: `pnpm --filter @imbobi/api seed`
- [ ] **VOCÊ**: Verificar backup automático (ofelia scheduler no compose)

### 2.2 Redis de produção
- [x] Redis já configurado no Docker Compose com persistência RDB+AOF
- [ ] **VOCÊ**: Subir com `docker compose ... up -d redis`
- [ ] **VOCÊ**: Testar: `redis-cli -h HOST ping`

### 2.3 AWS S3
- [x] IAM policy mínima criada: `infrastructure/aws-iam-s3-policy.json`
- [ ] **VOCÊ**: Criar bucket `imbobi-evidencias-prod` na AWS Console
- [ ] **VOCÊ**: Criar IAM user, anexar a policy acima, gerar Access Key
- [ ] **VOCÊ**: Configurar CORS do bucket (permite PUT do domínio da API)

---

## FASE 3 — Variáveis de ambiente (2h)

- [x] `.env.example` corrigido (nomes consistentes `AWS_S3_BUCKET`, `AWS_S3_REGION`)
- [x] Script de validação: `sh scripts/validate-env.sh` (rode antes do deploy)
- [ ] **VOCÊ**: Copie `.env.example` → `.env.prod` e preencha todos os valores reais
- [ ] **VOCÊ**: `ENV_FILE=.env.prod sh scripts/validate-env.sh` → deve retornar OK
- [ ] **VOCÊ**: Configure as vars no painel do Vercel (web) e no servidor/Railway (API)

**Gerar JWT_SECRET seguro (T1):**
```bash
openssl rand -base64 48
```

**Vars obrigatórias API:** `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `CORS_ORIGIN`, `APP_URL`, `AWS_S3_BUCKET`, `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FIREBASE_*`, `SENTRY_DSN`, `NODE_ENV=production`

**Var obrigatória Web (Vercel):** `NEXT_PUBLIC_API_URL=https://api.seudominio.com.br`

---

## FASE 4 — Deploy (1 dia)

### 4.1 API + Banco + Redis (Render)
- [x] `render.yaml` criado — define API + PostgreSQL + Redis em um arquivo
- [x] PostGIS habilitado na migration `0_init`
- [ ] **VOCÊ**:
  1. render.com → New → Blueprint → conecte o repo
  2. Render lê o `render.yaml` e cria os 3 serviços automaticamente
  3. No painel, preencha as env vars marcadas como `sync: false`:
     `JWT_SECRET`, `CORS_ORIGIN`, `APP_URL`, `AWS_*`, `FIREBASE_*`, `SENTRY_DSN`, `EMAIL_PROVIDER`, `SENDGRID_API_KEY`
  4. Gere o JWT_SECRET: `openssl rand -base64 48`
  5. Após o deploy, rode as migrations:
     ```bash
     # Render fornece a DATABASE_URL no painel — copie e rode local:
     DATABASE_URL="..." npx prisma migrate deploy --schema services/api/prisma/schema.prisma
     ```

### 4.2 Web (Vercel)
- [x] `vercel.json` configurado
- [ ] **VOCÊ**:
  1. vercel.com → Add New Project → Import repo
  2. Root Directory: `apps/web`
  3. Env var: `NEXT_PUBLIC_API_URL=https://imobi-api.onrender.com`
  4. Deploy (automático no `git push`)

### 4.3 DNS
- [ ] **VOCÊ**: Domínio → aponte para Vercel (CNAME `cname.vercel-dns.com`)
- [ ] **VOCÊ**: Subdomínio `api.` → Settings do serviço no Render → Custom Domain
- [ ] SSL automático em ambos

---

## FASE 5 — Validação (1 dia)

### 5.1 Testes funcionais (manual — você faz)
- [ ] Login / logout funciona
- [ ] Cadastro com consentimento salva flags no banco (`consentidoTermos=true`)
- [ ] Upload de evidência com GPS funciona (arquivo aparece no S3)
- [ ] E-mail de boas-vindas chega (caixa de entrada)
- [ ] Push notification FCM chega no mobile

### 5.2 Testes de carga
- [x] Script k6 já existe: `scripts/cutover-load-test.js`
- [ ] **VOCÊ**: `k6 run -e API_URL=https://api.seudominio.com.br scripts/cutover-load-test.js`
- [ ] p95 < 200ms, error rate < 1%

### 5.3 Segurança
- [x] Script criado: `scripts/validate-security.sh`
- [ ] **VOCÊ**: `API_URL=https://api.seudominio.com.br WEB_URL=https://seudominio.com.br sh scripts/validate-security.sh`
- [ ] Deve passar: HTTPS, CORS, rate limit 429, security headers

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
