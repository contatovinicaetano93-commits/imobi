# Deployment Verification Checklist

> **Date**: 2026-05-28  
> **Environment**: Production (staging + production)  
> **Status**: Ready for verification

This document provides a step-by-step validation procedure to verify that the imobi platform is correctly deployed and all core services are functional.

---

## Pre-Verification Requirements

Before starting verification, ensure you have:
- [ ] API URL: `https://api.imobi.com` (or staging: `https://api-staging.imobi.com`)
- [ ] Web URL: `https://app.imobi.com.br` (or staging: `https://app-staging.imobi.com`)
- [ ] Test accounts created (see BETA_TEST_ACCOUNTS.md)
- [ ] Postman or curl available for API testing
- [ ] Browser with developer tools
- [ ] Network connectivity

---

## Step 1: Health Check Endpoint

**Purpose**: Verify API is running and core services are configured.

### Endpoint Details
- **URL**: `GET /api/v1/health`
- **Expected Status**: `200 OK`
- **Authentication**: Not required

### Test Steps

#### Option A: Using curl

```bash
curl -X GET "https://api.imobi.com/api/v1/health" \
  -H "Accept: application/json"
```

#### Option B: Using Postman

1. Create new request
2. Method: `GET`
3. URL: `https://api.imobi.com/api/v1/health`
4. Click "Send"

### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2026-05-28T22:30:15.123Z",
  "redis": {
    "status": "connected",
    "host": "your-redis-host.upstash.io",
    "port": 6379
  },
  "email": {
    "provider": "sendgrid",
    "configured": true
  },
  "firebase": {
    "configured": true
  },
  "database": {
    "configured": true
  }
}
```

### Verification Checklist

- [ ] Response status is `200`
- [ ] `status` field shows `"ok"` (not `"degraded"` or `"error"`)
- [ ] `timestamp` is current (within last 5 seconds)
- [ ] `redis.status` is `"connected"`
- [ ] `email.configured` is `true`
- [ ] `firebase.configured` is `true`
- [ ] `database.configured` is `true`

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Verify API is deployed and running |
| 404 Not Found | Check endpoint path is correct |
| Status: "degraded" | Check Redis/Email/Firebase/Database config |
| Status: "error" | Check logs in deployment dashboard |

---

## Step 2: User Registration (Auth Flow)

**Purpose**: Verify user registration system is working.

### Endpoint Details
- **URL**: `POST /api/v1/auth/registrar`
- **Expected Status**: `201 Created`
- **Authentication**: Not required

### Test Payload

```json
{
  "email": "deploy-test-001@imobi.test",
  "senha": "TestPass123!",
  "nome": "Deploy Test User",
  "cpf": "12345678901",
  "telefone": "11987654321",
  "tipo": "CONSTRUTORA"
}
```

### Test Steps

#### Option A: Using curl

```bash
curl -X POST "https://api.imobi.com/api/v1/auth/registrar" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deploy-test-001@imobi.test",
    "senha": "TestPass123!",
    "nome": "Deploy Test User",
    "cpf": "12345678901",
    "telefone": "11987654321",
    "tipo": "CONSTRUTORA"
  }'
```

#### Option B: Using Postman

1. Create new request
2. Method: `POST`
3. URL: `https://api.imobi.com/api/v1/auth/registrar`
4. Body (raw JSON):
```json
{
  "email": "deploy-test-001@imobi.test",
  "senha": "TestPass123!",
  "nome": "Deploy Test User",
  "cpf": "12345678901",
  "telefone": "11987654321",
  "tipo": "CONSTRUTORA"
}
```
5. Click "Send"

### Expected Response

```json
{
  "id": "user-uuid-here",
  "email": "deploy-test-001@imobi.test",
  "nome": "Deploy Test User",
  "tipo": "CONSTRUTORA",
  "createdAt": "2026-05-28T22:30:15.123Z",
  "cpf": "12345678901",
  "telefone": "11987654321"
}
```

### Verification Checklist

- [ ] Response status is `201` (Created)
- [ ] Response contains `id` field (UUID format)
- [ ] User email matches request
- [ ] User tipo matches request
- [ ] `createdAt` is recent
- [ ] All required fields are present

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 400 Bad Request | Check JSON format and required fields |
| 422 Validation Error | Check email/CPF format or uniqueness |
| 500 Server Error | Check API logs for database errors |
| Database error | Verify DATABASE_URL and migrations |

---

## Step 3: User Login

**Purpose**: Verify JWT authentication is working correctly.

### Endpoint Details
- **URL**: `POST /api/v1/auth/login`
- **Expected Status**: `200 OK`
- **Authentication**: Not required
- **Returns**: JWT tokens

### Test Payload

Use credentials from Step 2 or existing test account:

```json
{
  "email": "deploy-test-001@imobi.test",
  "senha": "TestPass123!"
}
```

### Test Steps

#### Option A: Using curl

```bash
curl -X POST "https://api.imobi.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deploy-test-001@imobi.test",
    "senha": "TestPass123!"
  }'
```

#### Option B: Using Postman

1. Create new request
2. Method: `POST`
3. URL: `https://api.imobi.com/api/v1/auth/login`
4. Body (raw JSON):
```json
{
  "email": "deploy-test-001@imobi.test",
  "senha": "TestPass123!"
}
```
5. Click "Send"

### Expected Response

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-here",
  "expiresIn": 900,
  "user": {
    "id": "user-uuid",
    "email": "deploy-test-001@imobi.test",
    "nome": "Deploy Test User",
    "tipo": "CONSTRUTORA"
  }
}
```

### Verification Checklist

- [ ] Response status is `200`
- [ ] `accessToken` is a valid JWT (starts with `eyJ`)
- [ ] `refreshToken` is present
- [ ] `expiresIn` is numeric (default: 900 seconds)
- [ ] User data matches login request
- [ ] Token decodes without errors

### Token Verification (Advanced)

To decode JWT (paste token at https://jwt.io):

```bash
# Extract and decode JWT
TOKEN="your_access_token_here"
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .
```

Expected decoded payload:
```json
{
  "sub": "user-uuid",
  "email": "deploy-test-001@imobi.test",
  "iat": 1716936615,
  "exp": 1716937515
}
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check password is correct |
| 404 User Not Found | User must exist; create with Step 2 first |
| 500 Server Error | Check Redis/JWT configuration |
| Token validation fails | Verify JWT_SECRET is set correctly |

---

## Step 4: Core Feature Check - List Obras

**Purpose**: Verify authenticated endpoints work and database queries execute.

### Endpoint Details
- **URL**: `GET /api/v1/obras`
- **Expected Status**: `200 OK`
- **Authentication**: Required (Bearer token from Step 3)
- **Returns**: List of obras (projects)

### Test Steps

#### Option A: Using curl

```bash
# First, login and capture the token
TOKEN=$(curl -s -X POST "https://api.imobi.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deploy-test-001@imobi.test",
    "senha": "TestPass123!"
  }' | jq -r '.accessToken')

# Then use token to access obras
curl -X GET "https://api.imobi.com/api/v1/obras" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

#### Option B: Using Postman

1. Use token from Step 3
2. Create new request
3. Method: `GET`
4. URL: `https://api.imobi.com/api/v1/obras`
5. Headers:
   - Key: `Authorization`
   - Value: `Bearer {accessToken from Step 3}`
6. Click "Send"

### Expected Response

For new user (likely empty):

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "pages": 0
  }
}
```

Or with existing works:

```json
{
  "data": [
    {
      "id": "work-uuid-1",
      "nome": "Obra Test 1",
      "endereco": "Rua Test, 123",
      "cep": "12345678",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "status": "ATIVO",
      "createdAt": "2026-05-28T20:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### Verification Checklist

- [ ] Response status is `200`
- [ ] `data` array is present (may be empty)
- [ ] `meta` object contains pagination info
- [ ] If data present: each object has required fields
- [ ] Latitude/longitude are valid (within Brazil)
- [ ] Timestamps are in ISO 8601 format

### Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Token expired; login again in Step 3 |
| 403 Forbidden | Token valid but insufficient permissions |
| 500 Server Error | Database query failed; check logs |
| Empty response | New user may have no obras yet (expected) |

---

## Step 5: Web App Health Check

**Purpose**: Verify frontend is deployed and loads correctly.

### Test Steps

1. Open browser to: `https://app.imobi.com.br`
2. Verify page loads (no 404 or 503 errors)
3. Check browser console for errors (F12)
4. Verify login form is visible

### Verification Checklist

- [ ] Page loads without error (HTTP 200)
- [ ] Login form is displayed
- [ ] No red errors in browser console
- [ ] Page takes < 5 seconds to load
- [ ] Mobile responsive layout loads

### Browser Console Checks

1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Verify no red error messages
4. Check for Sentry initialization message

Expected (may be warning/info only):
```
✓ No 404 errors
✓ No CORS errors
✓ Sentry initialized (if configured)
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not found (404) | Verify deployment to Vercel completed |
| Blank page | Check Vercel build logs |
| Console errors | Check NEXT_PUBLIC_API_URL is correct |
| CORS errors | API CORS_ORIGIN must include web domain |

---

## Step 6: End-to-End Login Flow (Web)

**Purpose**: Verify complete user flow works in web interface.

### Test Steps

1. Navigate to `https://app.imobi.com.br/login`
2. Enter test account email: `deploy-test-001@imobi.test`
3. Enter test account password: `TestPass123!`
4. Click "Login" button
5. Verify redirect to dashboard
6. Check user profile shows correct information

### Verification Checklist

- [ ] Login form submits without errors
- [ ] Redirect to dashboard occurs (< 3 seconds)
- [ ] User email visible in profile/header
- [ ] No API errors in browser console
- [ ] No infinite redirect loops

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Verify account exists from Step 2 |
| Blank page after login | Check localStorage for token |
| Stuck on login page | Check API_URL in Vercel env vars |
| Network errors | Verify CORS headers from API |

---

## Summary Verification Checklist

Use this table to track all verification steps:

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | Health check (GET /health) | [ ] | Response status 200, all services ok |
| 2 | User registration (POST /auth/registrar) | [ ] | User created with ID |
| 3 | User login (POST /auth/login) | [ ] | JWT tokens received |
| 4 | List obras (GET /obras) | [ ] | Authenticated request successful |
| 5 | Web app loads | [ ] | No console errors |
| 6 | Web login flow | [ ] | Dashboard accessible |

---

## Production Readiness Sign-Off

### All Tests Passed?

If all steps above are successful, the deployment is verified and ready:

- [ ] All health checks passed
- [ ] Authentication working (registration + login)
- [ ] Core API endpoints functional
- [ ] Web frontend deployed and responsive
- [ ] No critical errors in logs

### If Tests Failed

1. Review troubleshooting sections above
2. Check deployment logs:
   - **Render API logs**: https://dashboard.render.com
   - **Vercel Web logs**: https://vercel.com/deployments
3. Review environment variables in dashboard
4. Check database migrations completed
5. Verify Sentry errors (if configured)

---

## Additional Validation Commands

### API Uptime Check
```bash
# Check API responds quickly
time curl -X GET "https://api.imobi.com/api/v1/health" -H "Accept: application/json"

# Expected: response time < 500ms
```

### SSL Certificate Validation
```bash
# Verify SSL cert is valid
curl -I https://api.imobi.com
curl -I https://app.imobi.com.br

# Expected: HTTP/2 200 or 301 (redirect)
```

### Database Connection Check
```bash
# From API logs, verify database connected
# Look for: "Connected to database" message

# Or test via API:
curl https://api.imobi.com/api/v1/health | jq '.database.configured'
# Should return: true
```

---

## Post-Deployment Checklist

After verification passes:

- [ ] Sentry account created and configured
- [ ] Sentry DSNs added to environment variables
- [ ] Alert rules configured in Sentry
- [ ] Team notified of successful deployment
- [ ] Monitoring dashboard reviewed
- [ ] Backup procedures verified
- [ ] Incident response plan reviewed
- [ ] Runbook created and shared

---

## Contact & Support

**Deployment Issues**: contato.vinicaetano93@gmail.com

**Documentation**:
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Full deployment guide
- [BETA_TEST_ACCOUNTS.md](./BETA_TEST_ACCOUNTS.md) - Test account details
- [SENTRY_IMPLEMENTATION_CHECKLIST.md](./SENTRY_IMPLEMENTATION_CHECKLIST.md) - Error tracking setup

---

**Last Updated**: 2026-05-28  
**Verified By**: _______________  
**Verification Date**: _______________  
**Environment**: Production | Staging

---

## Quick Reference URLs

| Service | URL |
|---------|-----|
| API Health | https://api.imobi.com/api/v1/health |
| API Docs | https://api.imobi.com/api/docs |
| Web App | https://app.imobi.com.br |
| Admin Dashboard | https://app.imobi.com.br/admin |
| Vercel Deployments | https://vercel.com/contatovinicaetano93-commits/imobi/deployments |
| Render Dashboard | https://dashboard.render.com |
| Sentry Dashboard | https://sentry.io/organizations/[org-slug]/ |

