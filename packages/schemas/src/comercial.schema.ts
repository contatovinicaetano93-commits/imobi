import { z } from "zod";

export const FonteEnum = z.enum([
  "WEBSITE",
  "INDICACAO",
  "MARKETPLACE",
  "CAMPANHA_DIGITAL",
  "OFFLINE",
  "PARCEIRO",
]);

export const SegmentoClienteEnum = z.enum([
  "NOVO",
  "RETORNO",
  "CONCORRENTE",
]);

export const TipoObraEnum = z.enum([
  "residencial",
  "comercial",
  "industrial",
  "reforma",
]);

export const LeadActivityTypeEnum = z.enum([
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

export const CreateLeadSchema = z.object({
  clienteNome: z.string().min(3, "Nome obrigatório"),
  clienteEmail: z.string().email("Email inválido"),
  clienteTelefone: z.string().min(10, "Telefone inválido"),
  clienteCpf: z.string().length(11, "CPF deve ter 11 dígitos").optional(),
  fonte: FonteEnum,
  tipoObra: TipoObraEnum,
  segmentoCliente: SegmentoClienteEnum,
});

export const LeadActivitySchema = z.object({
  leadActivityId: z.string().uuid(),
  leadId: z.string().uuid(),
  usuarioId: z.string().uuid(),
  tipo: LeadActivityTypeEnum,
  descricao: z.string(),
  criadoEm: z.date(),
});

export const ConversionScoreSchema = z.object({
  scoreId: z.string().uuid(),
  leadId: z.string().uuid(),
  scoreFinal: z.number().min(0).max(100),
  probabilidadeClosing: z.number().min(0).max(1),
  dataEstimadaClosing: z.string(),
  fonteScore: z.number().min(0).max(100),
  tipoObraScore: z.number().min(0).max(100),
  segmentoScore: z.number().min(0).max(100),
  engajamentoScore: z.number().min(0).max(100),
  historicoScore: z.number().min(0).max(100),
  criadoEm: z.string(),
});

export const LeadSchema = z.object({
  leadId: z.string().uuid(),
  clienteNome: z.string(),
  clienteEmail: z.string().email(),
  clienteTelefone: z.string(),
  clienteCpf: z.string().optional(),
  fonte: FonteEnum,
  tipoObra: TipoObraEnum,
  segmentoCliente: SegmentoClienteEnum,
  stageId: z.string().uuid(),
  criadoEm: z.date(),
  atualizadoEm: z.date(),
  scoreHistorico: z.array(ConversionScoreSchema).optional(),
});

export const LeadDetailSchema = LeadSchema.extend({
  stage: z.object({
    stageId: z.string().uuid(),
    nome: z.string(),
    pipelineId: z.string().uuid(),
  }).optional(),
  atividades: z.array(LeadActivitySchema).optional(),
  scoreBreakdown: ConversionScoreSchema.optional(),
  obra: z.object({
    obraId: z.string().uuid(),
    nome: z.string(),
  }).optional(),
  usuario: z.object({
    usuarioId: z.string().uuid(),
    nome: z.string(),
    email: z.string().email(),
  }).optional(),
  proximoAcompanhamento: z.date().optional(),
});

export const AddLeadActivitySchema = z.object({
  tipo: LeadActivityTypeEnum,
  descricao: z.string().min(5, "Descrição obrigatória"),
});

export const DashboardStatsSchema = z.object({
  totalLeads: z.number().int().nonnegative(),
  leadsThisWeek: z.number().int().nonnegative(),
  avgScore: z.number().int().min(0).max(100),
  conversionRate: z.number().int().min(0).max(100),
});

export const LeadsListResponseSchema = z.object({
  leads: z.array(LeadSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export const LeadCapturaPublicaSchema = z.object({
  clienteNome:     z.string().min(2, "Nome obrigatório"),
  clienteEmail:    z.string().email("E-mail inválido"),
  clienteTelefone: z.string().min(10, "Telefone inválido"),
  empresa:         z.string().optional(),
  cargo:           z.string().optional(),
  modalidade:      z.string().optional(),
  volume:          z.string().optional(),
  observacoes:     z.string().max(1000).optional(),
});

// Type exports
export type LeadCapturaPublica = z.infer<typeof LeadCapturaPublicaSchema>;
export type FonteType = z.infer<typeof FonteEnum>;
export type SegmentoClienteType = z.infer<typeof SegmentoClienteEnum>;
export type TipoObraType = z.infer<typeof TipoObraEnum>;
export type LeadActivityType = z.infer<typeof LeadActivityTypeEnum>;

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type LeadActivity = z.infer<typeof LeadActivitySchema>;
export type ConversionScore = z.infer<typeof ConversionScoreSchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type LeadDetail = z.infer<typeof LeadDetailSchema>;
export type AddLeadActivityInput = z.infer<typeof AddLeadActivitySchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type LeadsListResponse = z.infer<typeof LeadsListResponseSchema>;
