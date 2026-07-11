import { z } from "zod";

export const TIPOS_EVENTO_NOTIFICACAO = [
  "DOCUMENTO_APROVADO",
  "DOCUMENTO_REJEITADO",
  "OBRA_HOMOLOGADA",
  "TRANCHE_VALIDADA",
  "TRANCHE_LIBERADA",
  "OBRA_QUITADA",
] as const;

export const TipoEventoNotificacaoEnum = z.enum(TIPOS_EVENTO_NOTIFICACAO);
export type TipoEventoNotificacao = z.infer<typeof TipoEventoNotificacaoEnum>;

export const LABELS_EVENTO_NOTIFICACAO: Record<TipoEventoNotificacao, string> = {
  DOCUMENTO_APROVADO: "Documento aprovado",
  DOCUMENTO_REJEITADO: "Documento rejeitado",
  OBRA_HOMOLOGADA: "Obra homologada",
  TRANCHE_VALIDADA: "Fase validada pelo engenheiro",
  TRANCHE_LIBERADA: "Tranche liberada",
  OBRA_QUITADA: "Obra quitada",
};
