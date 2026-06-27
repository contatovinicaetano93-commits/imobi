import { z } from "zod";
export declare const TipoCreditoPropostaEnum: z.ZodEnum<["OBRA_NOVA", "OBRA_EM_ANDAMENTO", "CREDITO_PONTE"]>;
export declare const PropostaCreditoStatusEnum: z.ZodEnum<["RECEBIDA", "EM_ANALISE", "APROVADA", "REJEITADA"]>;
export declare const EnviarPropostaPublicaSchema: z.ZodEffects<z.ZodObject<{
    tipoCredito: z.ZodEnum<["OBRA_NOVA", "OBRA_EM_ANDAMENTO", "CREDITO_PONTE"]>;
    nomeEmpreendimento: z.ZodString;
    nomeContato: z.ZodString;
    email: z.ZodString;
    telefone: z.ZodString;
    empresa: z.ZodOptional<z.ZodString>;
    narrativa: z.ZodOptional<z.ZodString>;
    dataBase: z.ZodOptional<z.ZodDate>;
    percentualFisico: z.ZodEffects<z.ZodOptional<z.ZodNumber>, number | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    email: string;
    tipoCredito: "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";
    nomeEmpreendimento: string;
    nomeContato: string;
    telefone: string;
    empresa?: string | undefined;
    narrativa?: string | undefined;
    dataBase?: Date | undefined;
    percentualFisico?: number | undefined;
}, {
    email: string;
    tipoCredito: "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";
    nomeEmpreendimento: string;
    nomeContato: string;
    telefone: string;
    empresa?: string | undefined;
    narrativa?: string | undefined;
    dataBase?: Date | undefined;
    percentualFisico?: unknown;
}>, {
    email: string;
    tipoCredito: "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";
    nomeEmpreendimento: string;
    nomeContato: string;
    telefone: string;
    empresa?: string | undefined;
    narrativa?: string | undefined;
    dataBase?: Date | undefined;
    percentualFisico?: number | undefined;
}, {
    email: string;
    tipoCredito: "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";
    nomeEmpreendimento: string;
    nomeContato: string;
    telefone: string;
    empresa?: string | undefined;
    narrativa?: string | undefined;
    dataBase?: Date | undefined;
    percentualFisico?: unknown;
}>;
export declare const ChecklistTipoCreditoQuerySchema: z.ZodObject<{
    tipo: z.ZodEnum<["OBRA_NOVA", "OBRA_EM_ANDAMENTO", "CREDITO_PONTE"]>;
}, "strip", z.ZodTypeAny, {
    tipo: "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";
}, {
    tipo: "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";
}>;
export type TipoCreditoProposta = z.infer<typeof TipoCreditoPropostaEnum>;
export type PropostaCreditoStatus = z.infer<typeof PropostaCreditoStatusEnum>;
export type EnviarPropostaPublicaInput = z.infer<typeof EnviarPropostaPublicaSchema>;
export type ChecklistTipoCreditoQuery = z.infer<typeof ChecklistTipoCreditoQuerySchema>;
