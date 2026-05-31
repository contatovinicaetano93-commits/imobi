import { z } from "zod";

// ─── Lead Management ──────────────────────────────────────────
export const LeadFonteSchema = z.enum([
  "WEBSITE",
  "INDICACAO",
  "MARKETPLACE",
  "CAMPANHA_DIGITAL",
  "OFFLINE",
  "PARCEIRO",
]);

export const LeadSegmentoSchema = z.enum(["NOVO", "RETORNO", "CONCORRENTE"]);

export const LeadStageSchema = z.enum([
  "PROSPECÇÃO",
  "CONTATO",
  "QUALIFICAÇÃO",
  "PROPOSTA",
  "NEGOCIAÇÃO",
  "FECHAMENTO",
  "GANHO",
  "PERDIDO",
]);

export const CreateLeadSchema = z.object({
  clienteNome: z.string().min(3),
  clienteEmail: z.string().email(),
  clienteTelefone: z.string().regex(/^\+?[\d\s()-]{10,}$/),
  clienteCpf: z.string().regex(/^\d{11}$/).optional(),
  fonte: LeadFonteSchema,
  tipoObra: z.string().optional(),
  segmentoCliente: LeadSegmentoSchema,
});

export const UpdateLeadSchema = CreateLeadSchema.partial();

// ─── Conversion Scoring ───────────────────────────────────────
export const ConversionScoreSchema = z.object({
  scoreFinal: z.number().min(0).max(100),
  probabilidadeClosing: z.number().min(0).max(1),
  dataEstimadaClosing: z.date().optional(),
  fonteScore: z.number().min(0).max(100),
  tipoObraScore: z.number().min(0).max(100),
  segmentoScore: z.number().min(0).max(100),
  engajamentoScore: z.number().min(0).max(100),
  historicoScore: z.number().min(0).max(100),
  versaoAlgoritmo: z.string().default("v1"),
});

// ─── Lead Activity ────────────────────────────────────────────
export const LeadActivityTipoSchema = z.enum([
  "CALL_OUTBOUND",
  "CALL_INBOUND",
  "EMAIL_SENT",
  "EMAIL_RECEIVED",
  "MEETING_SCHEDULED",
  "MEETING_COMPLETED",
  "PROPOSAL_SENT",
  "DOCUMENT_REQUESTED",
  "PAYMENT_RECEIVED",
  "STAGE_CHANGED",
  "NOTE_ADDED",
  "FOLLOW_UP_SET",
]);

export const CreateLeadActivitySchema = z.object({
  tipo: LeadActivityTipoSchema,
  descricao: z.string().min(1).max(1000),
});

// ─── Pipeline Management ──────────────────────────────────────
export const CreatePipelineStageSchema = z.object({
  nome: z.string().min(3).max(50),
  ordem: z.number().int().positive(),
  descricao: z.string().max(500).optional(),
  corHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  taxaConversao: z.number().min(0).max(1),
  diasMedioStage: z.number().int().positive(),
});

export const UpdatePipelineStageSchema = CreatePipelineStageSchema.partial();

// ─── Lead List Response ───────────────────────────────────────
export const LeadListResponseSchema = z.object({
  leadId: z.string().uuid(),
  clienteNome: z.string(),
  clienteEmail: z.string().email(),
  clienteTelefone: z.string(),
  stageName: z.string(),
  fonte: LeadFonteSchema,
  segmentoCliente: LeadSegmentoSchema,
  scoreFinal: z.number().min(0).max(100),
  probabilidadeClosing: z.number().min(0).max(1),
  dataEstimadaClosing: z.date().nullable(),
  criadoEm: z.date(),
  atualizadoEm: z.date(),
  atribuidoEm: z.date().nullable(),
  convertidoEm: z.date().nullable(),
});

export const LeadDetailResponseSchema = LeadListResponseSchema.extend({
  obraId: z.string().uuid().nullable(),
  usuarioId: z.string().uuid().nullable(),
  condicoes: z.string().nullable(),
  proximoAcompanhamento: z.date().nullable(),
  statusUltimo: z.string().nullable(),
  atividades: CreateLeadActivitySchema.array(),
});

// ─── CRM Integration ──────────────────────────────────────────
export const HubspotSyncSchema = z.object({
  leadId: z.string().uuid(),
  hubspotContactId: z.string(),
  lastSyncedAt: z.date(),
  syncStatus: z.enum(["PENDING", "SYNCED", "FAILED"]),
});

export const PipedriveSyncSchema = z.object({
  leadId: z.string().uuid(),
  pipedrivePersonId: z.number(),
  pipedriveDealId: z.number().optional(),
  lastSyncedAt: z.date(),
  syncStatus: z.enum(["PENDING", "SYNCED", "FAILED"]),
});

// ─── Filters & Query ──────────────────────────────────────────
export const LeadFilterSchema = z.object({
  stage: z.string().optional(),
  fonte: LeadFonteSchema.optional(),
  segmentoCliente: LeadSegmentoSchema.optional(),
  scoreMin: z.number().min(0).max(100).optional(),
  scoreMax: z.number().min(0).max(100).optional(),
  atribuidoA: z.string().uuid().optional(),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
  searchTerm: z.string().optional(),
});

export type Lead = z.infer<typeof LeadListResponseSchema>;
export type LeadDetail = z.infer<typeof LeadDetailResponseSchema>;
export type LeadActivity = z.infer<typeof CreateLeadActivitySchema>;
export type ConversionScore = z.infer<typeof ConversionScoreSchema>;
export type LeadFilter = z.infer<typeof LeadFilterSchema>;
