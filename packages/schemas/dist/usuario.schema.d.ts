import { z } from "zod";
/** 4 papéis únicos — sem aliases. */
export declare const RoleEnum: z.ZodEnum<["ADMIN", "CLIENTE", "FUNDO", "ENGENHEIRO"]>;
export type Role = z.infer<typeof RoleEnum>;
/** Cadastro público — sempre CLIENTE. Outros papéis só via Admin (CriarUsuarioAdminSchema). */
export declare const CadastroUsuarioSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    senha: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nome: string;
    email: string;
    senha: string;
}, {
    nome: string;
    email: string;
    senha: string;
}>;
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;
/** Admin cria contas de qualquer papel (ex: Engenheiro, Fundo). */
export declare const CriarUsuarioAdminSchema: z.ZodObject<{
    nome: z.ZodString;
    email: z.ZodString;
    senha: z.ZodString;
    role: z.ZodEnum<["ADMIN", "CLIENTE", "FUNDO", "ENGENHEIRO"]>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    email: string;
    senha: string;
    role: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO";
}, {
    nome: string;
    email: string;
    senha: string;
    role: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO";
}>;
export type CriarUsuarioAdminInput = z.infer<typeof CriarUsuarioAdminSchema>;
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
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const RefreshTokenBodySchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type RefreshTokenBodyInput = z.infer<typeof RefreshTokenBodySchema>;
export declare const EsqueceuSenhaSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type EsqueceuSenhaInput = z.infer<typeof EsqueceuSenhaSchema>;
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
export type RedefinirSenhaInput = z.infer<typeof RedefinirSenhaSchema>;
export declare const AtualizarUsuarioAdminSchema: z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["ADMIN", "CLIENTE", "FUNDO", "ENGENHEIRO"]>>;
    novaSenha: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nome?: string | undefined;
    email?: string | undefined;
    role?: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO" | undefined;
    novaSenha?: string | undefined;
}, {
    nome?: string | undefined;
    email?: string | undefined;
    role?: "ADMIN" | "CLIENTE" | "FUNDO" | "ENGENHEIRO" | undefined;
    novaSenha?: string | undefined;
}>;
export type AtualizarUsuarioAdminInput = z.infer<typeof AtualizarUsuarioAdminSchema>;
