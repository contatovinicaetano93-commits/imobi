import { z } from "zod";

export const TipoParceiroEnum = z.enum([
  "CORRESPONDENTE",
  "IMOBILIARIA",
  "CONSTRUTORA",
  "INDEPENDENTE",
]);

export const CadastroParceiroSchema = z.object({
  nome: z.string().min(3).max(120),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
  email: z.string().email(),
  telefone: z.string().regex(/^\d{10,11}$/, "Telefone inválido"),
  tipo: TipoParceiroEnum,
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ inválido").optional(),
  nomeEmpresa: z.string().max(120).optional(),
  creciNumero: z.string().max(30).optional(),
});

export const UpdateParceiroSchema = CadastroParceiroSchema.omit({ cpf: true }).partial();

export const FiltroParceiroSchema = z.object({
  tipo: TipoParceiroEnum.optional(),
  ativo: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type TipoParceiro = z.infer<typeof TipoParceiroEnum>;
export type CadastroParceiroInput = z.infer<typeof CadastroParceiroSchema>;
export type UpdateParceiroInput = z.infer<typeof UpdateParceiroSchema>;
export type FiltroParceiroInput = z.infer<typeof FiltroParceiroSchema>;
