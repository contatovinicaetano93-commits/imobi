"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistTipoCreditoQuerySchema = exports.EnviarPropostaPublicaSchema = exports.PropostaCreditoStatusEnum = exports.TipoCreditoPropostaEnum = void 0;
const zod_1 = require("zod");
exports.TipoCreditoPropostaEnum = zod_1.z.enum([
    "OBRA_NOVA",
    "OBRA_EM_ANDAMENTO",
    "CREDITO_PONTE",
]);
exports.PropostaCreditoStatusEnum = zod_1.z.enum([
    "RECEBIDA",
    "EM_ANALISE",
    "APROVADA",
    "REJEITADA",
]);
const percentualFisicoField = zod_1.z.preprocess((v) => {
    if (v === "" || v === null || v === undefined)
        return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
}, zod_1.z.number().min(0).max(100).optional());
exports.EnviarPropostaPublicaSchema = zod_1.z
    .object({
    tipoCredito: exports.TipoCreditoPropostaEnum,
    nomeEmpreendimento: zod_1.z.string().min(3).max(255),
    nomeContato: zod_1.z.string().min(2).max(120),
    email: zod_1.z.string().email(),
    telefone: zod_1.z.string().min(10).max(20),
    empresa: zod_1.z.string().max(255).optional(),
    narrativa: zod_1.z.string().max(5000).optional(),
    dataBase: zod_1.z.coerce.date().optional(),
    percentualFisico: percentualFisicoField,
})
    .superRefine((data, ctx) => {
    if (data.tipoCredito !== "OBRA_NOVA" && data.percentualFisico == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Informe o percentual físico da obra (0–100).",
            path: ["percentualFisico"],
        });
    }
});
exports.ChecklistTipoCreditoQuerySchema = zod_1.z.object({
    tipo: exports.TipoCreditoPropostaEnum,
});
