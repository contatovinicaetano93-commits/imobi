import { z } from "zod";

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UploadEvidenciaSchema = z.object({
  etapaId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMetros: z
    .number()
    .max(15, "Precisão GPS insuficiente. Aguarde sinal melhor."),
  timestampCaptura: z
    .string()
    .datetime()
    .refine((ts) => new Date(ts) <= new Date(), "Timestamp não pode ser no futuro"),
  descricao: z.string().max(500).optional(),
});

export const ValidarEvidenciaSchema = z.object({
  evidenciaId: z.string().uuid(),
  aprovado: z.boolean(),
  observacao: z.string().max(1000).optional(),
});

export const FiltroEvidenciaSchema = z.object({
  etapaId: z.string().uuid().optional(),
  obraId: z.string().uuid().optional(),
  validada: z.boolean().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;
export type UploadEvidenciaInput = z.infer<typeof UploadEvidenciaSchema>;
export type ValidarEvidenciaInput = z.infer<typeof ValidarEvidenciaSchema>;
export type FiltroEvidenciaInput = z.infer<typeof FiltroEvidenciaSchema>;
