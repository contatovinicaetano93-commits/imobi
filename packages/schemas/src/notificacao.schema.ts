import { z } from "zod";

export const TipoNotificacaoEnum = z.enum([
  "PARCELA_LIBERADA",
  "PARCELA_FALHA",
  "KYC_APROVADO",
  "KYC_REJEITADO",
  "OBRA_ATUALIZADA",
  "ETAPA_APROVADA",
  "ETAPA_REJEITADA",
  "VISTORIA_AGENDADA",
  "SISTEMA",
]);

export const CriarNotificacaoSchema = z.object({
  usuarioId: z.string().uuid(),
  tipo: TipoNotificacaoEnum,
  titulo: z.string().min(1).max(120),
  descricao: z.string().max(1000),
  link: z.string().max(500).optional(),
});

export const FiltroNotificacaoSchema = z.object({
  lida: z.coerce.boolean().optional(),
  tipo: TipoNotificacaoEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TipoNotificacao = z.infer<typeof TipoNotificacaoEnum>;
export type CriarNotificacaoInput = z.infer<typeof CriarNotificacaoSchema>;
export type FiltroNotificacaoInput = z.infer<typeof FiltroNotificacaoSchema>;
