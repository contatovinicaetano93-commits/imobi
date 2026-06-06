"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroVistoriaSchema = exports.AgendarVistoriaSchema = exports.RejeitarVistoriaSchema = exports.AprovarVistoriaSchema = void 0;
const zod_1 = require("zod");
exports.AprovarVistoriaSchema = zod_1.z.object({
    observacoes: zod_1.z.string().max(1000).optional(),
});
exports.RejeitarVistoriaSchema = zod_1.z.object({
    motivo: zod_1.z
        .string()
        .min(10, "Descreva o motivo com ao menos 10 caracteres")
        .max(1000),
});
exports.AgendarVistoriaSchema = zod_1.z.object({
    etapaId: zod_1.z.string().uuid(),
    engenheiroId: zod_1.z.string().uuid(),
    dataAgendada: zod_1.z.string().datetime(),
    observacoes: zod_1.z.string().max(500).optional(),
});
exports.FiltroVistoriaSchema = zod_1.z.object({
    engenheiroId: zod_1.z.string().uuid().optional(),
    obraId: zod_1.z.string().uuid().optional(),
    etapaId: zod_1.z.string().uuid().optional(),
    dataInicio: zod_1.z.string().datetime().optional(),
    dataFim: zod_1.z.string().datetime().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
});
