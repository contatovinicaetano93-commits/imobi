# PHASE 5 BRIEF — imobi Team Coordination

**Data**: 3 de Junho de 2026, 02:00 UTC
**Objetivo**: Validação E2E + Testes de Carga + Produção (48h target)
**Equipe**: Frontend Agent | Backend Agent | Conferência Agent

---

## 📊 STATUS ATUAL

| Componente | Status | Branch | URL |
|-----------|--------|--------|-----|
| **Frontend** | ✅ DEPLOYED | `main` | Pushed ✓ Vercel pending |
| **Backend** | ✅ DEPLOYED | `claude/happy-goldberg-AFQPj` | https://imobi-api-staging.onrender.com |
| **AWS EC2 API** | ✅ DEPLOYED | deployment scripts | 15.228.10.251:3001 |
| **Phase 4-C** | ✅ COMPLETE | `main` | AdvancedFilters ✓ BulkRejection ✓ GPS Map ✓ Audit Trail ✓ |

---

## 🎯 AGORA VOCÊ PODE...

### Para Agente FRONTEND
**Arquivo**: `.claude/reports/FRONTEND_STATUS.md`

**Tarefas**:
1. Validar que Phase 4-C features funcionam end-to-end
   - Advanced Filters conectadas ao backend
   - Bulk rejection modal com 5 reasons
   - GPS map renderizado com Leaflet
   - Audit trail timeline PT-BR

2. Rodar E2E tests
   ```bash
   # (Playwright setup quando disponível)
   npm run test:e2e
   ```

3. Testar happy path
   - Login → Dashboard → Filters → Approvals

4. Testar edge cases
   - Expired token → auto-refresh
   - Rate limit 429
   - IDOR prevention (user A não vê dados de user B)

---

### Para Agente BACKEND
**Arquivo**: `.claude/reports/FRONTEND_STATUS.md` + `PROJECT_CONTEXT.md`

**Tarefas**:
1. Validar que endpoints respondem corretamente
   ```bash
   GET /api/v1/admin/etapas (com filters)
   PATCH /api/v1/admin/etapas/:id (approve/reject)
   POST /api/v1/evidencias (GPS validation)
   ```

2. Rodar E2E tests
   ```bash
   npm run test:e2e
   ```

3. Validar job queues (BullMQ)
   - liberacao-parcela: após approve, job enfileirado
   - notificacao-push: usuários recebem FCM

4. Performance testing
   - 100 concurrent users
   - Cache hit rate > 80%
   - Response time < 200ms p95

---

### Para Agente CONFERENCIA
**Arquivo**: `.claude/reports/CONFERENCIA_VALIDATION.md`

**Tarefas**:
1. Validar 9 regras de negócio críticas
   - CPF checksum (modulo-11)
   - GPS validation (PostGIS distance < raio)
   - Score calculation (300-900)
   - KYC workflow (PENDENTE → ANALISANDO → APROVADO)
   - Credit approval logic
   - Payment async (BullMQ)
   - Rate limiting (429)
   - IDOR prevention
   - Data integrity

2. Testar edge cases para cada regra
   - CPF inválido → 400
   - GPS fora raio → EvidenciaEtapa REJEITADA
   - Score < 700 → AGUARDANDO_REVISAO
   - Unauthorized user → 403

3. Validação checklist Phase 5-A/B/C
   ```
   Phase 5-A: Happy path E2E
   Phase 5-B: Edge cases
   Phase 5-C: Load testing
   ```

---

## 🔗 SHARED CONTEXT

**Todos os agentes têm acesso a**:

1. **PROJECT_CONTEXT.md**
   - Arquitetura unificada
   - URLs (dev/staging/prod)
   - Integração entre componentes
   - Gotchas & known issues

2. **Shared Packages** (@imbobi/*)
   - schemas (Zod) — SOURCE OF TRUTH
   - core (hooks, utils, api-client)
   - ui (componentes base)

3. **Sync Protocol**
   - Git commits with descriptive messages
   - `.claude/reports/` directory
   - GitHub issues com `[BLOCKER]` prefix para escalação

---

## 📱 COMO USAR ESTES ARQUIVOS

### Para Frontend Agent
```
1. Ler: .claude/reports/FRONTEND_STATUS.md
2. Ler: PROJECT_CONTEXT.md (seção Frontend)
3. Executar: Tarefas de validação E2E
4. Reportar: Findings em GitHub issues
```

### Para Backend Agent
```
1. Ler: PROJECT_CONTEXT.md (seção Backend)
2. Ler: .claude/reports/CONFERENCIA_VALIDATION.md (rules to validate)
3. Executar: E2E tests + performance tests
4. Reportar: Job queue status, cache metrics
```

### Para Conferência Agent
```
1. Ler: .claude/reports/CONFERENCIA_VALIDATION.md
2. Ler: PROJECT_CONTEXT.md (seção Sync Protocol)
3. Executar: Validar 9 regras + edge cases
4. Reportar: Validation results em checklist
```

---

## 🚀 TIMELINE PROPOSTA

### Hour 0-4 (2026-06-03 02:00 — 06:00 UTC)
- [ ] Frontend: Validar Phase 4-C features
- [ ] Backend: Rodar E2E tests básicos
- [ ] Conferência: Validar 3 rules críticas (Auth, CPF, GPS)

### Hour 4-12 (2026-06-03 06:00 — 14:00 UTC)
- [ ] Frontend: E2E happy path
- [ ] Backend: Performance testing (100 users)
- [ ] Conferência: Validar 6 rules restantes

### Hour 12-24 (2026-06-03 14:00 — 2026-06-04 02:00 UTC)
- [ ] Frontend: Fix issues found
- [ ] Backend: Load testing + cache optimization
- [ ] Conferência: Edge case validation + report

### Hour 24-48 (2026-06-04 02:00 — 2026-06-05 02:00 UTC)
- [ ] Frontend: Vercel deploy + monitoring
- [ ] Backend: Production setup (AWS auto-scaling)
- [ ] Conferência: Final validation + sign-off

---

## 🎯 SUCCESS CRITERIA

**Frontend**: ✅ Phase 4-C features working end-to-end
**Backend**: ✅ 99.9% uptime, < 200ms p95, > 80% cache hit
**Conferência**: ✅ All 9 rules validated, all edge cases passing

**Go-Live**: ✅ All 3 agents sign-off → 2026-06-05 02:00 UTC target

---

## 📞 ESCALACAO

**Blocker encontrado?**
1. Abrir GitHub issue com `[BLOCKER]` + agent name
   ```
   Title: [BLOCKER][Frontend] Advanced Filters not connecting to API
   ```
2. Tag todos os agents: `@claude-frontend @claude-backend @claude-conferencia`
3. Incluir: testcase, resposta obtida, resposta esperada
4. Resolver em <1h (escalacao tempo crítico)

---

## 📂 FILES PARA COMPARTILHAR

**Enviar para Agente Backend**:
```
PROJECT_CONTEXT.md
.claude/reports/FRONTEND_STATUS.md (secção API Integration)
.claude/reports/CONFERENCIA_VALIDATION.md
```

**Enviar para Agente Frontend**:
```
PROJECT_CONTEXT.md
.claude/reports/FRONTEND_STATUS.md
.claude/reports/CONFERENCIA_VALIDATION.md (secção 8-9)
```

**Enviar para Agente Conferência**:
```
PROJECT_CONTEXT.md
.claude/reports/CONFERENCIA_VALIDATION.md (seu arquivo principal)
.claude/reports/FRONTEND_STATUS.md (secção API Endpoints)
```

---

## ✅ CHECKLIST ANTES DE COMPARTILHAR

- [x] Contexto unificado criado (PROJECT_CONTEXT.md)
- [x] Relatório Frontend criado (.claude/reports/FRONTEND_STATUS.md)
- [x] Relatório Conferência criado (.claude/reports/CONFERENCIA_VALIDATION.md)
- [x] Todos commitados e pushed
- [x] Sync protocol definido
- [x] Timeline proposta (48h)
- [x] Success criteria claro
- [ ] Agentes briefados (próximo passo)

---

**Ready for**: Phase 5 Team Coordination
**Updated**: 2026-06-03 02:00 UTC
**Next**: Share this brief + files with agents

