import { z } from "zod";

export const TipoVagaEnum = z.enum(["AC", "BCT", "BC", "NMA"]);

export const CursoAmetEnum = z.enum([
  "IMAGINOLOGIA",
  "ESTETICA",
  "ANALISES_CLINICAS",
  "HEMATOLOGIA",
]);

export const CandidaturaVagaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
  rgm: z.string().min(1, "RGM obrigatório"),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
  email: z.string().email("E-mail inválido"),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido"),
  tipoVaga: TipoVagaEnum,
  cursoAmet: CursoAmetEnum,
});

export type TipoVaga = z.infer<typeof TipoVagaEnum>;
export type CursoAmet = z.infer<typeof CursoAmetEnum>;
export type CandidaturaVagaInput = z.infer<typeof CandidaturaVagaSchema>;
