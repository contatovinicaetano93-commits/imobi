# Status do Projeto IMOBI — 2026-06-20

> Auditoria técnica completa | Sessão Claude

---

## Completude Geral

```
Backend (API)          ████████████████████░  ~92%
Web App                ████████████████████░  ~90%
Mobile App             ██████████████████░░░  ~78%
Infraestrutura/Deploy  ████████████████░░░░░  ~72%
Testes                 ████████████████████░  ~88%
```

---

## O que está pronto e funcionando

### Core do produto (MVP completo)
- ✅ Cadastro, login, JWT com refresh rotation
- ✅ Criação de obra com 9 etapas auto-geradas
- ✅ Upload de evidências com validação GPS (2 camadas: mobile + PostGIS)
- ✅ Aprovação de etapas por engenheiro/gestor
- ✅ Liberação de parcela de crédito via BullMQ
- ✅ KYC com workflow de aprovação/rejeição
- ✅ Score de construtibilidade
- ✅ Painel por role: Tomador, Gestor, Engenheiro, Admin, Comercial, Comitê
- ✅ Notificações in-app, email e push (Firebase FCM)
- ✅ LGPD: exclusão de conta com grace period de 30 dias
- ✅ Pipeline comercial com scoring de conversão
- ✅ Comitê digital com votação
- ✅ Due diligence de fundo

### Infraestrutura
- ✅ CI/CD no GitHub Actions (validate → test → build → E2E)
- ✅ Deploy: API no Render, Web na Vercel
- ✅ Docker multi-stage para produção
- ✅ Banco com 14 migrations aplicadas
- ✅ Redis para cache e filas BullMQ

### Testes
- ✅ **813 testes unitários** (API 643 + Core 36 + Schemas 66 + Web 70)
- ✅ E2E tests, load tests, RBAC tests, ownership tests

---

## Bloqueios para lançamento

### 🔴 Críticos (impedem produção)

| # | Problema | Localização | Solução |
|---|----------|-------------|---------|
| 1 | Marketplace module vazio — importado mas não faz nada | `modules/marketplace/marketplace.module.ts` | Remover o módulo |
| 2 | Consent tracking incompleto — placeholder em código | `usuarios.service.ts:288` | Finalizar rastreio LGPD |
| 3 | Workers sem monitoramento — falha silenciosa possível | BullMQ jobs | Adicionar retry + alertas Slack |
| 4 | Emails síncronos — se SMTP cair a requisição trava | `email.service.ts` | Mover para fila BullMQ |

### 🟡 Importantes, não bloqueiam o lançamento inicial

- Relatórios dashboard — só scaffolding, sem dados reais
- Mobile sem modo offline
- Sentry config existe mas SDK não está inicializado
- Preferências de notificação sem UI (API pronta, front não)

---

## Numeração de Migrations (atenção)

Há colisões de prefixo que podem causar confusão:
- `10_add_comite_digital/`
- `10_add_mailing_contato/`
- `10_add_notificacao_comite_tipos/`
- `10_add_sessao_device_info/`

Prisma aplica por timestamp, não número. Funciona, mas deve ser corrigido em próxima migration.

---

## Variáveis de ambiente necessárias em produção

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<64+ chars aleatórios>
AWS_S3_BUCKET=imobi-evidencias-prod
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
SMTP_HOST=... (ou SENDGRID_API_KEY)
SENTRY_DSN=...
CORS_ORIGIN=https://seudominio.com.br
```

---

## Estimativa até lançamento

| Fase | Esforço |
|------|---------|
| Fase 1 — corrigir bloqueios | 5–10 dias |
| Fase 2 — estabilidade e observabilidade | 3–5 dias |
| Fase 3 — deploy produção | 2–3 dias |
| Review Apple App Store (em paralelo) | 2–4 semanas |
| **Total web** | **~2–3 semanas** |
| **Total mobile** | **~4–6 semanas** |
