# imobi - Jornadas de Usuário & Camadas

## 1️⃣ TOMADOR (Cliente Tomador de Crédito)

```
TOMADOR - Construtora/Mutuário
├── WEB (Next.js)
│   ├── (auth)
│   │   ├── /login
│   │   ├── /cadastro
│   │   └── /termos
│   │
│   └── (dashboard)
│       ├── /dashboard (home)
│       ├── /dashboard/construtor (portal principal)
│       │   ├── Minhas obras
│       │   ├── Etapas (enviar evidências)
│       │   ├── Crédito (saldo, simulador)
│       │   └── Score (construtibilidade)
│       ├── /dashboard/obras/[id]
│       │   ├── Detalhes obra
│       │   ├── Upload fotos (GPS validado)
│       │   └── Status etapas
│       ├── /dashboard/credito
│       │   ├── Simulador
│       │   ├── Contratação
│       │   └── Extrato
│       ├── /dashboard/kyc
│       │   └── Upload documentos
│       └── /dashboard/perfil
│           └── Editar dados, LGPD
│
├── MOBILE (Expo)
│   ├── (auth)
│   │   ├── /login
│   │   └── /register
│   │
│   └── (tabs)
│       ├── /obras
│       │   ├── Lista obras
│       │   ├── /obras/[id] (detalhe)
│       │   └── Camera + GPS (evidência)
│       ├── /credito
│       │   └── Saldo + info
│       └── /perfil
│           └── Logout
│
├── API (NestJS) - Endpoints chamados
│   ├── POST /auth/registrar
│   ├── POST /auth/login
│   ├── GET /usuarios/me
│   ├── PATCH /usuarios/[id]
│   ├── GET /obras (minhas obras)
│   ├── POST /obras
│   ├── GET /obras/[id]
│   ├── GET /etapas?obraId=X
│   ├── POST /evidencias (upload foto)
│   ├── GET /credito/disponivel
│   ├── POST /credito/solicitar
│   ├── GET /score/meu
│   ├── POST /kyc/upload
│   ├── GET /notificacoes
│   └── DELETE /usuarios/[id] (LGPD)
│
└── SYSTEMS (Workers/Background)
    ├── 📧 Notificações (push, email)
    ├── 📊 Cálculo de Score
    ├── 💳 Liberação de Parcela (BullMQ)
    └── 🔍 Validação PostGIS (GPS)
```

---

## 2️⃣ GESTOR / ADMIN (Gerenciador / Administrador)

```
GESTOR/ADMIN - Aprovador
├── WEB (Next.js)
│   ├── (auth)
│   │   └── /login
│   │
│   └── (dashboard)
│       ├── /dashboard (home)
│       ├── /dashboard/gestor (painel principal)
│       │   ├── Fila de Etapas
│       │   ├── Fila de KYC
│       │   ├── Estatísticas
│       │   └── Auditoria
│       ├── /dashboard/gestor/etapas
│       │   ├── Lista (filtro: status, data, tipo obra)
│       │   └── /etapas/[id]
│       │       ├── Fotos de evidência
│       │       ├── Validação GPS
│       │       ├── Botão Aprovar/Rejeitar
│       │       └── Audit log
│       ├── /dashboard/gestor/kyc
│       │   ├── Lista documentos pendentes
│       │   └── /kyc/[id]
│       │       ├── Validar documento
│       │       ├── Aprovar/Rejeitar
│       │       └── Motivo rejeição
│       └── /dashboard/perfil
│           └── Editar dados
│
├── MOBILE
│   └── ❌ Não tem acesso (web-only role)
│
├── API (NestJS) - Endpoints chamados
│   ├── POST /auth/login
│   ├── GET /usuarios/me
│   ├── GET /manager/dashboard (stats)
│   ├── GET /manager/etapas/pendentes
│   ├── PATCH /etapas/[id]/aprovar
│   ├── PATCH /etapas/[id]/rejeitar
│   ├── GET /manager/kyc/pendentes
│   ├── PATCH /kyc/[id]/aprovar
│   ├── PATCH /kyc/[id]/rejeitar
│   ├── GET /manager/auditoria (logs)
│   └── PATCH /usuarios/[id]
│
└── SYSTEMS (Workers/Background)
    ├── 📧 Notificação (etapa aprovada/rejeitada)
    ├── 📊 Atualizar status obra
    └── 🔔 Alert de fila crítica
```

---

## 3️⃣ ENGENHEIRO (Inspetor de Campo)

```
ENGENHEIRO - Field Inspector
├── WEB (Next.js)
│   ├── (auth)
│   │   └── /login
│   │
│   └── (dashboard)
│       ├── /dashboard (home)
│       ├── /dashboard/engenheiro (fila de visitas)
│       │   ├── Lista agendadas/pendentes
│       │   └── /dashboard/engenheiro/[visitaId]
│       │       ├── Endereço obra (mapa)
│       │       ├── Botão "Iniciar visita"
│       │       ├── Câmera (verificação)
│       │       ├── Checklist etapas
│       │       ├── Botão "Concluir"
│       │       └── Status: agendada → iniciada → concluída
│       └── /dashboard/perfil
│           └── Logout
│
├── MOBILE (Expo)
│   ├── (auth)
│   │   └── /login
│   │
│   └── (tabs)
│       ├── /obras (minhas visitas)
│       │   ├── Lista agendadas
│       │   └── /obras/[visitaId]
│       │       ├── Mapa + endereço
│       │       ├── Câmera
│       │       └── Checkboxes status
│       └── /perfil
│           └── Logout
│
├── API (NestJS) - Endpoints chamados
│   ├── POST /auth/login
│   ├── GET /usuarios/me
│   ├── GET /vistoria/minhas (agendadas para mim)
│   ├── GET /vistoria/[id]
│   ├── PATCH /vistoria/[id]/iniciar
│   ├── POST /vistoria/[id]/evidencia (foto)
│   ├── GET /vistoria/[id]/etapas (checklist)
│   ├── PATCH /vistoria/[id]/concluir
│   └── GET /notificacoes
│
└── SYSTEMS (Workers/Background)
    ├── 📧 Notificação (visita agendada)
    ├── 🗺️ Validação GPS (local correto)
    └── 📊 Atualizar status visita
```

---

## 🏗️ Camadas Compartilhadas (Todas usam)

```
PACKAGES (Compartilhadas)
├── @imbobi/schemas (Zod)
│   ├── usuario.schema.ts (tipo: TOMADOR, GESTOR_OBRA, ADMIN, ENGENHEIRO)
│   ├── obra.schema.ts
│   ├── etapa.schema.ts
│   ├── evidencia.schema.ts
│   ├── credito.schema.ts
│   └── vistoria.schema.ts
│
├── @imbobi/core
│   ├── hooks/
│   │   ├── useObra()
│   │   ├── useCredito()
│   │   ├── useGeoValidation() ← GPS
│   │   └── useAuth()
│   ├── services/ (api-client)
│   │   ├── fetch wrapper (JWT auth)
│   │   └── queries (CRUD)
│   └── utils/
│       ├── formatBRL()
│       ├── formatCPF()
│       └── haversine() ← GPS calc
│
├── @imbobi/ui
│   ├── web/ (shadcn)
│   │   ├── Button, Input, Dialog, etc
│   │   └── Componentes customizados
│   └── native/ (React Native)
│       └── Equivalentes mobile
│
└── DATABASE (Prisma)
    └── postgresql + PostGIS
        ├── usuario (usuarioId, tipo, kycStatus)
        ├── obra (endereco, geometry)
        ├── etapa (status, dataEsperada)
        ├── evidencia (foto, geopoint)
        ├── credito (saldo, limite)
        └── vistoria (dataAgendada, status)
```

---

## 📍 Fluxos Críticos

### TOMADOR: Solicitar Crédito
```
1. Mobile/Web: Cria Obra (nome, endereço)
   └─ API: POST /obras + Prisma save
      └─ Google Maps geocode → PostGIS geometry

2. Mobile: Tira foto + GPS
   └─ API: POST /evidencias (valida PostGIS)
      └─ Upload S3 + salva referência

3. Web: Marca etapa como concluída
   └─ API: PATCH /etapas/[id]/concluir
      └─ BullMQ: notifica GESTOR

4. GESTOR aprova
   └─ API: PATCH /etapas/[id]/aprovar
      └─ BullMQ: liberacao-parcela.worker.ts
         └─ Libera crédito (async)
```

### GESTOR: Revisar Etapa
```
1. Web: /dashboard/gestor/etapas
   └─ API: GET /manager/etapas/pendentes
      └─ Retorna obra + foto + GPS validado

2. Clica em etapa
   └─ API: GET /etapas/[id]
      └─ Mostra evidências + audit log

3. Clica Aprovar
   └─ API: PATCH /etapas/[id]/aprovar
      └─ Prisma update + BullMQ event
         └─ Notifica TOMADOR
         └─ Inicia liberação parcela
```

### ENGENHEIRO: Fazer Vistoria
```
1. Mobile: Vê lista agendadas
   └─ API: GET /vistoria/minhas
      └─ Mostra endereço + horário

2. Clica "Iniciar Visita"
   └─ API: PATCH /vistoria/[id]/iniciar
      └─ Valida GPS (está no local correto?)
         └─ PostGIS + haversine

3. Tira fotos + marca etapas
   └─ API: POST /vistoria/[id]/evidencia
      └─ S3 upload

4. Clica "Concluir"
   └─ API: PATCH /vistoria/[id]/concluir
      └─ BullMQ: Notifica GESTOR
```

---

## 🔐 Validações em Cada Camada

| Validação | Schemas | API Guard | Prisma | PostGIS |
|-----------|---------|-----------|--------|---------|
| Tipo usuário | ✅ Zod | ✅ JwtAuthGuard + RoleGuard | - | - |
| Dados entrada | ✅ Zod | ✅ Pipe ValidationPipe | - | - |
| GPS correto | - | ✅ POST /evidencias | - | ✅ ST_Distance |
| Autorização | - | ✅ CanApproveGuard | ✅ userId check | - |
| LGPD | - | ✅ DELETE /usuarios | ✅ Cascade | - |

