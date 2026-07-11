import { z } from "zod";

/** 4 papéis únicos — sem aliases. */
export const RoleEnum = z.enum(["ADMIN", "CLIENTE", "FUNDO", "ENGENHEIRO"]);
export type Role = z.infer<typeof RoleEnum>;

/** Cadastro público — sempre CLIENTE. Outros papéis só via Admin (CriarUsuarioAdminSchema). */
export const CadastroUsuarioSchema = z.object({
  nome: z.string().min(3).max(120),
  email: z.string().email(),
  senha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
});
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;

/** Admin cria contas de qualquer papel (ex: Engenheiro, Fundo). */
export const CriarUsuarioAdminSchema = z.object({
  nome: z.string().min(3).max(120),
  email: z.string().email(),
  senha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
  role: RoleEnum,
});
export type CriarUsuarioAdminInput = z.infer<typeof CriarUsuarioAdminSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1, "Token de atualização obrigatório"),
});
export type RefreshTokenBodyInput = z.infer<typeof RefreshTokenBodySchema>;

export const EsqueceuSenhaSchema = z.object({
  email: z.string().email(),
});
export type EsqueceuSenhaInput = z.infer<typeof EsqueceuSenhaSchema>;

export const RedefinirSenhaSchema = z.object({
  token: z.string().min(1),
  novaSenha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
});
export type RedefinirSenhaInput = z.infer<typeof RedefinirSenhaSchema>;

export const AtualizarUsuarioAdminSchema = z.object({
  nome: z.string().min(3).max(120).optional(),
  email: z.string().email().optional(),
  role: RoleEnum.optional(),
  novaSenha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número")
    .optional(),
});
export type AtualizarUsuarioAdminInput = z.infer<typeof AtualizarUsuarioAdminSchema>;
