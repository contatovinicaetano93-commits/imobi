# 🚀 ROADMAP PARALELO: Conclusão do MVP (Free + Testado)

**Data**: 2026-05-31  
**Objetivo**: Projeto completo, free tier, totalmente testado  
**Estratégia**: 3 tracks paralelos (API, Web, Mobile)

---

## 📊 STATUS ATUAL CONSOLIDADO

| Componente | Status | Detalhe |
|-----------|--------|---------|
| **Back 1: API Core** | ✅ 90% | GPS validation ✅, OAuth ✅, KYC module ✅, Email ✅, Workers ✅ |
| **Back 1: AWS Phase 1** | 📋 0% | SES, RDS, ElastiCache (ready to execute) |
| **Front 2: Landing** | ✅ 100% | Pitch deck colors implemented ✅ |
| **Front 2: Auth** | ✅ 100% | Login + Cadastro conectados à API ✅ |
| **Front 2: Obras** | 🟡 30% | Mock data, NOT connected to API |
| **Front 2: KYC Upload** | 🟡 20% | Documentos page has mock data |
| **Front 2: Dashboard** | 🟡 40% | Pages exist but NOT populated |
| **Back 2: Auth** | ✅ 80% | Estrutura pronta |
| **Back 2: Obras List** | ✅ 100% | Fully connected to API ✅ |
| **Back 2: KYC Upload** | 🟡 50% | Estrutura existe, integration pending |

**Critical Path**: Back 1 KYC tests + Front 2 API integration + AWS Phase 1

---

## 🎯 TRACK 1: BACK 1 (NestJS API) — 6-8 horas

### Phase 1A: Resolve KYC E2E Tests (2h)
**Blocker**: Jest database connection pooling issue  
**Action**:
1. Investigate connection pool configuration in test setup
2. Implement test database cleanup/reset utility
3. Run all 27 KYC test cases
4. Verify passing state

**Files**: 
- services/api/src/modules/kyc/kyc.e2e.spec.ts (27 tests)
- services/api/jest.config.js (connection config)

**Deliverable**: ✅ All 27 tests passing

### Phase 1B: Complete CORS Verification (1h)
**Status**: Configured but not fully tested  
**Action**:
1. Test preflight requests (OPTIONS) from different origins
2. Verify credential headers included
3. Test actual cross-origin POST/GET from browser

**Files**: services/api/src/main.ts (CORS config)

**Deliverable**: ✅ CORS properly tested end-to-end

### Phase 1C: AWS Phase 1 Implementation (3-4h)
**Timeline**: Can start in parallel AFTER Auth is verified working  
**Order**:
1. **Email (SES)** — 2h
   - Install @aws-sdk/client-ses
   - Create SES adapter in services/api/src/modules/email/email.service.ts
   - Replace Nodemailer transporter
   - Test: Send KYC approval/rejection emails
   - Validate: Check SES Dashboard

2. **Database (RDS)** — 4h (can run in parallel with Email)
   - Create RDS instance (t2.micro, 20GB, 7-day backup)
   - Update DATABASE_URL in .env
   - Run prisma db push / migrate
   - Test: SELECT version() from RDS
   - Validate: Run full test suite with RDS
   - Backup: pg_dump local database

3. **Cache (ElastiCache)** — 3h (after Email)
   - Create ElastiCache Redis cluster (cache.t2.micro)
   - Update REDIS_URL in .env
   - Test: redis-cli ping
   - Validate: BullMQ processes jobs with ElastiCache
   - Test: Session data persistence

**Deliverables**:
- ✅ SES email integration tested
- ✅ RDS database running and populated
- ✅ ElastiCache Redis connected
- ✅ All services working on AWS free tier

**Effort**: ~9 hours total | **Cost**: $0 (free tier)

---

## 🎯 TRACK 2: FRONT 2 (Next.js Web) — 6-8 horas

### Phase 2A: Connect Obras Page to API (2h)
**Current State**: Mock data showing hardcoded 3 obras  
**Action**:
1. Create hook: `useObras()` that calls `GET /api/v1/obras`
2. Replace mock data with real API calls
3. Add loading states + error handling
4. Test: Navigate to /dashboard/obras, verify list populates
5. Add "Nova Obra" button → form to POST /api/v1/obras

**Files**: 
- apps/web/app/(dashboard)/obras/page.tsx
- apps/web/lib/api.ts (add obrasApi.listar(), obrasApi.criar())

**Deliverable**: ✅ Dynamic obra listing + creation form working

### Phase 2B: Implement Obra Creation Flow (1.5h)
**Includes**: Address, GPS, area, dates  
**Action**:
1. Create form component with ZodSchema validation
2. Handle GPS input (map or coordinates)
3. Create modal/page for "Nova Obra"
4. POST to /api/v1/obras
5. Redirect to obra details
6. Test: Create obra → verify in database and list

**Files**:
- apps/web/components/obra-form.tsx (new)
- apps/web/app/(dashboard)/obras/nova/page.tsx (new)

**Deliverable**: ✅ User can create obra with GPS validation

### Phase 2C: KYC Document Upload (2.5h)
**Current State**: Mock page with hardcoded documents  
**Action**:
1. Replace mock data with real KYC upload form
2. Create form for: RG, CPF, Selfie, Comprovante Residência
3. Implement file upload to S3 via API
4. POST to /api/v1/kyc/upload for each document
5. Show upload progress + status
6. List uploaded documents with status (PENDENTE → APROVADO)
7. Test: Upload RG + Selfie, verify in database

**Files**:
- apps/web/app/(dashboard)/documentos/page.tsx (update)
- apps/web/components/kyc-upload-form.tsx (new)
- apps/web/lib/api.ts (add kycApi.upload(), kycApi.listar())

**Deliverable**: ✅ Full KYC upload workflow connected to API

### Phase 2D: Dashboard Population (1.5h)
**Action**:
1. Connect dashboard/home to API
2. Display user stats: obras count, KYC status, credit info
3. Show recent activities
4. Show credit available
5. Links to next actions

**Files**:
- apps/web/app/(dashboard)/dashboard/page.tsx (update)
- apps/web/app/(dashboard)/home/page.tsx (update)

**Deliverable**: ✅ Dashboard shows real user data

### Phase 2E: E2E Browser Testing (1h)
**Action**:
1. Create Playwright test for full flow:
   - Load landing page → screenshot with pitch deck colors
   - Click "Simular Crédito" → redirect to /cadastro
   - Register user → redirect to /dashboard
   - Create obra → verify in list
   - Upload KYC docs → verify status
   - Check dashboard update

**Files**:
- apps/web/e2e/flow.spec.ts (new)

**Deliverable**: ✅ Full user flow E2E tested

**Effort**: 6-8 hours | **Blocker**: Back 1 API working

---

## 🎯 TRACK 3: BACK 2 (Expo Mobile) — 4-5 horas

### Phase 3A: Verify Auth Implementation (1h)
**Current**: Structure exists  
**Action**:
1. Test login on mobile emulator
2. Test register
3. Verify tokens saved correctly (SecureStore)
4. Test JWT refresh
5. Verify auth guard on protected routes

**Files**:
- apps/mobile/app/(auth)/login.tsx
- apps/mobile/app/(auth)/cadastro.tsx
- apps/mobile/lib/auth.ts

**Deliverable**: ✅ Auth flow working on device

### Phase 3B: Complete Obra Details Page (1.5h)
**Current**: Listing works, details page partial  
**Action**:
1. Create obra detail page with full info
2. Display 9 default stages (etapas) with progress
3. Add evidence gallery (fotos geovalidadas)
4. Add button to upload new foto
5. Test: Click obra → see details + stages

**Files**:
- apps/mobile/app/(tabs)/obras/[id]/_layout.tsx
- apps/mobile/app/(tabs)/obras/[id]/index.tsx (new/update)

**Deliverable**: ✅ Obra details with stages visible

### Phase 3C: KYC Upload on Mobile (1.5h)
**Action**:
1. Create KYC upload screen
2. Document type selector (RG, CPF, Selfie, etc)
3. Camera + gallery picker
4. Upload to S3 via API
5. Show status and completion % (need 2+ docs)
6. Test: Upload RG + Selfie → KYC status updates

**Files**:
- apps/mobile/app/(tabs)/perfil/kyc.tsx (new)
- apps/mobile/lib/api.ts (add kycApi methods)

**Deliverable**: ✅ Mobile KYC upload working

### Phase 3D: Credit & Dashboard (1h)
**Action**:
1. Connect credito screen to API
2. Show available credit
3. Show simulation details
4. Link to main dashboard

**Files**:
- apps/mobile/app/(tabs)/credito/index.tsx (update)

**Deliverable**: ✅ Mobile dashboard populated with real data

**Effort**: 4-5 hours | **Blocker**: Back 1 API working

---

## 🔗 INTERDEPENDENCIES & EXECUTION ORDER

```
WEEK 1 (Days 1-2):
├─ Back 1: KYC E2E tests (2h) ← BLOCKER for everything else
├─ Back 1: CORS verification (1h)
├─ Back 1: AWS Phase 1 Email task (2h) ← START IN PARALLEL

WEEK 1 (Days 3-5):
├─ Front 2: Obras API integration (2h) ← DEPENDS ON: Back 1 API ✅
├─ Front 2: Obra creation form (1.5h)
├─ Front 2: KYC upload (2.5h)
├─ Back 2: Auth verification (1h) ← PARALLEL
├─ Back 2: Obra details page (1.5h)
├─ Back 2: KYC mobile upload (1.5h)

WEEK 2:
├─ Back 1: AWS Phase 1 Database (4h) ← CAN START parallel to Front
├─ Back 1: AWS Phase 1 ElastiCache (3h)
├─ Front 2: Dashboard population (1.5h)
├─ Front 2: E2E browser tests (1h)
├─ Back 2: Credit page (1h)

FINAL:
├─ Integration testing (all 3 tracks together)
├─ Performance validation
├─ AWS cost verification
```

---

## 📋 DAILY CHECKLIST (What to Commit)

### Day 1
- [ ] KYC E2E tests passing (27/27)
- [ ] CORS verification complete
- [ ] Commit: `feat: KYC e2e tests passing + CORS verified`

### Day 2
- [ ] SES email integration done
- [ ] Test KYC approval/rejection emails via SES
- [ ] Commit: `feat: AWS SES email integration (Phase 1 Email)`

### Day 3
- [ ] Obras page connected to API
- [ ] Obra creation form functional
- [ ] Commit: `feat: Front 2 - Obras API integration + creation form`

### Day 4
- [ ] KYC upload form on web
- [ ] Mobile auth verified
- [ ] Mobile obra details complete
- [ ] Commit: `feat: Front 2 - KYC upload + Back 2 - Mobile OBras details`

### Day 5
- [ ] Mobile KYC upload working
- [ ] Dashboard population on both platforms
- [ ] Commit: `feat: KYC upload on mobile + dashboard population`

### Week 2
- [ ] RDS database migration complete
- [ ] ElastiCache Redis connected
- [ ] Playwright E2E tests passing
- [ ] Commit: `feat: AWS Phase 1 complete - RDS + ElastiCache`

---

## 🎯 DEFINITION OF "COMPLETE & FREE & TESTED"

✅ **Complete**:
- User can register → create obra → upload KYC → see dashboard
- Works on web (Next.js) + mobile (Expo)
- All 8 core APIs connected (auth, obras, kyc, credit, etc)

✅ **Free**:
- All infra on AWS free tier (SES, RDS, ElastiCache)
- Cost: $0 until December 2027

✅ **Tested**:
- 27 KYC E2E tests passing
- Full user flow E2E tests with Playwright
- Manual testing on device/browser
- CORS verified end-to-end
- Performance baseline documented

---

## 📊 EFFORT BREAKDOWN

| Track | Phase | Effort | Status |
|-------|-------|--------|--------|
| Back 1 | KYC Tests | 2h | 📋 TODO |
| Back 1 | CORS | 1h | 📋 TODO |
| Back 1 | AWS Email | 2h | 📋 TODO |
| Back 1 | AWS Database | 4h | 📋 TODO |
| Back 1 | AWS Cache | 3h | 📋 TODO |
| **Back 1 Subtotal** | | **12h** | |
| Front 2 | Obras API | 2h | 📋 TODO |
| Front 2 | Obra Creation | 1.5h | 📋 TODO |
| Front 2 | KYC Upload | 2.5h | 📋 TODO |
| Front 2 | Dashboard | 1.5h | 📋 TODO |
| Front 2 | E2E Tests | 1h | 📋 TODO |
| **Front 2 Subtotal** | | **8.5h** | |
| Back 2 | Auth Verify | 1h | 📋 TODO |
| Back 2 | Obra Details | 1.5h | 📋 TODO |
| Back 2 | KYC Upload | 1.5h | 📋 TODO |
| Back 2 | Credit Page | 1h | 📋 TODO |
| **Back 2 Subtotal** | | **5h** | |
| **TOTAL** | | **~26 hours** | |

**Timeline**: ~3-4 weeks with parallel execution

---

## 🚀 SUCCESS CRITERIA

- ✅ 27 KYC tests passing
- ✅ Full user flow: Register → Obra → KYC → Dashboard (web + mobile)
- ✅ All API endpoints connected and working
- ✅ AWS Phase 1 complete (SES + RDS + ElastiCache)
- ✅ Zero cost during free tier (12 months)
- ✅ Playwright E2E test suite passing
- ✅ Ready for production deployment

