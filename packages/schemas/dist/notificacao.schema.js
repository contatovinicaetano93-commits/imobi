"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LABELS_EVENTO_NOTIFICACAO = exports.TipoEventoNotificacaoEnum = exports.TIPOS_EVENTO_NOTIFICACAO = void 0;
const zod_1 = require("zod");
exports.TIPOS_EVENTO_NOTIFICACAO = [
    "DOCUMENTO_APROVADO",
    "DOCUMENTO_REJEITADO",
    "OBRA_HOMOLOGADA",
    "TRANCHE_VALIDADA",
    "TRANCHE_LIBERADA",
    "OBRA_QUITADA",
];
exports.TipoEventoNotificacaoEnum = zod_1.z.enum(exports.TIPOS_EVENTO_NOTIFICACAO);
exports.LABELS_EVENTO_NOTIFICACAO = {
    DOCUMENTO_APROVADO: "Documento aprovado",
    DOCUMENTO_REJEITADO: "Documento rejeitado",
    OBRA_HOMOLOGADA: "Obra homologada",
    TRANCHE_VALIDADA: "Fase validada pelo engenheiro",
    TRANCHE_LIBERADA: "Tranche liberada",
    OBRA_QUITADA: "Obra quitada",
};
