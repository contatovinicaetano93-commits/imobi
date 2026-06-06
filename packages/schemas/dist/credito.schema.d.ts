import { z } from "zod";
export declare const StatusCreditoEnum: z.ZodEnum<["ATIVO", "SUSPENSO", "VENCIDO", "QUITADO"]>;
export declare const SimulacaoCreditoSchema: z.ZodObject<{
    valorSolicitado: z.ZodNumber;
    prazoMeses: z.ZodNumber;
    tipoObra: z.ZodEnum<["RESIDENCIAL", "COMERCIAL", "MISTO"]>;
}, "strip", z.ZodTypeAny, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
}, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
}>;
export declare const SolicitacaoCreditoSchema: z.ZodObject<{
    valorSolicitado: z.ZodNumber;
    prazoMeses: z.ZodNumber;
    tipoObra: z.ZodEnum<["RESIDENCIAL", "COMERCIAL", "MISTO"]>;
} & {
    obraId: z.ZodOptional<z.ZodString>;
    finalidade: z.ZodString;
    rendaMensalDeclarada: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
    finalidade: string;
    rendaMensalDeclarada: number;
    obraId?: string | undefined;
}, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
    finalidade: string;
    rendaMensalDeclarada: number;
    obraId?: string | undefined;
}>;
export declare const LiberacaoParcelaSchema: z.ZodObject<{
    creditoId: z.ZodString;
    etapaId: z.ZodString;
    valorLiberacao: z.ZodNumber;
    observacaoGestor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    creditoId: string;
    etapaId: string;
    valorLiberacao: number;
    observacaoGestor?: string | undefined;
}, {
    creditoId: string;
    etapaId: string;
    valorLiberacao: number;
    observacaoGestor?: string | undefined;
}>;
export type StatusCredito = z.infer<typeof StatusCreditoEnum>;
export type SimulacaoCreditoInput = z.infer<typeof SimulacaoCreditoSchema>;
export type SolicitacaoCreditoInput = z.infer<typeof SolicitacaoCreditoSchema>;
export type LiberacaoParcelaInput = z.infer<typeof LiberacaoParcelaSchema>;
