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
    .refine((v) => [12, 24, 36, 60, 120, 180].includes(v), "Prazo inválido"),
  tipoObra: z.enum(["RESIDENCIAL", "COMERCIAL", "MISTO"]),
});

export const SolicitacaoCreditoSchema = SimulacaoCreditoSchema.extend({
  obraId: z.string().uuid().optional(),
  finalidade: z.string().min(10, "Descrição mínima de 10 caracteres").max(500),
  rendaMensalDeclarada: z.number().min(500, "Renda mínima declarada R$ 500").positive(),
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
