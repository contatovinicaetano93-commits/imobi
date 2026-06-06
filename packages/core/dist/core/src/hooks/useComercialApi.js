"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useComercialApi = useComercialApi;
const react_1 = require("react");
const api_client_1 = require("../services/api-client");
function useComercialApi(token) {
    const [state, setState] = (0, react_1.useState)({
        loading: false,
        error: null,
    });
    const getLeads = (0, react_1.useCallback)(async (page = 1, pageSize = 12, searchTerm = '') => {
        setState({ loading: true, error: null });
        try {
            const offset = (page - 1) * pageSize;
            const filters = JSON.stringify({ searchTerm });
            const query = new URLSearchParams({
                limit: pageSize.toString(),
                offset: offset.toString(),
                filters,
            });
            const response = await api_client_1.apiClient.get(`/comercial/leads?${query}`, token);
            setState({ loading: false, error: null });
            return response;
        }
        catch (error) {
            const err = error instanceof api_client_1.ApiError ? error : new Error('Failed to fetch leads');
            setState({ loading: false, error: err });
            return null;
        }
    }, [token]);
    const getLeadDetail = (0, react_1.useCallback)(async (leadId) => {
        setState({ loading: true, error: null });
        try {
            const response = await api_client_1.apiClient.get(`/comercial/leads/${leadId}`, token);
            setState({ loading: false, error: null });
            return response;
        }
        catch (error) {
            const err = error instanceof api_client_1.ApiError ? error : new Error('Failed to fetch lead detail');
            setState({ loading: false, error: err });
            return null;
        }
    }, [token]);
    const getDashboardStats = (0, react_1.useCallback)(async () => {
        setState({ loading: true, error: null });
        try {
            const response = await api_client_1.apiClient.get(`/comercial/dashboard/stats`, token);
            setState({ loading: false, error: null });
            return response;
        }
        catch (error) {
            const err = error instanceof api_client_1.ApiError ? error : new Error('Failed to fetch dashboard stats');
            setState({ loading: false, error: err });
            return null;
        }
    }, [token]);
    const addActivity = (0, react_1.useCallback)(async (leadId, tipo, descricao) => {
        setState({ loading: true, error: null });
        try {
            await api_client_1.apiClient.post(`/comercial/leads/${leadId}/atividades`, { tipo, descricao }, token);
            setState({ loading: false, error: null });
            return { success: true };
        }
        catch (error) {
            const err = error instanceof api_client_1.ApiError ? error : new Error('Failed to add activity');
            setState({ loading: false, error: err });
            return { success: false, error: err.message };
        }
    }, [token]);
    return {
        ...state,
        getLeads,
        getLeadDetail,
        getDashboardStats,
        addActivity,
    };
}
