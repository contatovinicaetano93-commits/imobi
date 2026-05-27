import { z } from "zod";

export const UploadEvidenciaSchema = z.object({
  etapaId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMetros: z
    .number()
    .max(15, "Precisão GPS insuficiente. Aguarde sinal melhor."),
  timestampCaptura: z.string().datetime(),
  descricao: z.string().max(500).optional().transform(v => v?.trim() || undefined),
});

export const ValidarEvidenciaSchema = z.object({
  evidenciaId: z.string().uuid(),
  aprovado: z.boolean(),
  observacao: z.string().max(1000).optional().transform(v => v?.trim() || undefined),
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

export type UploadEvidenciaInput = z.infer<typeof UploadEvidenciaSchema>;
export type ValidarEvidenciaInput = z.infer<typeof ValidarEvidenciaSchema>;
export type FiltroEvidenciaInput = z.infer<typeof FiltroEvidenciaSchema>;
