import { z } from "zod";

export const AprovarVistoriaSchema = z.object({
  observacoes: z.string().max(1000).optional(),
});

export const RejeitarVistoriaSchema = z.object({
  motivo: z
    .string()
    .min(10, "Descreva o motivo com ao menos 10 caracteres")
    .max(1000),
});

export const AgendarVistoriaSchema = z.object({
  etapaId: z.string().uuid(),
  engenheiroId: z.string().uuid(),
  dataAgendada: z.string().datetime(),
  observacoes: z.string().max(500).optional(),
});

export const FiltroVistoriaSchema = z.object({
  engenheiroId: z.string().uuid().optional(),
  obraId: z.string().uuid().optional(),
  etapaId: z.string().uuid().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type AprovarVistoriaInput = z.infer<typeof AprovarVistoriaSchema>;
export type RejeitarVistoriaInput = z.infer<typeof RejeitarVistoriaSchema>;
export type AgendarVistoriaInput = z.infer<typeof AgendarVistoriaSchema>;
export type FiltroVistoriaInput = z.infer<typeof FiltroVistoriaSchema>;
