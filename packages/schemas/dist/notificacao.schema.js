"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LABELS_EVENTO_NOTIFICACAO = exports.UpdatePreferenciasNotificacaoSchema = exports.PreferenciasNotificacaoSchema = exports.PreferenciaCanalSchema = exports.TipoEventoNotificacaoEnum = exports.TIPOS_EVENTO_NOTIFICACAO = void 0;
exports.criarPreferenciasPadrao = criarPreferenciasPadrao;
const zod_1 = require("zod");
exports.TIPOS_EVENTO_NOTIFICACAO = [
    "PARCELA_LIBERADA",
    "PARCELA_FALHA",
    "ETAPA_APROVADA",
    "ETAPA_REPROVADA",
    "KYC_APROVADO",
    "KYC_REJEITADO",
    "CREDITO_APROVADO",
    "OBRA_CRIADA",
    "SCORE_ATUALIZADO",
    "VISTORIA_PENDENTE",
    "PARECER_SOLICITADO",
    "COMITE_DECISAO",
];
exports.TipoEventoNotificacaoEnum = zod_1.z.enum(exports.TIPOS_EVENTO_NOTIFICACAO);
exports.PreferenciaCanalSchema = zod_1.z.object({
    email: zod_1.z.boolean(),
    push: zod_1.z.boolean(),
    inApp: zod_1.z.boolean(),
});
exports.PreferenciasNotificacaoSchema = zod_1.z.record(exports.TipoEventoNotificacaoEnum, exports.PreferenciaCanalSchema);
exports.UpdatePreferenciasNotificacaoSchema = zod_1.z.record(exports.TipoEventoNotificacaoEnum, exports.PreferenciaCanalSchema.partial());
function criarPreferenciasPadrao() {
    const canal = { email: true, push: true, inApp: true };
    return Object.fromEntries(exports.TIPOS_EVENTO_NOTIFICACAO.map((tipo) => [tipo, { ...canal }]));
}
exports.LABELS_EVENTO_NOTIFICACAO = {
    PARCELA_LIBERADA: "Parcela liberada",
    PARCELA_FALHA: "Falha na liberação",
    ETAPA_APROVADA: "Etapa aprovada",
    ETAPA_REPROVADA: "Etapa reprovada",
    KYC_APROVADO: "KYC aprovado",
    KYC_REJEITADO: "KYC rejeitado",
    CREDITO_APROVADO: "Crédito aprovado",
    OBRA_CRIADA: "Obra criada",
    SCORE_ATUALIZADO: "Score atualizado",
    VISTORIA_PENDENTE: "Vistoria pendente",
    PARECER_SOLICITADO: "Parecer solicitado",
    COMITE_DECISAO: "Decisão do comitê",
};
