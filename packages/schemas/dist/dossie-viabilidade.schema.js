"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistTemplateQuerySchema = exports.AtualizarDossieStatusSchema = exports.AtualizarDossieSchema = exports.AtualizarDossieChecklistItemSchema = exports.CriarDossieSchema = exports.DossieChecklistItemStatusEnum = exports.DossieStatusEnum = exports.EstagioObraDossieEnum = void 0;
const zod_1 = require("zod");
exports.EstagioObraDossieEnum = zod_1.z.enum(["NOVO", "EM_ANDAMENTO", "ENTRADA_TARDIA"]);
exports.DossieStatusEnum = zod_1.z.enum([
    "RASCUNHO",
    "ENVIADO",
    "EM_ANALISE",
    "APROVADO",
    "REPROVADO",
]);
exports.DossieChecklistItemStatusEnum = zod_1.z.enum([
    "PENDENTE",
    "ENVIADO",
    "APROVADO",
    "REPROVADO",
    "NA",
]);
exports.CriarDossieSchema = zod_1.z.object({
    estagioObra: exports.EstagioObraDossieEnum,
    nomeEmpreendimento: zod_1.z.string().min(3, "Nome mínimo 3 caracteres").max(255),
    percentualFisico: zod_1.z.number().min(0).max(100).optional(),
    dataBase: zod_1.z.coerce.date().optional(),
    obraId: zod_1.z.string().uuid().optional(),
});
exports.AtualizarDossieChecklistItemSchema = zod_1.z.object({
    itemId: zod_1.z.string().min(1).max(64),
    status: exports.DossieChecklistItemStatusEnum.optional(),
    documentoId: zod_1.z.string().uuid().nullable().optional(),
    observacao: zod_1.z.string().max(2000).nullable().optional(),
});
exports.AtualizarDossieSchema = zod_1.z
    .object({
    nomeEmpreendimento: zod_1.z.string().min(3).max(255).optional(),
    tipologia: zod_1.z.string().max(100).nullable().optional(),
    endereco: zod_1.z.string().max(500).nullable().optional(),
    cidade: zod_1.z.string().max(120).nullable().optional(),
    uf: zod_1.z.string().length(2).nullable().optional(),
    totalUnidades: zod_1.z.number().int().min(0).nullable().optional(),
    areaTotal: zod_1.z.number().positive().nullable().optional(),
    dataEntregaPrevista: zod_1.z.coerce.date().nullable().optional(),
    nomeIncorporadora: zod_1.z.string().max(255).nullable().optional(),
    cnpjIncorporadora: zod_1.z.string().max(18).nullable().optional(),
    modeloAmortizacao: zod_1.z.string().max(120).nullable().optional(),
    totalCarteira: zod_1.z.number().nullable().optional(),
    totalAReceber: zod_1.z.number().nullable().optional(),
    estruturaSocietaria: zod_1.z.string().max(2000).nullable().optional(),
    percentualFisico: zod_1.z.number().min(0).max(100).nullable().optional(),
    dataBase: zod_1.z.coerce.date().nullable().optional(),
    obraId: zod_1.z.string().uuid().nullable().optional(),
    ficha: zod_1.z.record(zod_1.z.unknown()).optional(),
    checklistItens: zod_1.z.array(exports.AtualizarDossieChecklistItemSchema).optional(),
})
    .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar",
});
exports.AtualizarDossieStatusSchema = zod_1.z.object({
    status: exports.DossieStatusEnum,
    observacaoAdmin: zod_1.z.string().max(2000).optional(),
});
exports.ChecklistTemplateQuerySchema = zod_1.z.object({
    estagio: exports.EstagioObraDossieEnum,
});
