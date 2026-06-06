"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCredito = useCredito;
const react_1 = require("react");
const api_client_1 = require("../services/api-client");
const credito_1 = require("../utils/credito");
function useCredito(token) {
    const [state, setState] = (0, react_1.useState)({
        creditos: [],
        creditoAtual: null,
        simulacao: null,
        loading: false,
        error: null,
    });
    const simular = (0, react_1.useCallback)((input) => {
        const TAXA_MENSAL = 0.0099;
        const resultado = (0, credito_1.simularCredito)(input.valorSolicitado, TAXA_MENSAL, input.prazoMeses);
        setState((s) => ({ ...s, simulacao: resultado }));
        return resultado;
    }, []);
    const solicitar = (0, react_1.useCallback)(async (input) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const credito = await api_client_1.apiClient.post("/credito/solicitar", input, token);
            setState((s) => ({ ...s, creditos: [credito, ...s.creditos], loading: false }));
            return credito;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao solicitar crédito");
            setState((s) => ({ ...s, loading: false, error }));
            return null;
        }
    }, [token]);
    const listar = (0, react_1.useCallback)(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const creditos = await api_client_1.apiClient.get("/credito", token);
            setState((s) => ({ ...s, creditos, loading: false }));
            return creditos;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao carregar créditos");
            setState((s) => ({ ...s, loading: false, error }));
            return null;
        }
    }, [token]);
    const extrato = (0, react_1.useCallback)(async (creditoId) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const credito = await api_client_1.apiClient.get(`/credito/${creditoId}/extrato`, token);
            setState((s) => ({ ...s, creditoAtual: credito, loading: false }));
            return credito;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao carregar extrato");
            setState((s) => ({ ...s, loading: false, error }));
            return null;
        }
    }, [token]);
    return { ...state, simular, solicitar, listar, extrato };
}
