# PHASE 11: Comercial Dashboard Architecture

**Status**: Architecture & Design Phase  
**Timeline**: 2026-06-03 to 2026-06-10 (7-day development sprint post go-live)  
**Target Launch**: 2026-06-10  
**Team**: Sales team (2-4 managers, 10-15 reps)

---

## Table of Contents

1. [Database Schema Extensions](#database-schema-extensions)
2. [API Endpoints Specification](#api-endpoints-specification)
3. [Component Architecture](#component-architecture)
4. [CRM Integration Strategy](#crm-integration-strategy)
5. [Conversion Score Algorithm](#conversion-score-algorithm)
6. [Implementation Timeline](#implementation-timeline)
7. [Risk Mitigation](#risk-mitigation)

---

## Database Schema Extensions

### Overview
The Comercial module introduces a new `Lead` management system with conversion tracking and AI-powered scoring. Integration with existing `Obra` (project) and `Usuario` (user) models.

### Prisma Schema Additions

```prisma
// ── Leads (Comercial Pipeline) ─────────────────────────────────────

model Lead {
  leadId              String   @id @default(uuid())
  obraId              String?
  obra                Obra?    @relation(fields: [obraId], references: [obraId], onDelete: SetNull)
  usuarioId           String?  // Usuario (tomador) - populated after conversion
  usuario             Usuario? @relation("LeadUsuarios", fields: [usuarioId], references: [usuarioId], onDelete: SetNull)
  atribuidoEm         String?  // usuarioId of sales rep
  
  clienteNome         String
  clienteEmail        String
  clienteTelefone     String
  clienteCpf          String?
  
  stageId             String
  stage               PipelineStage @relation(fields: [stageId], references: [stageId], onDelete: Restrict)
  
  fonte               LeadFonte     @default(WEBSITE)
  tipoObra            String?       // RESIDENCIAL, PARCEIRO, etc
  segmentoCliente     LeadSegmento  @default(NOVO)
  
  condicoes           String?       // Cliente-specific notes
  proximoAcompanhamento DateTime?
  statusUltimo        String?       // Last action taken
  
  criadoEm            DateTime @default(now())
  atualizadoEm        DateTime @updatedAt
  convertidoEm        DateTime?
  
  scoreHistorico      ConversionScore[]
  atividades          LeadActivity[]
  
  @@index([obraId])
  @@index([usuarioId])
  @@index([stageId])
  @@index([fonte])
  @@index([segmentoCliente])
  @@index([criadoEm])
  @@index([convertidoEm])
}

enum LeadFonte {
  WEBSITE
  INDICACAO
  MARKETPLACE
  CAMPANHA_DIGITAL
  OFFLINE
  PARCEIRO
}

enum LeadSegmento {
  NOVO
  RETORNO
  CONCORRENTE
}

model PipelineStage {
  stageId         String   @id @default(uuid())
  nome            String   @unique
  ordem           Int      @unique
  descricao       String?
  corHex          String   @default("#999999")
  
  taxaConversao   Float    @default(0.0)  // historical conversion rate
  diasMedioStage  Int      @default(7)    // avg days in this stage
  
  leads           Lead[]
  
  criadoEm        DateTime @default(now())
  atualizadoEm    DateTime @updatedAt
  
  @@index([ordem])
}

model ConversionScore {
  scoreId             String   @id @default(uuid())
  leadId              String
  lead                Lead     @relation(fields: [leadId], references: [leadId], onDelete: Cascade)
  
  scoreFinal          Float    // 0-100
  probabilidadeClosing Float  // 0-1 (predicted closure probability)
  dataEstimadaClosing DateTime? // predicted closure date
  
  // Factor breakdown
  fonteScore          Float    @default(0.0)  // 0-25
  tipoObraScore       Float    @default(0.0)  // 0-20
  segmentoScore       Float    @default(0.0)  // 0-15
  engajamentoScore    Float    @default(0.0)  // 0-20
  historicoScore      Float    @default(0.0)  // 0-20
  
  versaoAlgoritmo     String   @default("v1")
  
  criadoEm            DateTime @default(now())
  atualizadoEm        DateTime @updatedAt
  
  @@index([leadId])
  @@index([scoreFinal])
  @@index([atualizadoEm])
}

model LeadActivity {
  atividadeId     String   @id @default(uuid())
  leadId          String
  lead            Lead     @relation(fields: [leadId], references: [leadId], onDelete: Cascade)
  
  tipo            LeadActivityTipo
  descricao       String
  usuarioId       String   // Sales rep who performed action
  
  criadoEm        DateTime @default(now())
  
  @@index([leadId])
  @@index([tipo])
  @@index([criadoEm])
}

enum LeadActivityTipo {
  CALL_OUTBOUND
  CALL_INBOUND
  EMAIL_SENT
  EMAIL_RECEIVED
  MEETING_SCHEDULED
  MEETING_COMPLETED
  PROPOSAL_SENT
  DOCUMENT_REQUESTED
  PAYMENT_RECEIVED
  STAGE_CHANGED
  NOTE_ADDED
  FOLLOW_UP_SET
}

// Existing Usuario model augmented with commercialRole
// Add to Usuario model:
// comercialRole       ComercialRole? // GERENTE_VENDAS, REPRESENTANTE, null
// leadsGerenciados    Lead[] @relation("LeadsGerenciados")
```

### Migration Script
```sql
-- Create enums
CREATE TYPE "LeadFonte" AS ENUM (
  'WEBSITE',
  'INDICACAO',
  'MARKETPLACE',
  'CAMPANHA_DIGITAL',
  'OFFLINE',
  'PARCEIRO'
);

CREATE TYPE "LeadSegmento" AS ENUM (
  'NOVO',
  'RETORNO',
  'CONCORRENTE'
);

CREATE TYPE "LeadActivityTipo" AS ENUM (
  'CALL_OUTBOUND',
  'CALL_INBOUND',
  'EMAIL_SENT',
  'EMAIL_RECEIVED',
  'MEETING_SCHEDULED',
  'MEETING_COMPLETED',
  'PROPOSAL_SENT',
  'DOCUMENT_REQUESTED',
  'PAYMENT_RECEIVED',
  'STAGE_CHANGED',
  'NOTE_ADDED',
  'FOLLOW_UP_SET'
);

-- Create tables
CREATE TABLE "PipelineStage" (
  "stageId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL,
  "descricao" TEXT,
  "corHex" TEXT NOT NULL DEFAULT '#999999',
  "taxaConversao" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "diasMedioStage" INTEGER NOT NULL DEFAULT 7,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("stageId"),
  CONSTRAINT "PipelineStage_nome_key" UNIQUE ("nome"),
  CONSTRAINT "PipelineStage_ordem_key" UNIQUE ("ordem")
);

CREATE INDEX "PipelineStage_ordem_idx" ON "PipelineStage"("ordem");

CREATE TABLE "Lead" (
  "leadId" TEXT NOT NULL,
  "obraId" TEXT,
  "usuarioId" TEXT,
  "atribuidoEm" TEXT,
  "clienteNome" TEXT NOT NULL,
  "clienteEmail" TEXT NOT NULL,
  "clienteTelefone" TEXT NOT NULL,
  "clienteCpf" TEXT,
  "stageId" TEXT NOT NULL,
  "fonte" "LeadFonte" NOT NULL DEFAULT 'WEBSITE',
  "tipoObra" TEXT,
  "segmentoCliente" "LeadSegmento" NOT NULL DEFAULT 'NOVO',
  "condicoes" TEXT,
  "proximoAcompanhamento" TIMESTAMP(3),
  "statusUltimo" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  "convertidoEm" TIMESTAMP(3),
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("leadId"),
  CONSTRAINT "Lead_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE SET NULL,
  CONSTRAINT "Lead_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE SET NULL,
  CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("stageId") ON DELETE RESTRICT
);

CREATE INDEX "Lead_obraId_idx" ON "Lead"("obraId");
CREATE INDEX "Lead_usuarioId_idx" ON "Lead"("usuarioId");
CREATE INDEX "Lead_stageId_idx" ON "Lead"("stageId");
CREATE INDEX "Lead_fonte_idx" ON "Lead"("fonte");
CREATE INDEX "Lead_segmentoCliente_idx" ON "Lead"("segmentoCliente");
CREATE INDEX "Lead_criadoEm_idx" ON "Lead"("criadoEm");
CREATE INDEX "Lead_convertidoEm_idx" ON "Lead"("convertidoEm");

CREATE TABLE "ConversionScore" (
  "scoreId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "scoreFinal" DOUBLE PRECISION NOT NULL,
  "probabilidadeClosing" DOUBLE PRECISION NOT NULL,
  "dataEstimadaClosing" TIMESTAMP(3),
  "fonteScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tipoObraScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "segmentoScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "engajamentoScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "historicoScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "versaoAlgoritmo" TEXT NOT NULL DEFAULT 'v1',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversionScore_pkey" PRIMARY KEY ("scoreId"),
  CONSTRAINT "ConversionScore_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("leadId") ON DELETE CASCADE
);

CREATE INDEX "ConversionScore_leadId_idx" ON "ConversionScore"("leadId");
CREATE INDEX "ConversionScore_scoreFinal_idx" ON "ConversionScore"("scoreFinal");
CREATE INDEX "ConversionScore_atualizadoEm_idx" ON "ConversionScore"("atualizadoEm");

CREATE TABLE "LeadActivity" (
  "atividadeId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "tipo" "LeadActivityTipo" NOT NULL,
  "descricao" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("atividadeId"),
  CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("leadId") ON DELETE CASCADE,
  CONSTRAINT "LeadActivity_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT
);

CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");
CREATE INDEX "LeadActivity_tipo_idx" ON "LeadActivity"("tipo");
CREATE INDEX "LeadActivity_criadoEm_idx" ON "LeadActivity"("criadoEm");

-- Insert default pipeline stages
INSERT INTO "PipelineStage" ("stageId", "nome", "ordem", "descricao", "corHex", "taxaConversao", "diasMedioStage", "criadoEm", "atualizadoEm")
VALUES
  (uuid_generate_v4(), 'Novo Lead', 1, 'Lead recém-capturado', '#3B82F6', 0.25, 3, NOW(), NOW()),
  (uuid_generate_v4(), 'Contato Inicial', 2, 'Primeiro contato realizado', '#8B5CF6', 0.45, 5, NOW(), NOW()),
  (uuid_generate_v4(), 'Proposta Enviada', 3, 'Proposta comercial enviada', '#F59E0B', 0.60, 7, NOW(), NOW()),
  (uuid_generate_v4(), 'Negociação', 4, 'Em negociação com cliente', '#EC4899', 0.75, 10, NOW(), NOW()),
  (uuid_generate_v4(), 'Contrato Assinado', 5, 'Contrato assinado, aguarda pagamento', '#10B981', 0.90, 5, NOW(), NOW()),
  (uuid_generate_v4(), 'Convertido', 6, 'Lead convertido em cliente ativo', '#06B6D4', 1.0, 0, NOW(), NOW());
```

### Key Relationships
- **Lead → Obra**: Optional (lead may exist before obra creation)
- **Lead → Usuario**: Optional initially, populated on conversion
- **Lead → PipelineStage**: Required (always in a stage)
- **ConversionScore → Lead**: 1:N (score history per lead)
- **LeadActivity → Lead**: 1:N (audit trail for all actions)

---

## API Endpoints Specification

### Base Path
`/api/v1/comercial`

### 1. Get Leads (Paginated, Filterable)

**Endpoint**: `GET /api/v1/comercial/leads`

**Request**:
```typescript
// Query Parameters
{
  page?: number = 1;              // 1-indexed
  limit?: number = 20;             // Max 100
  stageId?: string;                // Filter by pipeline stage
  fonte?: LeadFonte;               // Filter by source
  segmento?: LeadSegmento;         // Filter by segment
  searchTerm?: string;             // Search by name/email/phone
  startDate?: ISO8601;             // Filter by creation date
  endDate?: ISO8601;
  atribuidoEm?: string;            // Filter by assigned sales rep
  sortBy?: 'criadoEm' | 'scoreFinal' | 'proximoAcompanhamento';
  sortOrder?: 'asc' | 'desc';
}
```

**Zod Schema**:
```typescript
// packages/schemas/src/comercial.schema.ts
export const LeadFonteEnum = z.enum([
  'WEBSITE',
  'INDICACAO',
  'MARKETPLACE',
  'CAMPANHA_DIGITAL',
  'OFFLINE',
  'PARCEIRO',
]);

export const LeadSegmentoEnum = z.enum(['NOVO', 'RETORNO', 'CONCORRENTE']);

export const GetLeadsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  stageId: z.string().uuid().optional(),
  fonte: LeadFonteEnum.optional(),
  segmento: LeadSegmentoEnum.optional(),
  searchTerm: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  atribuidoEm: z.string().uuid().optional(),
  sortBy: z.enum(['criadoEm', 'scoreFinal', 'proximoAcompanhamento']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const LeadResponseSchema = z.object({
  leadId: z.string().uuid(),
  clienteNome: z.string(),
  clienteEmail: z.string().email(),
  clienteTelefone: z.string(),
  stageId: z.string().uuid(),
  stageName: z.string(),
  fonte: LeadFonteEnum,
  segmento: LeadSegmentoEnum,
  scoreFinal: z.number().min(0).max(100),
  proximoAcompanhamento: z.string().datetime().nullable(),
  criadoEm: z.string().datetime(),
  convertidoEm: z.string().datetime().nullable(),
});

export const GetLeadsResponseSchema = z.object({
  data: z.array(LeadResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  metrics: z.object({
    taxaConversaoMedia: z.number(),
    leadsPorStage: z.record(z.number()),
  }),
});

export type LeadResponse = z.infer<typeof LeadResponseSchema>;
export type GetLeadsResponse = z.infer<typeof GetLeadsResponseSchema>;
```

**Response** (200 OK):
```json
{
  "data": [
    {
      "leadId": "uuid",
      "clienteNome": "João Silva",
      "clienteEmail": "joao@example.com",
      "clienteTelefone": "11999999999",
      "stageId": "uuid",
      "stageName": "Contato Inicial",
      "fonte": "WEBSITE",
      "segmento": "NOVO",
      "scoreFinal": 75.5,
      "proximoAcompanhamento": "2026-06-04T14:00:00Z",
      "criadoEm": "2026-06-01T10:00:00Z",
      "convertidoEm": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 245,
    "totalPages": 13
  },
  "metrics": {
    "taxaConversaoMedia": 0.62,
    "leadsPorStage": {
      "stage1": 45,
      "stage2": 60,
      "stage3": 35
    }
  }
}
```

---

### 2. Create Lead

**Endpoint**: `POST /api/v1/comercial/leads`

**Request Body**:
```typescript
export const CriarLeadSchema = z.object({
  clienteNome: z.string().min(3).max(120),
  clienteEmail: z.string().email(),
  clienteTelefone: z.string().regex(/^\d{10,15}$/),
  clienteCpf: z.string().regex(/^\d{11}$/).optional(),
  fonte: LeadFonteEnum,
  tipoObra: z.string().optional(),
  segmento: LeadSegmentoEnum.default('NOVO'),
  condicoes: z.string().max(1000).optional(),
  proximoAcompanhamento: z.string().datetime().optional(),
  atribuidoEm: z.string().uuid().optional(), // Assign to sales rep immediately
});

export type CriarLeadInput = z.infer<typeof CriarLeadSchema>;
```

**Response** (201 Created):
```json
{
  "leadId": "uuid",
  "clienteNome": "Maria Santos",
  "clienteEmail": "maria@example.com",
  "clienteTelefone": "11988888888",
  "stageId": "uuid-novo-lead",
  "stageName": "Novo Lead",
  "fonte": "INDICACAO",
  "segmento": "NOVO",
  "scoreFinal": 40.0,
  "proximoAcompanhamento": null,
  "criadoEm": "2026-06-01T11:30:00Z",
  "convertidoEm": null
}
```

---

### 3. Move Lead to Next Stage (Kanban Drag-Drop)

**Endpoint**: `PATCH /api/v1/comercial/leads/{leadId}/stage`

**Request Body**:
```typescript
export const MoverLeadStageSchema = z.object({
  stageId: z.string().uuid(),
  motivoMudicao: z.string().max(500).optional(),
  proximoAcompanhamento: z.string().datetime().optional(),
});

export type MoverLeadStageInput = z.infer<typeof MoverLeadStageSchema>;
```

**Response** (200 OK):
```json
{
  "leadId": "uuid",
  "stageId": "uuid-novo-stage",
  "stageName": "Proposta Enviada",
  "atualizadoEm": "2026-06-01T12:00:00Z",
  "atividade": {
    "atividadeId": "uuid",
    "tipo": "STAGE_CHANGED",
    "descricao": "Proposta enviada para cliente"
  }
}
```

---

### 4. Get Analytics Dashboard

**Endpoint**: `GET /api/v1/comercial/analytics`

**Query Parameters**:
```typescript
export const GetAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  stageId: z.string().uuid().optional(),
});
```

**Response** (200 OK):
```json
{
  "period": {
    "startDate": "2026-05-01T00:00:00Z",
    "endDate": "2026-06-01T00:00:00Z"
  },
  "conversions": {
    "taxaConversaoGeral": 0.62,
    "leadsCapturados": 245,
    "leadsConvertidos": 152,
    "recebaEstimada": 1500000.00,
    "recebaPerLead": 9869.61
  },
  "porFonte": [
    {
      "fonte": "WEBSITE",
      "leads": 145,
      "conversoes": 95,
      "taxa": 0.655,
      "receitaPorLead": 12500.00
    }
  ],
  "timeline": [
    {
      "data": "2026-05-01",
      "leadsCapturados": 12,
      "conversoes": 8,
      "receitaDia": 85000.00
    }
  ],
  "previsao": {
    "leadsProjetados30Dias": 298,
    "conversoesProjetadas": 185,
    "recebaProjetada": 1850000.00
  }
}
```

---

### 5. Get Conversion Score Details

**Endpoint**: `GET /api/v1/comercial/leads/{leadId}/score`

**Response** (200 OK):
```json
{
  "leadId": "uuid",
  "scoreFinal": 75.5,
  "probabilidadeClosing": 0.755,
  "dataEstimadaClosing": "2026-06-15T00:00:00Z",
  "factorBreakdown": {
    "fonteScore": 20.0,
    "tipoObraScore": 15.0,
    "segmentoScore": 12.0,
    "engajamentoScore": 18.5,
    "historicoScore": 10.0
  },
  "versaoAlgoritmo": "v1",
  "atualizadoEm": "2026-06-01T10:00:00Z"
}
```

---

### 6. Add Lead Activity (Call, Email, Meeting, etc.)

**Endpoint**: `POST /api/v1/comercial/leads/{leadId}/activity`

**Request Body**:
```typescript
export const CriarLeadActivitySchema = z.object({
  tipo: z.enum([
    'CALL_OUTBOUND',
    'CALL_INBOUND',
    'EMAIL_SENT',
    'EMAIL_RECEIVED',
    'MEETING_SCHEDULED',
    'MEETING_COMPLETED',
    'PROPOSAL_SENT',
    'DOCUMENT_REQUESTED',
    'PAYMENT_RECEIVED',
    'STAGE_CHANGED',
    'NOTE_ADDED',
    'FOLLOW_UP_SET',
  ]),
  descricao: z.string().min(5).max(1000),
  proximoAcompanhamento: z.string().datetime().optional(),
});
```

**Response** (201 Created):
```json
{
  "atividadeId": "uuid",
  "leadId": "uuid",
  "tipo": "CALL_OUTBOUND",
  "descricao": "Chamada inicial com cliente - interesse confirmado",
  "usuarioId": "uuid-sales-rep",
  "criadoEm": "2026-06-01T14:30:00Z"
}
```

---

## Component Architecture

### Directory Structure
```
apps/web/components/dashboard/comercial/
├── index.ts
├── LeadPipeline.tsx          // Kanban board (main)
├── LeadCard.tsx              // Individual lead card
├── ConversionScoreVisualization.tsx
├── AnalyticsDashboard.tsx
├── CrmIntegrationStatus.tsx
├── LeadActivityTimeline.tsx
└── hooks/
    └── usePipelineFilters.ts
```

### 1. LeadPipeline (Kanban Board)

**File**: `apps/web/components/dashboard/comercial/LeadPipeline.tsx`

```typescript
"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadCard } from "./LeadCard";
import { Plus, Filter, TrendingUp } from "lucide-react";

interface PipelineStage {
  stageId: string;
  nome: string;
  ordem: number;
  corHex: string;
  leads: Lead[];
  taxaConversao: number;
  diasMedioStage: number;
}

interface Lead {
  leadId: string;
  clienteNome: string;
  clienteEmail: string;
  scoreFinal: number;
  stageName: string;
  proximoAcompanhamento?: string;
  fonte: string;
}

export function LeadPipeline() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFonte, setSelectedFonte] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { distance: 8 }),
    useSensor(KeyboardSensor)
  );

  const { data: stages, isLoading } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async () => {
      const res = await fetch("/api/v1/comercial/leads?limit=1000");
      return res.json();
    },
  });

  const moveLeadMutation = useMutation({
    mutationFn: (data: { leadId: string; stageId: string }) =>
      fetch(`/api/v1/comercial/leads/${data.leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: data.stageId }),
      }).then((r) => r.json()),
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const leadId = active.id as string;
      const targetStageId = over.id as string;
      moveLeadMutation.mutate({ leadId, stageId: targetStageId });
    },
    [moveLeadMutation]
  );

  if (isLoading) return <div className="p-4">Carregando pipeline...</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nome, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={selectedFonte || ""} onValueChange={setSelectedFonte}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Fonte do lead" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEBSITE">Website</SelectItem>
            <SelectItem value="INDICACAO">Indicação</SelectItem>
            <SelectItem value="MARKETPLACE">Marketplace</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
        </Button>
        <Button className="ml-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {stages?.data?.map((stage: PipelineStage) => (
            <PipelineColumn key={stage.stageId} stage={stage} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function PipelineColumn({ stage }: { stage: PipelineStage }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{stage.nome}</CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          {stage.leads?.length || 0} leads · {Math.round(stage.taxaConversao * 100)}% conv.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <SortableContext items={stage.leads?.map((l) => l.leadId) || []} strategy={verticalListSortingStrategy}>
          {stage.leads?.map((lead: Lead) => (
            <LeadCard key={lead.leadId} lead={lead} />
          ))}
        </SortableContext>
      </CardContent>
    </Card>
  );
}
```

---

### 2. LeadCard (Individual Lead)

**File**: `apps/web/components/dashboard/comercial/LeadCard.tsx`

```typescript
"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, TrendingUp } from "lucide-react";

interface LeadCardProps {
  lead: {
    leadId: string;
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    scoreFinal: number;
    fonte: string;
    proximoAcompanhamento?: string;
  };
}

export function LeadCard({ lead }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.leadId,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-blue-100 text-blue-800";
    if (score >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-3 bg-white border hover:shadow-md transition"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{lead.clienteNome}</p>
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
              <Mail className="w-3 h-3" />
              <span className="truncate">{lead.clienteEmail}</span>
            </div>
          </div>
          <Badge className={`shrink-0 ${getScoreColor(lead.scoreFinal)}`}>
            {lead.scoreFinal.toFixed(0)}
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Phone className="w-3 h-3" />
          <span>{lead.clienteTelefone}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant="outline" className="text-xs">
            {lead.fonte}
          </Badge>
          {lead.proximoAcompanhamento && (
            <span className="text-xs text-gray-500">
              Próximo: {new Date(lead.proximoAcompanhamento).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
```

---

### 3. ConversionScoreVisualization

**File**: `apps/web/components/dashboard/comercial/ConversionScoreVisualization.tsx`

```typescript
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Zap } from "lucide-react";

interface ConversionScoreProps {
  leadId: string;
  score: {
    scoreFinal: number;
    probabilidadeClosing: number;
    dataEstimadaClosing: string;
    factorBreakdown: {
      fonteScore: number;
      tipoObraScore: number;
      segmentoScore: number;
      engajamentoScore: number;
      historicoScore: number;
    };
  };
}

export function ConversionScoreVisualization({ score }: ConversionScoreProps) {
  const factors = [
    { label: "Fonte", value: score.factorBreakdown.fonteScore, max: 25 },
    { label: "Tipo Obra", value: score.factorBreakdown.tipoObraScore, max: 20 },
    { label: "Segmento", value: score.factorBreakdown.segmentoScore, max: 15 },
    { label: "Engajamento", value: score.factorBreakdown.engajamentoScore, max: 20 },
    { label: "Histórico", value: score.factorBreakdown.historicoScore, max: 20 },
  ];

  const closingDate = new Date(score.dataEstimadaClosing);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Score de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40 rounded-full border-8 border-blue-200 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{score.scoreFinal.toFixed(0)}</div>
              <div className="text-xs text-gray-600 mt-1">de 100</div>
              <div className="text-xs font-semibold text-green-600 mt-2">
                {(score.probabilidadeClosing * 100).toFixed(0)}% probabilidade
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Closing */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-700">Data Estimada de Fechamento</p>
          <p className="text-lg font-bold text-green-600 mt-1">
            {closingDate.toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Fatores de Impacto</p>
          {factors.map((factor) => (
            <div key={factor.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{factor.label}</span>
                <span className="text-sm font-semibold">
                  {factor.value.toFixed(1)} / {factor.max}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(factor.value / factor.max) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 4. AnalyticsDashboard

**File**: `apps/web/components/dashboard/comercial/AnalyticsDashboard.tsx`

```typescript
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";

export function AnalyticsDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ["comercial-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/v1/comercial/analytics?startDate=2026-05-01T00:00:00Z&endDate=2026-06-01T00:00:00Z");
      return res.json();
    },
  });

  if (!analytics) return <div>Carregando analytics...</div>;

  const metrics = [
    {
      label: "Taxa de Conversão",
      value: `${(analytics.conversions.taxaConversaoGeral * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Leads Capturados",
      value: analytics.conversions.leadsCapturados,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Receita Estimada",
      value: `R$ ${(analytics.conversions.recebaEstimada / 1000).toFixed(0)}k`,
      icon: DollarSign,
      color: "text-purple-600",
    },
    {
      label: "Leads Convertidos",
      value: analytics.conversions.leadsConvertidos,
      icon: Target,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold mt-2">{metric.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Capturados por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leadsCapturados" stroke="#3B82F6" />
                <Line type="monotone" dataKey="conversoes" stroke="#10B981" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Conversões por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.porFonte}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fonte" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversoes" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Previsão para os Próximos 30 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Leads Projetados</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{analytics.previsao.leadsProjetados30Dias}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Conversões Esperadas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{analytics.previsao.conversoesProjetadas}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Receita Projetada</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                R$ {(analytics.previsao.recebaProjetada / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### 5. CrmIntegrationStatus

**File**: `apps/web/components/dashboard/comercial/CrmIntegrationStatus.tsx`

```typescript
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface CrmSyncStatus {
  integracaoAtiva: boolean;
  ultimaSincronizacao: string;
  proximaSincronizacao: string;
  statusUltima: "sucesso" | "erro" | "pendente";
  registrosSincronizados: number;
  errosMensagem?: string;
}

export function CrmIntegrationStatus() {
  const { data: status, isLoading, refetch } = useQuery<CrmSyncStatus>({
    queryKey: ["crm-sync-status"],
    queryFn: async () => {
      // This endpoint will be implemented in Phase 11
      return {
        integracaoAtiva: true,
        ultimaSincronizacao: new Date(Date.now() - 3600000).toISOString(),
        proximaSincronizacao: new Date(Date.now() + 3600000).toISOString(),
        statusUltima: "sucesso",
        registrosSincronizados: 42,
      };
    },
  });

  if (isLoading) return <div>Carregando status CRM...</div>;

  const statusIcon = {
    sucesso: <CheckCircle className="w-5 h-5 text-green-600" />,
    erro: <AlertCircle className="w-5 h-5 text-red-600" />,
    pendente: <Clock className="w-5 h-5 text-yellow-600" />,
  };

  const statusLabel = {
    sucesso: "Sincronizado com sucesso",
    erro: "Erro na sincronização",
    pendente: "Aguardando sincronização",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Status de Integração CRM</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Sincronizar Agora
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {statusIcon[status?.statusUltima || "pendente"]}
            <div>
              <p className="text-sm font-semibold">{statusLabel[status?.statusUltima || "pendente"]}</p>
              <p className="text-xs text-gray-600">
                {status && new Date(status.ultimaSincronizacao).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <Badge variant={status?.statusUltima === "sucesso" ? "default" : "destructive"}>
            {status?.registrosSincronizados} registros
          </Badge>
        </div>

        {status?.integracaoAtiva && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-700">Próxima Sincronização</p>
            <p className="text-sm text-blue-600 mt-1">
              {status && new Date(status.proximaSincronizacao).toLocaleString("pt-BR")}
            </p>
          </div>
        )}

        {status?.statusUltima === "erro" && status?.errosMensagem && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-700">Erro</p>
            <p className="text-sm text-red-600 mt-1">{status.errosMensagem}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## CRM Integration Strategy

### 1. Integration Architecture

**Decision**: Hybrid approach combining webhooks + scheduled polling

```
┌─────────────────────────────────────────────────────────────────┐
│                        External CRM                             │
│                    (Hubspot/Pipedrive)                          │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
    WEBHOOK          SCHEDULED POLL
    (Real-time)     (Fallback 1h)
        │                  │
        └────────┬─────────┘
                 │
        ┌────────▼──────────────────┐
        │   NestJS API Controller   │
        │  /api/v1/comercial/crm   │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Lead Sync Service        │
        │  - Dedup logic            │
        │  - Field mapping          │
        │  - Conflict resolution    │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  Database (Prisma)        │
        │  Lead + LeadActivity      │
        └───────────────────────────┘
```

### 2. Webhook Receiver (NestJS Controller)

**File**: `services/api/src/modules/comercial/crm.controller.ts`

```typescript
import { Controller, Post, Body, Headers, BadRequestException } from "@nestjs/common";
import { CrmSyncService } from "./crm-sync.service";

@Controller("comercial/crm")
export class CrmController {
  constructor(private readonly crmService: CrmSyncService) {}

  /**
   * Webhook receiver for real-time CRM events
   * Expected sources: Hubspot, Pipedrive, custom webhooks
   */
  @Post("webhook/sync")
  async handleWebhook(@Body() payload: unknown, @Headers("x-crm-source") source: string) {
    if (!source) {
      throw new BadRequestException("Missing x-crm-source header");
    }

    // Validate webhook signature (source-specific)
    const isValid = await this.crmService.validateWebhookSignature(source, payload);
    if (!isValid) {
      throw new BadRequestException("Invalid webhook signature");
    }

    // Route to appropriate handler
    switch (source) {
      case "hubspot":
        return await this.crmService.syncHubspotLead(payload);
      case "pipedrive":
        return await this.crmService.syncPipedriveLead(payload);
      default:
        throw new BadRequestException(`Unknown CRM source: ${source}`);
    }
  }

  /**
   * Manual trigger for full resync (ops endpoint)
   */
  @Post("resync")
  async triggerFullResync() {
    return await this.crmService.fullSyncFromCrm();
  }
}
```

### 3. CRM Sync Service

**File**: `services/api/src/modules/comercial/crm-sync.service.ts`

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CriarLeadSchema } from "@imbobi/schemas";

interface CrmLeadPayload {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  fonte: string;
  valor_estimado: number;
  ultimo_contato: string;
  custom_fields?: Record<string, unknown>;
}

@Injectable()
export class CrmSyncService {
  private logger = new Logger(CrmSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sync lead from Hubspot webhook event
   */
  async syncHubspotLead(payload: any) {
    const crmLead = this.mapHubspotToLead(payload);
    return await this.upsertLead(crmLead, "HUBSPOT");
  }

  /**
   * Sync lead from Pipedrive webhook event
   */
  async syncPipedriveLead(payload: any) {
    const crmLead = this.mapPipedriveToLead(payload);
    return await this.upsertLead(crmLead, "PIPEDRIVE");
  }

  /**
   * Full resync from CRM (scheduled job)
   */
  async fullSyncFromCrm() {
    const leads = await this.fetchAllLeadsFromCrm();
    const results = await Promise.allSettled(
      leads.map((lead) => this.upsertLead(lead, "SCHEDULED_SYNC"))
    );

    return {
      total: leads.length,
      successful: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  }

  /**
   * Upsert lead with deduplication and conflict resolution
   */
  private async upsertLead(crmLead: CrmLeadPayload, source: string) {
    // 1. Check for existing lead by email + CPF
    const existingLead = await this.findDuplicateLead(crmLead);

    if (existingLead) {
      // Update if CRM data is fresher
      if (new Date(crmLead.ultimo_contato) > existingLead.atualizadoEm) {
        return await this.prisma.lead.update({
          where: { leadId: existingLead.leadId },
          data: {
            clienteNome: crmLead.nome,
            clienteEmail: crmLead.email,
            clienteTelefone: crmLead.telefone,
            condicoes: crmLead.custom_fields?.observacoes as string,
            atualizadoEm: new Date(),
          },
        });
      }
      return existingLead;
    }

    // 2. Create new lead
    const mappedLead = this.mapCrmFieldsToSchema(crmLead);
    return await this.prisma.lead.create({
      data: {
        ...mappedLead,
        stageId: await this.getDefaultStageId(), // "Novo Lead"
      },
    });
  }

  /**
   * Find potential duplicate based on email/phone/CPF
   */
  private async findDuplicateLead(crmLead: CrmLeadPayload) {
    return await this.prisma.lead.findFirst({
      where: {
        OR: [
          { clienteEmail: crmLead.email },
          { clienteTelefone: crmLead.telefone },
          crmLead.custom_fields?.cpf ? { clienteCpf: crmLead.custom_fields.cpf as string } : {},
        ],
      },
    });
  }

  /**
   * Map Hubspot fields to Lead schema
   */
  private mapHubspotToLead(hubspotData: any): CrmLeadPayload {
    const contact = hubspotData.contact || hubspotData;
    return {
      id: contact.vid || contact.id,
      nome: contact.properties?.firstname?.value || contact.firstname || "Sem Nome",
      email: contact.properties?.email?.value || contact.email || "",
      telefone: contact.properties?.phone?.value || contact.phone || "",
      fonte: "HUBSPOT",
      valor_estimado: contact.properties?.estimatedRevenue?.value || 0,
      ultimo_contato: contact.properties?.lastmodifieddate?.value || new Date().toISOString(),
      custom_fields: {
        hubspot_id: contact.vid,
      },
    };
  }

  /**
   * Map Pipedrive fields to Lead schema
   */
  private mapPipedriveToLead(pipedriveData: any): CrmLeadPayload {
    const deal = pipedriveData.current || pipedriveData;
    return {
      id: deal.id,
      nome: deal.person_name || deal.person?.name || "Sem Nome",
      email: deal.person?.email?.[0]?.value || "",
      telefone: deal.person?.phone?.[0]?.value || "",
      fonte: "PIPEDRIVE",
      valor_estimado: deal.value || 0,
      ultimo_contato: deal.update_time || new Date().toISOString(),
      custom_fields: {
        pipedrive_id: deal.id,
        pipedrive_stage: deal.status,
      },
    };
  }

  /**
   * Map CRM fields to Imobi Lead schema (Zod validation)
   */
  private mapCrmFieldsToSchema(crmLead: CrmLeadPayload) {
    const mapped = {
      clienteNome: crmLead.nome,
      clienteEmail: crmLead.email,
      clienteTelefone: crmLead.telefone,
      fonte: this.mapFonteEnum(crmLead.fonte),
      condicoes: `CRM Origin: ${crmLead.fonte} | Valor Estimado: R$ ${crmLead.valor_estimado}`,
      tipoObra: undefined,
      segmento: "NOVO" as const,
    };

    // Validate against schema
    return CriarLeadSchema.parse(mapped);
  }

  private mapFonteEnum(crmFonte: string) {
    const mapping: Record<string, string> = {
      HUBSPOT: "MARKETPLACE",
      PIPEDRIVE: "INDICACAO",
      WEBSITE: "WEBSITE",
    };
    return mapping[crmFonte] || "OFFLINE";
  }

  /**
   * Validate webhook signature (prevent spoofing)
   */
  async validateWebhookSignature(source: string, payload: any): Promise<boolean> {
    switch (source) {
      case "hubspot":
        return this.validateHubspotSignature(payload);
      case "pipedrive":
        return this.validatePipedriveSignature(payload);
      default:
        return false;
    }
  }

  private validateHubspotSignature(payload: any): boolean {
    // Implement Hubspot HMAC validation
    // https://developers.hubspot.com/docs/api/webhooks/validate-requests
    return true; // Placeholder
  }

  private validatePipedriveSignature(payload: any): boolean {
    // Implement Pipedrive signature validation
    // https://developers.pipedrive.com/docs/api/v1/webhooks
    return true; // Placeholder
  }

  private async fetchAllLeadsFromCrm(): Promise<CrmLeadPayload[]> {
    // Placeholder: would implement actual CRM API calls
    return [];
  }

  private async getDefaultStageId(): Promise<string> {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { nome: "Novo Lead" },
    });
    return stage?.stageId || "";
  }
}
```

### 4. BullMQ Worker for Async Processing

**File**: `services/workers/crm-sync.worker.ts`

```typescript
import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

const crmSyncQueue = new Queue("crm-sync", { connection: redisConnection });

const worker = new Worker(
  "crm-sync",
  async (job) => {
    console.log(`Processing CRM sync job: ${job.id}`);

    switch (job.data.type) {
      case "FULL_SYNC":
        // Full resync from CRM
        return await fullSyncJob(job.data.source);

      case "LEAD_SYNC":
        // Individual lead sync
        return await leadSyncJob(job.data.leadId, job.data.crmData);

      default:
        throw new Error(`Unknown job type: ${job.data.type}`);
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

async function fullSyncJob(source: string) {
  console.log(`Starting full CRM sync from ${source}`);
  // Implementation
}

async function leadSyncJob(leadId: string, crmData: any) {
  console.log(`Syncing lead ${leadId}`);
  // Implementation
}

// Schedule daily resync at 2:00 AM
crmSyncQueue.add("daily-full-sync", { type: "FULL_SYNC", source: "ALL" }, {
  repeat: { pattern: "0 2 * * *" }, // Cron: every day at 2 AM
});

export { crmSyncQueue };
```

---

## Conversion Score Algorithm

### Overview
**Goal**: Predict lead closure probability and estimated timeline based on multi-factor scoring system.

### Algorithm: Rule-Based Scoring (MVP v1)

```
TOTAL_SCORE = fonteScore + tipoObraScore + segmentoScore + engajamentoScore + historicoScore

Where max = 25 + 20 + 15 + 20 + 20 = 100
```

### Factor Details

#### 1. **Fonte Score (0-25 points)**
Reliability of lead source based on historical conversion rate

```
if (fonte == WEBSITE):          score = 20  (high-quality, intentional)
else if (fonte == INDICACAO):   score = 25  (highest conversion, trusted ref)
else if (fonte == MARKETPLACE): score = 18  (platform quality varies)
else if (fonte == CAMPANHA):    score = 15  (campaign-dependent)
else if (fonte == OFFLINE):     score = 10  (lower conversion)
else if (fonte == PARCEIRO):    score = 22  (partnership quality)

// Adjustment based on historical source performance
ajustado = score * (fonte.taxaConversaoHistorica / 0.6)
```

#### 2. **Tipo Obra Score (0-20 points)**
Project type likelihood of conversion

```
if (tipoObra == RESIDENCIAL):    score = 20  (high demand)
else if (tipoObra == PARCEIRO): score = 18  (good demand)
else if (tipoObra == REFORMA):   score = 15  (moderate demand)
else if (tipoObra == OUTRA):     score = 10  (unknown)
else:                             score = 12  (default/not specified)

// Market heat adjustment (seasonal)
actual_month = getCurrentMonth()
if (actual_month in [9, 10, 11]): score *= 1.15  // Spring build season
```

#### 3. **Segmento Score (0-15 points)**
Customer segment quality

```
if (segmento == NOVO):        score = 12  (potential high LTV)
else if (segmento == RETORNO): score = 15  (proven customer)
else if (segmento == CONCORRENTE): score = 8  (lower priority)

// Adjust based on customer age
days_since_creation = now() - lead.criadoEm
if (days_since_creation < 7):   score *= 0.8   (too fresh)
if (days_since_creation > 90):  score *= 0.9   (going cold)
```

#### 4. **Engajamento Score (0-20 points)**
Sales activity and engagement signals

```
activities_30d = countActivities(leadId, days: 30)
days_since_last_activity = (now() - lead.ultimaAtividade).days

if (activities_30d >= 3):       engagement = 20  (high engagement)
else if (activities_30d >= 2):  engagement = 15
else if (activities_30d >= 1):  engagement = 10
else:                            engagement = 0   (no contact)

// Decay over time
if (days_since_last_activity > 30): engagement *= 0.7
if (days_since_last_activity > 60): engagement *= 0.4
if (days_since_last_activity > 90): engagement = 0  (stale)
```

#### 5. **Histórico Score (0-20 points)**
Historical conversion data from same customer/source

```
if (usuarioId exists):
  historico_taxa = countConversionsForUsuario(usuarioId) / countLeadsForUsuario(usuarioId)
  if (historico_taxa > 0.7):     score = 20  (highly probable)
  else if (historico_taxa > 0.5): score = 15
  else if (historico_taxa > 0.3): score = 10
  else if (historico_taxa > 0):   score = 5
  else:                            score = 0
else:
  // No history, neutral score
  score = 10
```

### Pseudocode

```python
def calculate_conversion_score(lead: Lead) -> ConversionScore:
    # 1. Fonte Score
    fonte_base = FONTE_MAPPING[lead.fonte]
    fonte_score = fonte_base * (
        lead.fonte_taxa_historica / 0.6 if lead.fonte_taxa_historica else 1.0
    )
    
    # 2. Tipo Obra Score
    tipo_base = TIPO_OBRA_MAPPING.get(lead.tipoObra, 12)
    seasonal_multiplier = 1.15 if is_build_season() else 1.0
    tipo_score = tipo_base * seasonal_multiplier
    
    # 3. Segmento Score
    segmento_base = SEGMENTO_MAPPING[lead.segmento]
    days_old = (now() - lead.criadoEm).days
    age_multiplier = 0.8 if days_old < 7 else (0.9 if days_old > 90 else 1.0)
    segmento_score = segmento_base * age_multiplier
    
    # 4. Engajamento Score
    activities = count_activities(lead.leadId, days=30)
    engagement_base = {3: 20, 2: 15, 1: 10, 0: 0}.get(min(activities, 3), 0)
    days_inactive = (now() - lead.ultima_atividade).days
    decay = 0.7 if days_inactive > 30 else (0.4 if days_inactive > 60 else 1.0)
    engajamento_score = engagement_base * decay
    
    # 5. Histórico Score
    if lead.usuarioId:
        conversions = count_conversions(lead.usuarioId)
        total_leads = count_leads(lead.usuarioId)
        taxa = conversions / total_leads if total_leads > 0 else 0
        historico_score = {
            taxa > 0.7: 20,
            taxa > 0.5: 15,
            taxa > 0.3: 10,
            taxa > 0: 5,
        }.get(True, 0)
    else:
        historico_score = 10  # Neutral
    
    # 6. Sum all factors
    score_final = (
        fonte_score + tipo_score + segmento_score + 
        engajamento_score + historico_score
    )
    score_final = min(100, max(0, score_final))  # Clamp 0-100
    
    # 7. Calculate closure probability (sigmoid curve)
    probabilidade_closing = sigmoid(score_final, midpoint=60, steepness=0.1)
    
    # 8. Estimate closure date
    dias_estimados = estimate_closure_days(
        lead.fonte, lead.tipoObra, stage_order
    )
    data_estimada = now() + timedelta(days=dias_estimados)
    
    return ConversionScore(
        leadId=lead.leadId,
        scoreFinal=score_final,
        probabilidadeClosing=probabilidade_closing,
        dataEstimadaClosing=data_estimada,
        fonteScore=fonte_score,
        tipoObraScore=tipo_score,
        segmentoScore=segmento_score,
        engajamentoScore=engajamento_score,
        historicoScore=historico_score,
        versaoAlgoritmo="v1"
    )

def sigmoid(x, midpoint=60, steepness=0.1):
    """Smooth probability curve: 0-1"""
    return 1 / (1 + exp(-steepness * (x - midpoint)))

def estimate_closure_days(fonte, tipo_obra, stage_order):
    """Estimate days to closure based on factors"""
    base_days = {
        'NOVO_LEAD': 45,
        'CONTATO_INICIAL': 30,
        'PROPOSTA_ENVIADA': 14,
        'NEGOCIACAO': 7,
        'CONTRATO': 3,
    }.get(stage_order, 30)
    
    # Source modifier
    source_multiplier = {
        'INDICACAO': 0.7,
        'WEBSITE': 0.9,
        'MARKETPLACE': 1.2,
    }.get(fonte, 1.0)
    
    return int(base_days * source_multiplier)
```

### Score Recalculation Trigger
- **Frequency**: On every stage change, activity add, or daily batch (1 AM)
- **Batch job**: `services/workers/score-recalc.worker.ts`

---

## Implementation Timeline

### Sprint Overview: 7 days (2026-06-03 to 2026-06-10)

```
Phase 11: Comercial Dashboard (7 days, after Phase 10 go-live on 2026-06-02)

DAY 1-2 (Jun 3-4): Foundation
├─ Database migrations (Lead, PipelineStage, ConversionScore, LeadActivity)
├─ Prisma schema & client generation
├─ Zod schemas (@imbobi/schemas)
├─ API skeleton (6 endpoints)
└─ [Deliverable: DB + API stubs ready]

DAY 3 (Jun 5): API Implementation
├─ CRM controller (webhook receiver)
├─ Lead CRUD service
├─ Score calculation service
├─ Activity tracking
└─ [Deliverable: Full API endpoints functional]

DAY 4 (Jun 6): CRM Integration
├─ Hubspot mapper
├─ Pipedrive mapper
├─ Webhook signature validation
├─ Scheduled resync worker (BullMQ)
├─ Data deduplication logic
└─ [Deliverable: CRM → Lead sync working]

DAY 5-6 (Jun 7-8): Component Development
├─ LeadPipeline Kanban (dnd-kit)
├─ LeadCard component
├─ ConversionScoreVisualization
├─ AnalyticsDashboard (Recharts)
├─ CrmIntegrationStatus
├─ Page layout (app/dashboard/comercial)
└─ [Deliverable: UI fully interactive]

DAY 7 (Jun 9-10): Polish & Launch Prep
├─ E2E testing (Cypress/Playwright)
├─ Performance optimization (pagination, indexes)
├─ Error handling & retry logic
├─ Staging environment validation
├─ Sales team training materials
├─ Documentation (runbooks, CRM setup guides)
└─ [Deliverable: Ready for launch on Jun 10]

PARALLEL RISKS:
- Phase 10 delays could compress timeline → pre-stage components on develop branch
- CRM API rate limits → implement aggressive caching
- Data migration from existing platform (if applicable) → backfill script Day 2
```

### Task Breakdown

| Task | Owner | Days | Dependency | Status |
|------|-------|------|------------|--------|
| Prisma schema migrations | Backend | 1 | None | Ready |
| API endpoints (CRUD) | Backend | 2 | Schema | Ready |
| Zod schemas | Backend/Shared | 1 | None | Ready |
| CRM integrations (HubSpot) | Backend | 2 | API endpoints | Ready |
| CRM integrations (Pipedrive) | Backend | 1 | HubSpot mapper | Ready |
| Score calculation algorithm | Backend | 1.5 | API endpoints | Ready |
| LeadPipeline component | Frontend | 2 | API endpoints | Ready |
| Analytics dashboard | Frontend | 1.5 | API endpoints | Ready |
| Integration testing | QA | 1 | All components | Ready |
| Staging validation | QA | 0.5 | All | Ready |
| Launch prep | Ops | 0.5 | All | Ready |

---

## Risk Mitigation

### Risk Register

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Phase 10 go-live delays compress Phase 11 timeline | Medium | High | Pre-stage components on develop branch; use mock API | Reduce Phase 11 scope (defer analytics v1) |
| CRM API rate limits block sync | Medium | Medium | Implement Redis caching; batch requests | Use manual lead import CSV for MVP |
| Lead deduplication fails; duplicate records created | Low | High | Comprehensive email + phone + CPF matching; audit logs | Manual cleanup script; user reporting flow |
| Score algorithm too simplistic; doesn't predict well | Low | Medium | Seed with historical conversion data; A/B test v1 vs v2 | Fall back to simple rule: recency + engagement |
| Webhook signature validation bypass (security) | Low | Critical | Use HMAC-SHA256; rotate keys quarterly | IP whitelisting; rate limiting |
| Database query performance degrades (10K+ leads) | Low | High | Index on stageId, fonte, criadoEm; pagination (20 per page) | Implement read replicas; archive old leads |
| Sales team resists UI / training | Medium | Medium | Involve 1-2 early adopters Day 5; video demos | Host live training session Jun 9 |
| Mobile app (Expo) doesn't support Kanban drag-drop | Low | Low | ShadCN is web-only; mobile uses simpler list view | Build mobile-specific component after Phase 11 |

### Monitoring & Observability

```typescript
// Add to NestJS main.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.5,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
  ],
});

// Monitor score calculation
logger.log(`Score calculated: leadId=${leadId}, score=${score}, factor breakdown=${JSON.stringify(factors)}`);

// Alert on CRM sync failures
if (syncResult.failed > 0) {
  await alertSlack(`CRM sync failed: ${syncResult.failed}/${syncResult.total} leads`, "warning");
}

// Track Kanban drag-drop performance
analyticsTracker.trackEvent("lead_stage_changed", {
  leadId,
  fromStage: oldStageId,
  toStage: newStageId,
  duration_ms: endTime - startTime,
});
```

### Testing Strategy

```typescript
// Jest + Supertest (API tests)
describe("Commercial API", () => {
  describe("GET /api/v1/comercial/leads", () => {
    it("should return paginated leads", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/comercial/leads?page=1&limit=20")
        .expect(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });
  });

  describe("PATCH /api/v1/comercial/leads/:id/stage", () => {
    it("should move lead to new stage and create activity", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/comercial/leads/${leadId}/stage`)
        .send({ stageId: newStageId })
        .expect(200);
      expect(res.body.stageName).toBe("Proposta Enviada");
      // Verify activity created
      const activities = await db.leadActivity.findMany({ where: { leadId } });
      expect(activities.length).toBeGreaterThan(0);
    });
  });
});

// Cypress (E2E)
describe("Comercial Dashboard E2E", () => {
  it("should create lead and move through pipeline", () => {
    cy.visit("/dashboard/comercial");
    cy.contains("Novo Lead").click();
    cy.get("input[name=clienteNome]").type("João Silva");
    cy.get("input[name=clienteEmail]").type("joao@test.com");
    cy.get("button").contains("Criar Lead").click();
    cy.contains("João Silva").should("be.visible");
    // Drag lead to next stage
    cy.get("[data-testid=lead-card-${leadId}]")
      .drag("[data-testid=stage-proposta-enviada]");
    cy.contains("Proposta Enviada").should("have.text", /João Silva/);
  });
});
```

---

## Next Steps (Upon Phase 10 Completion)

1. **Git checkout**: `git checkout -b feat/comercial-dashboard`
2. **Database**: Run migrations in staging environment
3. **Backend coding**: Begin Day 1 API implementation (Day 3 in timeline)
4. **Frontend setup**: Install `dnd-kit`, `recharts`, prepare component directory
5. **CRM setup**: Obtain API credentials (HubSpot/Pipedrive test accounts)
6. **Daily standups**: 9 AM PT sync on success metrics & blockers
7. **Staging deploy**: End of each day for E2E test validation
8. **Launch PR review**: 2026-06-10 morning before 02:00 UTC cutoff

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-01  
**Author**: Architecture Team  
**Status**: Ready for Implementation
