# API Endpoints Documentation

## Base Information

- **Base URL**: `{NEXT_PUBLIC_API_URL}/api/v1`
- **Default**: `http://localhost:4000/api/v1`
- **Authentication**: JWT Bearer Token
- **Response Format**: JSON
- **Content-Type**: `application/json`

## Authentication Endpoints

### Register User
```
POST /auth/registrar
```
**No Authentication Required**

**Request Body** (Zod Schema: `CadastroUsuarioSchema`):
```json
{
  "nome": "João Silva",
  "email": "joao@example.com",
  "cpf": "12345678901",
  "telefone": "+5511999999999",
  "senha": "SenhaForte@123"
}
```

**Response** (201 Created):
```json
{
  "usuario": {
    "usuarioId": "uuid",
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipo": "construtor",
    "kycStatus": "pendente"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

---

### Login
```
POST /auth/login
```
**No Authentication Required**

**Request Body** (Zod Schema: `LoginSchema`):
```json
{
  "email": "joao@example.com",
  "senha": "SenhaForte@123"
}
```

**Response** (200 OK):
```json
{
  "usuario": {
    "usuarioId": "uuid",
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipo": "construtor"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

---

### Refresh Token
```
POST /auth/renovar
```
**No Authentication Required**

**Request Body**:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

---

### Logout
```
POST /auth/logout
```
**No Authentication Required**

**Request Body**:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response** (204 No Content)

---

## Users Endpoints

### Get My Profile
```
GET /usuarios/meu-perfil
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
{
  "usuarioId": "uuid",
  "nome": "João Silva",
  "cpf": "12345678901",
  "email": "joao@example.com",
  "telefone": "+5511999999999",
  "tipo": "construtor",
  "kycStatus": "aprovado",
  "criadoEm": "2026-05-20T10:30:00Z",
  "atualizadoEm": "2026-05-27T15:45:00Z"
}
```

---

### Update My Profile
```
PATCH /usuarios/meu-perfil
```
**Authentication**: Required (JWT Bearer)

**Request Body**:
```json
{
  "nome": "João Silva Atualizado",
  "telefone": "+5511988888888"
}
```

**Response** (200 OK):
```json
{
  "usuarioId": "uuid",
  "nome": "João Silva Atualizado",
  "cpf": "12345678901",
  "email": "joao@example.com",
  "telefone": "+5511988888888",
  "tipo": "construtor",
  "kycStatus": "aprovado",
  "criadoEm": "2026-05-20T10:30:00Z",
  "atualizadoEm": "2026-05-27T16:00:00Z"
}
```

---

## Obras (Works) Endpoints

### Create Work
```
POST /obras
```
**Authentication**: Required (JWT Bearer)

**Request Body** (Zod Schema: `CriarObraSchema`):
```json
{
  "nome": "Construção Residencial",
  "endereco": "Rua Principal, 123",
  "descricao": "Projeto residencial de 4 pavimentos",
  "geoLatitude": -23.5505,
  "geoLongitude": -46.6333,
  "raioValidacaoMetros": 50,
  "dataInicio": "2026-06-01",
  "dataFim": "2027-06-01"
}
```

**Response** (201 Created):
```json
{
  "id": "obra-uuid",
  "nome": "Construção Residencial",
  "endereco": "Rua Principal, 123",
  "status": "ativa",
  "geoLatitude": -23.5505,
  "geoLongitude": -46.6333,
  "raioValidacaoMetros": 50,
  "progresso": 0,
  "criadoEm": "2026-05-27T16:00:00Z"
}
```

---

### List My Works
```
GET /obras
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
[
  {
    "id": "obra-uuid-1",
    "nome": "Construção Residencial",
    "status": "ativa",
    "geoLatitude": -23.5505,
    "geoLongitude": -46.6333,
    "raioValidacaoMetros": 50,
    "progresso": 45,
    "credito": {
      "id": "credito-uuid",
      "valorAprovado": 500000.00,
      "valorLiberado": 250000.00,
      "status": "ativo"
    },
    "etapas": [
      {
        "id": "etapa-uuid-1",
        "nome": "Fundações",
        "ordem": 1,
        "percentualObra": 15,
        "valorLiberacao": 75000.00,
        "status": "concluida"
      }
    ]
  }
]
```

---

### Get Work Details
```
GET /obras/{id}
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Work UUID

**Response** (200 OK):
```json
{
  "id": "obra-uuid",
  "nome": "Construção Residencial",
  "endereco": "Rua Principal, 123",
  "descricao": "Projeto residencial de 4 pavimentos",
  "status": "ativa",
  "geoLatitude": -23.5505,
  "geoLongitude": -46.6333,
  "raioValidacaoMetros": 50,
  "progresso": 45,
  "dataInicio": "2026-06-01",
  "dataFim": "2027-06-01",
  "credito": {
    "id": "credito-uuid",
    "valorAprovado": 500000.00,
    "valorLiberado": 250000.00,
    "status": "ativo"
  },
  "etapas": [
    {
      "id": "etapa-uuid-1",
      "nome": "Fundações",
      "ordem": 1,
      "percentualObra": 15,
      "valorLiberacao": 75000.00,
      "status": "concluida",
      "evidencias": [
        {
          "id": "ev-uuid-1",
          "fotoUrl": "https://s3.amazonaws.com/...",
          "validada": true,
          "criadoEm": "2026-05-25T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

### Get Work Progress
```
GET /obras/{id}/progresso
```
**Authentication**: Optional (JWT Bearer recommended)

**Path Parameters**:
- `id` (string, required): Work UUID

**Response** (200 OK):
```json
{
  "progresso": 45
}
```

---

## Stages (Etapas) Endpoints

### List Stages by Work
```
GET /etapas/obra/{obraId}
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `obraId` (string, required): Work UUID

**Response** (200 OK):
```json
[
  {
    "id": "etapa-uuid-1",
    "nome": "Fundações",
    "ordem": 1,
    "percentualObra": 15,
    "valorLiberacao": 75000.00,
    "status": "concluida",
    "evidencias": [
      {
        "id": "ev-uuid-1",
        "fotoUrl": "https://s3.amazonaws.com/...",
        "validada": true,
        "criadoEm": "2026-05-25T10:00:00Z"
      }
    ]
  }
]
```

---

### Approve Stage
```
PATCH /etapas/{id}/aprovar
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Stage UUID

**Request Body**:
```json
{
  "observacao": "Etapa aprovada conforme especificações"
}
```

**Response** (200 OK):
```json
{
  "id": "etapa-uuid-1",
  "nome": "Fundações",
  "status": "aprovada",
  "aprovedoEm": "2026-05-27T16:00:00Z",
  "observacao": "Etapa aprovada conforme especificações"
}
```

---

### Update Stage Status
```
PATCH /etapas/{id}/status
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Stage UUID

**Request Body**:
```json
{
  "status": "em_andamento"
}
```

**Response** (200 OK):
```json
{
  "id": "etapa-uuid-1",
  "nome": "Fundações",
  "status": "em_andamento",
  "atualizadoEm": "2026-05-27T16:00:00Z"
}
```

---

## Evidence (Evidências) Endpoints

### Upload Evidence
```
POST /evidencias
```
**Authentication**: Required (JWT Bearer)

**Request Body**:
```json
{
  "etapaId": "etapa-uuid-1",
  "fotoUrl": "https://s3.amazonaws.com/...",
  "latCaptura": -23.5505,
  "lngCaptura": -46.6333,
  "accuracyMetros": 10
}
```

**Response** (201 Created):
```json
{
  "id": "ev-uuid-1",
  "etapaId": "etapa-uuid-1",
  "fotoUrl": "https://s3.amazonaws.com/...",
  "latCaptura": -23.5505,
  "lngCaptura": -46.6333,
  "accuracyMetros": 10,
  "distanciaObra": 5,
  "validada": false,
  "criadoEm": "2026-05-27T16:00:00Z"
}
```

---

### List Evidence by Stage
```
GET /evidencias/etapa/{etapaId}
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `etapaId` (string, required): Stage UUID

**Response** (200 OK):
```json
[
  {
    "id": "ev-uuid-1",
    "fotoUrl": "https://s3.amazonaws.com/...",
    "latCaptura": -23.5505,
    "lngCaptura": -46.6333,
    "accuracyMetros": 10,
    "distanciaObra": 5,
    "validada": true,
    "observacao": "Validado com sucesso",
    "criadoEm": "2026-05-25T10:00:00Z"
  }
]
```

---

### Validate Evidence
```
PATCH /evidencias/{id}/validar
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Evidence UUID

**Request Body**:
```json
{
  "aprovado": true,
  "observacao": "Foto clara e dentro do geofence"
}
```

**Response** (200 OK):
```json
{
  "id": "ev-uuid-1",
  "fotoUrl": "https://s3.amazonaws.com/...",
  "validada": true,
  "aprovado": true,
  "observacao": "Foto clara e dentro do geofence",
  "validadoPor": "manager-uuid",
  "validadoEm": "2026-05-27T16:00:00Z"
}
```

---

## KYC (Know Your Customer) Endpoints

### Upload Document
```
POST /kyc/upload
```
**Authentication**: Required (JWT Bearer)

**Request Body**:
```json
{
  "tipo": "rg",
  "url": "https://s3.amazonaws.com/..."
}
```

**Response** (201 Created):
```json
{
  "kycDocumentoId": "kyc-doc-uuid",
  "usuarioId": "user-uuid",
  "tipo": "rg",
  "url": "https://s3.amazonaws.com/...",
  "status": "pendente",
  "criadoEm": "2026-05-27T16:00:00Z"
}
```

---

### List My Documents
```
GET /kyc/documentos
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
[
  {
    "kycDocumentoId": "kyc-doc-uuid-1",
    "tipo": "rg",
    "url": "https://s3.amazonaws.com/...",
    "status": "aprovado",
    "analisadoEm": "2026-05-27T16:00:00Z",
    "criadoEm": "2026-05-25T10:00:00Z"
  }
]
```

---

### Get KYC Status
```
GET /kyc/status
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
{
  "usuarioId": "user-uuid",
  "status": "aprovado",
  "documentos": [
    {
      "kycDocumentoId": "kyc-doc-uuid-1",
      "tipo": "rg",
      "url": "https://s3.amazonaws.com/...",
      "status": "aprovado",
      "analisadoEm": "2026-05-27T16:00:00Z",
      "criadoEm": "2026-05-25T10:00:00Z"
    }
  ],
  "resumo": {
    "pendentes": 0,
    "aprovados": 3,
    "rejeitados": 0
  }
}
```

---

### Verify Complete KYC
```
GET /kyc/verificar
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
{
  "completo": true,
  "documentos": [
    {
      "kycDocumentoId": "kyc-doc-uuid-1",
      "tipo": "rg",
      "status": "aprovado"
    }
  ]
}
```

---

### List Pending Documents (Manager Only)
```
GET /kyc/pendentes
```
**Authentication**: Required (JWT Bearer - Manager)

**Response** (200 OK):
```json
[
  {
    "kycDocumentoId": "kyc-doc-uuid",
    "tipo": "rg",
    "url": "https://s3.amazonaws.com/...",
    "criadoEm": "2026-05-27T16:00:00Z",
    "usuario": {
      "usuarioId": "user-uuid",
      "nome": "João Silva",
      "email": "joao@example.com",
      "cpf": "12345678901",
      "kycStatus": "pendente"
    }
  }
]
```

---

### Approve Document (Manager Only)
```
PATCH /kyc/{id}/aprovar
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): KYC Document UUID

**Response** (200 OK):
```json
{
  "kycDocumentoId": "kyc-doc-uuid",
  "status": "aprovado",
  "analisadoPor": "manager-uuid",
  "analisadoEm": "2026-05-27T16:00:00Z"
}
```

---

### Reject Document (Manager Only)
```
PATCH /kyc/{id}/rejeitar
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): KYC Document UUID

**Request Body**:
```json
{
  "motivo": "Documento ilegível, por favor reenvie"
}
```

**Response** (200 OK):
```json
{
  "kycDocumentoId": "kyc-doc-uuid",
  "status": "rejeitado",
  "motivo": "Documento ilegível, por favor reenvie",
  "analisadoPor": "manager-uuid",
  "analisadoEm": "2026-05-27T16:00:00Z"
}
```

---

## Credit (Crédito) Endpoints

### Simulate Credit
```
POST /credito/simular
```
**No Authentication Required**

**Request Body** (Zod Schema: `SimulacaoCreditoSchema`):
```json
{
  "valorSolicitado": 250000.00,
  "prazoMeses": 24,
  "tipoObra": "residencial"
}
```

**Response** (200 OK):
```json
{
  "valorSolicitado": 250000.00,
  "taxaMensal": 1.5,
  "prazoMeses": 24,
  "valorTotal": 276500.00,
  "parcela": 11520.83,
  "score_necessario": 600,
  "documentos_necessarios": ["rg", "cpf"]
}
```

---

### Request Credit
```
POST /credito/solicitar
```
**Authentication**: Required (JWT Bearer)

**Request Body** (Zod Schema: `SolicitacaoCreditoSchema`):
```json
{
  "valorSolicitado": 250000.00,
  "prazoMeses": 24,
  "obraId": "obra-uuid",
  "tipoObra": "residencial"
}
```

**Response** (201 Created):
```json
{
  "id": "credito-uuid",
  "usuarioId": "user-uuid",
  "obraId": "obra-uuid",
  "valorSolicitado": 250000.00,
  "valorAprovado": 250000.00,
  "valorLiberado": 0.00,
  "taxaMensal": 1.5,
  "prazoMeses": 24,
  "status": "aprovado",
  "dataAprovacao": "2026-05-27T16:00:00Z",
  "dataVencimento": "2028-05-27T16:00:00Z",
  "criadoEm": "2026-05-27T16:00:00Z"
}
```

---

### Get My Credits
```
GET /credito/meus
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
[
  {
    "id": "credito-uuid",
    "valorAprovado": 250000.00,
    "valorLiberado": 125000.00,
    "taxaMensal": 1.5,
    "prazoMeses": 24,
    "status": "ativo",
    "dataAprovacao": "2026-05-27T16:00:00Z",
    "dataVencimento": "2028-05-27T16:00:00Z",
    "obras": [
      {
        "id": "obra-uuid",
        "nome": "Construção Residencial",
        "status": "ativa"
      }
    ],
    "liberacoes": [
      {
        "id": "lib-uuid-1",
        "valor": 125000.00,
        "status": "processada",
        "processadoEm": "2026-05-27T16:00:00Z"
      }
    ]
  }
]
```

---

### Get Credit Statement
```
GET /credito/{id}/extrato
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Credit UUID

**Response** (200 OK):
```json
{
  "id": "credito-uuid",
  "valorAprovado": 250000.00,
  "valorLiberado": 125000.00,
  "taxaMensal": 1.5,
  "prazoMeses": 24,
  "status": "ativo",
  "dataAprovacao": "2026-05-27T16:00:00Z",
  "dataVencimento": "2028-05-27T16:00:00Z",
  "liberacoes": [
    {
      "id": "lib-uuid-1",
      "valor": 125000.00,
      "status": "processada",
      "processadoEm": "2026-05-27T16:00:00Z"
    }
  ],
  "parcelas": [
    {
      "numero": 1,
      "valor": 10416.67,
      "dataVencimento": "2026-06-27",
      "status": "paga",
      "dataPagamento": "2026-06-25"
    }
  ]
}
```

---

## Manager Dashboard Endpoints

### Get Manager Dashboard Stats
```
GET /manager/dashboard
```
**Authentication**: Required (JWT Bearer - Manager)

**Response** (200 OK):
```json
{
  "filaAprovacoes": 12,
  "filaKyc": 8,
  "creditosAtivos": 45,
  "obrasAtivas": 34
}
```

---

### List Pending Stages
```
GET /manager/etapas-pendentes
```
**Authentication**: Required (JWT Bearer - Manager)

**Query Parameters**:
- `limit` (number, optional): Default 20
- `offset` (number, optional): Default 0

**Response** (200 OK):
```json
{
  "etapas": [
    {
      "etapaId": "etapa-uuid",
      "nome": "Fundações",
      "ordem": 1,
      "percentualObra": 15,
      "valorLiberacao": 75000.00,
      "evidenciasCount": 5,
      "criadoEm": "2026-05-20T10:00:00Z",
      "obra": {
        "obraId": "obra-uuid",
        "nome": "Construção Residencial",
        "endereco": "Rua Principal, 123",
        "usuario": {
          "usuarioId": "user-uuid",
          "nome": "João Silva",
          "email": "joao@example.com",
          "cpf": "12345678901"
        },
        "credito": {
          "creditoId": "credito-uuid",
          "valorAprovado": 500000.00
        }
      }
    }
  ],
  "total": 12
}
```

---

### List Pending KYC Documents
```
GET /manager/kyc-pendentes
```
**Authentication**: Required (JWT Bearer - Manager)

**Query Parameters**:
- `limit` (number, optional): Default 20
- `offset` (number, optional): Default 0

**Response** (200 OK):
```json
{
  "documentos": [
    {
      "kycDocumentoId": "kyc-doc-uuid",
      "tipo": "rg",
      "url": "https://s3.amazonaws.com/...",
      "criadoEm": "2026-05-27T16:00:00Z",
      "usuario": {
        "usuarioId": "user-uuid",
        "nome": "João Silva",
        "email": "joao@example.com",
        "cpf": "12345678901",
        "kycStatus": "pendente"
      }
    }
  ],
  "total": 8
}
```

---

### Get Stage Details (Manager)
```
GET /manager/etapas/{id}
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): Stage UUID

**Response** (200 OK):
```json
{
  "etapaId": "etapa-uuid",
  "nome": "Fundações",
  "ordem": 1,
  "percentualObra": 15,
  "valorLiberacao": 75000.00,
  "status": "pendente",
  "evidencias": [
    {
      "evidenciaId": "ev-uuid-1",
      "fotoUrl": "https://s3.amazonaws.com/...",
      "criadoEm": "2026-05-25T10:00:00Z"
    }
  ],
  "criadoEm": "2026-05-20T10:00:00Z",
  "obra": {
    "obraId": "obra-uuid",
    "nome": "Construção Residencial",
    "endereco": "Rua Principal, 123",
    "usuario": {
      "usuarioId": "user-uuid",
      "nome": "João Silva",
      "email": "joao@example.com",
      "cpf": "12345678901"
    }
  }
}
```

---

### Get KYC Details (Manager)
```
GET /manager/kyc/{id}
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): KYC Document UUID

**Response** (200 OK):
```json
{
  "kycDocumentoId": "kyc-doc-uuid",
  "tipo": "rg",
  "url": "https://s3.amazonaws.com/...",
  "status": "pendente",
  "criadoEm": "2026-05-27T16:00:00Z",
  "usuario": {
    "usuarioId": "user-uuid",
    "nome": "João Silva",
    "email": "joao@example.com",
    "cpf": "12345678901",
    "kycStatus": "pendente"
  }
}
```

---

### Approve Stage (Manager)
```
PATCH /manager/etapas/{id}/aprovar
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): Stage UUID

**Request Body**:
```json
{
  "observacao": "Etapa aprovada pelo gerenciador"
}
```

**Response** (200 OK):
```json
{
  "etapaId": "etapa-uuid",
  "status": "aprovada",
  "aprovedoEm": "2026-05-27T16:00:00Z",
  "aprovadoPor": "manager-uuid"
}
```

---

### Reject Stage (Manager)
```
PATCH /manager/etapas/{id}/rejeitar
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): Stage UUID

**Request Body**:
```json
{
  "motivo": "Fotos fora do geofence, favor reenviá-las"
}
```

**Response** (200 OK):
```json
{
  "etapaId": "etapa-uuid",
  "status": "rejeitada",
  "motivo": "Fotos fora do geofence, favor reenviá-las",
  "rejeitadoEm": "2026-05-27T16:00:00Z",
  "rejeitadoPor": "manager-uuid"
}
```

---

### Approve KYC (Manager)
```
PATCH /manager/kyc/{id}/aprovar
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): KYC Document UUID

**Response** (200 OK):
```json
{
  "kycDocumentoId": "kyc-doc-uuid",
  "status": "aprovado",
  "analisadoEm": "2026-05-27T16:00:00Z",
  "analisadoPor": "manager-uuid"
}
```

---

### Reject KYC (Manager)
```
PATCH /manager/kyc/{id}/rejeitar
```
**Authentication**: Required (JWT Bearer - Manager)

**Path Parameters**:
- `id` (string, required): KYC Document UUID

**Request Body**:
```json
{
  "motivo": "Documento fora do prazo de validade"
}
```

**Response** (200 OK):
```json
{
  "kycDocumentoId": "kyc-doc-uuid",
  "status": "rejeitado",
  "motivo": "Documento fora do prazo de validade",
  "analisadoEm": "2026-05-27T16:00:00Z",
  "analisadoPor": "manager-uuid"
}
```

---

## Score Endpoints

### Get Current Score
```
GET /score/atual
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
{
  "score": 750,
  "nivel": "excelente",
  "cor": "#22c55e",
  "descricao": "Seu score reflete um histórico excelente de pagamentos"
}
```

---

### Get Score History
```
GET /score/historico
```
**Authentication**: Required (JWT Bearer)

**Query Parameters**:
- `limit` (number, optional): Default to all

**Response** (200 OK):
```json
[
  {
    "id": "score-history-uuid",
    "score": 750,
    "motivo": "Pagamento de parcela realizado",
    "criadoEm": "2026-05-27T16:00:00Z"
  }
]
```

---

## Notifications (Notificações) Endpoints

### List Notifications
```
GET /notificacoes
```
**Authentication**: Required (JWT Bearer)

**Query Parameters**:
- `limit` (number, optional): Default 20
- `offset` (number, optional): Default 0

**Response** (200 OK):
```json
{
  "notificacoes": [
    {
      "notificacaoId": "notif-uuid",
      "tipo": "etapa_aprovada",
      "titulo": "Etapa Aprovada",
      "mensagem": "Sua etapa 'Fundações' foi aprovada",
      "link": "/obras/obra-uuid/etapa/etapa-uuid",
      "lida": false,
      "criadoEm": "2026-05-27T16:00:00Z"
    }
  ],
  "total": 24
}
```

---

### List Unread Notifications
```
GET /notificacoes/nao-lidas
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
[
  {
    "notificacaoId": "notif-uuid",
    "tipo": "etapa_aprovada",
    "titulo": "Etapa Aprovada",
    "mensagem": "Sua etapa 'Fundações' foi aprovada",
    "link": "/obras/obra-uuid/etapa/etapa-uuid",
    "lida": false,
    "criadoEm": "2026-05-27T16:00:00Z"
  }
]
```

---

### Count Unread Notifications
```
GET /notificacoes/contar-nao-lidas
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
{
  "count": 5
}
```

---

### Mark Notification as Read
```
PATCH /notificacoes/{id}/lida
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Notification UUID

**Response** (200 OK):
```json
{
  "notificacaoId": "notif-uuid",
  "lida": true,
  "lidoEm": "2026-05-27T16:00:00Z"
}
```

---

### Mark All Notifications as Read
```
PATCH /notificacoes/marcar-todas-lidas
```
**Authentication**: Required (JWT Bearer)

**Response** (200 OK):
```json
{
  "ok": true
}
```

---

### Delete Notification
```
DELETE /notificacoes/{id}
```
**Authentication**: Required (JWT Bearer)

**Path Parameters**:
- `id` (string, required): Notification UUID

**Response** (200 OK):
```json
{
  "ok": true
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "statusCode": 400,
  "message": "Descrição do erro",
  "error": "BadRequest"
}
```

**Common HTTP Status Codes**:
- `200 OK`: Successful GET, PATCH, DELETE
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE/Logout
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

---

## Rate Limiting & Throttling

The API implements global rate limiting via ThrottlerGuard:
- Requests are throttled to prevent abuse
- Rate limit headers are included in responses
- Exceeding limits returns `429 Too Many Requests`

---

## Authentication Header Format

All authenticated endpoints require:
```
Authorization: Bearer {accessToken}
```

Where `{accessToken}` is the JWT returned from `/auth/login` or `/auth/renovar`.

**Token Expiration**:
- Access Token: 15 minutes (JWT_EXPIRES_IN)
- Refresh Token: 7 days (JWT_REFRESH_EXPIRES_IN)

---

## API Base URL Configuration

Set via environment variable:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

In production, update to your deployment URL:
```env
NEXT_PUBLIC_API_URL=https://api.imbobi.com
```
