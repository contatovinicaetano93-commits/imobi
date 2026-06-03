# RELATÓRIO CONFERÊNCIA — Validações de Negócio imobi

**DATA**: 3 de Junho de 2026
**FOCO**: Regras de negócio, edge cases, conformidade
**RESPONSÁVEL**: Agente de Conferência (Validation)

---

## 🎯 Objetivo

Validar que **todas as regras de negócio** são aplicadas corretamente em:
1. Schemas Zod (`@imbobi/schemas`) — SOURCE OF TRUTH
2. Backend API (NestJS) — Validação incontornável
3. Frontend (Next.js) — UX + client hints
4. Mobile (Expo) — Offline validation (if applicable)

---

## 📋 VALIDAÇÕES CRITICAS

### 1. AUTENTICAÇÃO & AUTORIZAÇÃO

#### Rule 1.1: Tipos de Usuário
```typescript
enum UsuarioTipo {
  TOMADOR,        // Pessoa tomando crédito
  GESTOR_OBRA,    // Gestor/engenheiro da obra
  ADMIN,          // Admin interno
  PARCEIRO        // Parceiro de crédito
}
```

**Validação Conferência**:
- [ ] Signup só cria TOMADOR (não permite selecionar tipo)
- [ ] GESTOR_OBRA criado por admin via backend
- [ ] Login retorna JWT com `usuarioTipo` claim
- [ ] Tentativa de acessar /dashboard/gestor sem GESTOR_OBRA role → 403

**Teste**:
```bash
POST /auth/signup { email, senha, nome, cpf, telefone }
# Resposta: JWT com claims { usuarioId, usuarioTipo: "TOMADOR" }

GET /dashboard/gestor/etapas (sem GESTOR_OBRA)
# Resposta: 403 Unauthorized
```

---

#### Rule 1.2: JWT & Refresh Token
```
JWT lifetime: 1h
Refresh token: 7 days (HttpOnly cookie)
Refresh endpoint: POST /auth/refresh (auto-rotate old token)
Logout: DELETE /auth/logout (invalidate session)
```

**Validação Conferência**:
- [ ] JWT expirado → 401
- [ ] POST /auth/refresh com refresh token válido → novo JWT
- [ ] POST /auth/logout → token revoked
- [ ] Tentar usar refreshed token 2x → 401 (rotation prevents replay)

**Teste**:
```bash
# Simular expiração
JWT_TOKEN=<expired_token>
curl -H "Authorization: Bearer $JWT_TOKEN" /api/v1/creditos
# Resposta: 401 Token expired

# Refresh
curl -X POST /auth/refresh
# Resposta: novo JWT + novo refresh token em HttpOnly cookie
```

---

### 2. KYC & VALIDACAO DE DOCUMENTOS

#### Rule 2.1: CPF Validação
```
Regra: CPF deve ser válido (modulo-11 checksum)
Origem: @imbobi/schemas → cpfSchema
Validação: Client (UX) + Server (authoritative)
```

**Validação Conferência**:
- [ ] CPF inválido (checksum falha) → Zod error (client)
- [ ] CPF válido mas já cadastrado → 409 Conflict (backend)
- [ ] CPF com formato inválido → 400 Bad Request

**Teste**:
```bash
# CPF inválido
POST /auth/signup { cpf: "111.111.111-11" }
# Resposta: 400 Invalid CPF (checksum failed)

# CPF duplicado
POST /auth/signup { cpf: "123.456.789-10", email: "new@test.com" }
# Resposta: 409 CPF already registered
```

---

#### Rule 2.2: KYC Status Workflow
```
Status progression:
PENDENTE → ANALISANDO → APROVADO
                      └→ REJEITADO

Timeline:
- User uploads docs → PENDENTE
- Admin reviews → muda para ANALISANDO
- After 3 days → auto-revert to PENDENTE if not reviewed
- Admin approves → APROVADO (user can apply for credit)
- Admin rejects → REJEITADO (must resubmit)
```

**Validação Conferência**:
- [ ] User não pode aplicar crédito com KYC ≠ APROVADO
- [ ] Status transitions respeito sequência
- [ ] Após 72h ANALISANDO → volta para PENDENTE
- [ ] Reject reason obrigatório (max 500 chars)

**Teste**:
```bash
# Tentar aplicar crédito sem KYC
POST /creditos { obraId, valorSolicitado }
# Status KYC: PENDENTE
# Resposta: 403 KYC not approved yet

# Reject com motivo
PATCH /admin/kyc/:id { status: "REJEITADO", motivoRejeicao: "..." }
# Resposta: 200 + user notificado via FCM

# Auto-timeout após 72h
GET /admin/kyc/:id (criado 72h+ atrás com status ANALISANDO)
# Resposta: status = PENDENTE
```

---

### 3. CREDITO & SIMULACAO

#### Rule 3.1: Simulação de Crédito
```
Input:
  - valor: número (min 1000, max 500000)
  - prazo: meses (6, 12, 24, 36)
  - tipoCredito: PESSOA_FISICA | PEFJ | PJ

Output (calculado pelo backend):
  - valorLiberado
  - taxaMensal (% ao mês)
  - jurosTotal
  - parcelasMensal
  - dataInicio, dataFim
```

**Validação Conferência**:
- [ ] Valor < 1000 → 400 Bad Request
- [ ] Valor > 500000 → 400 Bad Request
- [ ] Prazo não em (6, 12, 24, 36) → 400 Bad Request
- [ ] Simulação retorna cálculos corretos

**Teste**:
```bash
POST /creditos/simular {
  valor: 50000,
  prazo: 12,
  tipoCredito: "PESSOA_FISICA"
}

# Resposta esperada:
{
  valorSolicitado: 50000,
  valorLiberado: 45000,      # (90% do solicitado, exemplo)
  taxaMensal: 2.5,           # 2.5% ao mês
  parcelasMensal: 3750,      # valor/prazo (simplificado)
  jurosTotal: 5000,
  dataVencimento: "2027-06-03"
}

# Verificar: parcelasMensal * prazo ≈ valorLiberado + jurosTotal
```

---

#### Rule 3.2: Score & Approval Automático
```
Score calculation:
  - Base: 300-900 (tipo FICO)
  - Fatores: CPF limpo, KYC, histórico de pagamentos
  - Update: Realtime quando dados mudam

Aprovação automática:
  - Score >= 700 + KYC APROVADO → Credito auto-approve
  - Score < 700 → Manual review by ADMIN
```

**Validação Conferência**:
- [ ] Score calculado corretamente após KYC aprovação
- [ ] Score < 700 → Credito em status AGUARDANDO_REVISAO
- [ ] Score >= 700 → Credito em status APROVADO
- [ ] Score atualiza em realtime quando histórico muda

**Teste**:
```bash
# User com score 750
GET /creditos/:id
# Resposta: status = "APROVADO"

# User com score 600
GET /creditos/:id
# Resposta: status = "AGUARDANDO_REVISAO"

# Admin approva manualmente
PATCH /admin/creditos/:id { status: "APROVADO" }
# Resposta: 200 + liberacao-parcela job enfileirado
```

---

### 4. OBRAS & ETAPAS

#### Rule 4.1: Estrutura de Obra
```
Obra = projeto de construção
├── Etapas (sequencial)
│   ├── Fundação (20%)
│   ├── Estrutura (30%)
│   ├── Acabamento (40%)
│   └── Finalização (10%)
└── Evidências (GPS-validated fotos)
```

**Validação Conferência**:
- [ ] Etapa só aprovada se anterior foi aprovada
- [ ] Primeira etapa pode ser aprovada direto
- [ ] Obra não pode ter >100% progresso

**Teste**:
```bash
# Tentar aprovar etapa 2 sem etapa 1
PATCH /admin/etapas/:etapa2Id { status: "APROVADA" }
# Resposta: 403 Previous etapa must be approved first

# Aprovar etapa 1 → depois etapa 2
PATCH /admin/etapas/:etapa1Id { status: "APROVADA" }
# Resposta: 200 + /admin/etapas/:etapa2Id now approvable
```

---

#### Rule 4.2: Raio de Validação GPS
```
Obra criação:
  - latitude, longitude obrigatório
  - raioValidacao: metros (default 500m)

Evidência upload:
  - Foto + GPS coordinates + accuracy
  - Server valida: distance(foto.gps, obra.gps) < raioValidacao
  - Se fora: EvidenciaEtapa rejeitada, usuário notificado
```

**Validação Conferência**:
- [ ] Evidência dentro raio → APROVADA
- [ ] Evidência fora raio → REJEITADA + notify user
- [ ] GPS accuracy > 30m → badge "Precisão baixa" (client hint)
- [ ] Foto sem GPS → 400 Bad Request

**Teste**:
```bash
# Obra em São Paulo (Pinheiros)
POST /obras {
  latitude: -23.5505,
  longitude: -46.6333,
  raioValidacao: 500
}

# Evidência dentro do raio (100m away)
POST /evidencias/:obraId {
  foto: <file>,
  latitude: -23.5515,
  longitude: -46.6333,
  accuracy: 8.5
}
# Resposta: 200 + EvidenciaEtapa.status = "APROVADA"

# Evidência fora do raio (1000m away)
POST /evidencias/:obraId {
  foto: <file>,
  latitude: -23.5600,
  longitude: -46.6333,
  accuracy: 8.5
}
# Resposta: 200 (upload OK) mas EvidenciaEtapa.status = "REJEITADA"
# User notificado: "Foto fora da zona autorizada (1000m > 500m)"
```

---

### 5. LIBERACAO DE PARCELAS (Async BullMQ)

#### Rule 5.1: Payment Release Workflow
```
Fluxo:
1. Admin approva etapa → Job "liberacao-parcela" enfileirado
2. Background worker processa:
   a. Valida se etapa todas evidências aprovadas
   b. Calcula valor da parcela
   c. Transferência bancária (mock ou real)
   d. Registra LiberacaoParcela
3. User notificado via FCM

Timeout: HTTP request returns imediatamente (async)
Status tracking: GET /liberacoes/:id
```

**Validação Conferência**:
- [ ] Liberação nunca bloqueia HTTP (async only)
- [ ] Job retry se falha (3 tentativas com backoff)
- [ ] Valor liberado = (etapa.percentual * credito.valorLiberado)
- [ ] User notificado quando concluída

**Teste**:
```bash
# Approvar etapa
PATCH /admin/etapas/:id { status: "APROVADA" }
# Resposta: 200 + imediato (job enfileirado background)

# Verificar status
GET /liberacoes?etapaId=:id
# Resposta: { status: "PROCESSANDO", iniciadoEm, ... }

# Após 10-30s (background processing)
GET /liberacoes/:id
# Resposta: { status: "CONCLUIDA", valorLiberado: 45000, ... }

# User recebeu FCM notification
```

---

### 6. NOTIFICACOES

#### Rule 6.1: Trigger & Delivery
```
Eventos que disparam notificações:
- KYC aprovada/rejeitada
- Crédito aprovado/rejeitado
- Etapa aprovada/rejeitada
- Parcela liberada
- Score atualizado

Delivery:
- FCM (Firebase Cloud Messaging) se usuário opt-in
- Email (SMTP) como fallback
- In-app (persistido em DB Notificacao)
```

**Validação Conferência**:
- [ ] Notificação enviada quando evento ocorre
- [ ] User pode marcar como lido via API
- [ ] Notificação não enviada se user opt-out
- [ ] Retry se falha (3x com backoff)

**Teste**:
```bash
# Aprovar KYC
PATCH /admin/kyc/:id { status: "APROVADO" }
# Background job "notificacao-push" enfileirado
# User vê notificação no app em tempo real (FCM)

# Marcar como lido
PATCH /notificacoes/:id { lida: true }
# Resposta: 200

# Listar notificações não lidas
GET /notificacoes?lida=false
# Resposta: array de notificações
```

---

### 7. RATE LIMITING

#### Rule 7.1: Throttle por Endpoint
```
Limite por tipo de endpoint:
- Geral: 100 req/min per IP/user
- Auth (signup/login): 10 req/min per IP
- Upload: 5 req/min per user
- Admin operations: 20 req/min per user
```

**Validação Conferência**:
- [ ] Após 101 requests/min → 429 Too Many Requests
- [ ] Auth endpoints mais restritivo (10/min)
- [ ] Rate limit reset a cada minuto
- [ ] Header `Retry-After` presente em 429

**Teste**:
```bash
# Simular 101 requisições em 1 minuto
for i in {1..101}; do curl /api/v1/creditos; done
# Respostas 1-100: 200 OK
# Resposta 101: 429 Too Many Requests
# Header: Retry-After: 45 (segundos)
```

---

### 8. SEGURANCA - IDOR & AUTORIZAÇÃO

#### Rule 8.1: Ownership Checks
```
Quando user A tenta acessar resource de user B:
- GET /creditos/:id (B's credit) → 403 Forbidden (A não owner)
- PATCH /obras/:id (B's work) → 403 Forbidden
- DELETE /notificacoes/:id (B's notif) → 403 Forbidden
```

**Validação Conferência**:
- [ ] Todo GET/PATCH/DELETE valida ownership
- [ ] Manager pode ver/approve etapas apenas de obras atribuídas
- [ ] Admin pode ver tudo (override)
- [ ] 403 retornado (não 404, que revelaria existência)

**Teste**:
```bash
# User A (JWT de A)
GET /creditos/:creditoId (de User B)
# Resposta: 403 Forbidden (ou 404 se escondido)

# Manager A (gestão de Obra X)
GET /obras/:obraId (Obra Y, outro manager)
# Resposta: 403 Forbidden

# Admin
GET /obras/:obraId (qualquer obra)
# Resposta: 200 OK
```

---

### 9. DATA INTEGRITY

#### Rule 9.1: Cascading Deletes & Soft Deletes
```
Quando usuário excluído:
- Usuario → soft delete (deletedAt)
- Creditos associados → permanecem (histórico)
- Sessões ativas → revogadas
```

**Validação Conferência**:
- [ ] Soft delete: dados não aparecem em queries normais
- [ ] Hard delete nunca feito para dados críticos
- [ ] Histórico preservado para auditoria

**Teste**:
```bash
# Excluir usuário
DELETE /usuarios/:id
# Resposta: 204 No Content

# Tentar logar com deleted user
POST /auth/login { email, senha }
# Resposta: 401 Invalid credentials

# Admin vê histórico (com deletedAt)
GET /admin/users/:id
# Resposta: { ...user, deletedAt: "2026-06-03T02:00:00Z" }
```

---

## 📊 CHECKLIST DE VALIDACAO

### Phase 5-A (Validação E2E)
- [ ] Autenticação: signup → login → JWT
- [ ] KYC: upload docs → admin approve → status muda
- [ ] Crédito: simulação → aplicação → auto/manual approval
- [ ] Obra: criar → etapas → GPS validation
- [ ] Liberação: admin approva etapa → background job → parcela liberada
- [ ] Rate limiting: 101 requests/min → 429
- [ ] IDOR: user A não vê dados de user B

### Phase 5-B (Edge Cases)
- [ ] CPF inválido → 400
- [ ] CPF duplicado → 409
- [ ] GPS fora raio → EvidenciaEtapa REJEITADA
- [ ] Score < 700 → AGUARDANDO_REVISAO
- [ ] Token expirado → auto-refresh
- [ ] Rate limit atingido → 429 com Retry-After

### Phase 5-C (Load & Stress)
- [ ] 100 users simultâneos → sem errors
- [ ] 1000 notificações enfileiradas → processadas com sucesso
- [ ] Database connections saturadas → graceful degrade (503)
- [ ] Redis falha → API continues (sem caching)

---

## 🚀 EXECUÇÃO

### Ferramenta Recomendada
```bash
# Integração com backend E2E tests
cd services/api
npm run test:e2e

# Observar logs
npm run test:e2e -- --verbose
```

### Relatório de Resultados
```markdown
# Conferência Validation Report — Phase 5-A

| Regra | Teste | Status | Observações |
|-------|-------|--------|-------------|
| 1.1 Tipos de usuário | User signup type | ✅ PASS | |
| 1.2 JWT expiry | Token 401 após 1h | ⚠️ FAIL | Expired em 59min |
| 2.1 CPF checksum | Invalid CPF 400 | ✅ PASS | |
| ...
```

---

## 📞 ESCALAÇÃO

**Blocker encontrado?**
1. Abrir GitHub issue com `[CONFERENCIA]` prefix
2. Tag: `@claude-backend`, `@claude-frontend`
3. Incluir: testcase exato, resposta obtida, resposta esperada
4. Aguardar fix + revalidar

---

**Responsible Agent**: Claude (Conferência)
**Updated**: 2026-06-03 02:00 UTC
**Status**: READY FOR VALIDATION

