import { z } from "zod";
export declare const AprovarEtapaSchema: z.ZodObject<{
    observacao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    observacao?: string | undefined;
}, {
    observacao?: string | undefined;
}>;
export declare const RejeitarEtapaSchema: z.ZodObject<{
    motivo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    motivo: string;
}, {
    motivo: string;
}>;
export declare const AtualizarStatusEtapaSchema: z.ZodObject<{
    status: z.ZodEnum<["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA", "REPROVADA", "CONCLUIDA"]>;
}, "strip", z.ZodTypeAny, {
    status: "EM_EXECUCAO" | "CONCLUIDA" | "PLANEJADA" | "AGUARDANDO_VISTORIA" | "REPROVADA";
}, {
    status: "EM_EXECUCAO" | "CONCLUIDA" | "PLANEJADA" | "AGUARDANDO_VISTORIA" | "REPROVADA";
}>;
export declare const FiltroEtapaSchema: z.ZodObject<{
    obraId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PLANEJADA", "EM_EXECUCAO", "AGUARDANDO_VISTORIA", "REPROVADA", "CONCLUIDA"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "EM_EXECUCAO" | "CONCLUIDA" | "PLANEJADA" | "AGUARDANDO_VISTORIA" | "REPROVADA" | undefined;
    obraId?: string | undefined;
}, {
    status?: "EM_EXECUCAO" | "CONCLUIDA" | "PLANEJADA" | "AGUARDANDO_VISTORIA" | "REPROVADA" | undefined;
    obraId?: string | undefined;
}>;
export type AprovarEtapaInput = z.infer<typeof AprovarEtapaSchema>;
export type RejeitarEtapaInput = z.infer<typeof RejeitarEtapaSchema>;
export type AtualizarStatusEtapaInput = z.infer<typeof AtualizarStatusEtapaSchema>;
export type FiltroEtapaInput = z.infer<typeof FiltroEtapaSchema>;
