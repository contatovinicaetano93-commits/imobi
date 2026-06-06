"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useObra = useObra;
const react_1 = require("react");
const api_client_1 = require("../services/api-client");
function useObra(token) {
    const [state, setState] = (0, react_1.useState)({
        obras: [],
        obraAtual: null,
        progresso: null,
        loading: false,
        error: null,
    });
    const listar = (0, react_1.useCallback)(async () => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const obras = await api_client_1.apiClient.get("/obras", token);
            setState((s) => ({ ...s, obras, loading: false }));
            return obras;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao carregar obras");
            setState((s) => ({ ...s, loading: false, error }));
            return null;
        }
    }, [token]);
    const buscar = (0, react_1.useCallback)(async (obraId) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const obra = await api_client_1.apiClient.get(`/obras/${obraId}`, token);
            setState((s) => ({ ...s, obraAtual: obra, loading: false }));
            return obra;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao carregar obra");
            setState((s) => ({ ...s, loading: false, error }));
            return null;
        }
    }, [token]);
    const criar = (0, react_1.useCallback)(async (input) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const obra = await api_client_1.apiClient.post("/obras", input, token);
            setState((s) => ({ ...s, obras: [obra, ...s.obras], obraAtual: obra, loading: false }));
            return obra;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha ao criar obra");
            setState((s) => ({ ...s, loading: false, error }));
            return null;
        }
    }, [token]);
    const buscarProgresso = (0, react_1.useCallback)(async (obraId) => {
        try {
            const res = await api_client_1.apiClient.get(`/obras/${obraId}/progresso`, token);
            setState((s) => ({ ...s, progresso: res.progresso }));
            return res.progresso;
        }
        catch {
            return null;
        }
    }, [token]);
    return { ...state, listar, buscar, criar, buscarProgresso };
}
