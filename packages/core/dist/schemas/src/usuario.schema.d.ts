import { z } from "zod";
export declare const TipoUsuarioEnum: z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"]>;
export declare const KycStatusEnum: z.ZodEnum<["PENDENTE", "EM_VERIFICACAO", "APROVADO", "REJEITADO"]>;
export declare const CadastroUsuarioSchema: z.ZodObject<{
    nome: z.ZodString;
    cpf: z.ZodString;
    email: z.ZodString;
    telefone: z.ZodString;
    senha: z.ZodString;
    tipo: z.ZodDefault<z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"]>>;
    consentidoTermos: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    consentidoPrivacy: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    consentidoKyc: z.ZodEffects<z.ZodBoolean, boolean, boolean>;
    consentidoMarketing: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    senha: string;
    tipo: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO";
    consentidoTermos: boolean;
    consentidoPrivacy: boolean;
    consentidoKyc: boolean;
    consentidoMarketing: boolean;
}, {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    senha: string;
    consentidoTermos: boolean;
    consentidoPrivacy: boolean;
    consentidoKyc: boolean;
    tipo?: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO" | undefined;
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
    tipo: z.ZodOptional<z.ZodDefault<z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"]>>>;
    consentidoTermos: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoPrivacy: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoKyc: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoMarketing: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    tipo?: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO" | undefined;
    consentidoTermos?: boolean | undefined;
    consentidoPrivacy?: boolean | undefined;
    consentidoKyc?: boolean | undefined;
    consentidoMarketing?: boolean | undefined;
}, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    tipo?: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO" | undefined;
    consentidoTermos?: boolean | undefined;
    consentidoPrivacy?: boolean | undefined;
    consentidoKyc?: boolean | undefined;
    consentidoMarketing?: boolean | undefined;
}>;
export type TipoUsuario = z.infer<typeof TipoUsuarioEnum>;
export type KycStatus = z.infer<typeof KycStatusEnum>;
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
export type EsqueceuSenhaInput = z.infer<typeof EsqueceuSenhaSchema>;
export type RedefinirSenhaInput = z.infer<typeof RedefinirSenhaSchema>;
