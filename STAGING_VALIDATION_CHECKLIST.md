# Checklist de Validação Staging - imbobi

## 📋 Visão Geral

Este documento lista todos os testes funcionais que devem ser validados após deploy de staging. Cada item inclui passos para testar e critérios de sucesso.

**Tempo estimado:** 45-60 minutos  
**Executado por:** QA / Tech Lead  
**Data:** _________________  
**Responsável:** _________________

---

## ✅ Seção 1: Infraestrutura & Health Checks

### 1.1 API Health Check

**Objetivo:** Validar que a API NestJS está rodando corretamente

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/health
```

**Esperado:**
```json
{
  "status": "ok",
  "timestamp": "2024-05-28T...",
  "environment": "staging",
  "uptime": 123.45
}
```

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 1.2 Database Connection

**Objetivo:** Validar conexão com PostgreSQL + PostGIS

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/health/database
```

**Esperado:**
- HTTP 200
- Resposta indicando banco conectado e healthy

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 1.3 Redis Connection

**Objetivo:** Validar conexão com Redis (BullMQ)

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/health/redis
```

**Esperado:**
- HTTP 200
- Cache/Queue service respondendo

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 1.4 Docker Containers Status

**Objetivo:** Validar que todos containers estão rodando

**Teste:**
```bash
docker-compose -f docker-compose.staging.yml -p imbobi_staging ps
```

**Esperado:**
- postgres: running (healthy)
- redis: running (healthy)
- api: running
- web: running (optional)

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 1.5 Web App Loads

**Objetivo:** Validar que Next.js app carrega no navegador

**Teste:**
1. Abrir http://localhost:3000 no navegador
2. Verificar que página carrega sem erros 500
3. Inspecionar console (DevTools F12) para erros

**Esperado:**
- Página carrega com sucesso
- Sem erros críticos no console
- Sem erros 5xx no network tab

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 🔐 Seção 2: Authentication & Authorization

### 2.1 User Signup

**Objetivo:** Validar flow completo de signup

**Passos:**
1. Navegar para /signup (ou rota de registro)
2. Preencher formulário:
   - Email: `test_user_$(date +%s)@test.com`
   - Senha: `SecurePass123!`
   - Confirmar senha: `SecurePass123!`
3. Submeter formulário
4. Verificar resposta do backend

**Teste via API:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_user@test.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'
```

**Esperado:**
- HTTP 201 (Created)
- Response contém `accessToken` e `refreshToken`
- Usuário criado no banco de dados

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 2.2 User Login

**Objetivo:** Validar autenticação com JWT

**Passos:**
1. Navegar para /login
2. Inserir credenciais do usuário criado em 2.1
3. Submeter formulário

**Teste via API:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_user@test.com",
    "password": "SecurePass123!"
  }'
```

**Esperado:**
- HTTP 200 OK
- Response contém `accessToken` (JWT válido)
- Token pode ser decodificado com secret de staging

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 2.3 User Profile Access

**Objetivo:** Validar acesso a dados do usuário autenticado

**Teste via API:**
```bash
ACCESS_TOKEN="<token_do_teste_2.2>"

curl -X GET http://localhost:4000/api/v1/users/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Esperado:**
- HTTP 200
- Retorna dados do usuário (email, name, id)
- Sem Bearer token: HTTP 401 Unauthorized

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 🆔 Seção 3: KYC (Know Your Customer) Flow

### 3.1 KYC Upload Iniciado

**Objetivo:** Validar início do flow de KYC

**Teste:**
1. Usuário autenticado navega para /kyc
2. Botão "Iniciar KYC" ou "Enviar Documentos" clicável
3. Modal/página de upload abre

**Esperado:**
- Interface de upload acessível
- Sem erros 500

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 3.2 Document Upload (Mock)

**Objetivo:** Validar upload de arquivo para S3

**Passos:**
1. Na página KYC, selecionar arquivo de identidade
2. Submeter upload
3. Verificar que arquivo foi enviado

**Teste via API:**
```bash
# Gerar presigned URL
curl -X POST http://localhost:4000/api/v1/kyc/presigned-url \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-id.pdf",
    "fileType": "application/pdf"
  }'

# Response contém URL para upload
# Usar URL para fazer upload do arquivo
```

**Esperado:**
- HTTP 200 com URL presigned
- Upload bem-sucedido para S3 (ou mock S3)
- Arquivo salvo no bucket correto

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 3.3 KYC Status Tracking

**Objetivo:** Validar que status de KYC é atualizado

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/users/kyc-status \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Esperado:**
- HTTP 200
- Status em: pending, reviewing, approved, rejected
- Timestamp de submissão

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 💰 Seção 4: Credit Simulation & Financial Features

### 4.1 Credit Simulation API

**Objetivo:** Validar cálculo de simulação de crédito

**Teste via API:**
```bash
curl -X POST http://localhost:4000/api/v1/credit/simulate \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "termMonths": 12,
    "productType": "construction"
  }'
```

**Esperado:**
- HTTP 200
- Response com:
  - totalAmount
  - monthlyPayment
  - interestRate
  - fees

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 4.2 Credit Application Creation

**Objetivo:** Validar criação de aplicação de crédito

**Teste via API:**
```bash
curl -X POST http://localhost:4000/api/v1/credit/applications \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "termMonths": 12,
    "purpose": "construction_materials"
  }'
```

**Esperado:**
- HTTP 201 (Created)
- Application ID retornado
- Status: "pending_analysis"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 🏗️ Seção 5: Obra (Project) Management

### 5.1 Obra Creation

**Objetivo:** Validar criação de uma obra/projeto

**Teste via API:**
```bash
curl -X POST http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reforma Casa Teste",
    "address": "Rua Teste 123, SP",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "estimatedBudget": 100000,
    "description": "Reforma de fachada"
  }'
```

**Esperado:**
- HTTP 201
- Obra criada com ID
- GPS coordinates validadas (PostGIS)
- Status: "draft"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 5.2 Obra List & Details

**Objetivo:** Validar leitura de obras

**Teste via API:**
```bash
# Listar todas as obras
curl -X GET http://localhost:4000/api/v1/obras \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Detalhes de uma obra
OBRA_ID="<id_from_5.1>"
curl -X GET http://localhost:4000/api/v1/obras/$OBRA_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Esperado:**
- HTTP 200
- Array de obras ou objeto único
- Paginação funcionando se array

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 📸 Seção 6: Evidence Upload com GPS Validation

### 6.1 Evidence Upload (Front-end Validation)

**Objetivo:** Validar que cliente valida GPS antes de upload

**Passos:**
1. Navegar para /obras/{id}/evidences
2. Tentar enviar foto:
   - Com GPS ativado: Deve aceitar
   - Sem GPS/GPS falso: Deve rejeitar com mensagem clara

**Esperado:**
- Client-side validation funciona
- Mensagem de erro clara se GPS inválido

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 6.2 Evidence Upload (Server-side Validation)

**Objetivo:** Validar que servidor rejeita GPS inválido

**Teste via API:**
```bash
# Tentar enviar evidence com GPS inválido
curl -X POST http://localhost:4000/api/v1/obras/$OBRA_ID/evidences \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://...",
    "latitude": 999,  # Inválido (fora de range)
    "longitude": 999,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

**Esperado:**
- HTTP 400 ou 422 (Unprocessable Entity)
- Erro message claro: "Invalid GPS coordinates"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 6.3 Evidence Upload (Válido)

**Objetivo:** Validar upload bem-sucedido de evidence

**Teste via API:**
```bash
# Upload com GPS válido
curl -X POST http://localhost:4000/api/v1/obras/$OBRA_ID/evidences \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://...",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

**Esperado:**
- HTTP 201
- Evidence ID retornado
- GPS armazenado no PostGIS

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 👥 Seção 7: Manager Dashboard Access

### 7.1 Manager Login & Authorization

**Objetivo:** Validar acesso ao painel gerencial

**Passos:**
1. Login com usuário manager (role: MANAGER)
2. Navegar para /dashboard/manager
3. Verificar que dados são visíveis

**Esperado:**
- Login bem-sucedido
- Token contém role: "MANAGER"
- Dashboard carrega

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 7.2 Manager Can View User List

**Objetivo:** Validar que manager pode listar usuários

**Teste via API:**
```bash
# Login como manager
MANAGER_TOKEN="<token_do_manager>"

curl -X GET http://localhost:4000/api/v1/admin/users \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

**Esperado:**
- HTTP 200
- Array de usuários
- Usuário sem role MANAGER: HTTP 403 Forbidden

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 7.3 Manager Can View All Obras

**Objetivo:** Validar que manager vê obras de todos usuários

**Teste via API:**
```bash
curl -X GET http://localhost:4000/api/v1/admin/obras \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

**Esperado:**
- HTTP 200
- Array com todas as obras do sistema

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 7.4 Manager Can View Analytics

**Objetivo:** Validar que manager tem acesso a analytics

**Teste via API:**
```bash
curl -X GET http://localhost:4000/api/v1/admin/analytics/dashboard \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

**Esperado:**
- HTTP 200
- Métricas de sistema (usuários, obras, aplicações, etc)

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 🔔 Seção 8: Push Notifications

### 8.1 Firebase Initialization

**Objetivo:** Validar que Firebase está configurado

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/health/firebase
```

**Esperado:**
- HTTP 200 (mesmo que Firebase credentials sejam test/disabled)
- Status: "initialized" ou "configured"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 8.2 Push Token Registration

**Objetivo:** Validar que cliente pode registrar push token

**Teste via API:**
```bash
curl -X POST http://localhost:4000/api/v1/users/push-tokens \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_token_12345",
    "platform": "web"
  }'
```

**Esperado:**
- HTTP 201
- Token armazenado no banco

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 8.3 Push Notification Trigger (Manual)

**Objetivo:** Validar que push pode ser disparado

**Passos:**
1. Manualmele disparar evento que deveria gerar push
2. Verificar que job foi enfileirado no Redis (BullMQ)
3. Verificar logs

**Teste via Redis:**
```bash
# Conectar ao Redis
redis-cli

# Ver filas
> KEYS *

# Verificar jobs em fila
> LLEN bull:notification-queue:active
```

**Esperado:**
- Fila criada
- Jobs enfileirados com sucesso

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 📧 Seção 9: Email Delivery

### 9.1 Email Service Health

**Objetivo:** Validar que serviço de email está configurado

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/health/email
```

**Esperado:**
- HTTP 200
- Status: "ok" ou "configured"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 9.2 Welcome Email on Signup

**Objetivo:** Validar que email de boas-vindas é enviado

**Passos:**
1. Fazer signup de novo usuário (veja seção 2.1)
2. Verificar logs da API:
   ```bash
   docker-compose -f docker-compose.staging.yml -p imbobi_staging logs api | grep -i email
   ```
3. Em staging, emails geralmente são logados no console (não enviados realmente)

**Esperado:**
- Log message: "Welcome email sent to ..."
- Sem erro de envio

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 9.3 Transactional Email (Credit Approval)

**Objetivo:** Validar que emails transacionais são gerados

**Teste:**
1. Criar aplicação de crédito (seção 4.2)
2. Simular aprovação (se houver endpoint)
3. Verificar logs de email

**Esperado:**
- Email notification gerada
- Sem erros de template

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 🗄️ Seção 10: Database Integrity

### 10.1 Prisma Migrations Applied

**Objetivo:** Validar que todas migrations foram aplicadas

**Teste:**
```bash
cd services/api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  pnpm prisma migrate status
```

**Esperado:**
- Output: "All migrations have been successfully applied"
- Nenhuma migration pending

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 10.2 Database Schema Valid

**Objetivo:** Validar que schema está válido no Prisma

**Teste:**
```bash
cd services/api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/imbobi_staging" \
  pnpm prisma validate
```

**Esperado:**
- Output: "✔ Your schema is valid"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 10.3 PostGIS Extension Active

**Objetivo:** Validar que extensão PostGIS está ativa

**Teste:**
```bash
docker-compose -f docker-compose.staging.yml -p imbobi_staging exec postgres psql -U postgres -d imbobi_staging -c "SELECT PostGIS_Version();"
```

**Esperado:**
- Output com versão do PostGIS (ex: "POSTGIS=3.3.0 ...")

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 🔒 Seção 11: Security Checks

### 11.1 CORS Configuration

**Objetivo:** Validar que CORS está configurado corretamente

**Teste:**
```bash
curl -X OPTIONS http://localhost:4000/api/v1/health \
  -H "Origin: http://localhost:3000" \
  -v
```

**Esperado:**
- Header `Access-Control-Allow-Origin: http://localhost:3000`
- Método OPTIONS responde 200

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 11.2 Environment Variables Not Exposed

**Objetivo:** Validar que secrets não são expostos

**Teste:**
```bash
curl http://localhost:4000/api/v1/status | jq .
```

**Esperado:**
- Nenhum secret na response (JWT_SECRET, passwords, etc)
- Apenas informações públicas

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

### 11.3 Encryption Active

**Objetivo:** Validar que dados sensíveis são encryptados

**Teste:**
```bash
curl -X GET http://localhost:4000/api/v1/health/encryption \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Esperado:**
- HTTP 200
- Status: "active" ou "configured"

**Status:** ☐ Passou | ☐ Falhou  
**Notas:** ___________________________________________________________________

---

## 📋 Resumo Final

### Seções Completadas:

- [ ] 1. Infraestrutura & Health Checks (5 itens)
- [ ] 2. Authentication & Authorization (3 itens)
- [ ] 3. KYC Flow (3 itens)
- [ ] 4. Credit Simulation (2 itens)
- [ ] 5. Obra Management (2 itens)
- [ ] 6. Evidence Upload (3 itens)
- [ ] 7. Manager Dashboard (4 itens)
- [ ] 8. Push Notifications (3 itens)
- [ ] 9. Email Delivery (3 itens)
- [ ] 10. Database Integrity (3 itens)
- [ ] 11. Security Checks (3 itens)

**Total de testes:** 42 itens

### Aprovação Final:

- **Total Passou:** _____ / 42
- **Total Falhou:** _____ / 42
- **Taxa de Sucesso:** _____%

### Problemas Encontrados:

1. ___________________________________________________________________
2. ___________________________________________________________________
3. ___________________________________________________________________

### Ações Necessárias:

- [ ] Todos testes passaram - Deploy aprovado
- [ ] Falhas menores - Contornar e reavaliar em produção
- [ ] Falhas críticas - BLOQUEAR deploy até correção

### Sign-off:

**QA Lead:** _________________________ **Data:** __________

**Tech Lead:** _________________________ **Data:** __________

**Product Manager:** _________________________ **Data:** __________

---

**Notas Adicionais:**

___________________________________________________________________

___________________________________________________________________

___________________________________________________________________

---

**Documento atualizado:** 2024-05-28  
**Versão:** 1.0
