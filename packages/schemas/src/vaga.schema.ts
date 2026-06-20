import { z } from "zod";

export const TipoVagaEnum = z.enum(["AC", "BCT", "BC", "NMA"]);

export const GrauEscolaridadeEnum = z.enum([
  "FUNDAMENTAL",
  "MEDIO",
  "TECNICO",
  "SUPERIOR",
  "POS_GRADUACAO",
]);

export const CandidaturaVagaSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(120),
  dataNascimento: z.string().min(1, "Data de nascimento obrigatória"),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve conter 11 dígitos numéricos"),
  email: z.string().email("E-mail inválido"),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, "Telefone inválido"),
  tipoVaga: TipoVagaEnum,
  areaAtuacao: z.string().min(2, "Área de atuação obrigatória"),
  experienciaAnos: z
    .number({ invalid_type_error: "Informe os anos de experiência" })
    .min(0)
    .max(50),
  pretensaoSalarial: z
    .number({ invalid_type_error: "Valor inválido" })
    .min(0)
    .optional(),
  grauEscolaridade: GrauEscolaridadeEnum,
});

export type TipoVaga = z.infer<typeof TipoVagaEnum>;
export type GrauEscolaridade = z.infer<typeof GrauEscolaridadeEnum>;
export type CandidaturaVagaInput = z.infer<typeof CandidaturaVagaSchema>;
