"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = useAuth;
const react_1 = require("react");
const api_client_1 = require("../services/api-client");
function useAuth(onTokenChange) {
    const [state, setState] = (0, react_1.useState)({
        usuario: null,
        token: null,
        loading: false,
        error: null,
    });
    const login = (0, react_1.useCallback)(async (input) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await api_client_1.apiClient.post("/auth/login", input);
            setState({ usuario: res.usuario, token: res.accessToken, loading: false, error: null });
            onTokenChange?.(res.accessToken);
            return true;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha no login");
            setState((s) => ({ ...s, loading: false, error }));
            return false;
        }
    }, [onTokenChange]);
    const cadastrar = (0, react_1.useCallback)(async (input) => {
        setState((s) => ({ ...s, loading: true, error: null }));
        try {
            const res = await api_client_1.apiClient.post("/auth/register", input);
            setState({ usuario: res.usuario, token: res.accessToken, loading: false, error: null });
            onTokenChange?.(res.accessToken);
            return true;
        }
        catch (err) {
            const error = err instanceof api_client_1.ApiError ? err : new Error("Falha no cadastro");
            setState((s) => ({ ...s, loading: false, error }));
            return false;
        }
    }, [onTokenChange]);
    const logout = (0, react_1.useCallback)(() => {
        setState({ usuario: null, token: null, loading: false, error: null });
        onTokenChange?.(null);
    }, [onTokenChange]);
    const limparErro = (0, react_1.useCallback)(() => {
        setState((s) => ({ ...s, error: null }));
    }, []);
    return { ...state, login, cadastrar, logout, limparErro };
}
