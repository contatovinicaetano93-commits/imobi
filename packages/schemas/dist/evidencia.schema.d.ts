import { z } from "zod";
export declare const UploadEvidenciaSchema: z.ZodObject<{
    etapaId: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    accuracyMetros: z.ZodNumber;
    timestampCaptura: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    etapaId: string;
    latitude: number;
    longitude: number;
    accuracyMetros: number;
    timestampCaptura: string;
    descricao?: string | undefined;
}, {
    etapaId: string;
    latitude: number;
    longitude: number;
    accuracyMetros: number;
    timestampCaptura: string;
    descricao?: string | undefined;
}>;
export declare const ValidarEvidenciaSchema: z.ZodObject<{
    evidenciaId: z.ZodString;
    aprovado: z.ZodBoolean;
    observacao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    evidenciaId: string;
    aprovado: boolean;
    observacao?: string | undefined;
}, {
    evidenciaId: string;
    aprovado: boolean;
    observacao?: string | undefined;
}>;
export declare const FiltroEvidenciaSchema: z.ZodObject<{
    etapaId: z.ZodOptional<z.ZodString>;
    obraId: z.ZodOptional<z.ZodString>;
    validada: z.ZodOptional<z.ZodBoolean>;
    dataInicio: z.ZodOptional<z.ZodString>;
    dataFim: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    obraId?: string | undefined;
    etapaId?: string | undefined;
    validada?: boolean | undefined;
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
}, {
    obraId?: string | undefined;
    page?: number | undefined;
    etapaId?: string | undefined;
    validada?: boolean | undefined;
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
    limit?: number | undefined;
}>;
export type UploadEvidenciaInput = z.infer<typeof UploadEvidenciaSchema>;
export type ValidarEvidenciaInput = z.infer<typeof ValidarEvidenciaSchema>;
export type FiltroEvidenciaInput = z.infer<typeof FiltroEvidenciaSchema>;
