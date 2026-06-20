"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevogarConsentimentoSchema = exports.PushTokenSchema = exports.KycRejeitarSchema = exports.KycUploadSchema = exports.KycDocumentoTipoEnum = exports.AdicionarMailingSchema = exports.MarketplaceCriarFornecedorSchema = exports.FornecedorTipoEnum = exports.MarketplaceAvaliarSchema = exports.ComiteEncerrarSchema = exports.ComiteDecisaoEnum = exports.ComiteVotarSchema = exports.VotoDecisaoEnum = exports.ComiteParecerSchema = exports.ComiteSolicitarSchema = exports.VistoriaRejeitarSchema = exports.VistoriaAprovarSchema = void 0;
const zod_1 = require("zod");
// ── Vistoria ────────────────────────────────────────────────────────────
exports.VistoriaAprovarSchema = zod_1.z.object({
    obraId: zod_1.z.string().uuid().optional(),
    observacoes: zod_1.z.string().max(2000).optional(),
});
exports.VistoriaRejeitarSchema = zod_1.z.object({
    motivo: zod_1.z.string().min(5, "Motivo deve ter pelo menos 5 caracteres").max(2000),
});
// ── Comitê Digital ──────────────────────────────────────────────────────
exports.ComiteSolicitarSchema = zod_1.z.object({
    valorSolicitado: zod_1.z.number().positive("Valor deve ser positivo"),
    prazoMeses: zod_1.z.number().int().min(1).max(360),
    taxaMensal: zod_1.z.number().min(0).max(100),
    finalidade: zod_1.z.string().min(5, "Finalidade obrigatória").max(1000),
    garantias: zod_1.z.string().max(2000).optional(),
    observacoes: zod_1.z.string().max(2000).optional(),
    obraId: zod_1.z.string().uuid().optional(),
    vgv: zod_1.z.number().positive().optional(),
    custoObra: zod_1.z.number().positive().optional(),
    ltv: zod_1.z.number().min(0).max(100).optional(),
});
exports.ComiteParecerSchema = zod_1.z.object({
    parecerTecnico: zod_1.z.string().min(10, "Parecer deve ter pelo menos 10 caracteres").max(5000),
});
exports.VotoDecisaoEnum = zod_1.z.enum(["APROVAR", "AJUSTAR", "REPROVAR"]);
exports.ComiteVotarSchema = zod_1.z.object({
    voto: exports.VotoDecisaoEnum,
    justificativa: zod_1.z.string().min(5).max(2000).optional(),
    condicoes: zod_1.z.string().max(2000).optional(),
});
exports.ComiteDecisaoEnum = zod_1.z.enum(["APROVADO", "AJUSTADO", "REPROVADO"]);
exports.ComiteEncerrarSchema = zod_1.z.object({
    decisao: exports.ComiteDecisaoEnum,
    motivo: zod_1.z.string().max(2000).optional(),
});
// ── Marketplace ────────────────────────────────────────────────────────
exports.MarketplaceAvaliarSchema = zod_1.z.object({
    nota: zod_1.z
        .number()
        .int("Nota deve ser inteiro")
        .min(1, "Nota mínima: 1")
        .max(5, "Nota máxima: 5"),
    comentario: zod_1.z.string().max(1000).optional(),
});
exports.FornecedorTipoEnum = zod_1.z.enum([
    "MATERIAL_CONSTRUCAO",
    "MAO_DE_OBRA",
    "EQUIPAMENTO",
    "PROJETO_ARQUITETURA",
    "ENGENHARIA",
    "OUTROS",
]);
exports.MarketplaceCriarFornecedorSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2, "Nome obrigatório").max(200),
    tipo: exports.FornecedorTipoEnum,
    descricao: zod_1.z.string().max(2000).optional(),
    website: zod_1.z.string().url("URL inválida").optional().or(zod_1.z.literal("")),
    telefone: zod_1.z
        .string()
        .regex(/^\d{10,11}$/, "Telefone inválido")
        .optional(),
    email: zod_1.z.string().email("Email inválido").optional(),
    endereco: zod_1.z.string().max(500).optional(),
    uf: zod_1.z.string().length(2, "UF deve ter 2 caracteres").optional(),
    cidade: zod_1.z.string().max(100).optional(),
    geoLatitude: zod_1.z.number().min(-90).max(90).optional(),
    geoLongitude: zod_1.z.number().min(-180).max(180).optional(),
});
// ── Parceiros ──────────────────────────────────────────────────────────
exports.AdicionarMailingSchema = zod_1.z.object({
    nome: zod_1.z.string().min(2, "Nome obrigatório").max(200),
    email: zod_1.z.string().email("E-mail inválido"),
    telefone: zod_1.z
        .string()
        .regex(/^\d{10,11}$/, "Telefone inválido")
        .optional(),
});
// ── KYC ───────────────────────────────────────────────────────────────
exports.KycDocumentoTipoEnum = zod_1.z.enum([
    "RG",
    "CPF",
    "CNH",
    "PASSAPORTE",
    "COMPROVANTE_RESIDENCIA",
    "CNPJ",
    "CONTRATO_SOCIAL",
    "OUTROS",
]);
exports.KycUploadSchema = zod_1.z.object({
    tipo: exports.KycDocumentoTipoEnum,
    url: zod_1.z.string().url("URL do documento inválida").min(1),
});
exports.KycRejeitarSchema = zod_1.z.object({
    motivo: zod_1.z.string().min(5, "Motivo de rejeição obrigatório").max(1000),
});
// ── Push Notificações ──────────────────────────────────────────────────
exports.PushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(10, "Token FCM inválido").max(500),
});
// ── Usuários (LGPD) ────────────────────────────────────────────────────
exports.RevogarConsentimentoSchema = zod_1.z.object({
    tipo: zod_1.z.enum(["MARKETING", "NOTIFICACOES", "TUDO"], {
        errorMap: () => ({ message: "Tipo deve ser MARKETING, NOTIFICACOES ou TUDO" }),
    }),
});
