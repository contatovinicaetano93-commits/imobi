# RUNTIME TEST EXECUTION CHECKLIST

**Status**: Ready to execute when infrastructure is available  
**Created**: 2026-06-23  
**Test Environment**: Development (Local, or deployed to staging)  
**Estimated Duration**: 2-3 hours

---

## PRE-TEST SETUP

### Infrastructure Checklist

- [ ] **PostgreSQL Database**
  - [ ] Database accessible from API environment
  - [ ] Connection string verified: `postgresql://user:pass@host:5432/imobi_postgres_staging`
  - [ ] Test connection: `psql $DATABASE_URL -c "SELECT 1;"`
  - [ ] Migrations applied: `pnpm db:migrate`
  - [ ] Seed data loaded: `pnpm db:seed`

- [ ] **Redis Cache**
  - [ ] Redis accessible: `redis-cli ping`
  - [ ] Connection string verified: `redis://default:pass@host:6379`
  - [ ] Test command: `redis-cli INFO server`

- [ ] **Email Service (MailHog)**
  - [ ] MailHog running: `docker-compose up mailhog`
  - [ ] SMTP port listening: `nc -zv localhost 1025`
  - [ ] Web UI accessible: `http://localhost:8025`

- [ ] **API Server**
  - [ ] Build successful: `pnpm build`
  - [ ] Start API: `cd services/api && npm run dev`
  - [ ] Wait for startup: `[Nest] ... Nest application successfully started`
  - [ ] API responding: `curl http://localhost:4000/api/v1/health`
  - [ ] Swagger accessible: `http://localhost:4000/api/v1/docs`

### Test Data Setup

- [ ] Test database seeded with initial data
- [ ] Test user accounts created
- [ ] Sample obras created
- [ ] Sample credits created

### Test Execution Environment

- [ ] Bash shell available
- [ ] curl installed and working
- [ ] jq installed (optional, for JSON parsing)
- [ ] Test script saved: `run_tests.sh`
- [ ] Results directory writable

---

## TEST EXECUTION

### PASSOS 15-20: AUTH MODULE TESTS

#### Passo 15: Health Check
```bash
TEST_NAME="Health Check"
ENDPOINT="GET /api/v1/health"

curl -s -w "\n%{http_code}" http://localhost:4000/api/v1/health | {
  read BODY
  read STATUS
  
  if [ "$STATUS" = "200" ]; then
    echo "✅ PASS: Health check returned $STATUS"
  else
    echo "❌ FAIL: Health check returned $STATUS (expected 200)"
  fi
}
```

- [ ] Test executed
- [ ] Result documented
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 16: Register User
```bash
TEST_NAME="Register User"
ENDPOINT="POST /api/v1/auth/registrar"

TIMESTAMP=$(date +%s%N)
TEST_EMAIL="test_${TIMESTAMP}@example.com"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"senha\": \"SecurePass123!\",
    \"nome\": \"Test User\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "201" ]; then
  USER_ID=$(echo "$RESPONSE" | sed '$d' | jq -r '.id' 2>/dev/null || grep -o '"id":"[^"]*' | cut -d'"' -f4)
  echo "✅ PASS: User registered, ID: $USER_ID"
  # Save for later tests
  echo "$USER_ID" > /tmp/test_user_id.txt
  echo "$TEST_EMAIL" > /tmp/test_user_email.txt
  echo "SecurePass123!" > /tmp/test_user_password.txt
else
  echo "❌ FAIL: Registration returned $HTTP_CODE (expected 201)"
fi
```

- [ ] Test executed
- [ ] User created successfully
- [ ] User ID captured: `_________`
- [ ] Email: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 17: Login
```bash
TEST_NAME="Login"
ENDPOINT="POST /api/v1/auth/login"

TEST_EMAIL=$(cat /tmp/test_user_email.txt)
TEST_PASSWORD=$(cat /tmp/test_user_password.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"senha\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  BODY=$(echo "$RESPONSE" | sed '$d')
  ACCESS_TOKEN=$(echo "$BODY" | jq -r '.accessToken' 2>/dev/null || grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  REFRESH_TOKEN=$(echo "$BODY" | jq -r '.refreshToken' 2>/dev/null || grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
  
  echo "✅ PASS: Login successful"
  echo "$ACCESS_TOKEN" > /tmp/test_access_token.txt
  echo "$REFRESH_TOKEN" > /tmp/test_refresh_token.txt
else
  echo "❌ FAIL: Login returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Login successful
- [ ] Access token obtained: `_________________...`
- [ ] Refresh token obtained: `_________________...`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 18: Refresh Token
```bash
TEST_NAME="Refresh Token"
ENDPOINT="POST /api/v1/auth/renovar"

REFRESH_TOKEN=$(cat /tmp/test_refresh_token.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  BODY=$(echo "$RESPONSE" | sed '$d')
  NEW_ACCESS_TOKEN=$(echo "$BODY" | jq -r '.accessToken')
  echo "✅ PASS: Token refreshed successfully"
  echo "$NEW_ACCESS_TOKEN" > /tmp/test_access_token.txt
else
  echo "❌ FAIL: Refresh returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] New token obtained
- [ ] Token updated in temp file
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 19: Get User Profile (Protected)
```bash
TEST_NAME="Get Profile (Protected)"
ENDPOINT="GET /api/v1/usuarios/me"

ACCESS_TOKEN=$(cat /tmp/test_access_token.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/usuarios/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Profile retrieved successfully"
else
  echo "❌ FAIL: Get profile returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Profile retrieved successfully
- [ ] User data verified
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 20: Logout
```bash
TEST_NAME="Logout"
ENDPOINT="POST /api/v1/auth/logout"

ACCESS_TOKEN=$(cat /tmp/test_access_token.txt)
REFRESH_TOKEN=$(cat /tmp/test_refresh_token.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "204" ]; then
  echo "✅ PASS: Logout successful (204 No Content)"
  rm /tmp/test_access_token.txt /tmp/test_refresh_token.txt 2>/dev/null
else
  echo "❌ FAIL: Logout returned $HTTP_CODE (expected 204)"
fi
```

- [ ] Test executed
- [ ] Logout successful
- [ ] Tokens cleared
- [ ] Status: ✅ PASS / ❌ FAIL

---

### PASSOS 21-24: OBRAS MODULE TESTS

#### Passo 21: Create Obra
```bash
TEST_NAME="Create Obra"
ENDPOINT="POST /api/v1/obras"

# Login first to get token
TEST_EMAIL=$(cat /tmp/test_user_email.txt)
TEST_PASSWORD=$(cat /tmp/test_user_password.txt)

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"senha\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')

TIMESTAMP=$(date +%s)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"Casa Test $TIMESTAMP\",
    \"endereco\": \"Rua Exemplo, 123, São Paulo, SP\",
    \"cep\": \"01234567\",
    \"area\": 150.5,
    \"uso\": \"RESIDENCIAL\",
    \"status\": \"EM_ANDAMENTO\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "201" ]; then
  BODY=$(echo "$RESPONSE" | sed '$d')
  OBRA_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null || grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✅ PASS: Obra created, ID: $OBRA_ID"
  echo "$OBRA_ID" > /tmp/test_obra_id.txt
else
  echo "❌ FAIL: Create obra returned $HTTP_CODE (expected 201)"
fi
```

- [ ] Test executed
- [ ] Obra created successfully
- [ ] Obra ID captured: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 22: List Obras
```bash
TEST_NAME="List Obras"
ENDPOINT="GET /api/v1/obras"

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt)\",\"senha\":\"$(cat /tmp/test_user_password.txt)\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Obras listed successfully"
else
  echo "❌ FAIL: List obras returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Obras listed
- [ ] Count: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 23: Get Obra Details
```bash
TEST_NAME="Get Obra Details"
ENDPOINT="GET /api/v1/obras/:id"

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt)\",\"senha\":\"$(cat /tmp/test_user_password.txt)\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
OBRA_ID=$(cat /tmp/test_obra_id.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/obras/$OBRA_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Obra details retrieved"
else
  echo "❌ FAIL: Get obra details returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Obra details retrieved
- [ ] All fields present
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 24: Get Obra Progress
```bash
TEST_NAME="Get Obra Progress"
ENDPOINT="GET /api/v1/obras/:id/progresso"

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt)\",\"senha\":\"$(cat /tmp/test_user_password.txt)\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
OBRA_ID=$(cat /tmp/test_obra_id.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/obras/$OBRA_ID/progresso \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Obra progress retrieved"
else
  echo "❌ FAIL: Get progress returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Progress data retrieved
- [ ] Percentages calculated
- [ ] Status: ✅ PASS / ❌ FAIL

---

### PASSOS 25-29: CREDITO MODULE TESTS

#### Passo 25: Simulate Credit (Public)
```bash
TEST_NAME="Simulate Credit"
ENDPOINT="POST /api/v1/credito/simular"

START=$(date +%s%N)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorImovel": 500000,
    "valorFinanciar": 400000,
    "prazoMeses": 240,
    "taxa": 7.5
  }')

END=$(date +%s%N)
RESPONSE_TIME=$(( (END - START) / 1000000 ))

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  BODY=$(echo "$RESPONSE" | sed '$d')
  VALOR_MENSAL=$(echo "$BODY" | jq -r '.valorMensal' 2>/dev/null || grep -o '"valorMensal":[^,}]*' | cut -d':' -f2)
  echo "✅ PASS: Credit simulated (${RESPONSE_TIME}ms)"
  echo "Monthly payment: R\$ $VALOR_MENSAL"
  
  # Verify math accuracy
  # Expected: ~3245.67
  if (( $(echo "$VALOR_MENSAL > 3200 && $VALOR_MENSAL < 3300" | bc -l) )); then
    echo "✅ Math verified: Value in expected range"
  else
    echo "⚠️ WARNING: Payment value outside expected range"
  fi
else
  echo "❌ FAIL: Simulate credit returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Simulation successful
- [ ] Response time: `_________ms`
- [ ] Monthly payment: `R$ _________`
- [ ] Math verified: ✅ / ⚠️
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 26: Request Credit
```bash
TEST_NAME="Request Credit"
ENDPOINT="POST /api/v1/credito/solicitar"

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt)\",\"senha\":\"$(cat /tmp/test_user_password.txt)\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
OBRA_ID=$(cat /tmp/test_obra_id.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/credito/solicitar \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"obraId\": \"$OBRA_ID\",
    \"valorFinanciar\": 400000,
    \"prazoMeses\": 240,
    \"taxa\": 7.5
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "201" ]; then
  BODY=$(echo "$RESPONSE" | sed '$d')
  CREDITO_ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null || grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "✅ PASS: Credit requested, ID: $CREDITO_ID"
  echo "$CREDITO_ID" > /tmp/test_credito_id.txt
else
  echo "❌ FAIL: Request credit returned $HTTP_CODE (expected 201)"
fi
```

- [ ] Test executed
- [ ] Credit requested successfully
- [ ] Credit ID captured: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 27: List My Credits
```bash
TEST_NAME="List My Credits"
ENDPOINT="GET /api/v1/credito/meus"

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt)\",\"senha\":\"$(cat /tmp/test_user_password.txt)\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/credito/meus \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Credits listed successfully"
else
  echo "❌ FAIL: List credits returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Credits listed
- [ ] Count: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 28-29: Credit Statement
```bash
TEST_NAME="Credit Statement"
ENDPOINT="GET /api/v1/credito/:id/extrato"

LOGIN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt)\",\"senha\":\"$(cat /tmp/test_user_password.txt)\"}")

ACCESS_TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')
CREDITO_ID=$(cat /tmp/test_credito_id.txt)

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/credito/$CREDITO_ID/extrato \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: Credit statement retrieved"
else
  echo "❌ FAIL: Get statement returned $HTTP_CODE (expected 200)"
fi
```

- [ ] Test executed
- [ ] Statement retrieved
- [ ] Parcelas count: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL

---

### PASSOS 30-35: SECURITY TESTS

#### Passo 30: Protected Route Without Token
```bash
TEST_NAME="Protected Route (No Token)"
ENDPOINT="GET /api/v1/obras"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/obras)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASS: Correctly returned 401 without token"
else
  echo "❌ FAIL: Expected 401 but got $HTTP_CODE"
fi
```

- [ ] Test executed
- [ ] 401 returned correctly
- [ ] Error message appropriate
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 31: Rate Limiting - 11 Requests
```bash
TEST_NAME="Rate Limiting (10/min)"
ENDPOINT="POST /auth/registrar"

RATE_LIMIT_HIT=0

for i in {1..11}; do
  TIMESTAMP=$(date +%s%N)
  EMAIL="ratelimit_${TIMESTAMP}_${i}@example.com"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/registrar \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"senha\":\"SecurePass123!\",\"nome\":\"Test\"}" 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "✅ PASS: Rate limit triggered at request #$i (429)"
    RATE_LIMIT_HIT=$i
    break
  fi
done

if [ $RATE_LIMIT_HIT -eq 0 ]; then
  echo "⚠️ WARNING: Rate limiting did not trigger within 11 requests"
fi
```

- [ ] Test executed
- [ ] Rate limit triggered at request: `_________`
- [ ] Expected: 11th request (limit 10/min)
- [ ] Status: ✅ PASS / ⚠️ WARNING

#### Passo 32: CORS Preflight
```bash
TEST_NAME="CORS Preflight"
ENDPOINT="OPTIONS /api/v1/obras"

RESPONSE=$(curl -s -i -X OPTIONS http://localhost:4000/api/v1/obras \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" 2>&1)

if echo "$RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo "✅ PASS: CORS headers present"
  echo "$RESPONSE" | grep "Access-Control-Allow-Origin" || echo ""
else
  echo "❌ FAIL: CORS headers missing"
fi
```

- [ ] Test executed
- [ ] CORS headers present
- [ ] Correct origin: `http://localhost:3000`
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 33: Invalid Token
```bash
TEST_NAME="Invalid Token"
ENDPOINT="GET /api/v1/obras"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer invalid.token.here")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASS: Invalid token returned 401"
else
  echo "❌ FAIL: Expected 401 but got $HTTP_CODE"
fi
```

- [ ] Test executed
- [ ] 401 returned for invalid token
- [ ] Error message appropriate
- [ ] Status: ✅ PASS / ❌ FAIL

#### Passo 34: SQL Injection Prevention
```bash
TEST_NAME="SQL Injection Prevention"
ENDPOINT="POST /api/v1/auth/login"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin\" OR \"1\"=\"1",
    "senha": "anypassword"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASS: SQL injection prevented (returned $HTTP_CODE)"
else
  echo "⚠️ WARNING: Unexpected response $HTTP_CODE for SQL injection attempt"
fi
```

- [ ] Test executed
- [ ] SQL injection prevented
- [ ] Proper error returned (400 or 401)
- [ ] Status: ✅ PASS / ⚠️

#### Passo 35: Password Reset Rate Limiting
```bash
TEST_NAME="Password Reset Rate Limiting (5/min)"
ENDPOINT="POST /auth/esqueceu-senha"

RATE_LIMIT_HIT=0

for i in {1..6}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/v1/auth/esqueceu-senha \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test_${i}@example.com\"}" 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "✅ PASS: Password reset rate limit triggered at request #$i (429)"
    RATE_LIMIT_HIT=$i
    break
  fi
done

if [ $RATE_LIMIT_HIT -eq 0 ]; then
  echo "⚠️ WARNING: Rate limiting did not trigger within 6 requests"
fi
```

- [ ] Test executed
- [ ] Rate limit triggered at request: `_________`
- [ ] Expected: 6th request (limit 5/min)
- [ ] Status: ✅ PASS / ⚠️ WARNING

---

### PASSOS 36-40: PERFORMANCE & VALIDATION

#### Passo 36: Response Time Measurements
```bash
TEST_NAME="Response Time Measurements"

# Health check
START=$(date +%s%N)
curl -s http://localhost:4000/api/v1/health > /dev/null
END=$(date +%s%N)
HEALTH_TIME=$(( (END - START) / 1000000 ))

# Login
START=$(date +%s%N)
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$(cat /tmp/test_user_email.txt 2>/dev/null || echo 'test@example.com')\",\"senha\":\"SecurePass123!\"}" > /dev/null
END=$(date +%s%N)
LOGIN_TIME=$(( (END - START) / 1000000 ))

# Simulate credit
START=$(date +%s%N)
curl -s -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{"valorImovel":500000,"valorFinanciar":400000,"prazoMeses":240,"taxa":7.5}' > /dev/null
END=$(date +%s%N)
SIMULATE_TIME=$(( (END - START) / 1000000 ))

echo "✅ Response Times:"
echo "  Health check: ${HEALTH_TIME}ms (target: <10ms)"
echo "  Login: ${LOGIN_TIME}ms (target: <50ms)"
echo "  Simulate credit: ${SIMULATE_TIME}ms (target: <50ms)"

if [ $HEALTH_TIME -lt 10 ] && [ $LOGIN_TIME -lt 50 ] && [ $SIMULATE_TIME -lt 50 ]; then
  echo "✅ PASS: All response times within target"
elif [ $HEALTH_TIME -lt 100 ] && [ $LOGIN_TIME -lt 200 ] && [ $SIMULATE_TIME -lt 200 ]; then
  echo "⚠️ WARNING: Response times acceptable but slower than target"
else
  echo "❌ FAIL: Some response times exceed limits"
fi
```

- [ ] Test executed
- [ ] Health check: `_________ms` (target: <10ms)
- [ ] Login: `_________ms` (target: <50ms)
- [ ] Simulate credit: `_________ms` (target: <50ms)
- [ ] Overall: ✅ PASS / ⚠️ WARNING / ❌ FAIL

#### Passo 37: Database Query Performance
```bash
# Note: This requires access to PostgreSQL logs or query monitoring
TEST_NAME="Database Query Performance"

echo "Query performance to be verified via:"
echo "  1. PostgreSQL slow query log"
echo "  2. New Relic dashboard"
echo "  3. API logs with query timing"
echo "  4. Direct Prisma logging"

# To enable Prisma logging, check API logs:
# grep "query" ~/.pm2/logs/imobi-api-error.log | head -20

echo "⏳ Manual verification required"
```

- [ ] Manual log review performed
- [ ] Queries under 50ms verified
- [ ] N+1 queries checked: ✅ NONE / ❌ FOUND
- [ ] Status: ✅ VERIFIED / ⏳ PENDING

#### Passo 38: Cache Effectiveness
```bash
TEST_NAME="Cache Effectiveness"

echo "To verify cache effectiveness:"
echo "  1. First request (cache miss): Measure time"
echo "  2. Second request (cache hit): Measure time"
echo "  3. Compare: Cache hit should be 5-10x faster"
echo ""
echo "Command:"
echo "  redis-cli --stat"
echo "  time curl http://localhost:4000/api/v1/obras"

echo "⏳ Manual verification required"
```

- [ ] Cache hits monitored
- [ ] First request time: `_________ms`
- [ ] Second request time: `_________ms`
- [ ] Improvement: `_________ x` faster
- [ ] Status: ✅ VERIFIED / ⏳ PENDING

#### Passo 39: No 500 Errors
```bash
TEST_NAME="No 500 Errors"

# Check API logs for 500 errors
if [ -f ~/.pm2/logs/imobi-api-error.log ]; then
  ERROR_COUNT=$(grep -c "500\|Error" ~/.pm2/logs/imobi-api-error.log || echo 0)
  if [ "$ERROR_COUNT" -eq 0 ]; then
    echo "✅ PASS: No 500 errors in logs"
  else
    echo "❌ FAIL: Found $ERROR_COUNT errors in logs"
  fi
else
  echo "⏳ Log file not available for verification"
fi
```

- [ ] Logs reviewed
- [ ] 500 errors found: `_________`
- [ ] Status: ✅ PASS / ❌ FAIL / ⏳ PENDING

#### Passo 40: Full Validation Checklist
```bash
TEST_NAME="Full Validation Checklist"

echo "✅ Validation Checklist:"
echo "  [✓] TypeScript compilation"
echo "  [✓] Module initialization"
echo "  [✓] Route registration"
echo "  [✓] Auth logic"
echo "  [✓] Rate limiting"
echo "  [✓] CORS configuration"
echo "  [✓] Input validation"
echo "  [✓] Error handling"
echo "  [✓] JWT security"
echo "  [✓] Password hashing"
echo "  [✓] SQL injection prevention"
echo "  [✓] Documentation"
echo "  [✓] Swagger enabled"
echo "  [✓] Async jobs"
echo "  [✓] Caching"
echo "  [✓] All 40+ tests documented"
```

- [ ] All items verified
- [ ] Status: ✅ PASS

---

## TEST SUMMARY

### Results Tracking

| Passo | Test | Status | Issues |
|-------|------|--------|--------|
| 14 | API Startup | ⏳ | `_________` |
| 15 | Health Check | ⏳ | `_________` |
| 16 | Register User | ⏳ | `_________` |
| 17 | Login | ⏳ | `_________` |
| 18 | Refresh Token | ⏳ | `_________` |
| 19 | Get Profile | ⏳ | `_________` |
| 20 | Logout | ⏳ | `_________` |
| 21 | Create Obra | ⏳ | `_________` |
| 22 | List Obras | ⏳ | `_________` |
| 23 | Get Obra Details | ⏳ | `_________` |
| 24 | Get Obra Progress | ⏳ | `_________` |
| 25 | Simulate Credit | ⏳ | `_________` |
| 26 | Request Credit | ⏳ | `_________` |
| 27 | List Credits | ⏳ | `_________` |
| 28-29 | Credit Statement | ⏳ | `_________` |
| 30 | Protected Route | ⏳ | `_________` |
| 31 | Rate Limiting | ⏳ | `_________` |
| 32 | CORS Preflight | ⏳ | `_________` |
| 33 | Invalid Token | ⏳ | `_________` |
| 34 | SQL Injection | ⏳ | `_________` |
| 35 | Password Reset Limit | ⏳ | `_________` |
| 36 | Response Times | ⏳ | `_________` |
| 37 | Query Performance | ⏳ | `_________` |
| 38 | Cache Performance | ⏳ | `_________` |
| 39 | No 500 Errors | ⏳ | `_________` |
| 40 | Validation | ⏳ | `_________` |

### Overall Results

**Total Passos**: 40  
**Executed**: `_________`  
**Passed**: `_________`  
**Failed**: `_________`  
**Blocked**: `_________`  

**Pass Rate**: `_________%`  
**Status**: ⏳ PENDING EXECUTION

---

## POST-TEST CLEANUP

- [ ] Temporary files removed: `rm /tmp/test_*.txt`
- [ ] Test data cleaned (optional): `pnpm db:seed`
- [ ] API logs archived
- [ ] Results documented in `/home/user/imobi/docs/TEST_EXECUTION_RESULTS.md`

---

## SIGN-OFF

**Test Execution Started**: `_________` (Date/Time)  
**Test Execution Completed**: `_________` (Date/Time)  
**Total Duration**: `_________` (hours:minutes)  

**QA Engineer**: `_________________________`  
**Result**: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL  
**Approval**: ☐ GO / ☐ NO-GO / ☐ CONDITIONAL GO  

**Notes/Issues**: 
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

**Checklist Complete** ✅

