"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtualizarUsuarioAdminSchema = exports.FuncaoPainelEnum = exports.FUNCOES_PAINEL = exports.UpdateUsuarioSchema = exports.RedefinirSenhaSchema = exports.EsqueceuSenhaSchema = exports.LoginSchema = exports.CadastroUsuarioSchema = exports.KycStatusEnum = exports.TipoUsuarioEnum = void 0;
const zod_1 = require("zod");
exports.TipoUsuarioEnum = zod_1.z.enum([
    "TOMADOR",
    "GESTOR_OBRA",
    "ADMIN",
    "PARCEIRO",
]);
exports.KycStatusEnum = zod_1.z.enum([
    "PENDENTE",
    "EM_VERIFICACAO",
    "APROVADO",
    "REJEITADO",
]);
exports.CadastroUsuarioSchema = zod_1.z.object({
    nome: zod_1.z.string().min(3).max(120),
    cpf: zod_1.z
        .string()
        .regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
    email: zod_1.z.string().email(),
    telefone: zod_1.z
        .string()
        .regex(/^\d{10,11}$/, "Telefone inválido"),
    senha: zod_1.z
        .string()
        .min(8, "Mínimo 8 caracteres")
        .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
        .regex(/[0-9]/, "Deve conter ao menos um número"),
    tipo: exports.TipoUsuarioEnum.default("TOMADOR"),
    consentidoTermos: zod_1.z.boolean().refine((v) => v === true, { message: "Obrigatório" }),
    consentidoPrivacy: zod_1.z.boolean().refine((v) => v === true, { message: "Obrigatório" }),
    consentidoKyc: zod_1.z.boolean().refine((v) => v === true, { message: "Obrigatório" }),
    consentidoMarketing: zod_1.z.boolean().default(false),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    senha: zod_1.z.string().min(1),
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
exports.UpdateUsuarioSchema = exports.CadastroUsuarioSchema.omit({
    senha: true,
    cpf: true,
}).partial();
// ── Fiscalização (Admin) ────────────────────────────────────────────
// Funções de painel que o admin pode liberar/bloquear por usuário.
exports.FUNCOES_PAINEL = [
    "obras",
    "credito",
    "simulador",
    "score",
    "kyc",
    "notificacoes",
    "engenharia",
    "gestor",
    "due-diligence",
    "fundos",
    "relatorios",
    "comercial",
    "construtor",
];
exports.FuncaoPainelEnum = zod_1.z.enum(exports.FUNCOES_PAINEL);
exports.AtualizarUsuarioAdminSchema = zod_1.z.object({
    tipo: zod_1.z
        .enum(["TOMADOR", "GESTOR_OBRA", "ADMIN", "PARCEIRO", "GESTOR", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR"])
        .optional(),
    bloqueado: zod_1.z.boolean().optional(),
    funcoesBloqueadas: zod_1.z.array(exports.FuncaoPainelEnum).optional(),
});
