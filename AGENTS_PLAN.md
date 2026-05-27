# Frontend Development — Agent Distribution Plan

## 🎯 Agent A: Fundos Dashboard Refinement
**Lead**: Advanced metrics & visualization  
**Branch**: `feat/fundos-dashboard-advanced`

### Tasks:
1. **Charts & Visualization**
   - ROI chart (esperado vs real, histórico)
   - Inadimplência rate chart (por período)
   - Região distribution map/chart
   - Portfolio performance timeline

2. **Data Enhancements**
   - Fetch região data from obras (aggregate by estado/cidade)
   - Calculate ROI real from liberações vs expected
   - Inadimplência calculation logic
   - Export reports (CSV/PDF)

3. **Components**
   - `<PortfolioChart />` — ROI timeline
   - `<RegionalDistribution />` — Map or bar chart
   - `<InadimplenciaMetrics />` — Rate + trend
   - `<ReportExport />` — Export button

**Deliverable**: Production-ready Fundos dashboard with charts & exports

---

## 🎛️ Agent B: Manager Dashboard + Construtor Portal
**Lead**: Internal tools & UX refinement  
**Branch**: `feat/manager-construtor-portals`

### Tasks:

**Manager Dashboard Refinement** (`/dashboard/gestor`)
1. Better approval UX (single-click approve)
2. Bulk actions (multi-select, batch approve)
3. Advanced filters (date range, obra type, status)
4. Status badge improvements

**Construtor Portal** (`/dashboard/construtor` - NEW)
1. Credit simulator vs approved display
2. Cronograma de desembolsos (etapa timeline)
3. Technical reports overview
4. Score dinâmico (real-time evolution)
5. Notificação feed

### Components:
- `<BulkApprovalActions />` — Multi-select toolbar
- `<AdvancedFilters />` — Date range, status, type
- `<CreditSimulator />` — Side-by-side comparison
- `<DisembolsoTimeline />` — Etapas with dates
- `<ScoreDynamics />` — Chart of score evolution
- `<NotificationFeed />` — Recent activities

**Deliverable**: Manager dashboard improvements + full Construtor portal

---

## 👨‍🔧 Agent C: Eng. Portal + Mobile Web
**Lead**: Technical validation & mobile-first  
**Branch**: `feat/eng-portal-mobile`

### Tasks:

**Eng. Presencial Portal** (`/dashboard/engenheiro` - NEW)
1. Fila de visitas agendadas (list/calendar)
2. Validation form (checklist, observations)
3. Photo upload system
4. Relatório estruturado generation
5. GPS validation + distance check

**Mobile Web Complementar** (responsive version of construtor)
1. Mobile-first layout
2. Quick simulator widget
3. KYC status badge
4. Push notifications
5. Touch-optimized forms

### Components:
- `<VisitQueue />` — Scheduled inspections calendar
- `<ValidationForm />` — Structured checklist
- `<PhotoUploadWidget />` — With GPS capture
- `<InspectionReport />` — Auto-generated report
- `<QuickSimulator />` — Mobile simulator
- `<KYCStatus />` — Status badge + link

**Deliverable**: Full Eng. portal + mobile-optimized web experience

---

## 📊 Timeline
- **All agents start simultaneously** (parallel execution)
- **Daily check-ins** via commit messages
- **Integration merge** on main branch: 2-3 days
- **Sync point**: After Agent A completes, others can integrate chart components

## 🔗 API Assumptions
All agents should validate API endpoints with backend:
- `/obras?region=SP` — Filter by region
- `/credito/meus` — Current credits
- `/etapas/{id}/visitas` — Scheduled inspections
- `/engenheiro/validacoes` — Validation form schema
- `/score/historico` — Score evolution data

---

**Status**: Ready to deploy  
**Created**: 2026-05-27  
**Coordinator**: Claude (main session)
