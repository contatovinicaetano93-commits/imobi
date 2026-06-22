# 🎨 Imobi Frontend — Implementation Tracker

**Status**: Week 1 - Authentication & Core Layout  
**Timeline**: 4 weeks to MVP  
**Tech Stack**: Next.js 14, React, TypeScript, Tailwind CSS, React Hook Form, Zod

---

## 📊 PROGRESS TRACKING

### Week 1: Authentication & Core Layout (Days 1-5)

#### Day 1-2: Auth Core
- [x] Login page UI (already implemented)
- [x] Login form with validation
- [ ] **Register page** (create new)
- [ ] **Password reset flow** (esqueceu-senha)
- [ ] **Session management** (token refresh logic)
- [ ] **Route protection** (middleware for auth)
- [ ] **Post-login redirect** (fix navigation)

#### Day 3-4: Dashboard Shell
- [x] Dashboard layout (sidebar, nav, footer - already in layout.tsx)
- [ ] **Dashboard loading states** (skeleton screens)
- [ ] **Error pages** (404, 500 handlers - fix SSR)
- [ ] **Role-based menus** (show/hide nav items per role)
- [ ] **Mobile responsive** (hamburger menu for mobile)
- [ ] **Toast notifications** (useToast hook)

#### Day 5: Integration & Testing
- [ ] **Test login → dashboard flow** (full auth cycle)
- [ ] **Test role-based access** (each role sees correct nav)
- [ ] **Test session persistence** (reload page, still logged in)
- [ ] **Test error handling** (bad credentials, network errors)

---

### Week 2: TOMADOR Dashboard (Days 6-10)

#### Day 6-7: Properties Management
- [ ] **Lista de Obras** (property list with filters)
  - Search by name
  - Filter by status
  - Sort by date
  - Pagination
- [ ] **Criar Nova Obra** (add new property wizard)
  - Step 1: Basic info (name, location, phase)
  - Step 2: Financial (budget, timeline)
  - Step 3: Contacts (manager, email)
  - Step 4: Review & confirm
- [ ] **Detalhe da Obra** (property detail view)
  - Property overview
  - Timeline/stages
  - Documents attached
  - Actions (edit, delete, apply for credit)

#### Day 8-9: Credit Management
- [ ] **Credit simulator** (real-time calculations)
  - Input: property value, phase, term
  - Output: monthly payment, total interest, CET
  - Integration with backend API
- [ ] **Credit application wizard**
  - Select property
  - Confirm simulator result
  - Sign KYC consent
  - Submit application
- [ ] **Credit status tracker**
  - Show all credits (ABERTO, ATIVO, CONCLUIDA, REPROVADA)
  - Timeline of events
  - Approved limit & available balance
  - Recent releases

#### Day 10: Documents & KYC
- [ ] **KYC upload page**
  - Document types (CPF, RG, Comprovante de Renda, etc.)
  - Drag-drop upload
  - File preview
  - Status badges (enviado, verificando, aprovado, rejeitado)
- [ ] **Profile page**
  - Edit personal info
  - Change password
  - Delete account
  - Privacy settings

---

### Week 3: Cross-Role Features (Days 11-15)

#### Day 11-12: GESTOR Panel
- [ ] **Visão Geral** (fund overview)
  - Total AUM (assets under management)
  - Active credits
  - Pipeline value
  - Key metrics
- [ ] **Pipeline** (credit pipeline)
  - Filter by status (ABERTO, EM_ANÁLISE, APROVADO, LIBERADO)
  - Sort by date, value
  - Bulk actions (approve, reject, request docs)
- [ ] **Comitê** (approval committee)
  - List of pending approvals
  - Detail with financials
  - Approve/reject with comments
  - Audit trail

#### Day 13-14: ENGENHEIRO Panel
- [ ] **Inspecções** (site inspections)
  - List of due inspections
  - Camera integration for photos
  - Checklist (foundation, structure, etc.)
  - Status & observations
- [ ] **Alertas** (alerts/issues)
  - Flag issues on site
  - Track resolution
  - Attach photos/docs
- [ ] **Comitê** (engineering review)
  - View credit details
  - Add engineering opinion
  - Approve/reject

#### Day 15: COMERCIAL & ADMIN
- [ ] **COMERCIAL: Leads**
  - List of leads
  - Convert to customers
  - Track commissions
- [ ] **ADMIN: Users**
  - User management (create, edit, delete, deactivate)
  - Role assignment
  - Audit log

---

### Week 4: Polish & Optimization (Days 16-20)

#### Day 16-17: Performance
- [ ] Bundle size analysis
- [ ] Image optimization
- [ ] Code splitting
- [ ] Lazy loading for list pages
- [ ] Infinite scroll or pagination optimization

#### Day 18: Accessibility
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader testing (ARIA labels)
- [ ] Color contrast validation
- [ ] Focus management
- [ ] Form validation messages

#### Day 19-20: Testing & Refinement
- [ ] E2E tests (Cypress/Playwright)
  - Login flow
  - Create property
  - Apply for credit
  - Check status
- [ ] Visual regression tests
- [ ] Bug fixes from QA
- [ ] Mobile responsiveness final check

---

## 🗂️ DIRECTORY STRUCTURE

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx ✅
│   │   │   ├── LoginFormClient.tsx ✅
│   │   │   └── _components/
│   │   ├── cadastro/ ← [NEW]
│   │   │   ├── page.tsx
│   │   │   ├── CadastroFormClient.tsx
│   │   │   └── _components/
│   │   └── esqueceu-senha/ ← [NEW]
│   │       ├── page.tsx
│   │       └── ResetFormClient.tsx
│   └── (dashboard)/
│       ├── layout.tsx ✅ (sidebar nav)
│       ├── error.tsx ✅
│       ├── not-found.tsx ✅
│       └── dashboard/
│           ├── page.tsx ✅
│           ├── construtor/
│           │   └── page.tsx ✅
│           ├── obras/
│           │   ├── page.tsx (list) ← [ENHANCE]
│           │   ├── nova/ (wizard) ← [NEW]
│           │   └── [id]/ (detail) ← [ENHANCE]
│           ├── credito/
│           │   ├── page.tsx ← [NEW]
│           │   ├── simulador/ ← [NEW]
│           │   └── aplicar/ ← [NEW]
│           ├── kyc/
│           │   └── page.tsx ← [NEW]
│           ├── gestor/ ✅ (structure exists)
│           ├── engenheiro/ ✅ (structure exists)
│           ├── comercial/ ✅ (structure exists)
│           └── admin/ ✅ (structure exists)
├── components/
│   ├── ui/ (shadcn components)
│   ├── forms/ ← [NEW]
│   │   ├── PropertyForm.tsx
│   │   ├── CreditForm.tsx
│   │   └── KycForm.tsx
│   ├── layouts/ ← [NEW]
│   │   ├── DashboardShell.tsx
│   │   └── FormWizard.tsx
│   └── dashboard/ ← [NEW]
│       ├── PropertyCard.tsx
│       ├── CreditCard.tsx
│       └── StatusBadge.tsx
├── hooks/ ← [NEW]
│   ├── useAuth.ts (current user, logout)
│   ├── useApi.ts (data fetching with retry)
│   ├── useForm.ts (form state)
│   └── useToast.ts (notifications)
├── lib/
│   ├── api.ts ✅ (API client)
│   ├── auth/ ← [NEW]
│   │   ├── session.ts (JWT handling)
│   │   └── middleware.ts (route protection)
│   ├── utils.ts (helpers)
│   └── validators.ts (Zod schemas - use @imbobi/schemas)
└── styles/
    └── globals.css ✅

@imbobi/
├── schemas/ ✅ (already has Zod schemas)
├── core/ ✅ (hooks, utils)
└── ui/ ✅ (components)
```

---

## 🎯 PRIORITY FEATURES (MVP)

**Must Have** (Days 1-10):
1. ✅ Login page
2. **Register page** → [START HERE]
3. **Dashboard home** (redirect by role)
4. **Properties list** (CRUD basics)
5. **Credit simulator** (public API)
6. **KYC document upload**
7. **Profile page** (edit, change password)

**Should Have** (Days 11-15):
8. **GESTOR panel** (approve credits)
9. **ENGENHEIRO panel** (site inspections)
10. **COMERCIAL panel** (leads)
11. **ADMIN panel** (user management)

**Nice to Have** (Days 16-20):
12. Mobile app (Expo) - basic login + simulator
13. Notifications (real-time updates)
14. Export reports (PDF)
15. Maps integration (PostGIS queries)

---

## 🔌 API INTEGRATION CHECKLIST

All endpoints documented in `/docs/OPENAPI_SPECIFICATION.md`

### Authentication APIs ✅
- [x] POST /api/v1/auth/login
- [x] POST /api/v1/auth/registro
- [x] POST /api/v1/auth/refresh
- [x] POST /api/v1/auth/logout
- [ ] POST /api/v1/auth/esqueceu-senha
- [ ] POST /api/v1/auth/resetar-senha

### Properties APIs ✅
- [x] GET /api/v1/obras (list)
- [x] POST /api/v1/obras (create)
- [x] GET /api/v1/obras/:id (detail)
- [x] PATCH /api/v1/obras/:id (update)
- [x] DELETE /api/v1/obras/:id (delete)

### Credit APIs ✅
- [x] POST /api/v1/public/simulador (simulator)
- [x] POST /api/v1/credito (apply)
- [x] GET /api/v1/credito (list)
- [x] GET /api/v1/credito/:id (detail)
- [ ] GET /api/v1/credito/:id/etapas (stages)
- [ ] PATCH /api/v1/credito/:id (update status)

### KYC APIs ✅
- [x] POST /api/v1/kyc/documentos (upload)
- [x] GET /api/v1/kyc (status)
- [ ] DELETE /api/v1/kyc/documentos/:id (remove doc)

### Admin APIs ✅
- [x] GET /api/v1/admin/usuarios (list)
- [x] POST /api/v1/admin/usuarios (create)
- [x] PATCH /api/v1/admin/usuarios/:id (update)
- [x] DELETE /api/v1/admin/usuarios/:id (delete)

---

## 🧪 TESTING STRATEGY

### Unit Tests (Optional for MVP)
- Form validation
- Utils & helpers
- Custom hooks

### E2E Tests (Post-MVP)
- Login → Dashboard → Create Property
- Property → Credit Simulator → Apply
- KYC Upload → Document Verification

### Visual Tests
- Responsive design (mobile, tablet, desktop)
- Dark mode (if needed)
- Accessibility (keyboard nav, screen readers)

---

## 📋 COMPONENT CHECKLIST

### Form Components
- [ ] TextInput (with label, error, help text)
- [ ] EmailInput (with validation)
- [ ] PasswordInput (show/hide toggle) ✅
- [ ] SelectInput (dropdown)
- [ ] CurrencyInput (BRL formatting)
- [ ] FileUpload (drag-drop, preview)
- [ ] DateInput (calendar picker)
- [ ] PhoneInput (masks)

### Layout Components
- [ ] DashboardShell (sidebar, nav, footer)
- [ ] FormWizard (multi-step form with progress)
- [ ] Card (reusable card)
- [ ] Modal/Dialog (alerts, confirmations)
- [ ] SkeletonLoader (loading states)
- [ ] EmptyState (no data)
- [ ] ErrorBoundary (error handling)

### Dashboard Components
- [ ] PropertyCard (list item)
- [ ] CreditCard (credit item)
- [ ] StatusBadge (colored status)
- [ ] MetricBox (KPI card)
- [ ] Timeline (stages progress)
- [ ] DataTable (filterable list)

---

## 🚀 LAUNCH CHECKLIST

### Before Soft Launch (Day 20)
- [ ] All pages built and styled
- [ ] API integration complete
- [ ] Forms validated (client + server)
- [ ] Authentication working (login → dashboard)
- [ ] Each role dashboard working
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Images optimized
- [ ] Performance audit (Lighthouse > 85)
- [ ] Security scan (no XSS, CSRF, etc.)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] E2E tests passing
- [ ] Documentation updated (USAGE.md)

---

## 📚 RESOURCES

- **API Docs**: `/docs/OPENAPI_SPECIFICATION.md`
- **Schemas**: `@imbobi/schemas` package
- **UI Components**: `@imbobi/ui` + shadcn/ui
- **Backend Status**: All services running on `http://localhost:3000/api`

---

**Owner**: Cursor + Claude  
**Start Date**: June 22, 2026  
**Target Completion**: July 6, 2026  
**Status**: 🟢 READY TO START
