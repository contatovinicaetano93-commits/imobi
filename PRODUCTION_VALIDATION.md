# Production E2E Validation Guide

Complete end-to-end validation suite for Imobi production deployment. Run this after Vercel build succeeds.

**Estimated Total Time**: 45 minutes (5 phases)

---

## Phase 1: API Health Check (5 min)

Verify all external services are properly connected.

### 1.1 Health Endpoint
```bash
curl https://api.imobi.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-28T...",
  "redis": {
    "status": "connected",
    "host": "your-redis-host",
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

**Pass Criteria**:
- [ ] status = "ok"
- [ ] redis.status = "connected"
- [ ] All services show configured: true

### 1.2 Database Connectivity
```bash
# Log into Vercel to check database connection pool
# Check: Zero connection errors in API logs
```

**Pass Criteria**:
- [ ] No "Connection refused" errors in logs
- [ ] Migration status shows current schema version
- [ ] Can connect to PostgreSQL + PostGIS

### 1.3 Redis Connectivity
```bash
# Check cache operations work
curl -X GET https://api.imobi.com/api/v1/manager/etapas-pendentes \
  -H "Authorization: Bearer <valid-jwt>"
```

**Pass Criteria**:
- [ ] Response time < 300ms on first request (after cache populate)
- [ ] Second request < 150ms (cache hit)
- [ ] No Redis timeout errors in logs

---

## Phase 2: Authentication Flow (10 min)

Validate user registration, login, and token generation.

### 2.1 User Registration
```bash
POST https://api.imobi.com/api/v1/auth/signup
Content-Type: application/json

{
  "email": "test-user-$(date +%s)@imobi.test",
  "password": "TempPassword123!",
  "nomeCompleto": "Test User",
  "cpf": "11144477735",
  "numeroTelefone": "+5511987654321",
  "tipoUsuario": "TOMADORA"
}
```

**Pass Criteria**:
- [ ] Status 201 Created
- [ ] Response includes usuarioId
- [ ] Response includes accessToken (JWT)
- [ ] Email validation sent (check logs)

### 2.2 User Login
```bash
POST https://api.imobi.com/api/v1/auth/login
Content-Type: application/json

{
  "email": "test-user@imobi.test",
  "password": "TempPassword123!"
}
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Response includes accessToken (JWT)
- [ ] Token is valid (can decode and verify signature)
- [ ] Response time < 500ms

### 2.3 JWT Token Verification
```bash
# Extract token from login response, then:
curl https://api.imobi.com/api/v1/auth/verify \
  -H "Authorization: Bearer <token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Token is valid and not expired
- [ ] Decoded token includes usuarioId, email, tipoUsuario

### 2.4 Get User Profile
```bash
curl https://api.imobi.com/api/v1/usuarios/profile \
  -H "Authorization: Bearer <token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Returns user data (email, nome, cpf)
- [ ] Response time < 300ms

---

## Phase 3: Core Features (15 min)

Validate main application features: obras, credits, scores, notifications.

### 3.1 List Obras
```bash
curl https://api.imobi.com/api/v1/obras?limit=10&offset=0 \
  -H "Authorization: Bearer <construtora-token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Response includes array of obras with pagination
- [ ] Each obra includes: obraId, nome, endereco, status
- [ ] Response time < 500ms

### 3.2 Get Obra Details
```bash
curl https://api.imobi.com/api/v1/obras/{obraId} \
  -H "Authorization: Bearer <construtora-token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Includes obra metadata: nome, endereco, dataInicio, statusBuild
- [ ] Includes etapas array with status
- [ ] Includes creditos array with current status

### 3.3 Check User Score
```bash
curl https://api.imobi.com/api/v1/score/{usuarioId} \
  -H "Authorization: Bearer <token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Returns scoreAtual (numeric value)
- [ ] Includes scoreHistory with trends
- [ ] Response time < 300ms

### 3.4 List Notifications
```bash
curl https://api.imobi.com/api/v1/notificacoes?limit=20 \
  -H "Authorization: Bearer <token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Returns array of notifications with pagination
- [ ] Each notification includes: id, tipo, titulo, conteudo, lida, criadoEm
- [ ] Unread count available
- [ ] Response time < 300ms

### 3.5 Mark Notification as Read
```bash
PATCH https://api.imobi.com/api/v1/notificacoes/{notificacaoId}/read \
  -H "Authorization: Bearer <token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Notification marked as lida = true
- [ ] Response time < 200ms

---

## Phase 4: Manager Portal (10 min)

Validate manager approval workflows and dashboard.

### 4.1 Manager Dashboard Summary
```bash
curl https://api.imobi.com/api/v1/manager/dashboard \
  -H "Authorization: Bearer <manager-token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Returns KPI: etapasAguardando, kycAguardando, emVistoria
- [ ] Returns recentApprovals array
- [ ] All counts > 0 or properly empty
- [ ] Response time < 500ms

### 4.2 List Pending Etapas (Stages)
```bash
curl "https://api.imobi.com/api/v1/manager/etapas-pendentes?limit=10&offset=0" \
  -H "Authorization: Bearer <manager-token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Returns paginated list of etapas waiting for manager review
- [ ] Each etapa shows: etapaId, obraId, status, dataAgendadaVistoria, engineerId
- [ ] Support filtering by status (AGUARDANDO_VISTORIA, AGUARDANDO_APROVACAO)
- [ ] Response time < 500ms

### 4.3 Approve Etapa
```bash
PATCH https://api.imobi.com/api/v1/manager/etapas/{etapaId}/aprovar \
  -H "Authorization: Bearer <manager-token>" \
  -H "Content-Type: application/json" \
  -d '{"observacoes": "Vistoria aprovada. Qualidade conforme esperado."}'
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Etapa status changed to APROVADO
- [ ] Notification sent to engineer
- [ ] Audit log created (manager, timestamp, action)

### 4.4 Reject Etapa with Reason
```bash
PATCH https://api.imobi.com/api/v1/manager/etapas/{etapaId}/rejeitar \
  -H "Authorization: Bearer <manager-token>" \
  -H "Content-Type: application/json" \
  -d '{"motivo": "QUALIDADE_INSUFICIENTE", "observacoes": "Concreto com fissuras visíveis"}'
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Etapa status changed to REJEITADO
- [ ] Notification sent to engineer with reason
- [ ] Can be re-submitted by engineer

### 4.5 List Pending KYC Reviews
```bash
curl "https://api.imobi.com/api/v1/manager/kyc-pendentes?limit=10&offset=0" \
  -H "Authorization: Bearer <manager-token>"
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] Returns paginated list of KYC documents awaiting approval
- [ ] Each KYC includes: kyc_id, usuario_email, status, uploaded_docs
- [ ] Documents array contains file URLs
- [ ] Response time < 500ms

### 4.6 Approve KYC
```bash
PATCH https://api.imobi.com/api/v1/manager/kyc/{kycId}/aprovar \
  -H "Authorization: Bearer <manager-token>" \
  -H "Content-Type: application/json" \
  -d '{"observacoes": "Documentação completa e autêntica"}'
```

**Pass Criteria**:
- [ ] Status 200 OK
- [ ] KYC status changed to APROVADO
- [ ] User receives notification of KYC approval
- [ ] User's credit eligibility unlocked

---

## Phase 5: Performance & Load (5 min)

Validate response times, caching, and error handling.

### 5.1 Response Time Benchmarks
Test p95 (95th percentile) latency:

```bash
# Run 20 requests and measure response times
for i in {1..20}; do
  time curl https://api.imobi.com/api/v1/obras \
    -H "Authorization: Bearer <token>"
done
```

**Pass Criteria**:
- [ ] p95 for read endpoints < 800ms
- [ ] p95 for cached endpoints < 300ms
- [ ] Auth endpoints (login) < 500ms
- [ ] Average error rate < 1% (< 1 failure in 100 requests)

### 5.2 Cache Hit Ratio
```bash
# First request (cache miss)
curl -w "Time: %{time_total}s\n" \
  https://api.imobi.com/api/v1/manager/etapas-pendentes \
  -H "Authorization: Bearer <manager-token>" -s -o /dev/null

# Second request (cache hit - should be faster)
curl -w "Time: %{time_total}s\n" \
  https://api.imobi.com/api/v1/manager/etapas-pendentes \
  -H "Authorization: Bearer <manager-token>" -s -o /dev/null
```

**Pass Criteria**:
- [ ] Second response 50-70% faster than first
- [ ] Cache headers present: Cache-Control, X-Cache
- [ ] X-Cache header shows HIT on second request

### 5.3 Rate Limiting
```bash
# Send 11 requests in rapid succession to test rate limit
for i in {1..11}; do
  curl https://api.imobi.com/api/v1/obras \
    -H "Authorization: Bearer <construtora-token>" -s -o /dev/null -w "%{http_code}\n"
done
```

Expected pattern:
- First 10 requests: 200 OK
- 11th request: 429 Too Many Requests

**Pass Criteria**:
- [ ] Rate limit enforced: 100 req/min for general endpoints
- [ ] Auth endpoints limited to 10 req/min
- [ ] 429 response includes Retry-After header

### 5.4 Error Recovery
Test degraded conditions:

```bash
# Test with invalid token (should 401)
curl https://api.imobi.com/api/v1/obras \
  -H "Authorization: Bearer invalid-token"

# Test with missing auth (should 401)
curl https://api.imobi.com/api/v1/obras

# Test with bad query (should 400)
curl "https://api.imobi.com/api/v1/obras?limit=invalid"
```

**Pass Criteria**:
- [ ] Invalid token: 401 Unauthorized
- [ ] Missing token: 401 Unauthorized
- [ ] Invalid query: 400 Bad Request
- [ ] All errors include descriptive error message

---

## Summary Checklist

### Phase 1: API Health ✓
- [ ] Health endpoint returns status: ok
- [ ] Redis, Database, Firebase all connected
- [ ] Email provider configured

### Phase 2: Authentication ✓
- [ ] User registration succeeds
- [ ] Login generates valid JWT
- [ ] Token verification works
- [ ] Profile retrieval works

### Phase 3: Core Features ✓
- [ ] Obras list returns data
- [ ] Obra details complete
- [ ] Score retrieval works
- [ ] Notifications working
- [ ] Read/unread state changes

### Phase 4: Manager Portal ✓
- [ ] Dashboard shows KPIs
- [ ] Pending etapas list works with filters
- [ ] Etapa approval workflow complete
- [ ] Etapa rejection workflow complete
- [ ] KYC pending list works
- [ ] KYC approval workflow complete

### Phase 5: Performance ✓
- [ ] p95 response time < 800ms (read endpoints)
- [ ] Cached endpoints < 300ms
- [ ] Cache hit ratio > 50%
- [ ] Rate limiting enforced
- [ ] Error responses descriptive

---

## Next Steps if Issues Found

1. **Health check fails**: Check Vercel Environment Variables in dashboard
   - Verify all critical vars: DATABASE_URL, REDIS_URL, FIREBASE_*, SENDGRID_*
   - Check logs: https://vercel.com/[org]/imobi/deployments

2. **Authentication fails**: Check JWT_SECRET is set
   - Regenerate secret if needed
   - Verify CORS_ORIGIN matches frontend domain

3. **Slow responses**: Check Redis and database connection
   - Monitor Redis connection pool: `REDIS_URL` must be accessible from Vercel
   - Check database query performance

4. **Rate limiting too strict**: Adjust limits in `services/api/src/app.module.ts`
   - General: 100/min → CustomThrottlerGuard config
   - Auth: 10/min → Lower if needed
   - Can be overridden per endpoint with @Throttle() decorator

---

## Production Monitoring (Ongoing)

After validation passes:

1. **Set up error tracking**: Sentry or similar
2. **Monitor response times**: APM tool (Vercel Analytics)
3. **Watch rate limit hits**: Check logs for 429 responses
4. **Monitor cache hit ratio**: Aim for > 70% on manager endpoints
5. **Daily health check**: Run Phase 1 daily to catch connectivity issues

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-28  
**Status**: Ready for Phase 5 validation after Vercel deployment
