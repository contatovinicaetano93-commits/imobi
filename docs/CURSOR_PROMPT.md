# 🎯 CURSOR COLLABORATION PROMPT

Use this prompt with Cursor IDE for frontend development in parallel with Claude's backend work.

---

## CONTEXT

You're building the frontend for **Imobi**, a fintech platform for real estate credit. The backend API is being built by Claude simultaneously. Your job is to create a polished, production-ready Next.js frontend.

**Repository**: contatovinicaetano93-commits/imobi  
**Branch**: claude/imobi-mvp-fintech-status-jrr2ab  
**Deployment**: Vercel  

---

## STACK

- **Framework**: Next.js 14 (App Router, SSR)
- **Styling**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **State**: TanStack Query (server state), Zustand (UI state)
- **Validation**: Zod schemas (shared with backend)
- **Type Safety**: TypeScript strict mode
- **Testing**: Vitest + React Testing Library

---

## CRITICAL QUICK WINS (Priority Order)

### 1. Authentication Flow (Done by Claude)
- [x] useAuth hook (JWT token management)
- [x] useToast notification system
- [x] ProtectedContent HOC
- **Your task**: Wire these into pages

### 2. Create Core Pages
- [ ] /login - Login form + session handling
- [ ] /register - Registration form + validation
- [ ] /dashboard - Main dashboard (protected)
- [ ] /dashboard/obras - Construction projects list
- [ ] /dashboard/creditos - Credits list

### 3. Build Reusable Components
- [ ] Form inputs (text, email, password, select, checkbox)
- [ ] Cards (obra card, credit card, user card)
- [ ] Tables (obras list, credits list)
- [ ] Modal dialogs
- [ ] Loading states + skeletons
- [ ] Error boundaries

### 4. Integration
- [ ] Wire useAuth to protected pages
- [ ] Implement API data fetching (TanStack Query)
- [ ] Handle loading states
- [ ] Display error messages
- [ ] Implement success notifications

---

## FILE STRUCTURE

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── LoginFormClient.tsx
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   └── RegisterFormClient.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx (main dashboard)
│   │   ├── obras/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── creditos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx (root with ToastProvider)
│   └── not-found.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── dashboard/
│   │   ├── ObraCard.tsx
│   │   ├── CreditoCard.tsx
│   │   └── DashboardStats.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   └── Table.tsx
│   └── shared/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Navigation.tsx
├── hooks/
│   ├── useAuth.tsx (provided by Claude)
│   ├── useToast.ts (provided by Claude)
│   ├── useApi.ts (TanStack Query wrapper)
│   └── usePagination.ts
├── lib/
│   ├── api-client.ts (typed HTTP client)
│   └── validators.ts (Zod schemas)
└── styles/
    └── globals.css
```

---

## CODING STANDARDS

### Type Safety
```typescript
// ✅ Always use explicit types
interface User {
  id: string;
  email: string;
  nome: string;
  role: 'TOMADOR' | 'ADMIN';
}

// ❌ Never use `any`
const user: any = data;  // WRONG
```

### Components
```typescript
'use client';  // Client component

import { FC } from 'react';

interface Props {
  title: string;
  onSubmit: (data: FormData) => Promise<void>;
  loading?: boolean;
}

export const MyComponent: FC<Props> = ({ title, onSubmit, loading }) => {
  return (
    <div>
      {title}
    </div>
  );
};
```

### Forms
```typescript
const { register, handleSubmit, formState } = useForm({
  resolver: zodResolver(usuarioSchema),
  defaultValues: { email: '', password: '' },
});

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('email')} />
    {formState.errors.email && <span>{formState.errors.email.message}</span>}
  </form>
);
```

### Data Fetching
```typescript
const { data: obras, isPending, error } = useQuery({
  queryKey: ['obras', usuarioId],
  queryFn: () => api.obras.list({ usuarioId }),
});

if (isPending) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
return <ObraList obras={obras} />;
```

---

## VALIDATION

All forms use Zod schemas (shared with backend):

```typescript
import { usuarioSchema, obraSchema } from '@imbobi/schemas';

// Login form
const loginSchema = usuarioSchema.pick({ email: true, password: true });

// Registration
const registerSchema = usuarioSchema.pick({
  nome: true,
  email: true,
  cpf: true,
  telefone: true,
  password: true,
});

// Create obra
const createObraSchema = obraSchema.pick({
  nome: true,
  endereco: true,
  areaM2: true,
  tipo: true,
});
```

---

## API INTEGRATION

```typescript
// lib/api-client.ts
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  auth: {
    login: (email: string, password: string) =>
      client.post('/api/v1/auth/login', { email, password }),
    logout: () => client.post('/api/v1/auth/logout'),
  },
  obras: {
    list: (usuarioId: string) =>
      client.get(`/api/v1/obras?usuarioId=${usuarioId}`),
    get: (id: string) => client.get(`/api/v1/obras/${id}`),
    create: (data: ObraCreateDTO) =>
      client.post('/api/v1/obras', data),
    update: (id: string, data: ObraUpdateDTO) =>
      client.patch(`/api/v1/obras/${id}`, data),
  },
};
```

---

## PROTECTED ROUTES

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Skeleton />;
  if (!isAuthenticated) redirect('/login');

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

---

## TESTING

```typescript
// Test forms
import { render, screen, userEvent } from '@testing-library/react';
import LoginForm from './LoginForm';

test('should submit form with valid data', async () => {
  render(<LoginForm />);
  
  await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

---

## ENVIRONMENT VARIABLES

```bash
# .env.local (created by Claude's deploy-orchestrator.sh)
NEXT_PUBLIC_API_URL=https://imobi-api-xyz.railway.app
```

---

## COMMANDS

```bash
# Development
pnpm dev:web

# Type checking
pnpm type-check

# Linting
pnpm lint

# Testing
pnpm test:web

# Building
pnpm build --filter=@imbobi/web
```

---

## SUCCESS CRITERIA

- [x] Authentication flow working (login/register/logout)
- [x] Protected routes properly gated
- [x] All forms validate with Zod
- [x] Loading states show Skeletons
- [x] Error messages display properly
- [x] Toast notifications work
- [x] API calls with TanStack Query
- [x] Responsive design (mobile + desktop)
- [x] Type-safe throughout (no `any`)
- [x] No console errors/warnings

---

## QUICK CHECKLIST

- [ ] Create /login page + LoginForm component
- [ ] Create /register page + RegisterForm component
- [ ] Create /dashboard page with welcome
- [ ] Create /dashboard/obras page with list
- [ ] Create /dashboard/creditos page with list
- [ ] Wire up useAuth to all protected pages
- [ ] Implement TanStack Query for API calls
- [ ] Add loading states (Skeletons)
- [ ] Add error handling + user feedback
- [ ] Test in browser: register → login → dashboard

---

**Status**: Ready for frontend development  
**Start**: `pnpm dev:web` + open http://localhost:3001  
**Collaborate**: Cherry-pick from Claude's work as API endpoints become available

---

Let's build! 🚀
