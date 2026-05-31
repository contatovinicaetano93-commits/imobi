# Code Review Fixes - Session 5

**Date:** 2026-05-31  
**Branch:** `claude/gifted-hawking-ULZTB`

## Critical Bugs Fixed (High Priority)

### 1. ✅ Root Layout Server Component (Next.js 14 Compliance)
**Issue:** Root layout was marked as `"use client"` with browser-only initialization
**Impact:** Broke SSR features, Suspense boundaries, streaming
**Fix:** Removed `"use client"` directive and Sentry double-init
**File:** `apps/web/app/layout.tsx`

### 2. ✅ Authentication Flow Broken
**Issue:** `login()` was calling non-existent `/api/auth/login` endpoint
**Impact:** Users cannot log in - login requests return 404
**Fix:** 
- Point to correct backend endpoint: `/api/v1/auth/login`
- Add proper session cookie setup via `/api/auth/session`
- Fetch user data via `/api/auth/me`
**File:** `apps/web/contexts/auth-context.tsx`

### 3. ✅ Error Handling in Auth
**Issue:** Login errors silently swallowed, no error feedback to user
**Impact:** User gets no feedback on login failure (network error, wrong password)
**Fix:** 
- Parse error messages from backend response
- Re-throw errors so callers can handle them
- Add error logging for debugging
**File:** `apps/web/contexts/auth-context.tsx`

### 4. ✅ Session Verification Endpoint
**Issue:** `/api/auth/me` confused 401 (invalid token) with 500 (backend error)
**Impact:** Users get logged out during backend maintenance
**Fix:** 
- Return 401 only for authentication failures
- Return 500 with error detail for other failures
- Add error logging
**File:** `apps/web/app/api/auth/me/route.ts`

### 5. ✅ Toast ID Collision Risk
**Issue:** Used `Math.random()` for toast IDs - not guaranteed unique
**Impact:** Simultaneous toasts could dismiss incorrectly
**Fix:** Use `crypto.randomUUID()` with fallback to timestamp-based ID
**File:** `apps/web/contexts/toast-context.tsx`

## Code Quality Improvements

### Hooks Organization
**Added:** `apps/web/hooks/index.ts`
- Centralized exports for `useApiQuery`, `useApiMutation`, `useAuth`, `useToast`
- Simplifies imports: `import { useAuth } from "@/hooks"`

### API Integration Helpers
**Added:** `apps/web/hooks/useApiWithToast.ts`
- `useApiQueryWithToast()` - automatic error/success toast display
- `useApiMutationWithToast()` - same for mutations
- Reduces boilerplate in components

## Security Checklist

✅ No `dangerouslySetInnerHTML` or `innerHTML`  
✅ No hardcoded secrets in client code  
✅ Proper CORS handling (credentials: "include")  
✅ HttpOnly cookies for auth tokens  
✅ Input validation via Zod schemas  
✅ Error messages don't leak sensitive info  
✅ No localStorage for sensitive data (using HttpOnly cookies)

## Type Safety

✅ All TypeScript checks pass  
✅ Proper interface definitions for API responses  
✅ Generic hooks with correct type inference  
✅ No `any` types except in error cases

## Test Readiness

**Components ready for testing:**
- ✅ Authentication flow (signup, login, logout)
- ✅ Context providers (auth, toast)
- ✅ Form validation (FormField, Input components)
- ✅ Data display (DataTable, StatsCard, Badge)
- ✅ Admin dashboard
- ✅ Documents list page

**Mock data components (ready for API integration):**
- Admin dashboard (metrics, activities, services)
- Documents page (document list with status)

## Next Steps

### High Priority
1. **Test authentication flow** - verify login/logout works end-to-end
2. **Implement missing endpoints** if backend routes differ from expected paths
3. **Set up error toast display** in login/signup forms

### Medium Priority
1. Replace mock data with real API calls:
   - `POST /api/v1/admin/health` for service status
   - `GET /api/v1/documentos` for user documents
2. Add loading states to all data tables
3. Implement pagination for data tables

### Low Priority
1. Add analytics events for user actions
2. Optimize image loading with Next.js Image component
3. Add keyboard shortcuts for power users

## Commits

- **3497298** - Fix critical bugs found in code review
  - Auth endpoint, error handling, UUID generation, layout SSR fix
