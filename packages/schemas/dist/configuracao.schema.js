"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfiguracaoSistemaSchema = void 0;
const zod_1 = require("zod");
exports.ConfiguracaoSistemaSchema = zod_1.z
    .object({
    taxaMensalMin: zod_1.z.number().min(0.1).max(10),
    taxaMensalMax: zod_1.z.number().min(0.1).max(10),
    taxaPadrao: zod_1.z.number().min(0.1).max(10),
    valorMinCredito: zod_1.z.number().min(10000).max(50000000),
    valorMaxCredito: zod_1.z.number().min(10000).max(50000000),
    prazoMaxMeses: zod_1.z.number().int().min(6).max(360),
    raioValidacaoMetrosPadrao: zod_1.z.number().int().min(10).max(5000),
    toleranciaPrecisaoGps: zod_1.z.number().int().min(5).max(200),
    diasAprovacao: zod_1.z.number().int().min(1).max(60),
    limiteEvidenciasMB: zod_1.z.number().int().min(1).max(50),
    modoManutencao: zod_1.z.boolean(),
})
    .refine((d) => d.taxaMensalMin <= d.taxaPadrao && d.taxaPadrao <= d.taxaMensalMax, {
    message: "Taxa padrão deve estar entre a mínima e a máxima",
})
    .refine((d) => d.valorMinCredito <= d.valorMaxCredito, {
    message: "Valor mínimo não pode exceder o valor máximo",
});
