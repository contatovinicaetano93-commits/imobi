import { z } from "zod";

export const SimuladorInputSchema = z.object({
  valorEmpreendimento: z.number().positive("Valor deve ser positivo"),
  tipoObra: z.enum(["TERRENO", "CONSTRUCAO", "ACABAMENTO", "COMPRADOR"]),
  prazo: z.number().min(6).max(36),
  localizacao: z.string().optional(),
});

export type SimuladorInput = z.infer<typeof SimuladorInputSchema>;

export const SimuladorResultSchema = z.object({
  valorMaximoFinanciavel: z.number(),
  parcelaMedia: z.number(),
  taxaMensal: z.string(),
  taxaAno: z.string(),
  ltv: z.string(),
  totalJuros: z.number(),
});

export type SimuladorResult = z.infer<typeof SimuladorResultSchema>;
