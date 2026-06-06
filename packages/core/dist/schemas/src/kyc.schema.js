"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiltroKycSchema = exports.RejeitarDocumentoKycSchema = exports.UploadDocumentoKycSchema = exports.StatusDocumentoEnum = exports.TipoDocumentoEnum = void 0;
const zod_1 = require("zod");
exports.TipoDocumentoEnum = zod_1.z.enum([
    "RG",
    "CPF",
    "CNH",
    "Selfie",
    "ComprovanteRenda",
    "ComprovanteEndereco",
]);
exports.StatusDocumentoEnum = zod_1.z.enum([
    "PENDENTE",
    "APROVADO",
    "REJEITADO",
]);
exports.UploadDocumentoKycSchema = zod_1.z.object({
    tipo: exports.TipoDocumentoEnum,
    url: zod_1.z.string().url("URL do documento inválida"),
});
exports.RejeitarDocumentoKycSchema = zod_1.z.object({
    motivo: zod_1.z
        .string()
        .min(10, "Descreva o motivo com ao menos 10 caracteres")
        .max(500),
});
exports.FiltroKycSchema = zod_1.z.object({
    status: exports.StatusDocumentoEnum.optional(),
    tipo: exports.TipoDocumentoEnum.optional(),
    usuarioId: zod_1.z.string().uuid().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().min(1).max(100).default(20),
});
