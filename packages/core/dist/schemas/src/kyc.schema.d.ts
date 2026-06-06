import { z } from "zod";
export declare const TipoDocumentoEnum: z.ZodEnum<["RG", "CPF", "CNH", "Selfie", "ComprovanteRenda", "ComprovanteEndereco"]>;
export declare const StatusDocumentoEnum: z.ZodEnum<["PENDENTE", "APROVADO", "REJEITADO"]>;
export declare const UploadDocumentoKycSchema: z.ZodObject<{
    tipo: z.ZodEnum<["RG", "CPF", "CNH", "Selfie", "ComprovanteRenda", "ComprovanteEndereco"]>;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tipo: "RG" | "CPF" | "CNH" | "Selfie" | "ComprovanteRenda" | "ComprovanteEndereco";
    url: string;
}, {
    tipo: "RG" | "CPF" | "CNH" | "Selfie" | "ComprovanteRenda" | "ComprovanteEndereco";
    url: string;
}>;
export declare const RejeitarDocumentoKycSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export declare const FiltroKycSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["PENDENTE", "APROVADO", "REJEITADO"]>>;
    tipo: z.ZodOptional<z.ZodEnum<["RG", "CPF", "CNH", "Selfie", "ComprovanteRenda", "ComprovanteEndereco"]>>;
    usuarioId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "PENDENTE" | "APROVADO" | "REJEITADO" | undefined;
    tipo?: "RG" | "CPF" | "CNH" | "Selfie" | "ComprovanteRenda" | "ComprovanteEndereco" | undefined;
    usuarioId?: string | undefined;
}, {
    status?: "PENDENTE" | "APROVADO" | "REJEITADO" | undefined;
    tipo?: "RG" | "CPF" | "CNH" | "Selfie" | "ComprovanteRenda" | "ComprovanteEndereco" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    usuarioId?: string | undefined;
}>;
export type TipoDocumento = z.infer<typeof TipoDocumentoEnum>;
export type StatusDocumento = z.infer<typeof StatusDocumentoEnum>;
export type UploadDocumentoKycInput = z.infer<typeof UploadDocumentoKycSchema>;
export type RejeitarDocumentoKycInput = z.infer<typeof RejeitarDocumentoKycSchema>;
export type FiltroKycInput = z.infer<typeof FiltroKycSchema>;
