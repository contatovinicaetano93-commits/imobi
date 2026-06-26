import { z } from "zod";
export declare const KycDocumentoTipoEnum: z.ZodEnum<["RG_FRENTE", "RG_VERSO", "SELFIE", "COMPROVANTE"]>;
export declare const KycRejeitarDocumentoSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export type KycDocumentoTipo = z.infer<typeof KycDocumentoTipoEnum>;
export type KycRejeitarDocumentoInput = z.infer<typeof KycRejeitarDocumentoSchema>;
