import { z } from "zod";

export const CriarVistoriaSchema = z.object({
  etapaId: z.string().uuid(),
  agendadoPara: z.string().datetime(),
  observacoes: z.string().max(1000).optional(),
});

export const RelatorioVistoriaSchema = z.object({
  aprovado: z.boolean(),
  laudo: z.string().max(5000).optional(),
  fotoUrls: z.array(z.string().url()).max(20).optional(),
});

export type CriarVistoriaInput = z.infer<typeof CriarVistoriaSchema>;
export type RelatorioVistoriaInput = z.infer<typeof RelatorioVistoriaSchema>;
