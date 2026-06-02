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
}, "strip", z.ZodTypeAny, {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    senha: string;
    tipo: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO";
}, {
    nome: string;
    cpf: string;
    email: string;
    telefone: string;
    senha: string;
    tipo?: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO" | undefined;
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
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    telefone: z.ZodOptional<z.ZodString>;
    tipo: z.ZodOptional<z.ZodDefault<z.ZodEnum<["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO"]>>>;
}, "strip", z.ZodTypeAny, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    tipo?: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO" | undefined;
}, {
    nome?: string | undefined;
    email?: string | undefined;
    telefone?: string | undefined;
    tipo?: "TOMADOR" | "GESTOR_OBRA" | "ADMIN" | "PARCEIRO" | undefined;
}>;
export type TipoUsuario = z.infer<typeof TipoUsuarioEnum>;
export type KycStatus = z.infer<typeof KycStatusEnum>;
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
