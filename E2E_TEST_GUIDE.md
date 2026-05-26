# End-to-End Test Guide

Complete flow testing for imbobi credit and construction management system.

## Complete User Journey

### Phase 1: User Registration & Setup

**Test: User Registration Flow**
1. Open web app at `http://localhost:3000`
2. Click "Cadastrar" → fill form with:
   - Name: Test User
   - CPF: 12345678901
   - Phone: 11999999999
   - Email: testuser@example.com
   - Password: Senha123!
3. Click submit
4. Should redirect to `/dashboard` with session cookie

**Verify:**
- `access_token` cookie created (check DevTools > Application > Cookies)
- User record created in database:
  ```sql
  SELECT * FROM "Usuario" WHERE email = 'testuser@example.com';
  ```

---

### Phase 2: Credit Simulation & Application

**Test: Credit Simulation**
1. Go to `/dashboard/simulador`
2. Adjust sliders:
   - Amount: R$ 50,000
   - Term: 12 months
3. Observe calculations:
   - Monthly payment ≈ R$ 4,300
   - Total paid ≈ R$ 51,600
   - Interest ≈ R$ 1,600
   - CET ≈ 11.88%

**Expected Calculation:**
```
With rate = 0.99% monthly:
Monthly = Principal/months + (Balance × Rate)
= 50000/12 + (50000 × 0.0099) = 4,170 + 495 = 4,665
```

**Verify in database:**
```sql
SELECT * FROM "Credito" WHERE "usuarioId" = (SELECT "usuarioId" FROM "Usuario" WHERE email = 'testuser@example.com');
```

---

### Phase 3: Construction Project Creation

**Test: Create Construction Project (Obra)**
1. Go to `/dashboard/obras`
2. Click "Nova Obra"
3. Fill form:
   - Name: Casa no Bairro X
   - Address: Rua Principal, 123
   - GPS Coordinates: -23.5505, -46.6333 (São Paulo)
   - Radius: 50m
   - Area: 120m²
4. Click create
5. Should redirect to `/dashboard/obras` with new obra in list

**Verify:**
- 9 stages automatically created:
  ```sql
  SELECT nome, ordem, percentualObra FROM "EtapaObra" 
  WHERE "obraId" = 'xxx' ORDER BY ordem;
  ```

**Expected stages:**
1. Fundação (15%)
2. Estrutura (20%)
3. Alvenaria (15%)
4. Cobertura (10%)
5. Elétrica (10%)
6. Hidráulica (8%)
7. Acabamento (12%)
8. Pintura (7%)
9. Entrega (3%)

---

### Phase 4: Stage Execution & Evidence Upload

**Test: Register Evidence (Mobile Flow)**
1. Open mobile app (Expo)
2. Navigate to Obras tab
3. Tap obra → "Registrar Etapa (Fundação)"
4. GPS validation screen shows:
   - Current location check
   - Distance to obra
   - Accuracy indicator
5. Camera permission → take photo
6. Location confirmation
7. Upload evidence

**Verify in database:**
```sql
SELECT * FROM "EvidenciaEtapa" WHERE "etapaId" = 'xxx' 
ORDER BY "criadoEm" DESC LIMIT 1;
```

**Check fields:**
- `fotoUrl` — S3 URL
- `latCaptura` — Captured latitude
- `lngCaptura` — Captured longitude
- `distanciaObra` — Calculated by PostGIS
- `validada` — false (needs manager approval)

---

### Phase 5: Manager Inspection & Approval

**Test: Manager Vistoria Flow**
1. Switch to manager account (must have GESTOR_OBRA type)
2. Go to `/dashboard/gestor`
3. See obra in pending queue
4. Click "Vistorar"
5. Review evidence photos
6. Scroll to approval form
7. Enter observations: "Fundação validada, pronta para próxima etapa"
8. Click "✓ Aprovar etapa"

**Expected response:**
```json
{
  "ok": true,
  "observacao": "Fundação validada..."
}
```

---

### Phase 6: Automatic Installment Release (BullMQ)

**Test: Background Job Processing**
1. After stage approval, check BullMQ queue:
   ```bash
   redis-cli
   > KEYS "bull:liberacao-parcela:*"
   > HGETALL "bull:liberacao-parcela:1"
   ```

2. Monitor worker logs:
   ```
   [NestJS] 12:34:56 LOG Liberação processada para crédito xxx: R$ 7500
   ```

3. Verify database updates:
   ```sql
   SELECT * FROM "LiberacaoParcela" WHERE "creditoId" = 'xxx';
   -- Should see status: CONCLUIDA, processadoEm: NOW
   
   SELECT "valorLiberado" FROM "Credito" WHERE "creditoId" = 'xxx';
   -- Should increment by R$ 7,500 (15% of R$ 50,000)
   ```

4. Check EtapaObra status:
   ```sql
   SELECT status, "dataConclusaoReal" FROM "EtapaObra" WHERE "etapaId" = 'xxx';
   -- Should be CONCLUIDA with timestamp
   ```

---

### Phase 7: Score Calculation

**Test: Construtibilidade Score**
1. Go to `/dashboard/score`
2. Verify current score shows breakdown:
   - Base: 600
   - Completion on time: +0 (no stages completed yet... wait for more stages)
   - Completion rate: +0
   - Payment history: +0
   - Time as client: +5 (depends on registration date)
   - KYC approved: +0 (unless KYC completed)
   - **Total: 605+**

3. After completing more stages and payments:
   ```sql
   SELECT score, motivo FROM "ScoreHistorico" 
   WHERE "usuarioId" = 'xxx' 
   ORDER BY "criadoEm" DESC LIMIT 10;
   ```

---

### Phase 8: Credit Statement View

**Test: View Payment Schedule**
1. Go to `/dashboard/credito`
2. Verify displays:
   - Approved: R$ 50,000
   - Released: R$ 7,500 (after first stage)
   - Rate: 0.99%
   - Term: 12 months

3. Check payment schedule table:
   - Installment 1: R$ 4,665 + R$ 495 interest
   - Installment 2: R$ 4,665 + R$ 454 interest (balance decreased)
   - ...
   - Installment 12: R$ 4,665 + ~R$ 47 interest

4. Verify totals:
   - Total Interest: ~R$ 1,600
   - Total to Pay: ~R$ 51,600

---

## Automation Test Script

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:4000/api/v1"
WEB_URL="http://localhost:3000"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

echo -e "${YELLOW}Starting E2E Test Suite...${NC}\n"

# 1. Register user
echo -e "${YELLOW}1. Testing user registration...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/registrar" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"Test User\",
    \"cpf\": \"12345678901\",
    \"email\": \"$TEST_EMAIL\",
    \"telefone\": \"11999999999\",
    \"senha\": \"$TEST_PASSWORD\",
    \"tipo\": \"TOMADOR\"
  }")

USER_ID=$(echo $REGISTER_RESPONSE | jq -r '.usuarioId // empty')
if [ -z "$USER_ID" ]; then
  echo -e "${RED}✗ Registration failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ User registered: $USER_ID${NC}\n"

# 2. Login
echo -e "${YELLOW}2. Testing login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"senha\": \"$TEST_PASSWORD\"
  }")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')
if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Login successful${NC}\n"

# 3. Create obra
echo -e "${YELLOW}3. Testing obra creation...${NC}"
CREATE_OBRA=$(curl -s -X POST "$API_URL/obras" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"nome\": \"Test Casa\",
    \"endereco\": \"Rua Teste, 123\",
    \"geoLatitude\": -23.5505,
    \"geoLongitude\": -46.6333,
    \"raioValidacaoMetros\": 50,
    \"areaM2\": 120,
    \"tipo\": \"RESIDENCIAL\"
  }")

OBRA_ID=$(echo $CREATE_OBRA | jq -r '.obraId // empty')
if [ -z "$OBRA_ID" ]; then
  echo -e "${RED}✗ Obra creation failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Obra created: $OBRA_ID${NC}\n"

# 4. List etapas
echo -e "${YELLOW}4. Testing etapa listing...${NC}"
ETAPAS=$(curl -s "$API_URL/etapas/obra/$OBRA_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ETAPA_COUNT=$(echo $ETAPAS | jq 'length')
if [ "$ETAPA_COUNT" -ne 9 ]; then
  echo -e "${RED}✗ Expected 9 etapas, got $ETAPA_COUNT${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 9 etapas created automatically${NC}\n"

# 5. Get current score
echo -e "${YELLOW}5. Testing score calculation...${NC}"
SCORE=$(curl -s "$API_URL/score/atual" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SCORE_VALUE=$(echo $SCORE | jq -r '.score // empty')
if [ -z "$SCORE_VALUE" ]; then
  echo -e "${RED}✗ Score calculation failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Score: $SCORE_VALUE${NC}\n"

# 6. Test credit simulation (no auth needed)
echo -e "${YELLOW}6. Testing credit simulation...${NC}"
SIMULATION=$(curl -s -X POST "$API_URL/credito/simular" \
  -H "Content-Type: application/json" \
  -d "{
    \"valor\": 50000,
    \"prazo\": 12
  }")

MONTHLY=$(echo $SIMULATION | jq -r '.parcelaMensal // empty')
if [ -z "$MONTHLY" ]; then
  echo -e "${RED}✗ Credit simulation failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Monthly payment: $MONTHLY${NC}\n"

echo -e "${GREEN}All tests passed!${NC}"
```

**Run the test:**
```bash
chmod +x e2e_test.sh
./e2e_test.sh
```

---

## Manual Testing Checklist

- [ ] User can register with valid CPF
- [ ] User cannot register with invalid CPF
- [ ] Login sets httpOnly access_token cookie
- [ ] Logout revokes refresh token
- [ ] Dashboard loads with real data (not mocks)
- [ ] Obra creation generates exactly 9 stages
- [ ] Evidence upload validates GPS distance
- [ ] Manager can approve stage
- [ ] BullMQ processes installment release
- [ ] Credit balance increases after approval
- [ ] Score updates after stage completion
- [ ] Payment schedule sums correctly
- [ ] Mobile GPS validation shows live feedback
- [ ] Evidence photos upload to S3
- [ ] KYC status reflects in profile
- [ ] Mobile app survives navigation stack
- [ ] Web app handles offline gracefully
- [ ] Token refresh extends session
- [ ] Cross-origin requests work (CORS)

---

## Troubleshooting

### "Etapa não encontrada"
- Check if etapaId is spelled correctly
- Verify etapa belongs to user's obra
- Check database: `SELECT * FROM "EtapaObra" WHERE etapaId = 'xxx';`

### "Etapa não está aguardando vistoria"
- Etapa must have status = `AGUARDANDO_VISTORIA`
- First stage should be in this state after obra creation

### "Etapa precisa ter ao menos uma evidência validada"
- Evidence must have `validada = true`
- Manager must approve evidence before approving stage

### No BullMQ job processing
- Check Redis is running: `redis-cli ping`
- Check worker logs: `tail -f logs/worker.log`
- Verify QUEUE_LIBERACAO constant is exported

### Score not updating
- Run: `SELECT * FROM "ScoreHistorico" WHERE "usuarioId" = 'xxx';`
- Score calculation happens when `/score/atual` is called
- Only reflects completed stages with payment

---

## Performance Baselines

Set these as targets for optimization:

| Operation | Target | Current |
|-----------|--------|---------|
| Load dashboard | < 2s | ? |
| Create obra | < 1s | ? |
| List 50 obras | < 500ms | ? |
| Approve stage | < 500ms | ? |
| Calculate score | < 300ms | ? |
| Upload evidence | < 5s | ? |
| Payment schedule calc | < 200ms | ? |
| Mobile app startup | < 3s | ? |

---

## Load Testing (Artillery)

```yaml
# load-test.yml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 60
      arrivalRate: 25
      name: "Ramp up"
    - duration: 60
      arrivalRate: 50
      name: "Sustained"

scenarios:
  - name: "Typical user session"
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "test@example.com"
            senha: "password123"
          capture:
            json: "$.accessToken"
            as: "token"
      - get:
          url: "/api/v1/obras"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/v1/score/atual"
          headers:
            Authorization: "Bearer {{ token }}"
```

**Run:**
```bash
artillery run load-test.yml
```
