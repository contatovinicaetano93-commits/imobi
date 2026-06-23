# Component Library Documentation

## Overview

This document catalogs all UI components available across the imbobi project. Components are built using React with Tailwind CSS and are shared across web and mobile platforms where applicable.

---

## Table of Contents

1. [Manager Dashboard Components](#manager-dashboard-components)
2. [Constructor Portal Components](#constructor-portal-components)
3. [Engineer Portal Components](#engineer-portal-components)
4. [Funds Dashboard Components](#funds-dashboard-components)
5. [Shared Components](#shared-components)
6. [Styling & Design System](#styling--design-system)

---

## Manager Dashboard Components

### 1. BulkApprovalActions

**File**: `apps/web/components/dashboard/BulkApprovalActions.tsx`

**Purpose**: Floating action bar for bulk approving multiple etapas (stages).

**Props**:
```typescript
type BulkApprovalActionsProps = {
  selectedEtapas: string[];      // Array of selected etapa IDs
  onSuccess: () => void;          // Callback on successful approval
  onError: (message: string) => void; // Error callback
  isDisabled: boolean;            // Disable all actions
};
```

**Usage**:
```typescript
import { BulkApprovalActions } from "@/components/dashboard/BulkApprovalActions";

export function ManagerPage() {
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <>
      <EtapasTable 
        onSelectionChange={setSelected} 
        selectedIds={selected}
      />
      <BulkApprovalActions
        selectedEtapas={selected}
        onSuccess={() => refetchData()}
        onError={(msg) => showError(msg)}
        isDisabled={false}
      />
    </>
  );
}
```

**Features**:
- Displays count of selected items
- Confirmation modal before bulk action
- Loading state during processing
- Parallel approval requests
- Toast notifications for success/error

**States**:
- Idle (no items selected)
- Selecting (items shown in badge)
- Processing (button loading state)
- Confirming (modal displayed)

---

### 2. AdvancedFilters

**File**: `apps/web/components/dashboard/AdvancedFilters.tsx`

**Purpose**: Expandable filter panel for advanced querying of etapas and documents.

**Props**:
```typescript
type AdvancedFiltersProps = {
  onFilter: (filters: FilterState) => void;
  onReset: () => void;
};

type FilterState = {
  status: "todas" | "pendente" | "aprovada" | "rejeitada";
  dataInicio: string;      // ISO date
  dataFim: string;         // ISO date
  obraType: string;        // Type of work
};
```

**Usage**:
```typescript
import { AdvancedFilters } from "@/components/dashboard/AdvancedFilters";

export function EtapasPage() {
  const [filters, setFilters] = useState<FilterState>({
    status: "todas",
    dataInicio: "",
    dataFim: "",
    obraType: ""
  });

  const handleFilter = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Refetch data with new filters
  };

  return (
    <AdvancedFilters
      onFilter={handleFilter}
      onReset={() => setFilters(initialFilters)}
    />
  );
}
```

**Features**:
- Expandable/collapsible interface
- Status filter (dropdown)
- Date range selection
- Work type filter
- Active filter counter badge
- Clear/reset functionality
- Responsive grid layout

**Filter Options**:
- Status: "Todas", "Pendente", "Aprovada", "Rejeitada"
- Date Range: ISO date inputs
- Work Type: "Residencial", "Comercial", "Industrial", "Reforma"

---

## Constructor Portal Components

### 3. ScoreDynamics

**File**: `apps/web/components/dashboard/ScoreDynamics.tsx`

**Purpose**: Display constructor credit score with history and dynamics.

**Props**:
```typescript
type ScoreDynamicsProps = {
  currentScore: number;
  scoreHistory: Array<{
    score: number;
    motivo: string;
    criadoEm: string;
  }>;
  onRefresh?: () => void;
};
```

**Usage**:
```typescript
import { ScoreDynamics } from "@/components/dashboard/ScoreDynamics";

export function ConstructorDashboard() {
  const [score, setScore] = useState<ScoreAtual>();

  useEffect(() => {
    scoreApi.atual().then(setScore);
  }, []);

  return (
    <ScoreDynamics
      currentScore={score?.score ?? 0}
      scoreHistory={scoreHistory}
      onRefresh={() => location.reload()}
    />
  );
}
```

**Features**:
- Large score display with color coding
- Score level indicator (Excelente/Bom/Ruim)
- Historical timeline of score changes
- Reason for each score change
- Refresh button

**Color Coding**:
- Green (750+): "Excelente"
- Blue (600-749): "Bom"
- Orange (500-599): "Regular"
- Red (<500): "Ruim"

---

### 4. CreditSimulator

**File**: `apps/web/components/dashboard/CreditSimulator.tsx`

**Purpose**: Interactive credit simulation tool for constructors to explore financing options.

**Props**:
```typescript
type CreditSimulatorProps = {
  onSimulate: (amount: number, months: number, type: string) => void;
  loading?: boolean;
};
```

**Usage**:
```typescript
import { CreditSimulator } from "@/components/dashboard/CreditSimulator";

export function ConstructorPage() {
  const handleSimulate = async (amount: number, months: number, type: string) => {
    const result = await creditoApi.simular({
      valorSolicitado: amount,
      prazoMeses: months,
      tipoObra: type
    });
    setSimulation(result);
  };

  return (
    <CreditSimulator
      onSimulate={handleSimulate}
      loading={isLoading}
    />
  );
}
```

**Features**:
- Amount input slider (R$ 50k - R$ 5M)
- Duration selector (6-36 months)
- Work type dropdown
- Real-time calculation
- APR display
- Monthly installment calculation
- Total cost calculation

**Validation**:
- Minimum amount: R$ 50,000
- Maximum amount: R$ 5,000,000
- Duration: 6-36 months
- Only active after KYC approval

---

## Engineer Portal Components

### 5. VisitQueue

**File**: `apps/web/app/(dashboard)/dashboard/engenheiro/_components/VisitQueue.tsx`

**Purpose**: Displays ordered list of nearby works for engineer visits based on geolocation.

**Props**:
```typescript
type VisitQueueProps = {
  works: ObraResumo[];
  currentLocation: { lat: number; lng: number };
  radiusKm?: number;
  onSelectWork: (obraId: string) => void;
};
```

**Usage**:
```typescript
import { VisitQueue } from "./_components/VisitQueue";

export function EngineerDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number }>();
  const [works, setWorks] = useState<ObraResumo[]>([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
    });
  }, []);

  return (
    <VisitQueue
      works={works}
      currentLocation={location}
      radiusKm={10}
      onSelectWork={(id) => router.push(`/obras/${id}`)}
    />
  );
}
```

**Features**:
- Orders works by distance from current location
- Shows distance to each work
- Displays work address and progress
- Click to view work details
- Auto-updates every 60 seconds
- Color-coded status badges

---

### 6. QuickActions

**File**: `apps/web/app/(dashboard)/dashboard/engenheiro/_components/QuickActions.tsx`

**Purpose**: Floating action menu for quick access to common engineer tasks.

**Props**:
```typescript
type QuickActionsProps = {
  obraId: string;
  etapaId?: string;
  onCapturePhoto?: () => void;
  onStartVisit?: () => void;
  onMarkComplete?: () => void;
};
```

**Usage**:
```typescript
import { QuickActions } from "./_components/QuickActions";

export function ObraDetailPage({ params }: Props) {
  return (
    <>
      <ObraDetails id={params.id} />
      <QuickActions
        obraId={params.id}
        onCapturePhoto={() => openCamera()}
        onStartVisit={() => recordVisit()}
        onMarkComplete={() => completeStage()}
      />
    </>
  );
}
```

**Features**:
- Floating action button (FAB)
- Photo capture shortcut
- Visit start/end recording
- Stage completion marking
- Loading states
- Success/error notifications

---

### 7. DynamicVisitQueueClient

**File**: `apps/web/app/(dashboard)/dashboard/engenheiro/_components/DynamicVisitQueueClient.tsx`

**Purpose**: Client-side component for real-time visit queue updates with WebSocket support.

**Props**:
```typescript
type DynamicVisitQueueClientProps = {
  initialWorks: ObraResumo[];
  refreshInterval?: number; // milliseconds
};
```

**Usage**:
```typescript
import { DynamicVisitQueueClient } from "./_components/DynamicVisitQueueClient";

export function EngineerPage() {
  return (
    <DynamicVisitQueueClient
      initialWorks={works}
      refreshInterval={30000} // 30 seconds
    />
  );
}
```

**Features**:
- Auto-refresh location every 30 seconds
- Real-time distance recalculation
- Reorder queue as engineer moves
- Cached previous results
- Optimized performance
- Fallback to polling if WebSocket unavailable

---

## Funds Dashboard Components

### 8. PortfolioChart

**File**: `apps/web/app/(dashboard)/dashboard/fundos/_components/PortfolioChart.tsx`

**Purpose**: Visual representation of credit portfolio composition and performance.

**Props**:
```typescript
type PortfolioChartProps = {
  data: {
    totalCreditos: number;
    totalValor: number;
    creditosAtivos: number;
    creditosPagos: number;
    creditosAtrasados: number;
  };
  showLegend?: boolean;
};
```

**Usage**:
```typescript
import { PortfolioChart } from "./_components/PortfolioChart";

export function FundosDashboard() {
  return (
    <PortfolioChart
      data={portfolioData}
      showLegend={true}
    />
  );
}
```

**Features**:
- Donut chart showing portfolio breakdown
- Color-coded segments (Ativos/Pagos/Atrasados)
- Animated transitions
- Responsive sizing
- Legend with values
- Hover tooltips

---

### 9. InadimplenciaMetrics

**File**: `apps/web/app/(dashboard)/dashboard/fundos/_components/InadimplenciaMetrics.tsx`

**Purpose**: Display default/delinquency metrics and trends.

**Props**:
```typescript
type InadimplenciaMetricsProps = {
  totalCreditos: number;
  creditosAtrasados: number;
  diasMedioAtraso: number;
  recuperacaoPercentual: number;
};
```

**Usage**:
```typescript
import { InadimplenciaMetrics } from "./_components/InadimplenciaMetrics";

export function FundosDashboard() {
  return (
    <InadimplenciaMetrics
      totalCreditos={450}
      creditosAtrasados={12}
      diasMedioAtraso={35}
      recuperacaoPercentual={87.5}
    />
  );
}
```

**Features**:
- Key metrics cards
- Status indicators (Green/Yellow/Red)
- Percentage calculations
- Trend arrows
- Contextual explanations

---

### 10. RegionalDistribution

**File**: `apps/web/app/(dashboard)/dashboard/fundos/_components/RegionalDistribution.tsx`

**Purpose**: Geographic distribution of works and credits across regions.

**Props**:
```typescript
type RegionalDistributionProps = {
  regions: Array<{
    name: string;
    obras: number;
    creditos: number;
    valor: number;
  }>;
  sortBy?: "obras" | "creditos" | "valor";
};
```

**Usage**:
```typescript
import { RegionalDistribution } from "./_components/RegionalDistribution";

export function FundosDashboard() {
  return (
    <RegionalDistribution
      regions={regionData}
      sortBy="valor"
    />
  );
}
```

**Features**:
- Regional breakdown table
- Works count by region
- Credit count by region
- Total value by region
- Sorting options
- Filtering by state/city

---

### 11. ReportExport

**File**: `apps/web/app/(dashboard)/dashboard/fundos/_components/ReportExport.tsx`

**Purpose**: Export portfolio reports in multiple formats (PDF, CSV, Excel).

**Props**:
```typescript
type ReportExportProps = {
  format?: "pdf" | "csv" | "xlsx";
  includeRegional?: boolean;
  includeMaps?: boolean;
  dateRange?: { start: string; end: string };
};
```

**Usage**:
```typescript
import { ReportExport } from "./_components/ReportExport";

export function FundosDashboard() {
  return (
    <ReportExport
      format="pdf"
      includeRegional={true}
      includeMaps={true}
      dateRange={{
        start: "2026-01-01",
        end: "2026-05-31"
      }}
    />
  );
}
```

**Features**:
- Format selection (PDF/CSV/XLSX)
- Date range picker
- Checkbox options for sections
- Preview before export
- Download progress indicator
- Email delivery option

---

## Shared Components

### 12. KYCStatusBadge

**File**: `apps/web/app/(dashboard)/_components/KYCStatusBadge.tsx`

**Purpose**: Visual badge showing KYC verification status.

**Props**:
```typescript
type KYCStatusBadgeProps = {
  status: "pendente" | "aprovado" | "rejeitado";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
};
```

**Usage**:
```typescript
import { KYCStatusBadge } from "@/app/(dashboard)/_components/KYCStatusBadge";

export function UserCard() {
  return (
    <div>
      <h3>João Silva</h3>
      <KYCStatusBadge status="aprovado" size="md" showIcon={true} />
    </div>
  );
}
```

**Features**:
- Color-coded badges (Green/Orange/Red)
- Icon indicators
- Multiple sizes
- Tooltip with description
- Accessibility labels

---

### 13. MobileNotificationBanner

**File**: `apps/web/app/(dashboard)/_components/MobileNotificationBanner.tsx`

**Purpose**: Notification banner optimized for mobile view.

**Props**:
```typescript
type MobileNotificationBannerProps = {
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
};
```

**Usage**:
```typescript
import { MobileNotificationBanner } from "@/app/(dashboard)/_components/MobileNotificationBanner";

export function DashboardLayout() {
  return (
    <>
      {notification && (
        <MobileNotificationBanner
          title="Etapa Aprovada"
          message="Sua etapa 'Fundações' foi aprovada!"
          type="success"
          action={{ label: "Ver Detalhes", onClick: () => {} }}
          onDismiss={() => setNotification(null)}
        />
      )}
      <main>{children}</main>
    </>
  );
}
```

**Features**:
- Sticky positioning
- Auto-dismiss after 5 seconds
- Swipe to dismiss (mobile)
- Action button
- Icon indicators
- Accessible announcements

---

### 14. QuickSimulator

**File**: `apps/web/app/(dashboard)/_components/QuickSimulator.tsx`

**Purpose**: Lightweight credit simulator widget for dashboard preview.

**Props**:
```typescript
type QuickSimulatorProps = {
  onNavigateToFull?: () => void;
  defaultValues?: {
    valor?: number;
    meses?: number;
  };
};
```

**Usage**:
```typescript
import { QuickSimulator } from "@/app/(dashboard)/_components/QuickSimulator";

export function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <QuickSimulator
        defaultValues={{ valor: 250000, meses: 24 }}
        onNavigateToFull={() => router.push('/simulador')}
      />
    </div>
  );
}
```

**Features**:
- Compact layout
- Quick calculations
- Link to full simulator
- Real-time updates
- Mobile-optimized

---

### 15. ProfileForm

**File**: `apps/web/app/(dashboard)/dashboard/perfil/perfil-form.tsx`

**Purpose**: User profile edit form with validation.

**Props**:
```typescript
type PerfilFormProps = {
  initialData: UsuarioPerfil;
  onSave: (data: Partial<UsuarioPerfil>) => Promise<void>;
  isLoading?: boolean;
};
```

**Usage**:
```typescript
import { PerfilForm } from "./perfil-form";

export function PerfilPage() {
  const [profile, setProfile] = useState<UsuarioPerfil>();

  const handleSave = async (data: Partial<UsuarioPerfil>) => {
    await usuariosApi.atualizarPerfil(data);
    setProfile({ ...profile, ...data });
  };

  return (
    <PerfilForm
      initialData={profile}
      onSave={handleSave}
      isLoading={isSaving}
    />
  );
}
```

**Features**:
- Editable fields (nome, telefone)
- Read-only fields (email, CPF)
- Phone number formatting
- Validation feedback
- Save/Cancel buttons
- Error messages

---

## Styling & Design System

### Colors

```css
/* Primary Colors */
--primary-blue: #3b82f6;    /* Main actions */
--primary-green: #22c55e;   /* Success/Approval */
--primary-red: #ef4444;     /* Danger/Rejection */
--primary-orange: #f97316;  /* Warning */

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### Typography

```css
/* Headings */
h1: 2rem (32px), bold
h2: 1.5rem (24px), bold
h3: 1.25rem (20px), semibold
h4: 1.125rem (18px), semibold

/* Body */
body: 1rem (16px), regular
small: 0.875rem (14px), regular
caption: 0.75rem (12px), regular
```

### Spacing Scale

```css
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 2.5rem (40px)
```

### Breakpoints

```css
mobile: 0px (default)
tablet: 768px
desktop: 1024px
wide: 1280px
```

---

## Component Best Practices

### 1. Always Include PropTypes or TypeScript

```typescript
// Good
type ButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function Button({ label, onClick, disabled, variant }: ButtonProps) {
  return <button>{label}</button>;
}

// Avoid
export function Button(props) {
  return <button>{props.label}</button>;
}
```

### 2. Handle Loading and Error States

```typescript
// Good
function DataTable({ data, isLoading, error }) {
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <table>{/* render data */}</table>;
}

// Avoid
function DataTable({ data }) {
  return <table>{data.map(/* ... */)}</table>;
}
```

### 3. Use Semantic HTML

```typescript
// Good
<button onClick={handleApprove}>Aprovar</button>
<a href="/obras">Obras</a>
<form onSubmit={handleSubmit}>

// Avoid
<div onClick={handleApprove}>Aprovar</div>
<div onClick={() => navigate('/obras')}>Obras</div>
```

### 4. Responsive Design

```typescript
// Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Avoid
<div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto' }}>
```

### 5. Accessibility

```typescript
// Good
<button aria-label="Fechar" onClick={close} aria-disabled={disabled}>
  X
</button>

// Avoid
<button onClick={close}>X</button>
```

---

## Component Creation Template

```typescript
// components/MyComponent.tsx
import { ReactNode } from 'react';

export type MyComponentProps = {
  title: string;
  children: ReactNode;
  loading?: boolean;
  onClose?: () => void;
};

export function MyComponent({
  title,
  children,
  loading = false,
  onClose
}: MyComponentProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="animate-pulse">Carregando...</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
```

---

## Total Components Count

**Current**: 15 documented components
- Manager Dashboard: 2 (BulkApprovalActions, AdvancedFilters)
- Constructor Portal: 2 (ScoreDynamics, CreditSimulator)
- Engineer Portal: 3 (VisitQueue, QuickActions, DynamicVisitQueueClient)
- Funds Dashboard: 3 (PortfolioChart, InadimplenciaMetrics, RegionalDistribution, ReportExport)
- Shared: 4 (KYCStatusBadge, MobileNotificationBanner, QuickSimulator, ProfileForm)

**Future Components** (In Backlog):
- DataTable with sorting/filtering
- Modal/Dialog component
- Toast notification system
- Accordion component
- Tabs component
- Dropdown menu
- Search input with autocomplete
- Date picker
- File upload
- Image gallery
