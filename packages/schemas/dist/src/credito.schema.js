"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiberacaoParcelaSchema = exports.SolicitacaoCreditoSchema = exports.SimulacaoCreditoSchema = exports.StatusCreditoEnum = void 0;
const zod_1 = require("zod");
exports.StatusCreditoEnum = zod_1.z.enum([
    "ATIVO",
    "SUSPENSO",
    "VENCIDO",
    "QUITADO",
]);
exports.SimulacaoCreditoSchema = zod_1.z.object({
    valorSolicitado: zod_1.z
        .number()
        .min(10000, "Valor mínimo R$ 10.000")
        .max(5000000, "Valor máximo R$ 5.000.000"),
    prazoMeses: zod_1.z
        .number()
        .int()
        .min(12, "Prazo mínimo 12 meses")
        .max(180, "Prazo máximo 180 meses"),
    tipoObra: zod_1.z.enum(["RESIDENCIAL", "COMERCIAL", "MISTO"]),
});
exports.SolicitacaoCreditoSchema = exports.SimulacaoCreditoSchema.extend({
    obraId: zod_1.z.string().uuid().optional(),
    finalidade: zod_1.z.string().max(500),
    rendaMensalDeclarada: zod_1.z.number().positive(),
});
exports.LiberacaoParcelaSchema = zod_1.z.object({
    creditoId: zod_1.z.string().uuid(),
    etapaId: zod_1.z.string().uuid(),
    valorLiberacao: zod_1.z.number().positive(),
    observacaoGestor: zod_1.z.string().max(1000).optional(),
});
