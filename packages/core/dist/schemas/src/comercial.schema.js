"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsListResponseSchema = exports.DashboardStatsSchema = exports.AddLeadActivitySchema = exports.LeadDetailSchema = exports.LeadSchema = exports.ConversionScoreSchema = exports.LeadActivitySchema = exports.CreateLeadSchema = exports.LeadActivityTypeEnum = exports.TipoObraEnum = exports.SegmentoClienteEnum = exports.FonteEnum = void 0;
const zod_1 = require("zod");
exports.FonteEnum = zod_1.z.enum(["PARCEIRO", "INDICACAO", "WEBSITE", "OFFLINE"]);
exports.SegmentoClienteEnum = zod_1.z.enum([
    "NOVO",
    "RETORNO",
    "CONCORRENTE",
]);
exports.TipoObraEnum = zod_1.z.enum([
    "residencial",
    "comercial",
    "industrial",
    "reforma",
]);
exports.LeadActivityTypeEnum = zod_1.z.enum([
    "CALL",
    "EMAIL",
    "MEETING",
    "PROPOSAL",
    "VISIT",
    "FOLLOW_UP",
    "NOTE",
]);
exports.CreateLeadSchema = zod_1.z.object({
    clienteNome: zod_1.z.string().min(3, "Nome obrigatório"),
    clienteEmail: zod_1.z.string().email("Email inválido"),
    clienteTelefone: zod_1.z.string().min(10, "Telefone inválido"),
    clienteCpf: zod_1.z.string().length(11, "CPF deve ter 11 dígitos").optional(),
    fonte: exports.FonteEnum,
    tipoObra: exports.TipoObraEnum,
    segmentoCliente: exports.SegmentoClienteEnum,
});
exports.LeadActivitySchema = zod_1.z.object({
    leadActivityId: zod_1.z.string().uuid(),
    leadId: zod_1.z.string().uuid(),
    usuarioId: zod_1.z.string().uuid(),
    tipo: exports.LeadActivityTypeEnum,
    descricao: zod_1.z.string(),
    criadoEm: zod_1.z.date(),
});
exports.ConversionScoreSchema = zod_1.z.object({
    scoreId: zod_1.z.string().uuid(),
    leadId: zod_1.z.string().uuid(),
    scoreFinal: zod_1.z.number().int().min(0).max(100),
    probabilidadeClosing: zod_1.z.number().min(0).max(1),
    dataEstimadaClosing: zod_1.z.date(),
    fonteScore: zod_1.z.number().int().min(0).max(100),
    tipoObraScore: zod_1.z.number().int().min(0).max(100),
    segmentoScore: zod_1.z.number().int().min(0).max(100),
    engajamentoScore: zod_1.z.number().int().min(0).max(100),
    historicoScore: zod_1.z.number().int().min(0).max(100),
    criadoEm: zod_1.z.date(),
});
exports.LeadSchema = zod_1.z.object({
    leadId: zod_1.z.string().uuid(),
    clienteNome: zod_1.z.string(),
    clienteEmail: zod_1.z.string().email(),
    clienteTelefone: zod_1.z.string(),
    clienteCpf: zod_1.z.string().optional(),
    fonte: exports.FonteEnum,
    tipoObra: exports.TipoObraEnum,
    segmentoCliente: exports.SegmentoClienteEnum,
    stageId: zod_1.z.string().uuid(),
    criadoEm: zod_1.z.date(),
    atualizadoEm: zod_1.z.date(),
    scoreHistorico: zod_1.z.array(exports.ConversionScoreSchema).optional(),
});
exports.LeadDetailSchema = exports.LeadSchema.extend({
    stage: zod_1.z.object({
        stageId: zod_1.z.string().uuid(),
        nome: zod_1.z.string(),
        pipelineId: zod_1.z.string().uuid(),
    }).optional(),
    atividades: zod_1.z.array(exports.LeadActivitySchema).optional(),
    scoreBreakdown: exports.ConversionScoreSchema.optional(),
    obra: zod_1.z.object({
        obraId: zod_1.z.string().uuid(),
        nome: zod_1.z.string(),
    }).optional(),
    usuario: zod_1.z.object({
        usuarioId: zod_1.z.string().uuid(),
        nome: zod_1.z.string(),
        email: zod_1.z.string().email(),
    }).optional(),
    proximoAcompanhamento: zod_1.z.date().optional(),
});
exports.AddLeadActivitySchema = zod_1.z.object({
    tipo: exports.LeadActivityTypeEnum,
    descricao: zod_1.z.string().min(5, "Descrição obrigatória"),
});
exports.DashboardStatsSchema = zod_1.z.object({
    totalLeads: zod_1.z.number().int().nonnegative(),
    leadsThisWeek: zod_1.z.number().int().nonnegative(),
    avgScore: zod_1.z.number().int().min(0).max(100),
    conversionRate: zod_1.z.number().int().min(0).max(100),
});
exports.LeadsListResponseSchema = zod_1.z.object({
    leads: zod_1.z.array(exports.LeadSchema),
    total: zod_1.z.number().int().nonnegative(),
    page: zod_1.z.number().int().positive(),
    pageSize: zod_1.z.number().int().positive(),
});
