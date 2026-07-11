"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevisarDocumentoSchema = exports.EnviarDocumentoSchema = exports.DocumentoStatusEnum = void 0;
const zod_1 = require("zod");
/** KYC do cliente e documentos da obra — um único modelo, `tipo` diferencia. */
exports.DocumentoStatusEnum = zod_1.z.enum(["PENDENTE", "APROVADO", "REJEITADO"]);
exports.EnviarDocumentoSchema = zod_1.z.object({
    obraId: zod_1.z.string().uuid(),
    tipo: zod_1.z.string().min(2).max(60),
    url: zod_1.z.string().url(),
});
exports.RevisarDocumentoSchema = zod_1.z.object({
    status: zod_1.z.enum(["APROVADO", "REJEITADO"]),
});
