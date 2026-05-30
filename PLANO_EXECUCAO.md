# PLANO DE EXECUÇÃO: Landing → Backend → Dashboard

## ✅ FEITO (Frontend)

### Landing Page
- [x] Hero com pitch deck colors (#30D158, #0052CC, #0f172a)
- [x] 11 seções (jornada, diferenciais, produtos, segurança, FAQ, etc)
- [x] Navbar com CTA
- [x] Responsive design

### Simulador
- [x] `POST /api/simulador` - Calcula: valor máx, parcelas, taxa, juros
- [x] Frontend form com inputs: valor, tipo obra, prazo
- [x] Resultado renderizado em tempo real

### Cadastro (KYC)
- [x] Página `(auth)/cadastro` - integrada com backend NestJS
- [x] `POST /api/kyc` stub para referência
- [x] Middleware permite acesso público

### Dashboard
- [x] `(dashboard)/home` - dashboard home (redireciona após login)
- [x] `(dashboard)/obras-list` - lista obras com progresso
- [x] `GET/POST /api/obras` stub endpoints

---

## ⏳ A FAZER (Por ordem)

### FASE 1: Backend NestJS (Crítico)
1. **Schemas Zod** (`@imbobi/schemas`)
   - Validar: SimuladorInput, KYCInput, ObraInput, UsuarioInput
   
2. **Prisma ORM**
   - Migração: Usuario, Obra, Parcela, KYC
   - Indexes: GPS (PostGIS), CNPJ, email
   
3. **NestJS Controllers** (`services/api/src`)
   - `auth.controller` - POST /registrar, /login, /refresh
   - `simulador.controller` - POST /calcular
   - `obras.controller` - GET /, POST /, GET /:id
   - `parcelas.controller` - GET /, POST /liberar
   
4. **Services & Business Logic**
   - `auth.service` - JWT token, bcrypt password
   - `simulador.service` - LTV, taxa, cálculo amortização
   - `obras.service` - CRUD + GPS validation
   - `parcelas.service` - Async liberação via BullMQ

5. **Middleware**
   - JwtAuthGuard para rotas privadas
   - CORS configurado para frontend

### FASE 2: Frontend → Backend Integration
1. **apiClient setup** (`@imbobi/core`)
   - Axios instance com auth headers
   - Erro handling
   
2. **Update Frontend APIs**
   - `POST /api/simulador` → chama `POST /api/backend/simulador`
   - `POST /api/kyc` → chama `POST /api/backend/auth/registrar`
   - `GET /api/obras` → chama `GET /api/backend/obras`
   
3. **Pages Integration**
   - Simulador: chama backend em vez de local
   - Cadastro: já usa backend ✓
   - Obras: chama backend em vez de stub
   
4. **Auth Flow**
   - Login: recebe JWT → localStorage
   - Headers: adiciona Authorization: Bearer token
   - Refresh: automático quando expira

### FASE 3: Funcionalidades Críticas
1. **Enviar Fotos (com GPS)**
   - Page: `(dashboard)/enviar-fotos`
   - API: `POST /api/backend/fotos` (multipart)
   - Backend: PostGIS validation, geovalidação
   - Workers: BullMQ processa IA analysis
   
2. **Liberação de Parcelas**
   - Trigger: IA aprova fotos + etapa completa
   - BullMQ Worker: calcula valor, libera na conta
   - Webhook: notifica usuario
   
3. **Dashboard com Dados Reais**
   - Crédito disponível (do banco)
   - Obras com status real
   - Próximos passos personalizados
   - Timeline de parcelas

### FASE 4: Personas (Admin, Engenheiro, Comercial)
1. **Admin Dashboard** - Painel de risco, operações, auditoria
2. **Engenheiro Dashboard** - Análise de fotos, geovalidação
3. **Comercial Dashboard** - Funil, leads, conversão

---

## DEPENDÊNCIAS

```
Landing Page (✓)
├── Simulador (✓)
│   └── POST /api/simulador (✓ front, ⏳ backend)
├── Cadastro (✓ front, ⏳ backend KYC)
│   └── JWT Auth (⏳ backend)
└── Obras (✓ front, ⏳ backend CRUD)
    └── Geovalidação (⏳ PostGIS + IA)
        └── Liberação de Parcelas (⏳ BullMQ)
```

---

## ESTIMATIVA DE TOKENS

| Fase | Tarefa | Tokens |
|------|--------|--------|
| 1 | Schemas + Prisma | 200 |
| 1 | Controllers + Services | 400 |
| 1 | Auth + Middleware | 250 |
| 2 | apiClient setup | 100 |
| 2 | Integration endpoints | 300 |
| 3 | Fotos + GPS | 350 |
| 3 | BullMQ + Parcelas | 300 |
| 4 | Admin/Eng/Com dashboards | 500 |
| **TOTAL** | | **2400** |

---

## PRÓXIMO PASSO RECOMENDADO

**Começar FASE 1.1**: Schemas Zod na pasta `@imbobi/schemas`
- Rápido (50 tokens)
- Define contrato entre frontend/backend
- Desbloqueia resto da arquitetura

Confirma?
