import { z } from "zod";
/** KYC do cliente e documentos da obra — um único modelo, `tipo` diferencia. */
export declare const DocumentoStatusEnum: z.ZodEnum<["PENDENTE", "APROVADO", "REJEITADO"]>;
export type DocumentoStatus = z.infer<typeof DocumentoStatusEnum>;
export declare const EnviarDocumentoSchema: z.ZodObject<{
    obraId: z.ZodString;
    tipo: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    obraId: string;
    tipo: string;
    url: string;
}, {
    obraId: string;
    tipo: string;
    url: string;
}>;
export type EnviarDocumentoInput = z.infer<typeof EnviarDocumentoSchema>;
export declare const RevisarDocumentoSchema: z.ZodObject<{
    status: z.ZodEnum<["APROVADO", "REJEITADO"]>;
}, "strip", z.ZodTypeAny, {
    status: "APROVADO" | "REJEITADO";
}, {
    status: "APROVADO" | "REJEITADO";
}>;
export type RevisarDocumentoInput = z.infer<typeof RevisarDocumentoSchema>;
