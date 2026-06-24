import { z } from "zod";

export const TIPOS_EVENTO_NOTIFICACAO = [
  "PARCELA_LIBERADA",
  "PARCELA_FALHA",
  "ETAPA_APROVADA",
  "ETAPA_REPROVADA",
  "KYC_APROVADO",
  "KYC_REJEITADO",
  "CREDITO_APROVADO",
  "OBRA_CRIADA",
  "OBRA_HOMOLOGADA",
  "SCORE_ATUALIZADO",
  "VISTORIA_PENDENTE",
  "PARECER_SOLICITADO",
  "COMITE_DECISAO",
] as const;

export const TipoEventoNotificacaoEnum = z.enum(TIPOS_EVENTO_NOTIFICACAO);

export const PreferenciaCanalSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  inApp: z.boolean(),
});

export const PreferenciasNotificacaoSchema = z.record(
  TipoEventoNotificacaoEnum,
  PreferenciaCanalSchema
);

export const UpdatePreferenciasNotificacaoSchema = z.record(
  TipoEventoNotificacaoEnum,
  PreferenciaCanalSchema.partial()
);

export type TipoEventoNotificacao = z.infer<typeof TipoEventoNotificacaoEnum>;
export type PreferenciaCanal = z.infer<typeof PreferenciaCanalSchema>;
export type PreferenciasNotificacao = z.infer<typeof PreferenciasNotificacaoSchema>;
export type UpdatePreferenciasNotificacaoInput = z.infer<typeof UpdatePreferenciasNotificacaoSchema>;

export function criarPreferenciasPadrao(): PreferenciasNotificacao {
  const canal = { email: true, push: true, inApp: true };
  return Object.fromEntries(
    TIPOS_EVENTO_NOTIFICACAO.map((tipo) => [tipo, { ...canal }])
  ) as PreferenciasNotificacao;
}

export const LABELS_EVENTO_NOTIFICACAO: Record<TipoEventoNotificacao, string> = {
  PARCELA_LIBERADA: "Parcela liberada",
  PARCELA_FALHA: "Falha na liberação",
  ETAPA_APROVADA: "Etapa aprovada",
  ETAPA_REPROVADA: "Etapa reprovada",
  KYC_APROVADO: "KYC aprovado",
  KYC_REJEITADO: "KYC rejeitado",
  CREDITO_APROVADO: "Crédito aprovado",
  OBRA_CRIADA: "Obra criada",
  OBRA_HOMOLOGADA: "Obra homologada",
  SCORE_ATUALIZADO: "Score atualizado",
  VISTORIA_PENDENTE: "Vistoria pendente",
  PARECER_SOLICITADO: "Parecer solicitado",
  COMITE_DECISAO: "Decisão do comitê",
};
