"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomologarObraSchema = exports.CriarObraSchema = exports.EtapaFunilEnum = void 0;
const zod_1 = require("zod");
/** Fonte única do funil — dirige nav, middleware e progresso guiado. */
exports.EtapaFunilEnum = zod_1.z.enum([
    "KYC_PENDENTE",
    "DOSSIE_EM_ANALISE",
    "APROVADO",
    "OBRA_CADASTRADA",
    "HOMOLOGADA",
    "EM_ANDAMENTO",
    "QUITADO",
]);
exports.CriarObraSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120),
    endereco: zod_1.z.string().min(3).max(200),
    valorCredito: zod_1.z.number().positive(),
});
exports.HomologarObraSchema = zod_1.z.object({
    engenheiroId: zod_1.z.string().uuid(),
});
