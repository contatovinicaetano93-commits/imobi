"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JornadaResponseSchema = exports.JornadaPerfilEnum = exports.JornadaPassoIdEnum = void 0;
const zod_1 = require("zod");
exports.JornadaPassoIdEnum = zod_1.z.enum([
    "kyc",
    "viabilidade",
    "obra",
    "credito",
    "aguardando",
    "acompanhar",
    "concluido",
    "gestor_kyc",
    "gestor_etapas",
    "gestor_ok",
]);
exports.JornadaPerfilEnum = zod_1.z.enum(["tomador", "gestor", "outro"]);
exports.JornadaResponseSchema = zod_1.z.object({
    perfil: exports.JornadaPerfilEnum,
    passoAtual: exports.JornadaPassoIdEnum,
    titulo: zod_1.z.string(),
    descricao: zod_1.z.string(),
    href: zod_1.z.string(),
    concluido: zod_1.z.boolean(),
    passosConcluidos: zod_1.z.number().int().min(0),
    totalPassos: zod_1.z.number().int().min(0),
    progressoPct: zod_1.z.number().min(0).max(100),
    bloqueado: zod_1.z.string().optional(),
    fila: zod_1.z
        .object({
        kyc: zod_1.z.number().int().min(0),
        etapas: zod_1.z.number().int().min(0),
    })
        .optional(),
});
