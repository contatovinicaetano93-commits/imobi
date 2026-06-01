import { z } from "zod";

const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11))) return false;

  return true;
};

const validateCNPJ = (cnpj: string): boolean => {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let sum = 0;
  let multiplier = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(clean[12])) return false;

  sum = 0;
  multiplier = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(clean[13])) return false;

  return true;
};

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
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  cnpj: z.string().refine(validateCNPJ, "CNPJ inválido").optional(),
  email: z.string().email(),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone inválido"),
  senha: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
  tipo: TipoUsuarioEnum.default("TOMADOR"),
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
