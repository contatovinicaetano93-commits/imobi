import { z } from "zod";
export declare const TipoUsuarioEnum: z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"]>;
export declare const KycStatusEnum: z.ZodEnum<["PENDENTE", "APROVADO", "REJEITADO", "EM_ANALISE"]>;
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
    tipo: "PARCEIRO" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN";
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
    tipo?: "PARCEIRO" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | undefined;
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
export declare const UpdateUsuarioSchema: z.ZodObject<{
    tipo: z.ZodOptional<z.ZodDefault<z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"]>>>;
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    consentidoTermos: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoPrivacy: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoKyc: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>;
    consentidoMarketing: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    tipo?: "PARCEIRO" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | undefined;
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    consentidoTermos?: boolean | undefined;
    consentidoPrivacy?: boolean | undefined;
    consentidoKyc?: boolean | undefined;
    consentidoMarketing?: boolean | undefined;
}, {
    tipo?: "PARCEIRO" | "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | undefined;
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
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
