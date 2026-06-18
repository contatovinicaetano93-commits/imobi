"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroEvidenciaSchema = exports.ValidarEvidenciaSchema = exports.UploadEvidenciaSchema = void 0;
const zod_1 = require("zod");
exports.UploadEvidenciaSchema = zod_1.z.object({
    etapaId: zod_1.z.string().uuid(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    accuracyMetros: zod_1.z
        .number()
        .min(1, "Precisão GPS suspeita — use o GPS real do dispositivo.")
        .max(15, "Precisão GPS insuficiente. Aguarde sinal melhor."),
    timestampCaptura: zod_1.z.string().datetime(),
    altitude: zod_1.z.number().nullable().optional(),
    heading: zod_1.z.number().min(-1).max(360).nullable().optional(),
    speed: zod_1.z.number().min(-1).nullable().optional(),
    isMockLocation: zod_1.z.boolean().optional().default(false),
    descricao: zod_1.z.string().max(500).optional(),
});
exports.ValidarEvidenciaSchema = zod_1.z.object({
    evidenciaId: zod_1.z.string().uuid(),
    aprovado: zod_1.z.boolean(),
    observacao: zod_1.z.string().max(1000).optional(),
});
exports.FiltroEvidenciaSchema = zod_1.z.object({
    etapaId: zod_1.z.string().uuid().optional(),
    obraId: zod_1.z.string().uuid().optional(),
    validada: zod_1.z.boolean().optional(),
    dataInicio: zod_1.z.string().datetime().optional(),
    dataFim: zod_1.z.string().datetime().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
});
