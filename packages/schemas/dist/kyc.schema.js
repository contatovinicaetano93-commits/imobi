"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycRejeitarDocumentoSchema = exports.KycDocumentoTipoEnum = void 0;
const zod_1 = require("zod");
exports.KycDocumentoTipoEnum = zod_1.z.enum([
    "RG_FRENTE",
    "RG_VERSO",
    "SELFIE",
    "COMPROVANTE",
]);
exports.KycRejeitarDocumentoSchema = zod_1.z.object({
    motivo: zod_1.z.string().min(3, "Informe o motivo da rejeição").max(500),
});
