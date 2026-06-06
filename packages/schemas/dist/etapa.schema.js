"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroEtapaSchema = exports.AtualizarStatusEtapaSchema = exports.RejeitarEtapaSchema = exports.AprovarEtapaSchema = void 0;
const zod_1 = require("zod");
exports.AprovarEtapaSchema = zod_1.z.object({
    observacao: zod_1.z.string().max(1000).optional(),
});
exports.RejeitarEtapaSchema = zod_1.z.object({
    motivo: zod_1.z
        .string()
        .min(10, "Descreva o motivo com ao menos 10 caracteres")
        .max(1000),
});
exports.AtualizarStatusEtapaSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "PLANEJADA",
        "EM_EXECUCAO",
        "AGUARDANDO_VISTORIA",
        "REPROVADA",
        "CONCLUIDA",
    ]),
});
exports.FiltroEtapaSchema = zod_1.z.object({
    obraId: zod_1.z.string().uuid().optional(),
    status: zod_1.z
        .enum([
        "PLANEJADA",
        "EM_EXECUCAO",
        "AGUARDANDO_VISTORIA",
        "REPROVADA",
        "CONCLUIDA",
    ])
        .optional(),
});
