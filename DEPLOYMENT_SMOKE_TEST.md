# imobi — Production Smoke Test Plan

**Date**: 2026-05-30  
**Status**: Ready for Vercel Deployment Testing

## Prerequisites
- Vercel deployment completed successfully
- Frontend: https://imbobi.vercel.app
- Backend API: Running (or configured at vercel environment)

## Critical Flows to Validate

### 1. **Authentication Flow** (5 min)
- [ ] Navigate to `/cadastro` (signup page)
- [ ] Create new test account with email
- [ ] Check email verification link received
- [ ] Verify email and login
- [ ] Confirm JWT token stored in localStorage
- [ ] Check user can access `/dashboard`

### 2. **Tomador (Borrower) Dashboard** (5 min)
- [ ] Login as tomador user
- [ ] Navigate to `/dashboard/credito` (credit dashboard)
- [ ] Verify credit simulator loads
- [ ] Check obras list (`/dashboard/obras`)
- [ ] Verify status indicators display correctly

### 3. **Engenheiro (Engineer) Portal** (5 min)
- [ ] Login as engenheiro user
- [ ] Check visit queue appears (`/dashboard/engenheiro`)
- [ ] Verify vistoria form loads
- [ ] Check GPS capture functionality (if available)
- [ ] Verify photo upload shows in evidence section

### 4. **Gestor (Manager) Dashboard** (5 min)
- [ ] Login as gestor/admin user
- [ ] Navigate to `/dashboard/gestor/etapas`
- [ ] Verify etapas list loads with filters
- [ ] Check KYC document review (`/dashboard/gestor/kyc`)
- [ ] Verify approval workflow buttons appear

### 5. **API Health Check** (2 min)
```bash
curl -X GET https://imbobi.vercel.app/api/auth/session \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```
- [ ] Response includes session or 401 (expected)
- [ ] No 500 errors

## Success Criteria
✅ All 5 flows navigate without 500 errors  
✅ UI renders correctly on desktop and mobile  
✅ No console errors in browser DevTools  
✅ API responds within 2s  

## Rollback Plan
If critical issues found:
1. Revert main branch to previous stable commit
2. Notify via GitHub status
3. Deploy hotfix and redeploy to Vercel

---

**Next**: Execute smoke tests and report results
