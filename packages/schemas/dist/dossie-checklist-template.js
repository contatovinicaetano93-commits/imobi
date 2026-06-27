"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarEstagiosEntrada = listarEstagiosEntrada;
exports.listarTiposCredito = listarTiposCredito;
exports.estagioFromTipoCredito = estagioFromTipoCredito;
exports.getTipoCreditoMeta = getTipoCreditoMeta;
exports.getChecklistItemsForTipoCredito = getChecklistItemsForTipoCredito;
exports.getChecklistItemsForEstagio = getChecklistItemsForEstagio;
exports.getEstagioMeta = getEstagioMeta;
exports.resolveTipoCredito = resolveTipoCredito;
const checklist_por_estagio_json_1 = __importDefault(require("./data/checklist-por-estagio.json"));
function listarEstagiosEntrada() {
    return checklist_por_estagio_json_1.default.estagiosEntrada;
}
function listarTiposCredito() {
    return checklist_por_estagio_json_1.default.tiposCredito;
}
function estagioFromTipoCredito(tipo) {
    const meta = listarTiposCredito().find((t) => t.id === tipo);
    return meta?.estagioObra ?? (tipo === "OBRA_NOVA" ? "NOVO" : "EM_ANDAMENTO");
}
function getTipoCreditoMeta(tipo) {
    return listarTiposCredito().find((t) => t.id === tipo);
}
function pushItem(items, bloco, item) {
    items.push({
        itemId: item.id,
        titulo: item.titulo,
        obrigatorio: item.obrigatorio,
        blocoId: bloco.id,
        blocoTitulo: bloco.titulo,
        blocoOrdem: bloco.ordem,
    });
}
function getChecklistItemsForTipoCredito(tipo) {
    const estagio = estagioFromTipoCredito(tipo);
    const items = [];
    for (const bloco of checklist_por_estagio_json_1.default.blocos) {
        if ("somenteEstagio" in bloco && bloco.somenteEstagio && bloco.somenteEstagio !== estagio) {
            continue;
        }
        if ("somenteTipoCredito" in bloco &&
            bloco.somenteTipoCredito &&
            bloco.somenteTipoCredito !== tipo) {
            continue;
        }
        for (const item of bloco.itens) {
            if (!item.estagios.includes(estagio))
                continue;
            if ("tiposCredito" in item &&
                Array.isArray(item.tiposCredito) &&
                item.tiposCredito.length > 0 &&
                !item.tiposCredito.includes(tipo)) {
                continue;
            }
            pushItem(items, bloco, item);
        }
    }
    return items.sort((a, b) => a.blocoOrdem - b.blocoOrdem || a.itemId.localeCompare(b.itemId));
}
function getChecklistItemsForEstagio(estagio) {
    const tipoMap = {
        NOVO: "OBRA_NOVA",
        EM_ANDAMENTO: "OBRA_EM_ANDAMENTO",
        ENTRADA_TARDIA: "OBRA_EM_ANDAMENTO",
    };
    return getChecklistItemsForTipoCredito(tipoMap[estagio]);
}
function getEstagioMeta(estagio) {
    return listarEstagiosEntrada().find((e) => e.id === estagio);
}
function resolveTipoCredito(input) {
    if (input.tipoCredito)
        return input.tipoCredito;
    if (input.estagioObra === "NOVO")
        return "OBRA_NOVA";
    return "OBRA_EM_ANDAMENTO";
}
