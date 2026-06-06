"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVistoria = useVistoria;
const react_1 = require("react");
const api_client_1 = require("../services/api-client");
function useVistoria(token) {
    const [state, setState] = (0, react_1.useState)({
        loading: false,
        error: null,
    });
    const aprovar = (0, react_1.useCallback)(async (etapaId, input) => {
        setState({ loading: true, error: null });
        try {
            const res = await api_client_1.apiClient.patch(`/etapas/${etapaId}/aprovar`, { observacao: input.observacoes }, token);
            setState({ loading: false, error: null });
            return res;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao aprovar etapa");
            setState({ loading: false, error });
            return null;
        }
    }, [token]);
    const rejeitar = (0, react_1.useCallback)(async (etapaId, input) => {
        setState({ loading: true, error: null });
        try {
            const res = await api_client_1.apiClient.patch(`/etapas/${etapaId}/rejeitar`, { motivo: input.motivo }, token);
            setState({ loading: false, error: null });
            return res;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao rejeitar etapa");
            setState({ loading: false, error });
            return null;
        }
    }, [token]);
    const listarPorObra = (0, react_1.useCallback)(async (obraId) => {
        setState({ loading: true, error: null });
        try {
            const etapas = await api_client_1.apiClient.get(`/etapas/obra/${obraId}`, token);
            setState({ loading: false, error: null });
            return etapas;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao carregar etapas");
            setState({ loading: false, error });
            return null;
        }
    }, [token]);
    return { ...state, aprovar, rejeitar, listarPorObra };
}
