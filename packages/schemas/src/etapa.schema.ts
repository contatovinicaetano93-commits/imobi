import { z } from "zod";

export const StatusEtapaTransicaoEnum = z.enum([
  "AGUARDANDO_VISTORIA",
  "APROVADA",
  "REJEITADA",
  "CONCLUIDA",
]);

export const AtualizarEtapaSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  descricao: z.string().max(1000).optional(),
  percentualObra: z.number().min(0.01).max(100).optional(),
});

export const AprovarEtapaSchema = z.object({
  obraId: z.string().uuid(),
  observacoes: z.string().max(2000).optional(),
  aprovado: z.boolean(),
});

export type AtualizarEtapaInput = z.infer<typeof AtualizarEtapaSchema>;
export type AprovarEtapaInput = z.infer<typeof AprovarEtapaSchema>;
