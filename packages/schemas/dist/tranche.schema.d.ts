import { z } from "zod";
/** Gate sequencial: Engenheiro valida a fase → Admin libera o valor. */
export declare const TrancheStatusEnum: z.ZodEnum<["PENDENTE", "VALIDADA_ENGENHEIRO", "LIBERADA_ADMIN", "REJEITADA"]>;
export type TrancheStatus = z.infer<typeof TrancheStatusEnum>;
export declare const CriarTrancheSchema: z.ZodObject<{
    obraId: z.ZodString;
    numero: z.ZodNumber;
    valor: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    obraId: string;
    numero: number;
    valor: number;
}, {
    obraId: string;
    numero: number;
    valor: number;
}>;
export type CriarTrancheInput = z.infer<typeof CriarTrancheSchema>;
export declare const AnexarEvidenciaSchema: z.ZodObject<{
    url: z.ZodString;
    descricao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url: string;
    descricao?: string | undefined;
}, {
    url: string;
    descricao?: string | undefined;
}>;
export type AnexarEvidenciaInput = z.infer<typeof AnexarEvidenciaSchema>;
/** Engenheiro valida a fase da obra (não libera dinheiro). */
export declare const ValidarTrancheSchema: z.ZodObject<{
    aprovado: z.ZodBoolean;
    observacao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    aprovado: boolean;
    observacao?: string | undefined;
}, {
    aprovado: boolean;
    observacao?: string | undefined;
}>;
export type ValidarTrancheInput = z.infer<typeof ValidarTrancheSchema>;
/** Admin libera o valor após validação do engenheiro. */
export declare const LiberarTrancheSchema: z.ZodObject<{
    confirmacao: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    confirmacao: true;
}, {
    confirmacao: true;
}>;
export type LiberarTrancheInput = z.infer<typeof LiberarTrancheSchema>;
