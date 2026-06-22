import { z } from "zod";
export declare const KycDocumentoTipoEnum: z.ZodEnum<["RG_FRENTE", "RG_VERSO", "SELFIE", "COMPROVANTE"]>;
export type KycDocumentoTipo = z.infer<typeof KycDocumentoTipoEnum>;
export declare const KYC_MAX_FILE_BYTES: number;
export declare const KYC_ACCEPTED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
export declare const KYC_ACCEPT_INPUT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf";
export declare function validateKycFile(file: File): {
    ok: true;
} | {
    ok: false;
    message: string;
};
export declare const KYC_DOC_CATALOG: Array<{
    tipo: KycDocumentoTipo;
    label: string;
    desc: string;
}>;
