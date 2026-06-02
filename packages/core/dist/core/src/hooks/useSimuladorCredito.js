"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSimuladorCredito = useSimuladorCredito;
const react_1 = require("react");
const credito_1 = require("../utils/credito");
const TAXA_MENSAL_DEFAULT = 0.0099; // ~1% a.m. (CET ~12,5% a.a.)
function useSimuladorCredito(taxaMensal = TAXA_MENSAL_DEFAULT) {
    const [valorSolicitado, setValorSolicitado] = (0, react_1.useState)(150000);
    const [prazoMeses, setPrazoMeses] = (0, react_1.useState)(60);
    const resultado = (0, react_1.useMemo)(() => (0, credito_1.simularCredito)(valorSolicitado, taxaMensal, prazoMeses), [valorSolicitado, prazoMeses, taxaMensal]);
    return {
        valorSolicitado,
        setValorSolicitado,
        prazoMeses,
        setPrazoMeses,
        taxaMensal,
        resultado,
    };
}
