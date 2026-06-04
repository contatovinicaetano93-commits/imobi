import { z } from "zod";

export const TipoUsuarioEnum = z.enum([
  "TOMADOR",
  "GESTOR_OBRA",
  "ADMIN",
  "PARCEIRO",
]);

export const KycStatusEnum = z.enum([
  "PENDENTE",
  "APROVADO",
  "REJEITADO",
  "EM_ANALISE",
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
  tipo: TipoUsuarioEnum.default("TOMADOR"),
  consentidoTermos: z.literal(true, { errorMap: () => ({ message: "Obrigatório" }) }),
  consentidoPrivacy: z.literal(true, { errorMap: () => ({ message: "Obrigatório" }) }),
  consentidoKyc: z.literal(true, { errorMap: () => ({ message: "Obrigatório" }) }),
  consentidoMarketing: z.boolean().default(false),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const UpdateUsuarioSchema = CadastroUsuarioSchema.omit({
  senha: true,
  cpf: true,
}).partial();

export type TipoUsuario = z.infer<typeof TipoUsuarioEnum>;
export type KycStatus = z.infer<typeof KycStatusEnum>;
export type CadastroUsuarioInput = z.infer<typeof CadastroUsuarioSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioSchema>;
