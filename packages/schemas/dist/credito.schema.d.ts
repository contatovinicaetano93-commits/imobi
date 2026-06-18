import { z } from "zod";
export declare const StatusCreditoEnum: z.ZodEnum<["ATIVO", "SUSPENSO", "VENCIDO", "QUITADO"]>;
export declare const TipoGarantiaEnum: z.ZodEnum<["IMOVEL", "RECEBIVEIS"]>;
export declare const SimulacaoCreditoSchema: z.ZodObject<{
    valorSolicitado: z.ZodNumber;
    prazoMeses: z.ZodNumber;
    tipoObra: z.ZodEnum<["RESIDENCIAL", "COMERCIAL", "MISTO"]>;
    scoreConstrutibilidade: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
    scoreConstrutibilidade?: number | undefined;
}, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
    scoreConstrutibilidade?: number | undefined;
}>;
export declare const SolicitacaoCreditoSchema: z.ZodObject<{
    valorSolicitado: z.ZodNumber;
    prazoMeses: z.ZodNumber;
    tipoObra: z.ZodEnum<["RESIDENCIAL", "COMERCIAL", "MISTO"]>;
    scoreConstrutibilidade: z.ZodOptional<z.ZodNumber>;
} & {
    obraId: z.ZodOptional<z.ZodString>;
    finalidade: z.ZodString;
    rendaMensalDeclarada: z.ZodNumber;
    tipoGarantia: z.ZodEnum<["IMOVEL", "RECEBIVEIS"]>;
    creditoPonte: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
    finalidade: string;
    rendaMensalDeclarada: number;
    tipoGarantia: "IMOVEL" | "RECEBIVEIS";
    creditoPonte: boolean;
    obraId?: string | undefined;
    scoreConstrutibilidade?: number | undefined;
}, {
    tipoObra: "RESIDENCIAL" | "COMERCIAL" | "MISTO";
    valorSolicitado: number;
    prazoMeses: number;
    finalidade: string;
    rendaMensalDeclarada: number;
    tipoGarantia: "IMOVEL" | "RECEBIVEIS";
    obraId?: string | undefined;
    scoreConstrutibilidade?: number | undefined;
    creditoPonte?: boolean | undefined;
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
export declare const DadosBancariosSchema: z.ZodEffects<z.ZodObject<{
    banco: z.ZodString;
    agencia: z.ZodOptional<z.ZodString>;
    conta: z.ZodOptional<z.ZodString>;
    tipoConta: z.ZodDefault<z.ZodEnum<["CORRENTE", "POUPANCA"]>>;
    tipoChavePix: z.ZodOptional<z.ZodEnum<["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA"]>>;
    chavePix: z.ZodOptional<z.ZodString>;
    nomeTitular: z.ZodString;
    cpfCnpjTitular: z.ZodString;
}, "strip", z.ZodTypeAny, {
    banco: string;
    tipoConta: "CORRENTE" | "POUPANCA";
    nomeTitular: string;
    cpfCnpjTitular: string;
    agencia?: string | undefined;
    conta?: string | undefined;
    tipoChavePix?: "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA" | undefined;
    chavePix?: string | undefined;
}, {
    banco: string;
    nomeTitular: string;
    cpfCnpjTitular: string;
    agencia?: string | undefined;
    conta?: string | undefined;
    tipoConta?: "CORRENTE" | "POUPANCA" | undefined;
    tipoChavePix?: "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA" | undefined;
    chavePix?: string | undefined;
}>, {
    banco: string;
    tipoConta: "CORRENTE" | "POUPANCA";
    nomeTitular: string;
    cpfCnpjTitular: string;
    agencia?: string | undefined;
    conta?: string | undefined;
    tipoChavePix?: "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA" | undefined;
    chavePix?: string | undefined;
}, {
    banco: string;
    nomeTitular: string;
    cpfCnpjTitular: string;
    agencia?: string | undefined;
    conta?: string | undefined;
    tipoConta?: "CORRENTE" | "POUPANCA" | undefined;
    tipoChavePix?: "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA" | undefined;
    chavePix?: string | undefined;
}>;
export declare const ConfirmarTransferenciaSchema: z.ZodObject<{
    observacao: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    observacao?: string | undefined;
}, {
    observacao?: string | undefined;
}>;
export type StatusCredito = z.infer<typeof StatusCreditoEnum>;
export type TipoGarantia = z.infer<typeof TipoGarantiaEnum>;
export type SimulacaoCreditoInput = z.infer<typeof SimulacaoCreditoSchema>;
export type SolicitacaoCreditoInput = z.infer<typeof SolicitacaoCreditoSchema>;
export type LiberacaoParcelaInput = z.infer<typeof LiberacaoParcelaSchema>;
export type DadosBancariosInput = z.infer<typeof DadosBancariosSchema>;
export type ConfirmarTransferenciaInput = z.infer<typeof ConfirmarTransferenciaSchema>;
