# 🔗 Frontend API Integration Guide

**Status**: Ready for integration (waiting for API deployment)  
**Frontend Components**: ✅ Complete  
**Backend API**: ⏳ Deploying to Railway  
**Timeline**: 1-2 hours to full integration

---

## Quick Start

Once the API is deployed to Railway:

1. **Get API URL** from Railway dashboard: `https://<subdomain>.railway.app`
2. **Update `.env.local`** in `apps/web/`
3. **Test auth flow** in browser
4. **Verify API integration** with console tests

---

## Step 1: Configure API URL

### Create `.env.local`
```bash
cd apps/web
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://<your-railway-url>
EOF
```

**Example**:
```env
NEXT_PUBLIC_API_URL=https://imobi-api-production.railway.app
```

### Verify Configuration
```bash
# Should output the URL
grep NEXT_PUBLIC_API_URL apps/web/.env.local
```

---

## Step 2: Start Frontend

```bash
cd apps/web
pnpm dev
```

**Expected output**:
```
> @imbobi/web@0.0.1 dev
▲ Next.js 14.x
✓ Ready in 1.2s
➜  Local:        http://localhost:3001
```

---

## Step 3: Manual Auth Flow Testing

### Register (Cadastro)

1. **Navigate to**: http://localhost:3001/cadastro
2. **Fill form**:
   - Nome: "Test User"
   - Email: "test-$(date +%s)@example.com" (unique)
   - CPF: "12345678900"
   - Telefone: "11999999999"
   - Senha: "TestPass123!@"
   - Check all consent boxes

3. **Submit** and wait for response
4. **Expected**: Success toast notification + redirect to login

### Login

1. **Navigate to**: http://localhost:3001/login
2. **Fill form**:
   - Email: (from registration above)
   - Senha: (from registration above)

3. **Submit** and wait
4. **Expected**: 
   - Notification: "Conectando ao servidor..."
   - Redirect to dashboard
   - Session stored in localStorage

### Dashboard

1. **Verify logged in**: Sidebar shows username
2. **Check session**: 
   - Open DevTools → Application → LocalStorage
   - Should see `access_token` and `refresh_token`
3. **Verify role**: Sidebar shows correct role (TOMADOR, GESTOR, etc.)

---

## Step 4: API Integration Tests

### Test 1: Verify Token is Sent

```javascript
// In browser console
fetch(new URL('/api/v1/obras', 'https://<your-railway-url>'), {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(d => console.log('Works:', d))
```

**Expected**: 
- Response 200 with array (even if empty)
- No 401 errors

### Test 2: Verify Token Refresh

```javascript
// Check refresh token exists
localStorage.getItem('refresh_token')
// Output: "eyJhbGc..."

// Token expiry in 15 minutes - hook will auto-refresh
// No manual action needed
```

### Test 3: Verify Session Persistence

```javascript
// 1. Open developer tools (F12)
// 2. Copy access_token
// 3. Reload page (F5)
// 4. Check if still logged in
// 5. Verify access_token is still in localStorage
```

**Expected**: 
- Still logged in after reload
- Same token in localStorage
- No re-login prompt

### Test 4: Test Protected Route

```
1. Navigate to: http://localhost:3001/dashboard
2. Expected: Redirected to role-specific dashboard (e.g., /dashboard/construtor)
3. Not logged in? Should redirect to /login
```

---

## Step 5: Error Scenarios

### Test Invalid Credentials

1. **Go to**: http://localhost:3001/login
2. **Enter**:
   - Email: "nonexistent@example.com"
   - Senha: "WrongPass123!@"
3. **Submit**
4. **Expected**: Error toast: "Email ou senha incorretos"
5. **Verify**: Still on login page, localStorage empty

### Test Network Error

1. **In DevTools**: Network tab → Disable network
2. **Try login**
3. **Expected**: Error toast with retry message
4. **Resume network** (toggle back on)
5. **Try again**: Should work

### Test Expired Session

1. **Login normally**
2. **Open DevTools Console**:
   ```javascript
   // Manually expire the token
   localStorage.setItem('access_token', 'expired.token.here');
   ```
3. **Try to access protected endpoint** (refresh page or click nav link)
4. **Expected**: Redirected to /login with `?session=expired`

---

## API Endpoints Ready to Integrate

### Authentication (✅ Ready)
```
POST /api/v1/auth/registro     - Register user
POST /api/v1/auth/login        - Login
POST /api/v1/auth/refresh      - Refresh token
POST /api/v1/auth/logout       - Logout
GET  /api/v1/auth/me           - Current user
```

### Public Endpoints (✅ Ready)
```
POST /api/v1/public/simulador  - Loan simulator
GET  /health                    - Health check
GET  /metrics                   - Prometheus metrics
GET  /docs                      - Swagger UI
```

### Protected Endpoints (✅ Ready, need implementation)
```
GET  /api/v1/obras              - List user's obras
POST /api/v1/obras              - Create obra
GET  /api/v1/credito            - List credits
GET  /api/v1/kyc                - Get KYC status
```

---

## Hook Usage Examples

### useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

export function DashboardPage() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) return <Skeleton />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return (
    <div>
      <h1>Olá, {user?.nome}</h1>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

### useToast Hook

```typescript
import { useToast } from '@/hooks/useToast';

export function LoginForm() {
  const toast = useToast();

  const handleSubmit = async (data) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Login failed');
      toast.success('Login successful!');
    } catch (e) {
      toast.error(e.message);
    }
  };
}
```

### ProtectedContent Component

```typescript
import { useAuth, ProtectedContent } from '@/hooks/useAuth';

export function MyPage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <ProtectedContent 
      isAuthenticated={isAuthenticated}
      loading={loading}
      fallback={<Skeleton />}
    >
      <h1>Only visible when logged in</h1>
    </ProtectedContent>
  );
}
```

---

## Frontend Checklist

### Before Integration
- [ ] API URL configured in `.env.local`
- [ ] Frontend server running (`pnpm dev`)
- [ ] Browser DevTools open for debugging
- [ ] Network tab enabled to watch requests

### Registration Flow
- [ ] Can access `/cadastro` page
- [ ] Form validates inputs
- [ ] Can submit registration
- [ ] API returns 201 + user ID
- [ ] Redirects to `/login`
- [ ] Toast shows success

### Login Flow
- [ ] Can access `/login` page
- [ ] Form validates email/password
- [ ] Can submit login
- [ ] API returns tokens (access + refresh)
- [ ] localStorage gets `access_token` and `refresh_token`
- [ ] Redirects to role-specific dashboard
- [ ] Toast shows "Login successful"

### Session Flow
- [ ] Can reload page, still logged in
- [ ] Token persists in localStorage
- [ ] Dashboard still accessible after reload
- [ ] useAuth hook returns correct user
- [ ] Logout clears tokens + redirects to /login

### API Calls
- [ ] Authorization header includes Bearer token
- [ ] API responds with 200 (or 401 if token invalid)
- [ ] Error messages display as toasts
- [ ] Loading states show skeleton

### Error Handling
- [ ] Invalid credentials show error toast
- [ ] Network errors handled gracefully
- [ ] 401 errors trigger logout + redirect
- [ ] 403 errors show "Access denied"
- [ ] 500 errors show "Server error, try again"

---

## Debugging Tips

### Check Authorization Header
```javascript
// In browser console
fetch(new URL('/api/v1/obras', 'https://<api-url>'), {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => {
  console.log('Status:', r.status);
  return r.json();
}).then(console.log)
```

### View API Logs
```bash
# In Railway dashboard:
# imobi-api → Logs tab
# Watch real-time logs as you test
```

### Check Token Contents
```javascript
// In browser console
const token = localStorage.getItem('access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));
console.log('User role:', payload.role);
```

### Simulate Expired Token
```javascript
// Force token refresh
localStorage.removeItem('access_token');
// Then try to access protected route
```

---

## Common Issues & Solutions

### Issue: CORS Error
```
Error: "Access to XMLHttpRequest blocked by CORS policy"

Solution:
1. Check API URL is correct
2. Verify CORS is enabled in backend (should be by default)
3. Check Origin header matches allowed domains
4. Try from same origin (use proxy if needed)
```

### Issue: 401 Unauthorized
```
Error: "401 Unauthorized"

Solution:
1. Token may be expired → logout + login again
2. Token format wrong → check localStorage.getItem('access_token')
3. Authorization header wrong → should be "Bearer <token>"
4. Backend may require re-verification → check API logs
```

### Issue: 403 Forbidden
```
Error: "403 Forbidden"

Solution:
1. User role doesn't have permission
2. Check middleware ROLE_RULES in apps/web/middleware.ts
3. Verify user has correct role assigned
4. Try with different role user
```

### Issue: Token Not Persisting
```
Problem: Reload page, not logged in anymore

Solution:
1. Check localStorage is enabled
2. Try: localStorage.setItem('test', '1') in console
3. Check for localStorage.removeItem calls
4. Verify useAuth hook is using correct key
```

---

## Next Steps

### Week 1 (After Integration)
1. Implement dashboard pages for each role
2. Add API data fetching to pages
3. Implement navigation between sections
4. Test full user flow (register → dashboard → features)

### Week 2
1. Add role-specific features
2. Implement pagination/filtering
3. Add form handling for data submission
4. Error handling for all API calls

### Week 3+
1. Performance optimization
2. Mobile responsiveness
3. Advanced features
4. User testing & feedback

---

## Support

**Blocked on API integration?**
- Check API URL in `.env.local`
- Check API is deployed and responding
- Run `bash scripts/post-deploy-verification.sh <api-url>`
- Check browser console for errors
- Check API logs in Railway dashboard

**Questions about hooks?**
- See `apps/web/hooks/useAuth.tsx` for implementation
- See `apps/web/hooks/useToast.ts` for usage
- Check example forms in `LoginFormClient.tsx`

---

**Status**: 🟢 Ready for integration  
**Frontend**: ✅ Complete  
**Backend API**: ⏳ Deploying  
**Est. Integration Time**: 1-2 hours
