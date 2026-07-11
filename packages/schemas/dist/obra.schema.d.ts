import { z } from "zod";
/** Fonte única do funil — dirige nav, middleware e progresso guiado. */
export declare const EtapaFunilEnum: z.ZodEnum<["KYC_PENDENTE", "DOSSIE_EM_ANALISE", "APROVADO", "OBRA_CADASTRADA", "HOMOLOGADA", "EM_ANDAMENTO", "QUITADO"]>;
export type EtapaFunil = z.infer<typeof EtapaFunilEnum>;
export declare const CriarObraSchema: z.ZodObject<{
    nome: z.ZodString;
    endereco: z.ZodString;
    valorCredito: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    nome: string;
    endereco: string;
    valorCredito: number;
}, {
    nome: string;
    endereco: string;
    valorCredito: number;
}>;
export type CriarObraInput = z.infer<typeof CriarObraSchema>;
export declare const HomologarObraSchema: z.ZodObject<{
    engenheiroId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    engenheiroId: string;
}, {
    engenheiroId: string;
}>;
export type HomologarObraInput = z.infer<typeof HomologarObraSchema>;
