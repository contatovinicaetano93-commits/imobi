"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSimuladorCredito = useSimuladorCredito;
const react_1 = require("react");
const credito_1 = require("../utils/credito");
function useSimuladorCredito(taxaMensal = credito_1.TAXA_MENSAL_SIMULACAO_CREDITO) {
    const [valorSolicitado, setValorSolicitado] = (0, react_1.useState)(150000);
    const [prazoMeses, setPrazoMeses] = (0, react_1.useState)(credito_1.PRAZO_MAX_SIMULACAO_CREDITO_MESES);
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
