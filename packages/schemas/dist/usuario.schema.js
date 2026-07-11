"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtualizarUsuarioAdminSchema = exports.RedefinirSenhaSchema = exports.EsqueceuSenhaSchema = exports.RefreshTokenBodySchema = exports.LoginSchema = exports.CriarUsuarioAdminSchema = exports.CadastroUsuarioSchema = exports.RoleEnum = void 0;
const zod_1 = require("zod");
/** 4 papéis únicos — sem aliases. */
exports.RoleEnum = zod_1.z.enum(["ADMIN", "CLIENTE", "FUNDO", "ENGENHEIRO"]);
/** Cadastro público — sempre CLIENTE. Outros papéis só via Admin (CriarUsuarioAdminSchema). */
exports.CadastroUsuarioSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120),
    email: zod_1.z.string().email(),
    senha: zod_1.z
        .string()
        .min(8, "Mínimo 8 caracteres")
        .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Deve conter ao menos um número"),
});
/** Admin cria contas de qualquer papel (ex: Engenheiro, Fundo). */
exports.CriarUsuarioAdminSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120),
    email: zod_1.z.string().email(),
    senha: zod_1.z
        .string()
        .min(8, "Mínimo 8 caracteres")
        .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Deve conter ao menos um número"),
    role: exports.RoleEnum,
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    senha: zod_1.z.string().min(1),
});
exports.RefreshTokenBodySchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, "Token de atualização obrigatório"),
});
exports.EsqueceuSenhaSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.RedefinirSenhaSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    novaSenha: zod_1.z
        .string()
        .min(8, "Mínimo 8 caracteres")
        .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Deve conter ao menos um número"),
});
exports.AtualizarUsuarioAdminSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120).optional(),
    email: zod_1.z.string().email().optional(),
    role: exports.RoleEnum.optional(),
    novaSenha: zod_1.z
        .string()
        .min(8, "Mínimo 8 caracteres")
        .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Deve conter ao menos um número")
        .optional(),
});
