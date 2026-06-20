import { z } from "zod";

export const TipoUsuarioEnum = z.enum([
  "TOMADOR",
  "GESTOR_OBRA",
  "ADMIN",
  "PARCEIRO",
  "GESTOR",
  "GESTOR_FUNDO",
  "ENGENHEIRO",
  "COMERCIAL",
  "CONSTRUTOR",
]);

export const KycStatusEnum = z.enum([
  "PENDENTE",
  "EM_VERIFICACAO",
  "APROVADO",
  "REJEITADO",
]);

export const CadastroUsuarioSchema = z.object({
  nome: z.string().min(3).max(120),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
  email: z.string().email(),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido"),
  senha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
  consentidoTermos: z.boolean().refine((v) => v === true, { message: "Obrigatório" }),
  consentidoPrivacy: z.boolean().refine((v) => v === true, { message: "Obrigatório" }),
  consentidoKyc: z.boolean().refine((v) => v === true, { message: "Obrigatório" }),
  consentidoMarketing: z.boolean().default(false),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const EsqueceuSenhaSchema = z.object({
  email: z.string().email(),
});

export const RedefinirSenhaSchema = z.object({
  token: z.string().min(1),
  novaSenha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
});

export const UpdateUsuarioSchema = CadastroUsuarioSchema.omit({
  senha: true,
  cpf: true,
}).partial();

/** Campos editáveis pelo usuário em /dashboard/perfil */
export const UpdatePerfilUsuarioSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
  telefone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10,11}$/, "Telefone inválido")),
});

/** Conta bancária da empresa (pagamentos manuais SIPOC). */
export const ContaBancariaEmpresaSchema = z.object({
  contaTitular: z.string().min(3).max(120),
  contaBanco: z.string().min(2).max(80),
  contaAgencia: z.string().min(1).max(20),
  contaNumero: z.string().min(1).max(30),
  contaPix: z.string().min(5).max(120).optional().or(z.literal("")),
});

export type ContaBancariaEmpresaInput = z.infer<typeof ContaBancariaEmpresaSchema>;

// ── Fiscalização (Admin) ────────────────────────────────────────────
// Funções de painel que o admin pode liberar/bloquear por usuário.
export const FUNCOES_PAINEL = [
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
] as const;

export const FuncaoPainelEnum = z.enum(FUNCOES_PAINEL);

export const AtualizarUsuarioAdminSchema = z.object({
  nome: z.string().min(3).max(120).optional(),
  email: z.string().email().optional(),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido")
    .optional(),
  kycStatus: KycStatusEnum.optional(),
  novaSenha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número")
    .optional(),
  tipo: TipoUsuarioEnum.optional(),
  bloqueado: z.boolean().optional(),
  funcoesBloqueadas: z.array(FuncaoPainelEnum).optional(),
});

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
