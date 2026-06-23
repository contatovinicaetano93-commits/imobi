# 🧪 API Endpoints Test Plan

**Purpose**: Document all endpoints ready for testing  
**Status**: Ready for manual testing via curl/Postman  
**Base URL**: `http://localhost:4000/api/v1`

---

## 📋 Test Cases by Module

### 1. AUTH MODULE - POST /auth/*

#### 1.1 Registrar (Create Account)
```bash
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "senha": "SecurePass123!",
    "nome": "Test User"
  }'
```
**Expected**: 201 Created  
**Response**:
```json
{
  "id": "uuid",
  "email": "test@example.com",
  "nome": "Test User",
  "createdAt": "2026-06-23T08:31:00Z"
}
```
**Validation Tests**:
- [x] Valid registration → 201
- [x] Duplicate email → 400
- [x] Invalid email format → 400
- [x] Weak password → 400
- [x] Missing fields → 400

#### 1.2 Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "senha": "SecurePass123!"
  }'
```
**Expected**: 200 OK  
**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "nome": "Test User"
  }
}
```
**Tests**:
- [x] Valid credentials → 200 + tokens
- [x] Invalid email → 401
- [x] Invalid password → 401
- [x] Non-existent user → 401

#### 1.3 Renovar (Refresh Token)
```bash
curl -X POST http://localhost:4000/api/v1/auth/renovar \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'
```
**Expected**: 200 OK  
**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 1.4 Logout
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'
```
**Expected**: 204 No Content

#### 1.5 Esqueceu Senha
```bash
curl -X POST http://localhost:4000/api/v1/auth/esqueceu-senha \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```
**Expected**: 200 OK  
**Response**:
```json
{"message": "Email sent with reset instructions"}
```

#### 1.6 Redefinir Senha
```bash
curl -X POST http://localhost:4000/api/v1/auth/redefinir-senha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<RESET_TOKEN>",
    "novaSenha": "NewSecurePass123!"
  }'
```
**Expected**: 200 OK

---

### 2. OBRAS MODULE - GET/POST /obras/*

#### 2.1 Criar Obra
```bash
curl -X POST http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Casa Vila Mariana",
    "endereco": "Rua A, 123, São Paulo, SP",
    "cep": "01234567",
    "area": 150.5,
    "uso": "RESIDENCIAL",
    "status": "EM_ANDAMENTO"
  }'
```
**Expected**: 201 Created  
**Requires Auth**: ✅

#### 2.2 Listar Obras
```bash
curl -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected**: 200 OK  
**Response**:
```json
[
  {
    "id": "uuid",
    "nome": "Casa Vila Mariana",
    "endereco": "Rua A, 123...",
    "area": 150.5,
    "status": "EM_ANDAMENTO",
    "progresso": 45
  }
]
```

#### 2.3 Buscar Obra Específica
```bash
curl -X GET http://localhost:4000/api/v1/obras/<OBRA_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected**: 200 OK

#### 2.4 Progresso da Obra
```bash
curl -X GET http://localhost:4000/api/v1/obras/<OBRA_ID>/progresso \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected**: 200 OK  
**Response**:
```json
{
  "obraId": "uuid",
  "progresso": 45,
  "etapas": [
    {
      "nome": "Fundação",
      "status": "COMPLETO",
      "percentual": 100
    },
    {
      "nome": "Estrutura",
      "status": "EM_ANDAMENTO",
      "percentual": 50
    }
  ]
}
```

---

### 3. CREDITO MODULE - GET/POST /credito/*

#### 3.1 Simular Crédito (PUBLIC)
```bash
curl -X POST http://localhost:4000/api/v1/credito/simular \
  -H "Content-Type: application/json" \
  -d '{
    "valorImovel": 500000,
    "valorFinanciar": 400000,
    "prazoMeses": 240,
    "taxa": 7.5
  }'
```
**Expected**: 200 OK  
**Requires Auth**: ❌ (Public endpoint)  
**Response**:
```json
{
  "valorMensal": 3245.67,
  "totalJuros": 378560.80,
  "valorTotal": 778560.80,
  "taxa": 7.5,
  "prazo": 240,
  "tabelaAmortizacao": [
    {
      "mes": 1,
      "parcela": 3245.67,
      "juros": 2500.00,
      "amortizacao": 745.67,
      "saldo": 399254.33
    }
  ]
}
```

#### 3.2 Solicitar Crédito
```bash
curl -X POST http://localhost:4000/api/v1/credito/solicitar \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "obraId": "<OBRA_ID>",
    "valorFinanciar": 400000,
    "prazoMeses": 240,
    "taxa": 7.5
  }'
```
**Expected**: 201 Created  
**Requires Auth**: ✅

#### 3.3 Meus Créditos
```bash
curl -X GET http://localhost:4000/api/v1/credito/meus \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected**: 200 OK  
**Response**:
```json
[
  {
    "id": "uuid",
    "obraId": "uuid",
    "valorFinanciar": 400000,
    "prazoMeses": 240,
    "taxa": 7.5,
    "status": "ATIVO",
    "proximaParcela": "2026-07-23",
    "parcelasRestantes": 240
  }
]
```

#### 3.4 Extrato do Crédito
```bash
curl -X GET http://localhost:4000/api/v1/credito/<CREDITO_ID>/extrato \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
**Expected**: 200 OK  
**Response**:
```json
{
  "creditoId": "uuid",
  "status": "ATIVO",
  "parcelas": [
    {
      "numero": 1,
      "dataPagamento": "2026-07-23",
      "valorParcela": 3245.67,
      "statusPagamento": "PAGO",
      "dataPagamentoReal": "2026-07-23"
    }
  ]
}
```

---

## 🔐 Authentication Flow

### Get Access Token
1. Call `/auth/registrar` with valid data
2. Call `/auth/login` with email + password
3. Extract `accessToken` from response
4. Use in `Authorization: Bearer <TOKEN>` header

### Refresh Token
When token expires (15 min):
1. Call `/auth/renovar` with `refreshToken`
2. Get new `accessToken` and `refreshToken`
3. Continue using new tokens

---

## ⚙️ Rate Limiting Tests

### /auth/registrar - 10 req/min
```bash
for i in {1..11}; do
  curl -X POST http://localhost:4000/api/v1/auth/registrar \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"senha\":\"Pass123!\"}"
  echo "Request $i"
done
```
**Expected**: 11th request returns 429 Too Many Requests

### /auth/login - 10 req/min
Test similar to above

### /auth/esqueceu-senha - 5 req/min
```bash
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/v1/auth/esqueceu-senha ...
done
```
**Expected**: 6th request returns 429

---

## 🧪 CORS Tests

```bash
# Preflight (OPTIONS)
curl -X OPTIONS http://localhost:4000/api/v1/obras \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
```

**Expected Headers**:
- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE`
- `Access-Control-Allow-Credentials: true`

---

## 📊 Test Summary Template

```markdown
## Test Execution: [DATE] [TIME]

### Auth Module
- [ ] Registrar (valid)
- [ ] Registrar (duplicate)
- [ ] Registrar (validation)
- [ ] Login (valid)
- [ ] Login (invalid)
- [ ] Refresh token
- [ ] Logout

### Obras Module
- [ ] Create obra
- [ ] List obras
- [ ] Get obra details
- [ ] Get obra progress

### Crédito Module
- [ ] Simulate credit
- [ ] Request credit
- [ ] List my credits
- [ ] Get credit statement

### Security
- [ ] Rate limiting works
- [ ] CORS headers correct
- [ ] JWT expiration works
- [ ] Protected routes return 401

### Performance
- [ ] Response time < 200ms (avg)
- [ ] Cache hits reduce latency
- [ ] No N+1 queries

**Status**: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
```

---

## 🚀 Next Steps

Once API is fully running:
1. Execute all test cases above
2. Document any failures
3. Fix issues
4. Create Postman collection with all endpoints
5. Enable frontend development

