# IMOBI — Auditoria Técnica: 200 Perguntas

> Status: ✅ Implementado | ⚠️ Parcial | ❌ Não implementado  
> Atualizado em: 2026-06-15

---

## SEÇÃO 1 — ARQUITETURA GERAL (25 perguntas)

### ✅ Q1 — Padrão arquitetural

**Monolito modular**, não microserviços. `services/api` é um único processo NestJS/Fastify com 25 módulos isolados. Comunicação `apps/web → services/api` é REST HTTP (fetch via `@imbobi/core/api-client`). O proxy Next.js (`/api/proxy/**`) repassa cookies httpOnly automaticamente para o backend, evitando CORS em produção. Não medimos latência (ver Q9 — gap de observabilidade).

### ✅ Q2 — DDD / Bounded Contexts

Não é DDD formal, mas os módulos NestJS mapeiam bem para contextos:  
- **Crédito**: `credito`, `comite`, `score`  
- **Operacional/Obra**: `obras`, `etapas`, `evidencias`, `vistoria`, `engenheiros`  
- **Comercial**: `comercial`, `parceiros`, `marketplace`  
- **Identidade**: `auth`, `usuarios`, `kyc`  
- **Suporte**: `email`, `notificacoes`, `push-notificacoes`, `documentos`  

Comunicação entre contextos é direta via `PrismaService` injetado — sem event bus inter-contexto.

### ✅ Q3 — Estrutura de pastas / Monorepo

```
imobi/
  apps/web/          # Next.js 14 App Router (SSR + client)
  apps/mobile/       # Expo 51 + Expo Router
  services/api/      # NestJS + Fastify (porta 4000)
  services/workers/  # BullMQ workers (liberação, exclusão)
  packages/core/     # utils, api-client, formatters — zero deps nativas
  packages/schemas/  # Zod schemas compartilhados
  packages/ui/       # shadcn (web) + RN (mobile)
```

Turborepo gerencia build/dev paralelos. Dependências circulares evitadas por convenção: `packages/*` nunca importa `apps/*` ou `services/*`.

### ✅ Q4 — Separação de responsabilidades

- `apps/web`: UI, SSR, proxy de autenticação, state cliente
- `services/api`: regras de negócio, validação, persistência, fila
- `packages/schemas`: Zod é a única fonte de validação — não duplicada
- `packages/core`: funções puras reutilizáveis (Haversine, formatarBRL, simularCredito)

### ✅ Q5 — Versionamento de API

Prefixo global `api/v1` (configurado em `services/api/src/main.ts`). Não há plano formal de deprecação ou v2.

### ⚠️ Q6 — Tratamento de erros em cascata

`HttpExceptionFilter` global captura exceções NestJS e retorna JSON padronizado. No frontend, `api-client.ts` lança `ApiError` com status + message. **Gap**: sem retry logic, sem circuit breaker — uma falha da API derruba silenciosamente a UI.

### ❌ Q7 — API Gateway

Sem API Gateway dedicado. O Next.js atua como BFF (Backend for Frontend) via `/api/proxy/**`. Rate limiting está no NestJS via `ThrottlerModule`. **Gap**: sem WAF, sem roteamento avançado.

### ❌ Q8 — Logging distribuído / Correlation IDs

Sem correlation IDs. Fastify loga em dev (`logger: true`). Sem rastreamento ponta-a-ponta de uma requisição.

### ⚠️ Q9 — Observabilidade

`.env.example` tem `SENTRY_DSN`, `SENTRY_TRACING_SAMPLE_RATE=0.1`, `SENTRY_ERROR_SAMPLE_RATE=1.0`. `next.config.js` referencia `@opentelemetry`. **Gap**: Sentry não está configurado no NestJS — apenas no Next.js (parcial).

### ✅ Q10 — Autenticação e Autorização

- JWT com `JWT_SECRET` HS256
- Access token: 8h, httpOnly cookie `access_token`
- Refresh token: 7d, httpOnly cookie `refresh_token`
- Revogação: `SessaoToken` table — refresh token é invalidado no uso (`revogadoEm`)
- Fluxo: login → `gerarTokens()` → cookies → JwtStrategy valida na API + verifica DB se usuário bloqueado
- Next.js middleware verifica assinatura com `jose jwtVerify()` (desde PR atual)

### ✅ Q11 — RBAC

8 roles ativos em `UsuarioTipo` (+ `GESTOR_FUNDO` legado no enum, normalizado para `GESTOR`): ADMIN, **GESTOR (Gestor do Fundo — único gestor)**, CONSTRUTOR, TOMADOR, ENGENHEIRO, GESTOR_OBRA, COMERCIAL, PARCEIRO.  
Verificação em 2 camadas:  
1. `middleware.ts` (Next.js): routing de UI  
2. `@Roles()` + `RolesGuard` (NestJS): autorização real por endpoint

### ✅ Q12 — Gerenciamento de sessões

Sessões na tabela `SessaoToken` do PostgreSQL. Refresh token rotacionado a cada uso (revoga o anterior). Sem Redis para sessão — só para cache e filas.

### ✅ Q13 — Comunicação frontend ↔ backend

REST com JSON. `api-client.ts` em `@imbobi/core` abstrai fetch. Na web, o proxy Next.js forwarda cookies automaticamente. Fastify serve na porta 4000.

### ❌ Q14 — Real-time features

Sem WebSocket, SSE ou polling implementado. Notificações são pull-based (usuário abre a UI para ver notificações novas).

### ❌ Q15 — Deploy / Versionamento de frontend

Sem pipeline de CI/CD definido. Sem blue-green ou canary configurado.

### ❌ Q16 — Feature flags

Sem sistema de feature flags.

### ✅ Q17 — Configuração por ambiente

Variáveis de ambiente (`.env`). `ConfigModule` global no NestJS. `.env.example` documentado com todas as chaves. `NODE_ENV` controla comportamentos (CORS, logs, tela de credenciais admin).

### ⚠️ Q18 — Cache multi-camada

- **Backend**: `CacheModule` global com Redis (Keyv), TTL 5min — disponível via `@UseInterceptors(CacheInterceptor)`, mas uso por endpoint não verificado
- **Frontend**: HTTP cache padrão do Next.js (`force-dynamic` em algumas páginas)
- **CDN**: não configurado

### ❌ Q19 — Circuit breaker

Não implementado.

### ❌ Q20 — Bulkhead pattern

Não implementado.

### ✅ Q21 — Retry logic (BullMQ)

Workers BullMQ têm retry automático com backoff exponencial. Redis tem `retryStrategy` com cap de 2000ms. Chamadas HTTP front→api sem retry.

### ❌ Q22 — Timeout handling

Sem timeout configurado nas chamadas `api-client.ts`. NestJS Fastify usa timeout padrão (não configurado explicitamente).

### ❌ Q23 — Graceful degradation

Páginas SSR usam `.catch(() => [])` para não quebrar em erro de API — isso é degradação mínima. Sem plano formal de fallback.

### ❌ Q24 — Health checks com alerting

Sem endpoint `/health` com alerting automatizado.

### ❌ Q25 — Disaster recovery

Sem RTO/RPO definido. Sem runbook documentado.

---

## SEÇÃO 2 — BANCO DE DADOS POSTGRESQL (30 perguntas)

### ✅ Q1 — Schema principal

Tabelas principais com suas relações:
```
Usuario (1) → (*) Obra → (*) EtapaObra → (*) EvidenciaEtapa
Usuario (1) → (*) Credito → (*) LiberacaoParcela
Credito (1) → (*) Obra
Usuario (1) → (*) SessaoToken
Usuario (1) → (*) KycDocumento
Usuario (1) → (*) Lead → (*) ConversionScore, LeadActivity
Lead → PipelineStage
SolicitacaoCredito → ComiteDigital → (*) VotoComite
```

### ✅ Q2 — Tabela de usuários

```prisma
model Usuario {
  usuarioId       String    @id @default(uuid())
  nome            String
  email           String    @unique
  cpf             String    @unique
  telefone        String?
  passwordHash    String
  tipo            UsuarioTipo
  comercialRole   ComercialRole?
  kycStatus       KycStatus @default(PENDENTE)
  funcoesBloqueadas String[]
  bloqueadoEm     DateTime?
  deletadoEm      DateTime?   // soft delete
  passwordResetToken String?
  passwordResetExpires DateTime?
  criadoEm        DateTime  @default(now())
  atualizadoEm    DateTime  @updatedAt
}
```
Soft delete via `deletadoEm`. Roles via `UsuarioTipo` enum (não array — um role por usuário).

### ✅ Q3 — Tabela de obras

```prisma
model Obra {
  obraId      String    @id @default(uuid())
  creditoId   String?
  usuarioId   String
  nome        String
  endereco    String
  geoLatitude  Float?
  geoLongitude Float?
  raioValidacaoMetros Int @default(50)
  areaM2      Float?
  tipo        String?
  status      ObraStatus @default(PLANEJAMENTO)
  // ObraStatus: PLANEJAMENTO, EM_EXECUCAO, PAUSADA, CONCLUIDA, CANCELADA
}
```
Sem histórico de mudanças de status (audit log só em EtapaObra e KycDocumento).

### ✅ Q4 — Tabela de crédito / tranches

```prisma
model Credito {
  creditoId    String  @id @default(uuid())
  usuarioId    String
  valorAprovado Decimal
  valorLiberado Decimal @default(0)
  taxaMensal   Float   @default(0.0099)  // 0.99% a.m.
  prazoMeses   Int
  status       StatusCredito  // ATIVO, SUSPENSO, VENCIDO, QUITADO
  dataAprovacao DateTime?
  dataVencimento DateTime?
  liberacoes   LiberacaoParcela[]
}

model LiberacaoParcela {
  liberacaoId String  @id @default(uuid())
  creditoId   String
  valor       Decimal
  status      LiberacaoStatus  // PENDENTE, PROCESSANDO, CONCLUIDA, FALHA
  motivo      String?
  processadoEm DateTime?
}
```

### ⚠️ Q5 — Garantias

Sem tabela `Garantia` dedicada. Campo `garantias` existe em `SolicitacaoCredito` como `String?`. Não há modelo formal para Alienação Fiduciária ou SPE.

### ❌ Q6–Q9 — Índices (simples, compostos, parciais, texto)

Apenas índices nos campos únicos declarados no schema Prisma (`@@unique`). Sem `@@index` explícitos adicionais. Sem full-text search implementado.

### ✅ Q10 — Normalização

Aproximadamente 3NF. Sem desnormalizações deliberadas além de `valorLiberado` em `Credito` (computed field mantido sincronizado pelo worker).

### ✅ Q11 — Migrations

Prisma Migrate. Comando: `pnpm db:migrate`. Histórico em `services/api/prisma/migrations/`.

### ❌ Q12 — Rollback de migrations

Prisma não suporta rollback automático. Sem processo documentado de rollback manual.

### ❌ Q13 — Conflitos de migrations em equipe

Sem processo documentado. Risco real em feature branches paralelas.

### ✅ Q14 — Soft deletes

`deletadoEm DateTime?` em `Usuario`. Worker `excluir-usuario` faz hard delete após 30 dias (LGPD).

### ✅ Q15 — Auditoria de dados

`EtapaAuditLog` e `KycAuditLog` registram mudanças com `acaoTipo`, `usuarioId`, e timestamp. Retidos por 7 anos (regulatório).

### ❌ Q16 — Versionamento de dados (histórico de mudanças de registro)

Sem event sourcing ou histórico de versões além dos audit logs.

### ❌ Q17 — Backup / Restore

Sem processo documentado. Depende do provedor de hospedagem (Render/Neon).

### ❌ Q18–Q20 — Replicação, read/write splitting, sharding

Não implementado. Banco único.

### ❌ Q21 — Queries lentas / EXPLAIN ANALYZE

Sem processo de monitoramento de queries lentas.

### ⚠️ Q22 — Query caching

`CacheModule` com Redis configurado globalmente no NestJS. Sem evidência de `@UseInterceptors(CacheInterceptor)` por endpoint.

### ✅ Q23–Q24 — Connection pool / Connection pooling

Prisma gerencia connection pool automaticamente. Redis tem `maxRetriesPerRequest: null` com backoff exponencial (cap 2000ms).

### ✅ Q25 — Transações

Prisma `$transaction([...])` em operações atômicas críticas (liberação de parcela no worker).

### ❌ Q26–Q27 — Transações distribuídas / Deadlocks

Sem 2-phase commit. Sem monitoramento de deadlocks.

### ✅ Q28–Q29 — Constraints / Integridade referencial

Chaves primárias (uuid), chaves estrangeiras com `onDelete: Cascade` onde apropriado, constraints `@unique` em email, cpf, refreshToken. Constraint composta em `VotoComite (comiteId, votanteId)`.

### ❌ Q30 — Triggers

Sem triggers de banco de dados.

---

## SEÇÃO 3 — SEGURANÇA (35 perguntas)

### ✅ Q1 — OWASP A01: Broken Access Control

`@Roles()` + `RolesGuard` em todos os endpoints protegidos. `JwtAuthGuard` global opcional. `middleware.ts` com `jwtVerify()` (jose). `JwtStrategy.validate()` consulta DB para verificar bloqueio.

### ✅ Q2 — OWASP A02: Cryptographic Failures

Senhas: bcrypt 12 rounds. JWT: HS256 com `JWT_SECRET` (min 64 chars). Tokens: crypto-random 32 bytes para password reset. HTTPS obrigatório em produção.

### ✅ Q3–Q4 — OWASP A03: Injection / SQL Injection

Prisma ORM com prepared statements. Zod valida todas as entradas antes de chegar ao banco.

### ✅ Q5 — NoSQL Injection

Não aplicável — sem MongoDB.

### ✅ Q6 — Command Injection

Sem execução de comandos do sistema na aplicação.

### ⚠️ Q7 — XSS

Next.js escapa output automaticamente em JSX. Sem `dangerouslySetInnerHTML`. **Gap**: sem DOMPurify para campos que aceitam HTML livre.

### ❌ Q8 — Content Security Policy (CSP)

Sem CSP configurado no `next.config.js`.

### ⚠️ Q9 — CSRF

Cookies `SameSite=Strict` mitigam CSRF. **Gap**: sem token CSRF explícito para maior robustez.

### ✅ Q10 — CORS

Configurado em `main.ts`: whitelist via `CORS_ORIGIN` env var, erro em produção se não configurado. Métodos e headers explícitos.

### ✅ Q11 — XXE

Sem processamento de XML.

### ✅ Q12 — Desserialização insegura

Dados deserializados via Zod (type-safe). Sem `eval()` ou `JSON.parse` sem validação.

### ❌ Q13 — Criptografia em repouso

Dados sensíveis no PostgreSQL não são criptografados em nível de coluna. Dependente de criptografia de disco do provedor.

### ✅ Q14 — Criptografia em trânsito

HTTPS obrigatório. TLS gerenciado pelo provedor (Render/Vercel). Fastify com `trustProxy: true`.

### ❌ Q15 — Gerenciamento de certificados SSL/TLS

Delegado ao provedor. Sem controle explícito de renovação.

### ✅ Q16 — Rate limiting

`ThrottlerModule` com 4 configurações:
- Default: 100 req/min
- Auth endpoints: 10 req/min
- Upload: 5 req/min  
- Manager: 20 req/min

`CustomThrottlerGuard` global em `app.module.ts`.

### ✅ Q17 — Proteção contra brute force

Rate limiting de 10/min nos endpoints de auth (`/auth/login`, `/auth/registrar`, `/auth/renovar`). `EsqueceuSenha` limitado a 5/min.

### ❌ Q18 — DDoS / WAF

Sem WAF. Rate limiting do ThrottlerModule é por processo (não distribuído). Em ambiente multi-instância, contadores não compartilhados.

### ❌ Q19 — MFA (Multi-factor Authentication)

Não implementado.

### ❌ Q20–Q21 — Phishing / Malware scanning

Sem validação de URLs. Sem scan de uploads (S3 direto).

### ✅ Q22 — Logging de segurança

`KycAuditLog` e `EtapaAuditLog` registram ações sensíveis com usuário e timestamp. **Gap**: sem log de tentativas de login falhas ou acessos suspeitos.

### ⚠️ Q23 — Alertas de segurança

`SLACK_WEBHOOK_URL` no `.env.example`. Sem implementação de alertas automáticos além do Sentry.

### ✅ Q24 — Gerenciamento de secrets

Environment variables. `.env` nunca commitado (`.gitignore`). `.env.example` com todos os keys documentados.

### ❌ Q25 — Rotação de secrets

Sem processo de rotação de `JWT_SECRET` ou chaves AWS.

### ✅ Q26–Q27 — Insecure deserialization / Broken authentication

Zod valida todos os payloads. JWT verificado com assinatura (jose). Tokens rotativos com revogação por DB.

### ⚠️ Q28 — Sensitive data exposure

Senhas nunca retornadas. Setup endpoint corrigido. **Gap**: sem mascaramento de CPF/telefone em logs.

### ✅ Q29 — XXE

Sem XML processing.

### ✅ Q30 — Broken access control

Ver Q1.

### ❌ Q31 — Security misconfiguration

Sem hardening checklist documentado. Sem headers de segurança (HSTS, X-Frame-Options, etc.) configurados no Next.js.

### ❌ Q32 — Componentes com vulnerabilidades conhecidas

Sem Snyk, Dependabot ou `npm audit` no CI.

### ⚠️ Q33 — Insufficient logging

Audit logs para KYC e etapas existem. **Gap**: sem logs estruturados de segurança centralizados, sem correlation IDs.

### ❌ Q34 — Penetration testing

Nunca realizado formalmente.

### ❌ Q35 — Gerenciamento de vulnerabilidades de dependências

Sem processo automático. Manual apenas.

---

## SEÇÃO 4 — PERFORMANCE (30 perguntas)

### ❌ Q1–Q3 — Métricas de performance (p50/p95/p99, FCP/LCP/CLS)

Sem medição ativa. Sentry configurado mas não confirmado no backend.

### ⚠️ Q4 — Caching backend

Redis disponível via `CacheModule`. TTL global 5min. Uso por endpoint não verificado.

### ❌ Q5 — Query caching

Sem cache de queries explícito além do `CacheModule`.

### ❌ Q6 — Queries lentas

Sem processo de monitoramento com `EXPLAIN ANALYZE`.

### ✅ Q7 — Pagination

`page` e `limit` nos schemas Zod (ex: `FiltroEvidenciaSchema`: page=1, limit=20).

### ❌ Q8–Q30 — Lazy loading, bundle size, compression, service workers, etc.

Next.js fornece code splitting, lazy loading e compressão automaticamente. Sem configuração adicional específica. Sem service workers. Sem Web Vitals tracking ativo.

---

## SEÇÃO 5 — ESCALABILIDADE (30 perguntas)

### ✅ Q6 — Message queues

BullMQ com Redis. Duas filas: `QUEUE_LIBERACAO` e `QUEUE_EXCLUIR_USUARIO`.

### ✅ Q12 — Retry logic (workers)

BullMQ retry automático em workers com backoff.

### ✅ Q26–Q27 — Queue management / Priority queues

BullMQ suporta prioridade por job. Workers com `@OnQueueFailed()` e `@OnQueueCompleted()`.

### ✅ Q28 — Dead letter queues

`LiberacaoParcela.status = FALHA` quando worker falha após retries.

### ✅ Q29 — Request deduplication

Worker de liberação tem guarda de idempotência: verifica `status !== PENDENTE` antes de processar.

### ❌ Q1–Q5, Q7–Q11, Q13–Q25, Q30 — Horizontal scaling, load balancer, sharding, auto-scaling, etc.

Não implementado. Sistema single-instance. Adequado para fase atual.

---

## SEÇÃO 6 — TESTES (20 perguntas)

### ❌ Q1–Q20 — Toda a seção

**Cobertura atual: 0%.** Sem testes unitários, de integração ou E2E configurados. Sem CI rodando testes. Sem fixtures ou factories de dados.

---

## SEÇÃO 7 — DEVOPS E INFRAESTRUTURA (35 perguntas)

### ❌ Q1–Q35 — Toda a seção (exceto Q3, Q26)

### ✅ Q3 — Configuração por ambiente

`.env` por ambiente. `ConfigModule` global. `NODE_ENV` diferencia comportamentos.

### ⚠️ Q26 — Secrets management

Environment variables no provedor. Sem Vault ou solução dedicada.

---

## SEÇÃO 8 — DADOS E COMPLIANCE (15 perguntas)

### ✅ Q1 — LGPD

- Soft delete com `deletadoEm`
- Hard delete após 30 dias via `QUEUE_EXCLUIR_USUARIO` worker
- KYC retido 5 anos (AML)
- Audit logs retidos 7 anos (regulatório)
- `funcoesBloqueadas[]` por usuário para controle granular
- `ExcluirUsuarioWorker` envia email de confirmação após exclusão

### ❌ Q2 — GDPR

Não aplicável (produto brasileiro, LGPD é suficiente).

### ❌ Q3 — Data residency

Sem garantia formal de residência de dados no Brasil.

### ⚠️ Q4 — Data retention

Implementado para KYC (5 anos) e audit logs (7 anos) no worker de exclusão. Sem política para outros dados.

### ❌ Q5–Q6 — Criptografia em repouso / Anonimização

Sem criptografia em nível de coluna. Sem anonimização de dados.

### ✅ Q8 — Audit trail

`EtapaAuditLog` e `KycAuditLog` com `acaoTipo`, `usuarioId`, timestamp.

### ❌ Q9–Q15 — Data classification, DLP, masking, governance, etc.

Não implementado.

---

## SEÇÃO 9 — DOMÍNIO DE NEGÓCIO (20 perguntas)

### ✅ Q1 — Fluxo de crédito imobiliário

```
Lead (comercial) 
  → ConversionScore (score 0-100)
  → SolicitacaoCredito (PENDENTE → EM_COMITE → APROVADA/REPROVADA)
  → ComiteDigital + VotoComite (ABERTO → EM_VOTACAO → ENCERRADO)
  → Credito (ATIVO)
  → LiberacaoParcela (PENDENTE → PROCESSANDO → CONCLUIDA/FALHA)
    via BullMQ worker (QUEUE_LIBERACAO)
```

### ✅ Q2 — Cálculo de taxa

`taxaMensal` padrão: `0.0099` (0.99% a.m.) em `Credito`. Schema permite range personalizado. `simularCredito()` em `packages/core/src/credito.ts` usa Price/SAC.

### ✅ Q3 — Cálculo de tranches / desembolsos

`LiberacaoParcela` por etapa de obra. Worker atualiza `Credito.valorLiberado` de forma atômica com idempotência.

### ✅ Q4 — Medição de obra / avanço físico

`EtapaObra.percentualObra` define peso da etapa. `EvidenciaEtapa` registra foto com GPS (Haversine valida distância da obra, raio padrão 50m). `EtapaStatus`: PLANEJADA → EM_EXECUCAO → AGUARDANDO_VISTORIA → CONCLUIDA/REPROVADA.

### ⚠️ Q5 — Garantias

Campo `garantias: String?` em `SolicitacaoCredito`. Sem modelo relacional dedicado para Alienação Fiduciária ou SPE.

### ✅ Q6 — Vistoria técnica

`VistoriaModule` + `EngenheirosModule`. Engenheiro registra `EvidenciaEtapa` com foto + GPS. `EtapaAuditLog` rastreia aprovações/reprovações com usuário responsável.

### ✅ Q7–Q9 — Análise e aprovação de crédito

`ScoreModule` calcula `ConversionScore` (scoreFinal, probabilidadeClosing, 5 componentes). `ComiteDigital` com votação digital (`VotoComite` com APROVAR/AJUSTAR/REPROVAR). `SolicitacaoCredito.ratingCalculado` embute o rating no momento da solicitação.

### ✅ Q10 — Recebimento / rastreamento de crédito

`Credito.valorLiberado` acumulado. `LiberacaoParcela` com `processadoEm` e status granular.

### ✅ Q11–Q12 — Relatórios e dashboards

Dashboards por role: fundos (`/dashboard/fundos`), construtor, gestor, admin, engenheiro, comercial. KPIs: valorLiberado, obrasProgresso, etapasCompletadas, inadimplência, ROI. `ReportExport` component para exportação.

### ✅ Q13 — Curva S

`calculateRoiTimeline()` em `fundos-utils.ts`. Dados por mês com ROI esperado vs real baseado em `LiberacaoParcela.processadoEm`.

### ✅ Q14 — Alertas de atraso

`etapasAguardandoVistoria` na dashboard de fundos. `TipoNotificacao.VISTORIA_PENDENTE` no sistema de notificações.

### ✅ Q16 — Pipeline de leads

`PipelineStage` com `ordem`, `corHex`, `taxaConversao`, `diasMedioStage`. `Lead` com `stageId` FK. `LeadActivity` para histórico de interações (12 tipos de atividade).

### ✅ Q17–Q18 — Pipeline / Conversão de leads

`ComercialModule` com filtros por score, região, fonte, segmento. `ConversionScore.probabilidadeClosing` e `dataEstimadaClosing` para previsibilidade.

### ⚠️ Q20 — Notificações para clientes

`Notificacao` (in-app, 12 tipos). `PushNotificacoesModule` com Firebase FCM (`UsuarioFcmToken`). `EmailModule` com SendGrid/SES/SMTP. **Gap**: FCM token não registrado no Expo (app mobile não envia token ao backend).

---

## SEÇÃO 10 — INTEGRAÇÃO E COMUNICAÇÃO (20 perguntas)

### ✅ Q1 — Comunicação frontend ↔ backend

REST. `@imbobi/core/api-client` com métodos `get/post/patch/delete`. Base URL via `NEXT_PUBLIC_API_URL`. Proxy Next.js em `/api/proxy/**` para manter cookies httpOnly.

### ✅ Q2 — Versionamento de comunicação

`api/v1` como prefixo global. Schemas Zod versionados via packages.

### ❌ Q3–Q5 — Retry, timeout, circuit breaker em chamadas API

Não implementado no `api-client.ts`.

### ✅ Q8 — Autenticação em chamadas de API

JWT via Bearer token (server-side) ou cookie httpOnly (browser).

### ❌ Q9–Q10 — Logging e monitoring de chamadas API

Sem logging estruturado de chamadas. Sem APM ativo.

### ✅ Q12 — Request/response validation

Zod schemas em todos os endpoints com `ZodPipe`.

### ❌ Q13 — API Documentation (Swagger/OpenAPI)

Não implementado. Sem Swagger configurado no NestJS.

### ✅ Q18 — Message broker

BullMQ + Redis.

### ❌ Q19–Q20 — Saga pattern / Compensating transactions

Não implementado formalmente. Worker de liberação tem idempotência, mas sem saga distribuída.

---

## SEÇÃO 11 — MONITORAMENTO E OBSERVABILIDADE (20 perguntas)

### ⚠️ Q1–Q4 — Métricas e dashboards

Sentry configurado no `.env.example`. `SLACK_WEBHOOK_URL` para alertas. **Gap**: sem Grafana, Prometheus, ou Datadog.

### ❌ Q5–Q20 — On-call, incident response, SLO/SLI, tracing distribuído, profiling, etc.

Não implementado.

---

## SEÇÃO 12 — DESENVOLVIMENTO E QUALIDADE (20 perguntas)

### ✅ Q4 — Type checking

TypeScript strict em todos os pacotes. `pnpm type-check` roda em todos os workspaces via Turborepo.

### ✅ Q6 — Dependency management

pnpm workspaces com lockfile. Turborepo para build orchestration.

### ✅ Q8 — Git workflow

Feature branches, PRs para `main`. Commit messages descritivos.

### ❌ Q2–Q3 — Linting / Formatting

ESLint e Prettier provavelmente configurados mas sem verificação confirmada no CI.

### ❌ Q5 — Static analysis

Sem SonarQube.

### ❌ Q7 — Dependency scanning

Sem Snyk ou Dependabot.

### ❌ Q10–Q12 — Branch protection, PR process, code ownership

Sem CODEOWNERS. Sem branch protection rules documentadas.

### ❌ Q14 — API documentation

Sem Swagger/OpenAPI.

### ❌ Q15–Q20 — ADR, runbook, knowledge base, onboarding, training, tech debt

Não documentado formalmente.

---

---

# PLANO DE IMPLEMENTAÇÃO — GAPS CRÍTICOS

## P0 — Antes de ir pra produção com clientes reais

### 1. Testes de integração nos fluxos financeiros

**Por que é crítico para o Imobi:** O sistema movimenta crédito imobiliário real. Um bug no worker de liberação de parcela ou no cálculo de score pode resultar em prejuízo financeiro ou processamento incorreto de tranches. Sem testes, cada deploy é uma aposta.

**O que fazer:**
```bash
# Instalar jest + supertest + prisma test db
pnpm --filter @imbobi/api add -D jest @nestjs/testing supertest jest-mock-extended
```

Prioridade de testes:
1. `liberacao-parcela.worker.spec.ts` — idempotência, valor correto, notificação
2. `auth.service.spec.ts` — login, bloqueio, renovarToken com bloqueio
3. `score.service.spec.ts` — cálculo de obrasConcluidasNoPrazo, filtro de score
4. `credito.service.spec.ts` — aprovação, desembolso sequencial

**Esforço estimado:** 3-5 dias. Retorno imediato em confiança nos deploys.

---

### 2. CI/CD com GitHub Actions

**Por que é crítico:** Sem pipeline automatizado, bugs chegam em produção sem detecção. Para um sistema financeiro, isso é inaceitável.

**O que fazer:** Criar `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test
```

**Esforço estimado:** 1 dia (depois que os testes existirem).

---

### 3. Real S3 upload no KYC

**Por que é crítico:** A tela de KYC está usando URL mock (`https://s3.example.com/...`). Em produção, documentos KYC não são salvos — isso quebra o fluxo regulatório (AML/KYC é obrigação legal).

**O que fazer:**
- `StorageModule` já existe em `services/api/src/modules/storage/`
- Verificar se está sendo chamado no `KycModule` ou se o upload vai direto pra URL mock
- Conectar upload multipart do Next.js → `/api/proxy/kyc/upload` → `StorageService` → S3

**Esforço estimado:** 1-2 dias.

---

### 4. Admin pipeline page (correção de 404)

**Por que é crítico:** Link `/dashboard/admin/pipeline` existe na nav mas a página não existe — 404 para administradores.

**O que fazer:** Criar `apps/web/app/(dashboard)/dashboard/admin/pipeline/page.tsx` com listagem de `SolicitacaoCredito` (filtro por status, por gestor, por data).

**Esforço estimado:** 1 dia.

---

### 5. Sentry no NestJS (backend)

**Por que é crítico:** Erros no backend (falhas de liberação, exceções de DB) são invisíveis. Sem monitoramento, problemas em produção só aparecem quando um usuário reclama.

**O que fazer:**
```bash
pnpm --filter @imbobi/api add @sentry/nestjs @sentry/profiling-node
```

```typescript
// services/api/src/main.ts — antes do bootstrap
import * as Sentry from "@sentry/nestjs";
Sentry.init({
  dsn: process.env["SENTRY_DSN"],
  tracesSampleRate: Number(process.env["SENTRY_TRACING_SAMPLE_RATE"] ?? 0.1),
});
```

Adicionar `SentryGlobalFilter` como global exception filter.

**Esforço estimado:** 2-4 horas.

---

## P1 — Nas próximas 4 semanas

### 6. MFA para ADMIN e GESTOR

**Por que é crítico para o Imobi:** Administradores têm acesso a dados de crédito de todos os clientes e podem bloquear/desbloquear usuários. Uma conta comprometida sem MFA é brecha grave.

**O que fazer:** TOTP (authenticator app) é suficiente. Email como fallback.

```bash
pnpm --filter @imbobi/api add otpauth
```

Novo fluxo de login para roles críticas:
```
POST /auth/login → { requiresMfa: true, mfaToken: "temp_jwt_15min" }
POST /auth/login/mfa { mfaToken, code } → { accessToken, refreshToken }
```

Novo campo no schema:
```prisma
model Usuario {
  mfaSecret     String?
  mfaAtivadoEm  DateTime?
}
```

**Esforço estimado:** 3-4 dias.

---

### 7. CSP Headers no Next.js

**Por que é crítico:** Sem Content Security Policy, XSS pode executar scripts arbitrários — em um sistema financeiro, isso pode capturar dados de formulários de crédito.

**O que fazer em `next.config.js`:**
```js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-{nonce}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' *.amazonaws.com data:;
  connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL};
  frame-ancestors 'none';
`;
// Adicionar via headers() ou middleware
```

**Esforço estimado:** 1-2 dias (testagem é a parte demorada).

---

### 8. Security Headers básicos

**Por que é crítico:** HSTS, X-Frame-Options, X-Content-Type-Options — proteções básicas que o Next.js não aplica por padrão.

**O que fazer em `next.config.js`:**
```js
headers: async () => [{
  source: "/(.*)",
  headers: [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  ],
}]
```

**Esforço estimado:** 2-4 horas.

---

### 9. Dependabot / npm audit no CI

**Por que é crítico:** Dependências com vulnerabilidades conhecidas são um vetor de ataque. Para um fintech, CVEs em produção são inaceitáveis.

**O que fazer:** Criar `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      dev-deps:
        dependency-type: "development"
```

Adicionar `pnpm audit --audit-level=high` no CI.

**Esforço estimado:** 2 horas.

---

### 10. Endpoint /health com alerting

**Por que é crítico:** Sem health check, o load balancer não sabe se a instância está saudável. Falhas silenciosas servem tráfego de erro.

**O que fazer:**
```typescript
// services/api/src/modules/health/health.controller.ts
@Get("health")
async health() {
  await this.prisma.$queryRaw`SELECT 1`;
  return { status: "ok", timestamp: new Date().toISOString() };
}
```

**Esforço estimado:** 2-4 horas.

---

### 11. Correlation IDs nos logs

**Por que é crítico:** Quando um usuário reporta erro, sem correlation ID é impossível rastrear qual requisição falhou entre Next.js → NestJS → PostgreSQL.

**O que fazer:**
```bash
pnpm --filter @imbobi/api add cls-rtracer
```

```typescript
// Middleware global que injeta UUID por request
// Todos os logs incluem { correlationId }
// Next.js passa X-Correlation-ID header
```

**Esforço estimado:** 1 dia.

---

### 12. Processo de backup documentado

**Por que é crítico:** Sistema financeiro com crédito real — perder dados do banco é perda irreversível de informação regulatória.

**O que fazer:**
- Configurar backup automático diário no provedor de PostgreSQL (Neon/Render/Supabase)
- Documentar processo de restore testado
- Testar restore em ambiente de staging mensalmente
- Alertar se backup falhar

**Esforço estimado:** 1 dia (maioria é configuração no provedor).

---

## P2 — Próximos 3 meses

### 13. Swagger / OpenAPI

**Por que:** Facilita onboarding de novos devs e integração com parceiros externos.

**O que fazer:**
```bash
pnpm --filter @imbobi/api add @nestjs/swagger swagger-ui-fastify
```

`@ApiProperty()` nos DTOs, `SwaggerModule.setup("docs", app, document)` no `main.ts`. Proteger com autenticação em produção.

**Esforço estimado:** 2-3 dias (decorar todos os DTOs).

---

### 14. Feature flags (DIY simples)

**Por que:** Permite ativar features por usuário/role sem deploy. Útil para rollout gradual de novas funcionalidades de crédito.

**O que fazer:** Aproveitar `funcoesBloqueadas[]` já existente em `Usuario` como base. Adicionar `funcoesBloqueadas` para o sistema inverso (features liberadas).

**Esforço estimado:** 2 dias.

---

### 15. API documentation pública para parceiros

**Por que:** `ParceirosModule` e `MarketplaceModule` existem — parceiros precisam de documentação para integrar.

**Esforço estimado:** 1 semana (documentação + SDK básico).

---

### 16. Criptografia em nível de coluna para CPF/dados sensíveis

**Por que:** LGPD exige proteção adicional de dados pessoais sensíveis. CPF, email e telefone armazenados em plaintext.

**O que fazer:** `pgcrypto` extension + funções de encrypt/decrypt em Prisma raw queries para campos CPF.

**Esforço estimado:** 3-5 dias (inclui migração de dados existentes).

---

### 17. Rate limiting distribuído com Redis

**Por que:** O `ThrottlerModule` atual armazena contadores em memória — em multi-instância, cada processo tem seu próprio contador (ineficaz).

**O que fazer:**
```bash
pnpm --filter @imbobi/api add @nestjs-throttler/storage-redis
```

```typescript
ThrottlerModule.forRoot({
  storage: new ThrottlerStorageRedisService(redisClient),
  ...
})
```

**Esforço estimado:** 4 horas.

---

### 18. Perfil de usuário editável

**Por que:** Usuários não conseguem atualizar nome/telefone — fluxo UX incompleto.

**O que fazer:** `PATCH /usuarios/me` já pode existir no `UsuariosModule`. Verificar e criar UI em `/dashboard/perfil`.

**Esforço estimado:** 1 dia.

---

### 19. Persistência de simulação de crédito

**Por que:** Usuário faz simulação e perde os dados ao sair da página — sem histórico.

**O que fazer:** Salvar resultado em `localStorage` ou criar tabela `SimulacaoCredito` com TTL de 30 dias.

**Esforço estimado:** 4 horas (localStorage) ou 1 dia (tabela DB).

---

### 20. FCM token registration no Expo (mobile)

**Por que:** `UsuarioFcmToken` existe no banco, `PushNotificacoesModule` está implementado — mas o app mobile não registra o token FCM, então push notifications não chegam.

**O que fazer:**
```typescript
// apps/mobile — em um hook useEffect após login
import { getExpoPushTokenAsync } from "expo-notifications";
const token = await getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
await api.post("/usuarios/fcm-token", { token: token.data });
```

**Esforço estimado:** 4 horas.

---

# RESUMO EXECUTIVO

| Seção | Status |
|-------|--------|
| Arquitetura geral | ⚠️ Sólida, faltam circuit breaker e health checks |
| Banco de dados | ⚠️ Schema bem modelado, faltam índices e backup |
| Segurança | ⚠️ Auth robusto, faltam MFA, CSP, dependency scanning |
| Performance | ⚠️ Cache disponível, não medido |
| Escalabilidade | ✅ Adequada para fase atual (BullMQ, idempotência) |
| Testes | ❌ Zero — risco crítico para sistema financeiro |
| DevOps/CI/CD | ❌ Não configurado |
| LGPD/Compliance | ✅ Melhor que a maioria (worker de exclusão, audit logs) |
| Domínio de negócio | ✅ Bem implementado (crédito, obras, comitê) |
| Integração | ⚠️ REST sólido, falta circuit breaker e Swagger |
| Observabilidade | ⚠️ Sentry parcial, sem correlation IDs |
| Qualidade de código | ✅ TypeScript strict, Zod, Prisma type-safe |

**Top 5 ações para implementar agora (por impacto/risco):**
1. ❌ Testes nos fluxos financeiros (worker de liberação, auth, score)
2. ❌ CI/CD no GitHub Actions
3. ❌ Sentry no NestJS (visibilidade de erros em produção)
4. ❌ S3 real no KYC (obrigação regulatória)
5. ❌ MFA para ADMIN/GESTOR (risco de acesso não autorizado a dados de crédito)
