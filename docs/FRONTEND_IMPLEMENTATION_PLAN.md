# 🎨 Frontend Implementation Plan - Passos 41-80

**Status**: Ready to begin | Backend API code-complete ✅  
**Target**: MVP web interface for fintech operations  
**Timeline**: 2-3 weeks (parallel with backend testing)  
**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

---

## 📋 Overview

This plan covers frontend development for the Imobi MVP, assuming backend API is available at `http://localhost:4000/api/v1` (or production URL when deployed).

**Status of each module**:
- ✅ Backend API ready (50+ endpoints)
- ✅ API documentation generated (Swagger)
- ✅ Type-safe schemas available (@imbobi/schemas)
- ⏳ Frontend code ready for development
- ⏳ Database connectivity (waiting for staging/prod deployment)

---

## 🏗️ Architecture

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth group (login, register, etc)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (dashboard)/       # Protected group (requires auth)
│   │   ├── dashboard/page.tsx
│   │   ├── obras/
│   │   │   ├── page.tsx (list)
│   │   │   ├── [id]/page.tsx (detail)
│   │   │   ├── novo/page.tsx (create)
│   │   │   └── [id]/progresso/page.tsx (progress)
│   │   │
│   │   ├── credito/
│   │   │   ├── simular/page.tsx (simulator - public)
│   │   │   ├── solicitar/page.tsx (request - protected)
│   │   │   ├── meus/page.tsx (my credits)
│   │   │   └── [id]/extrato/page.tsx (statement)
│   │   │
│   │   ├── perfil/
│   │   │   ├── page.tsx (view)
│   │   │   ├── editar/page.tsx (edit)
│   │   │   └── seguranca/page.tsx (security)
│   │   │
│   │   └── notificacoes/page.tsx
│   │
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── api/               # Route handlers for proxy/helpers
│
├── components/
│   ├── auth/              # Auth-related components
│   ├── obras/             # Works/projects components
│   ├── credito/           # Credit-related components
│   ├── layout/            # Layout components (nav, sidebar, etc)
│   ├── forms/             # Form components
│   └── ui/                # Reusable UI components
│
├── hooks/
│   ├── useAuth.tsx        # Auth state and logic
│   ├── useApi.ts          # API fetching hook
│   ├── useForms.ts        # Form handling
│   └── [others]/
│
├── lib/
│   ├── api-client.ts      # Type-safe API client
│   ├── validators.ts      # Zod schema validators
│   ├── formatters.ts      # Date, currency formatters
│   └── constants.ts       # App constants
│
├── styles/
│   ├── globals.css        # Global styles (Tailwind)
│   └── variables.css      # CSS variables
│
├── next.config.js         # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS config
├── tsconfig.json          # TypeScript config
└── package.json
```

---

## 🎯 Passos 41-80: Implementation Breakdown

### Phase 1: Foundation Setup (Passos 41-45)

#### Passo 41: Project Structure & Dependencies
- ✅ Next.js 14 configured
- ✅ TypeScript strict mode enabled
- ✅ Tailwind CSS configured
- ✅ shadcn/ui components available
- **Task**: Verify all dependencies installed
  ```bash
  cd apps/web
  pnpm install
  pnpm type-check
  ```

#### Passo 42: Create API Client
- Create `lib/api-client.ts` - Type-safe HTTP client
- Configure base URL from env
- Add error handling
- Add request/response interceptors
- Add JWT token management

```typescript
// lib/api-client.ts
import { createClient } from '@imbobi/core/api-client';

export const apiClient = createClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

// Usage in components:
const { data, loading, error } = useApi(() => 
  apiClient.get('/usuarios/me')
);
```

#### Passo 43: Create Auth Context & Hooks
- Implement `hooks/useAuth.tsx` (already exists, verify)
- JWT decoding and validation
- Token refresh logic
- Protected route wrapper
- Login/logout functions

#### Passo 44: Create Protected Route Component
- `components/ProtectedRoute.tsx`
- Redirects unauthenticated users to login
- Shows loading state while checking auth
- Wraps protected pages

#### Passo 45: Setup Theme & Styling
- Configure Tailwind CSS variables
- Create color system (matches brand)
- Setup font system
- Create responsive layout system

---

### Phase 2: Authentication Pages (Passos 46-52)

#### Passo 46: Login Page (`app/(auth)/login/page.tsx`)
**Features**:
- Email + password form
- Form validation (via @imbobi/schemas)
- Remember me checkbox
- Error messages
- Loading state
- Link to register/forgot password

**Components needed**:
- `components/auth/LoginForm.tsx`
- `components/auth/FormLayout.tsx`

**API Call**:
```
POST /api/v1/auth/login
Response: { accessToken, refreshToken, user }
```

#### Passo 47: Register Page (`app/(auth)/register/page.tsx`)
**Features**:
- Email + password + name form
- Password strength indicator
- Terms of service checkbox
- Email validation
- Duplicate email checking (optional)
- Error messages
- Link to login

**Components needed**:
- `components/auth/RegisterForm.tsx`
- `components/forms/PasswordStrengthMeter.tsx`

**API Call**:
```
POST /api/v1/auth/registrar
Response: { id, email, nome, createdAt }
```

#### Passo 48: Forgot Password Page
**Features**:
- Email input
- Success message
- Rate limiting notice (5/min)
- Link to login

**API Call**:
```
POST /api/v1/auth/esqueceu-senha
Response: { message }
```

#### Passo 49: Reset Password Page
**Features**:
- Token from URL parameter
- New password input
- Password confirmation
- Validation
- Success/error states
- Redirect to login on success

**API Call**:
```
POST /api/v1/auth/redefinir-senha
Response: { message }
```

#### Passo 50: Email Verification (Optional)
- If needed, implement email verification flow
- Verify token from email link

#### Passo 51-52: Auth Testing
- Test login flow
- Test registration
- Test token refresh
- Test logout
- Test protected routes redirect

---

### Phase 3: Dashboard & Core Pages (Passos 53-65)

#### Passo 53: Dashboard Layout
**File**: `app/(dashboard)/layout.tsx`

**Components**:
- `components/layout/Header.tsx` - Top navigation
- `components/layout/Sidebar.tsx` - Side navigation
- `components/layout/Footer.tsx` - Footer

**Features**:
- Navigation menu
- User dropdown (profile, logout)
- Logo/branding
- Responsive design (hamburger menu on mobile)

#### Passo 54: Dashboard Home (`app/(dashboard)/dashboard/page.tsx`)
**Features**:
- Welcome message
- Quick stats (obras, créditos, notificações)
- Recent obras list
- Credit simulator link
- Notifications summary

**Components**:
- `components/dashboard/StatsCard.tsx`
- `components/dashboard/RecentWorks.tsx`
- `components/dashboard/NotificationsPeek.tsx`

#### Passo 55-57: Obras Management
**Passo 55**: List Obras (`app/(dashboard)/obras/page.tsx`)
- Table or card grid of obras
- Search/filter
- Pagination
- Create new button
- Click to view details

**Passo 56**: Create Obra Form (`app/(dashboard)/obras/novo/page.tsx`)
- Form fields (name, address, area, type, status)
- Validation
- Success message
- Redirect to detail page

**Passo 57**: Obra Details (`app/(dashboard)/obras/[id]/page.tsx`)
- Display obra information
- Show stages (etapas)
- Show progress percentage
- Edit button
- Delete button
- Evidence/documents section

---

#### Passo 58-60: Credit Management
**Passo 58**: Credit Simulator (`app/(dashboard)/credito/simular/page.tsx`)
- Public page (no auth required)
- Form: property value, financing amount, months, rate
- Calculate & display:
  - Monthly payment
  - Total interest
  - Total cost
  - Amortization table
- Print/export functionality

**Passo 59**: Request Credit (`app/(dashboard)/credito/solicitar/page.tsx`)
- Select obra from user's obras
- Fill in credit details
- Validation
- Submit request
- Success message

**Passo 60**: My Credits (`app/(dashboard)/credito/meus/page.tsx`)
- List of user's active/inactive credits
- Status, monthly payment, balance
- Click to view statement
- Payment schedule

---

#### Passo 61-65: User Profile & Settings
**Passo 61**: Profile View (`app/(dashboard)/perfil/page.tsx`)
- Display user info
- Avatar
- Edit button
- Change password button

**Passo 62**: Edit Profile (`app/(dashboard)/perfil/editar/page.tsx`)
- Form: name, email, phone, address, etc
- Validation
- Save changes
- Success message

**Passo 63**: Change Password (`app/(dashboard)/perfil/seguranca/page.tsx`)
- Current password
- New password
- Confirmation
- Validation
- Success message

**Passo 64**: Bank Account Info
- Form: bank, account, routing number
- Edit/update
- Validation
- Encryption on client side

**Passo 65**: Notifications Page (`app/(dashboard)/notificacoes/page.tsx`)
- List of notifications
- Mark as read
- Filter by type
- Delete notification

---

### Phase 4: Integration & Polish (Passos 66-75)

#### Passo 66: API Integration Testing
- Test all endpoints with frontend
- Mock data for debugging
- Error handling
- Loading states
- Offline support (optional)

#### Passo 67: Form Validation
- Client-side validation with Zod
- Error messages
- Real-time feedback
- Submit button disabled on invalid

#### Passo 68: Error Handling
- Global error boundary
- Toast notifications for errors
- Retry logic
- Network error handling
- 404/500 pages

#### Passo 69: Loading States
- Loading skeletons
- Spinners for async operations
- Progress bars
- Disable buttons while loading

#### Passo 70: Navigation & Routing
- Fix navigation
- Back buttons
- Breadcrumbs
- Deep linking
- URL parameters

#### Passo 71: Responsive Design
- Mobile layout
- Tablet layout
- Desktop layout
- Test on actual devices
- Hamburger menu on mobile

#### Passo 72: Accessibility
- ARIA labels
- Keyboard navigation
- Color contrast
- Screen reader testing
- Form labels

#### Passo 73: Performance Optimization
- Code splitting
- Image optimization
- Bundle analysis
- Lazy loading routes
- Memoization

#### Passo 74: Search & Filter
- Implement search in works list
- Implement filters (status, date, etc)
- Sort options
- Debounce search

#### Passo 75: Analytics Integration (Optional)
- Sentry error tracking
- Page view analytics
- User behavior tracking

---

### Phase 5: Testing & Deployment (Passos 76-80)

#### Passo 76: Manual Testing Checklist
- [ ] Login flow works
- [ ] Can register new user
- [ ] Can create obra
- [ ] Can view obra details
- [ ] Can simulate credit
- [ ] Can request credit
- [ ] Can view profile
- [ ] Can edit profile
- [ ] Can logout
- [ ] Redirects on unauthorized
- [ ] Rate limiting messages show
- [ ] Forms validate correctly
- [ ] Errors display properly
- [ ] Loading states appear
- [ ] Mobile responsive

#### Passo 77: Browser Compatibility
- Test Chrome/Chromium
- Test Firefox
- Test Safari
- Test Edge
- Fix compatibility issues

#### Passo 78: Lighthouse Audit
- Run Lighthouse
- Fix performance issues
- Improve accessibility
- Ensure SEO basics
- Check best practices

#### Passo 79: Build & Export
```bash
cd apps/web
pnpm build
pnpm export  # if needed
```

#### Passo 80: Deploy to Production
- Deploy to Vercel
- Configure environment variables
- Setup custom domain
- Enable analytics
- Setup monitoring

---

## 📦 Component Library (shadcn/ui)

These components should already be available via `@imbobi/ui`:

```typescript
// Common components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
```

---

## 🔗 Integration Points

### With Backend API

Every feature depends on API calls:

```typescript
// Example: Get current user
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/usuarios/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => setUser(data))
    .finally(() => setLoading(false));
  }, []);

  return { user, loading };
};
```

### With Shared Schemas

```typescript
import { CadastroUsuarioSchema, ObraSchema } from '@imbobi/schemas';

// Client-side validation
const form = useForm({
  resolver: zodResolver(CadastroUsuarioSchema),
});

// Type-safe
type Usuario = z.infer<typeof CadastroUsuarioSchema>;
```

---

## 🚀 Getting Started

### Step 1: Start Frontend Dev Server
```bash
cd apps/web
pnpm dev
# Navigate to http://localhost:3000
```

### Step 2: Start Backend (when available)
```bash
cd services/api
pnpm dev
# API available at http://localhost:4000/api/v1
```

### Step 3: Create Environment File
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Step 4: Begin Implementation
Start with Passo 41 (project structure verification) and work through the phases.

---

## 📊 Estimated Timeline

| Phase | Passos | Tasks | Days |
|-------|--------|-------|------|
| Setup | 41-45 | Foundation, API client, Auth setup | 1 |
| Auth Pages | 46-52 | Login, register, password reset | 2 |
| Obras | 53-57 | List, create, detail pages | 2 |
| Credito | 58-60 | Simulator, request, my credits | 2 |
| Profile | 61-65 | User settings, notifications | 1-2 |
| Polish | 66-75 | Integration, errors, responsive | 2-3 |
| Testing | 76-80 | QA, optimization, deployment | 1-2 |
| **Total** | 41-80 | **~40 features** | **10-14 days** |

---

## ✅ Success Criteria

- [ ] All pages load without errors
- [ ] API integration works end-to-end
- [ ] Forms validate and submit correctly
- [ ] Authentication flow complete
- [ ] Responsive on mobile/tablet/desktop
- [ ] Performance: Lighthouse > 80
- [ ] Accessibility: WCAG AA compliant
- [ ] Zero console errors
- [ ] All routes protected as needed
- [ ] Error handling for all scenarios

---

## 🔗 Related Documentation

- `BACKEND_TEST_EXECUTION.md` - API endpoints ready for integration
- `API_ENDPOINTS_TEST_PLAN.md` - Detailed API specs
- `QUICK_START_BACKEND.md` - Backend startup
- `ARCHITECTURE_RESILIENCE_API_FIRST.md` - System design

---

**Start Date**: 2026-06-23  
**Target Completion**: 2026-07-07 (14 days)  
**Status**: Ready to begin ✅

Next: Execute Passo 41 (verify project structure) → Passo 42 (create API client)
