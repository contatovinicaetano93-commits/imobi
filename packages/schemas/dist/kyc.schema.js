"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYC_DOC_CATALOG = exports.KYC_ACCEPT_INPUT = exports.KYC_ACCEPTED_MIME_TYPES = exports.KYC_MAX_FILE_BYTES = exports.KycDocumentoTipoEnum = void 0;
exports.validateKycFile = validateKycFile;
const zod_1 = require("zod");
exports.KycDocumentoTipoEnum = zod_1.z.enum([
    "RG_FRENTE",
    "RG_VERSO",
    "SELFIE",
    "COMPROVANTE",
]);
exports.KYC_MAX_FILE_BYTES = 10 * 1024 * 1024;
exports.KYC_ACCEPTED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
];
exports.KYC_ACCEPT_INPUT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf";
function validateKycFile(file) {
    if (file.size > exports.KYC_MAX_FILE_BYTES) {
        return { ok: false, message: "Arquivo muito grande (máx. 10 MB)" };
    }
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf)
        return { ok: true };
    const type = file.type || "";
    const mimeOk = exports.KYC_ACCEPTED_MIME_TYPES.includes(type)
        || type.startsWith("image/");
    if (!mimeOk) {
        return { ok: false, message: "Formato não suportado. Use JPG, PNG, WEBP ou PDF." };
    }
    return { ok: true };
}
exports.KYC_DOC_CATALOG = [
    { tipo: "RG_FRENTE", label: "RG — Frente", desc: "Documento de Identidade (frente)" },
    { tipo: "RG_VERSO", label: "RG — Verso", desc: "Documento de Identidade (verso)" },
    { tipo: "SELFIE", label: "Selfie c/ documento", desc: "Foto sua segurando o documento" },
    { tipo: "COMPROVANTE", label: "Comprovante de residência", desc: "Conta de luz, água ou banco" },
];
