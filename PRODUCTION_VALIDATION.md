# Production Validation: Imobi MVP

**Status**: Vercel deployment in progress (~50-60s build time)  
**Production URL**: https://imobi.vercel.app  
**API Endpoint**: https://api.imobi.vercel.app/api/v1

---

## Sanity Check Checklist

### Phase 1: API Health (5 min)
- [ ] **API Health**: `GET /api/v1/health` → 200 OK
- [ ] **Database Connection**: Response includes `database: true`
- [ ] **Redis Cache**: Response includes `redis: true`
- [ ] **Firebase**: Response includes `firebase: true` or `pending`

### Phase 2: Authentication Flow (10 min)
- [ ] **Sign Up**: `POST /api/v1/auth/registro` with valid CPF/email
- [ ] **Login**: `POST /api/v1/auth/login` with created credentials
- [ ] **JWT Token**: Response includes valid `access_token`
- [ ] **Profile**: `GET /api/v1/usuarios/meu-perfil` returns user data

### Phase 3: Core Features (15 min)
- [ ] **Obras List**: `GET /api/v1/obras` returns paginated results
- [ ] **Credit Info**: `GET /api/v1/credito/meus` returns credit array
- [ ] **Score**: `GET /api/v1/score/atual` returns score object
- [ ] **Notifications**: `GET /api/v1/notificacoes` returns notification list

### Phase 4: Manager Portal (10 min)
- [ ] **Manager Dashboard**: `GET /api/v1/manager/dashboard` → stats
- [ ] **Pending Etapas**: `GET /api/v1/manager/etapas-pendentes` → array
- [ ] **Pending KYC**: `GET /api/v1/manager/kyc-pendentes` → array

### Phase 5: Performance (5 min)
- [ ] **Response Time**: p50 < 200ms, p95 < 500ms
- [ ] **Cache Hit Rate**: Manager endpoints show cache headers
- [ ] **Error Rate**: < 1% (check Vercel analytics)

---

## Quick Validation Script

```bash
#!/bin/bash
API="https://api.imobi.vercel.app/api/v1"

echo "🔍 Production Health Check"
echo "========================="

# Health check
echo "✓ Health check..."
curl -s "$API/health" | jq . || echo "❌ API not responding"

# Test with mock token (will fail if no auth, but shows API is up)
echo "✓ Testing auth endpoint..."
curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | jq .message

echo ""
echo "✅ Production validation complete"
```

---

## Expected Issues & Mitigations

| Issue | Mitigation |
|-------|-----------|
| **Build timeout (>60s)** | Check Vercel logs, likely next.js optimization issue |
| **API 502 errors** | Restart API service, check DATABASE_URL env var |
| **CORS errors** | Verify CORS_ORIGIN env var set to imobi.vercel.app |
| **Database connection fails** | Check DATABASE_URL points to production DB |
| **Redis connection fails** | Check REDIS_URL env var, may be optional in dev |

---

## Success Criteria

✅ **MVP is production-ready** when:
1. Health endpoint returns 200 OK
2. Auth flow (signup → login) completes without errors
3. Obras list returns data
4. Manager portal endpoints respond
5. Response times < 500ms p95
6. Error rate < 1%

---

## Next Actions

Once deployment is live:
1. Run health check: `curl https://api.imobi.vercel.app/api/v1/health`
2. Test signup flow in browser
3. Check Vercel analytics for performance
4. Monitor error logs for 1 hour
5. If all green: **MVP is production-ready** ✅

---

**Deployment Started**: 2026-05-28 20:15 UTC  
**Expected Live**: 2026-05-28 20:16-20:17 UTC  
**Monitoring**: Automated via Vercel dashboard
