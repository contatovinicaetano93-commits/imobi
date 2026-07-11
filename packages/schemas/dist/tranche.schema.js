"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiberarTrancheSchema = exports.ValidarTrancheSchema = exports.AnexarEvidenciaSchema = exports.CriarTrancheSchema = exports.TrancheStatusEnum = void 0;
const zod_1 = require("zod");
/** Gate sequencial: Engenheiro valida a fase → Admin libera o valor. */
exports.TrancheStatusEnum = zod_1.z.enum([
    "PENDENTE",
    "VALIDADA_ENGENHEIRO",
    "LIBERADA_ADMIN",
    "REJEITADA",
]);
exports.CriarTrancheSchema = zod_1.z.object({
    obraId: zod_1.z.string().uuid(),
    numero: zod_1.z.number().int().positive(),
    valor: zod_1.z.number().positive(),
});
exports.AnexarEvidenciaSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    descricao: zod_1.z.string().max(500).optional(),
});
/** Engenheiro valida a fase da obra (não libera dinheiro). */
exports.ValidarTrancheSchema = zod_1.z.object({
    aprovado: zod_1.z.boolean(),
    observacao: zod_1.z.string().max(1000).optional(),
});
/** Admin libera o valor após validação do engenheiro. */
exports.LiberarTrancheSchema = zod_1.z.object({
    confirmacao: zod_1.z.literal(true),
});
