import { z } from "zod";
export declare const TipoUsuarioEnum: z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR"]>;
export declare const KycStatusEnum: z.ZodEnum<["PENDENTE", "EM_VERIFICACAO", "APROVADO", "REJEITADO"]>;
export declare const CadastroUsuarioSchema: z.ZodObject<{
    nome: z.ZodString;
    cpf: z.ZodString;
    email: z.ZodString;
    telefone: z.ZodString;
    senha: z.ZodString;
    consentidoTermos: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    consentidoPrivacy: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    consentidoKyc: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    consentidoMarketing: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    senha: string;
    consentidoTermos: boolean;
    consentidoPrivacy: boolean;
    consentidoKyc: boolean;
    consentidoMarketing: boolean;
}, {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    senha: string;
    consentidoTermos: boolean;
    consentidoPrivacy: boolean;
    consentidoKyc: boolean;
    consentidoMarketing?: boolean | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    senha: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    senha: string;
}, {
    email: string;
    senha: string;
}>;
export declare const EsqueceuSenhaSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const RedefinirSenhaSchema: z.ZodObject<{
    token: z.ZodString;
    novaSenha: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    novaSenha: string;
}, {
    token: string;
    novaSenha: string;
}>;
export declare const UpdateUsuarioSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    consentidoTermos: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoPrivacy: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoKyc: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoMarketing: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    consentidoTermos?: boolean | undefined;
    consentidoPrivacy?: boolean | undefined;
    consentidoKyc?: boolean | undefined;
    consentidoMarketing?: boolean | undefined;
}, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    consentidoTermos?: boolean | undefined;
    consentidoPrivacy?: boolean | undefined;
    consentidoKyc?: boolean | undefined;
    consentidoMarketing?: boolean | undefined;
}>;
/** Campos editáveis pelo usuário em /dashboard/perfil */
export declare const UpdatePerfilUsuarioSchema: z.ZodObject<{
    nome: z.ZodString;
    telefone: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    telefone: string;
}, {
    nome: string;
    telefone: string;
}>;
/** Conta bancária da empresa (pagamentos manuais SIPOC). */
export declare const ContaBancariaEmpresaSchema: z.ZodObject<{
    contaTitular: z.ZodString;
    contaBanco: z.ZodString;
    contaAgencia: z.ZodString;
    contaNumero: z.ZodString;
    contaPix: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    contaTitular: string;
    contaBanco: string;
    contaAgencia: string;
    contaNumero: string;
    contaPix?: string | undefined;
}, {
    contaTitular: string;
    contaBanco: string;
    contaAgencia: string;
    contaNumero: string;
    contaPix?: string | undefined;
}>;
export type ContaBancariaEmpresaInput = z.infer<typeof ContaBancariaEmpresaSchema>;
export declare const FUNCOES_PAINEL: readonly ["obras", "credito", "simulador", "score", "kyc", "notificacoes", "engenharia", "gestor", "due-diligence", "fundos", "relatorios", "comercial", "construtor"];
export declare const FuncaoPainelEnum: z.ZodEnum<["obras", "credito", "simulador", "score", "kyc", "notificacoes", "engenharia", "gestor", "due-diligence", "fundos", "relatorios", "comercial", "construtor"]>;
export declare const AtualizarUsuarioAdminSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    kycStatus: z.ZodOptional<z.ZodEnum<["PENDENTE", "EM_VERIFICACAO", "APROVADO", "REJEITADO"]>>;
    novaSenha: z.ZodOptional<z.ZodString>;
    tipo: z.ZodOptional<z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR"]>>;
    bloqueado: z.ZodOptional<z.ZodBoolean>;
    funcoesBloqueadas: z.ZodOptional<z.ZodArray<z.ZodEnum<["obras", "credito", "simulador", "score", "kyc", "notificacoes", "engenharia", "gestor", "due-diligence", "fundos", "relatorios", "comercial", "construtor"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    tipo?: "PARCEIRO" | "COMERCIAL" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "GESTOR" | "GESTOR_FUNDO" | "ENGENHEIRO" | "CONSTRUTOR" | undefined;
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    novaSenha?: string | undefined;
    kycStatus?: "APROVADO" | "PENDENTE" | "EM_VERIFICACAO" | "REJEITADO" | undefined;
    bloqueado?: boolean | undefined;
    funcoesBloqueadas?: ("comercial" | "obras" | "credito" | "simulador" | "score" | "kyc" | "notificacoes" | "engenharia" | "gestor" | "due-diligence" | "fundos" | "relatorios" | "construtor")[] | undefined;
}, {
    tipo?: "PARCEIRO" | "COMERCIAL" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "GESTOR" | "GESTOR_FUNDO" | "ENGENHEIRO" | "CONSTRUTOR" | undefined;
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    novaSenha?: string | undefined;
    kycStatus?: "APROVADO" | "PENDENTE" | "EM_VERIFICACAO" | "REJEITADO" | undefined;
    bloqueado?: boolean | undefined;
    funcoesBloqueadas?: ("comercial" | "obras" | "credito" | "simulador" | "score" | "kyc" | "notificacoes" | "engenharia" | "gestor" | "due-diligence" | "fundos" | "relatorios" | "construtor")[] | undefined;
}>;
export type TipoUsuario = z.infer<typeof TipoUsuarioEnum>;
export type KycStatus = z.infer<typeof KycStatusEnum>;
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
export type UpdatePerfilUsuarioInput = z.infer<typeof UpdatePerfilUsuarioSchema>;
export type EsqueceuSenhaInput = z.infer<typeof EsqueceuSenhaSchema>;
export type RedefinirSenhaInput = z.infer<typeof RedefinirSenhaSchema>;
export type FuncaoPainel = z.infer<typeof FuncaoPainelEnum>;
export type AtualizarUsuarioAdminInput = z.infer<typeof AtualizarUsuarioAdminSchema>;
