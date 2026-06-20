import { z } from "zod";
export declare const TIPOS_EVENTO_NOTIFICACAO: readonly ["PARCELA_LIBERADA", "PARCELA_FALHA", "ETAPA_APROVADA", "ETAPA_REPROVADA", "KYC_APROVADO", "KYC_REJEITADO", "CREDITO_APROVADO", "OBRA_CRIADA", "SCORE_ATUALIZADO", "VISTORIA_PENDENTE", "PARECER_SOLICITADO", "COMITE_DECISAO"];
export declare const TipoEventoNotificacaoEnum: z.ZodEnum<["PARCELA_LIBERADA", "PARCELA_FALHA", "ETAPA_APROVADA", "ETAPA_REPROVADA", "KYC_APROVADO", "KYC_REJEITADO", "CREDITO_APROVADO", "OBRA_CRIADA", "SCORE_ATUALIZADO", "VISTORIA_PENDENTE", "PARECER_SOLICITADO", "COMITE_DECISAO"]>;
export declare const PreferenciaCanalSchema: z.ZodObject<{
    email: z.ZodBoolean;
    push: z.ZodBoolean;
    inApp: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    push: boolean;
    email: boolean;
    inApp: boolean;
}, {
    push: boolean;
    email: boolean;
    inApp: boolean;
}>;
export declare const PreferenciasNotificacaoSchema: z.ZodRecord<z.ZodEnum<["PARCELA_LIBERADA", "PARCELA_FALHA", "ETAPA_APROVADA", "ETAPA_REPROVADA", "KYC_APROVADO", "KYC_REJEITADO", "CREDITO_APROVADO", "OBRA_CRIADA", "SCORE_ATUALIZADO", "VISTORIA_PENDENTE", "PARECER_SOLICITADO", "COMITE_DECISAO"]>, z.ZodObject<{
    email: z.ZodBoolean;
    push: z.ZodBoolean;
    inApp: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    push: boolean;
    email: boolean;
    inApp: boolean;
}, {
    push: boolean;
    email: boolean;
    inApp: boolean;
}>>;
export declare const UpdatePreferenciasNotificacaoSchema: z.ZodRecord<z.ZodEnum<["PARCELA_LIBERADA", "PARCELA_FALHA", "ETAPA_APROVADA", "ETAPA_REPROVADA", "KYC_APROVADO", "KYC_REJEITADO", "CREDITO_APROVADO", "OBRA_CRIADA", "SCORE_ATUALIZADO", "VISTORIA_PENDENTE", "PARECER_SOLICITADO", "COMITE_DECISAO"]>, z.ZodObject<{
    email: z.ZodOptional<z.ZodBoolean>;
    push: z.ZodOptional<z.ZodBoolean>;
    inApp: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    push?: boolean | undefined;
    email?: boolean | undefined;
    inApp?: boolean | undefined;
}, {
    push?: boolean | undefined;
    email?: boolean | undefined;
    inApp?: boolean | undefined;
}>>;
export type TipoEventoNotificacao = z.infer<typeof TipoEventoNotificacaoEnum>;
export type PreferenciaCanal = z.infer<typeof PreferenciaCanalSchema>;
export type PreferenciasNotificacao = z.infer<typeof PreferenciasNotificacaoSchema>;
export type UpdatePreferenciasNotificacaoInput = z.infer<typeof UpdatePreferenciasNotificacaoSchema>;
export declare function criarPreferenciasPadrao(): PreferenciasNotificacao;
export declare const LABELS_EVENTO_NOTIFICACAO: Record<TipoEventoNotificacao, string>;
