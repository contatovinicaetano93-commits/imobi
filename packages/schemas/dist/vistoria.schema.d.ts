import { z } from "zod";
export declare const AprovarVistoriaSchema: z.ZodObject<{
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    observacoes?: string | undefined;
}, {
    observacoes?: string | undefined;
}>;
export declare const RejeitarVistoriaSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export declare const AgendarVistoriaSchema: z.ZodObject<{
    etapaId: z.ZodString;
    engenheiroId: z.ZodString;
    dataAgendada: z.ZodString;
    observacoes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    etapaId: string;
    engenheiroId: string;
    dataAgendada: string;
    observacoes?: string | undefined;
}, {
    etapaId: string;
    engenheiroId: string;
    dataAgendada: string;
    observacoes?: string | undefined;
}>;
export declare const FiltroVistoriaSchema: z.ZodObject<{
    engenheiroId: z.ZodOptional<z.ZodString>;
    obraId: z.ZodOptional<z.ZodString>;
    etapaId: z.ZodOptional<z.ZodString>;
    dataInicio: z.ZodOptional<z.ZodString>;
    dataFim: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    obraId?: string | undefined;
    etapaId?: string | undefined;
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
    engenheiroId?: string | undefined;
}, {
    obraId?: string | undefined;
    page?: number | undefined;
    etapaId?: string | undefined;
    dataInicio?: string | undefined;
    dataFim?: string | undefined;
    limit?: number | undefined;
    engenheiroId?: string | undefined;
}>;
export type AprovarVistoriaInput = z.infer<typeof AprovarVistoriaSchema>;
export type RejeitarVistoriaInput = z.infer<typeof RejeitarVistoriaSchema>;
export type AgendarVistoriaInput = z.infer<typeof AgendarVistoriaSchema>;
export type FiltroVistoriaInput = z.infer<typeof FiltroVistoriaSchema>;
