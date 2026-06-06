import { z } from "zod";

export const StatusCreditoEnum = z.enum([
  "ATIVO",
  "SUSPENSO",
  "VENCIDO",
  "QUITADO",
]);

export const SimulacaoCreditoSchema = z.object({
  valorSolicitado: z
    .number()
    .min(10000, "Valor mínimo R$ 10.000")
    .max(5000000, "Valor máximo R$ 5.000.000"),
  prazoMeses: z
    .number()
    .int()
    .min(12, "Prazo mínimo 12 meses")
    .max(180, "Prazo máximo 180 meses"),
  tipoObra: z.enum(["RESIDENCIAL", "COMERCIAL", "MISTO"]),
});

export const SolicitacaoCreditoSchema = SimulacaoCreditoSchema.extend({
  obraId: z.string().uuid().optional(),
  finalidade: z.string().max(500),
  rendaMensalDeclarada: z.number().positive(),
});

export const LiberacaoParcelaSchema = z.object({
  creditoId: z.string().uuid(),
  etapaId: z.string().uuid(),
  valorLiberacao: z.number().positive(),
  observacaoGestor: z.string().max(1000).optional(),
});

export type StatusCredito = z.infer<typeof StatusCreditoEnum>;
export type SimulacaoCreditoInput = z.infer<typeof SimulacaoCreditoSchema>;
export type SolicitacaoCreditoInput = z.infer<typeof SolicitacaoCreditoSchema>;
export type LiberacaoParcelaInput = z.infer<typeof LiberacaoParcelaSchema>;
