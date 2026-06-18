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
export declare const FUNCOES_PAINEL: readonly ["obras", "credito", "simulador", "score", "kyc", "notificacoes", "engenharia", "gestor", "due-diligence", "fundos", "relatorios", "comercial", "construtor"];
export declare const FuncaoPainelEnum: z.ZodEnum<["obras", "credito", "simulador", "score", "kyc", "notificacoes", "engenharia", "gestor", "due-diligence", "fundos", "relatorios", "comercial", "construtor"]>;
export declare const AtualizarUsuarioAdminSchema: z.ZodObject<{
    tipo: z.ZodOptional<z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR"]>>;
    bloqueado: z.ZodOptional<z.ZodBoolean>;
    funcoesBloqueadas: z.ZodOptional<z.ZodArray<z.ZodEnum<["obras", "credito", "simulador", "score", "kyc", "notificacoes", "engenharia", "gestor", "due-diligence", "fundos", "relatorios", "comercial", "construtor"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    tipo?: "PARCEIRO" | "COMERCIAL" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "GESTOR" | "GESTOR_FUNDO" | "ENGENHEIRO" | "CONSTRUTOR" | undefined;
    bloqueado?: boolean | undefined;
    funcoesBloqueadas?: ("comercial" | "obras" | "credito" | "simulador" | "score" | "kyc" | "notificacoes" | "engenharia" | "gestor" | "due-diligence" | "fundos" | "relatorios" | "construtor")[] | undefined;
}, {
    tipo?: "PARCEIRO" | "COMERCIAL" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "GESTOR" | "GESTOR_FUNDO" | "ENGENHEIRO" | "CONSTRUTOR" | undefined;
    bloqueado?: boolean | undefined;
    funcoesBloqueadas?: ("comercial" | "obras" | "credito" | "simulador" | "score" | "kyc" | "notificacoes" | "engenharia" | "gestor" | "due-diligence" | "fundos" | "relatorios" | "construtor")[] | undefined;
}>;
export declare const Totp2faConfirmarSchema: z.ZodObject<{
    totpCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    totpCode: string;
}, {
    totpCode: string;
}>;
export declare const Totp2faVerificarLoginSchema: z.ZodObject<{
    tempToken: z.ZodString;
    totpCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    totpCode: string;
    tempToken: string;
}, {
    totpCode: string;
    tempToken: string;
}>;
export declare const Totp2faDesativarSchema: z.ZodObject<{
    totpCode: z.ZodString;
    senha: z.ZodString;
}, "strip", z.ZodTypeAny, {
    senha: string;
    totpCode: string;
}, {
    senha: string;
    totpCode: string;
}>;
export type TipoUsuario = z.infer<typeof TipoUsuarioEnum>;
export type KycStatus = z.infer<typeof KycStatusEnum>;
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
export type EsqueceuSenhaInput = z.infer<typeof EsqueceuSenhaSchema>;
export type RedefinirSenhaInput = z.infer<typeof RedefinirSenhaSchema>;
export type FuncaoPainel = z.infer<typeof FuncaoPainelEnum>;
export type AtualizarUsuarioAdminInput = z.infer<typeof AtualizarUsuarioAdminSchema>;
export type Totp2faConfirmarInput = z.infer<typeof Totp2faConfirmarSchema>;
export type Totp2faVerificarLoginInput = z.infer<typeof Totp2faVerificarLoginSchema>;
export type Totp2faDesativarInput = z.infer<typeof Totp2faDesativarSchema>;
