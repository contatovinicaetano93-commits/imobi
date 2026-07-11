import { z } from "zod";
export declare const TIPOS_EVENTO_NOTIFICACAO: readonly ["DOCUMENTO_APROVADO", "DOCUMENTO_REJEITADO", "OBRA_HOMOLOGADA", "TRANCHE_VALIDADA", "TRANCHE_LIBERADA", "OBRA_QUITADA"];
export declare const TipoEventoNotificacaoEnum: z.ZodEnum<["DOCUMENTO_APROVADO", "DOCUMENTO_REJEITADO", "OBRA_HOMOLOGADA", "TRANCHE_VALIDADA", "TRANCHE_LIBERADA", "OBRA_QUITADA"]>;
export type TipoEventoNotificacao = z.infer<typeof TipoEventoNotificacaoEnum>;
export declare const LABELS_EVENTO_NOTIFICACAO: Record<TipoEventoNotificacao, string>;
