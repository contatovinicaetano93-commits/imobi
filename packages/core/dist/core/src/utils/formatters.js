"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatarBRL = formatarBRL;
exports.formatarCPF = formatarCPF;
exports.formatarTelefone = formatarTelefone;
exports.formatarCEP = formatarCEP;
exports.formatarPercentual = formatarPercentual;
exports.formatarArea = formatarArea;
function formatarBRL(valor) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valor);
}
function formatarCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
function formatarTelefone(tel) {
    if (tel.length === 11) {
        return tel.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return tel.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}
function formatarCEP(cep) {
    return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
}
function formatarPercentual(valor, casas = 1) {
    return `${valor.toFixed(casas)}%`;
}
function formatarArea(m2) {
    return `${m2.toLocaleString("pt-BR")} m²`;
}
