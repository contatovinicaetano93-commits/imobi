"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarEstagiosEntrada = listarEstagiosEntrada;
exports.getChecklistItemsForEstagio = getChecklistItemsForEstagio;
exports.getEstagioMeta = getEstagioMeta;
const checklist_por_estagio_json_1 = __importDefault(require("./data/checklist-por-estagio.json"));
function listarEstagiosEntrada() {
    return checklist_por_estagio_json_1.default.estagiosEntrada;
}
function getChecklistItemsForEstagio(estagio) {
    const items = [];
    for (const bloco of checklist_por_estagio_json_1.default.blocos) {
        if ("somenteEstagio" in bloco && bloco.somenteEstagio && bloco.somenteEstagio !== estagio) {
            continue;
        }
        for (const item of bloco.itens) {
            if (!item.estagios.includes(estagio))
                continue;
            items.push({
                itemId: item.id,
                titulo: item.titulo,
                obrigatorio: item.obrigatorio,
                blocoId: bloco.id,
                blocoTitulo: bloco.titulo,
                blocoOrdem: bloco.ordem,
            });
        }
    }
    return items.sort((a, b) => a.blocoOrdem - b.blocoOrdem || a.itemId.localeCompare(b.itemId));
}
function getEstagioMeta(estagio) {
    return listarEstagiosEntrada().find((e) => e.id === estagio);
}
