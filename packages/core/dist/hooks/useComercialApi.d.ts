import { LeadDetail, DashboardStats, LeadsListResponse } from '@imbobi/schemas';
export declare function useComercialApi(token?: string): {
    getLeads: (page?: number, pageSize?: number, searchTerm?: string) => Promise<LeadsListResponse | null>;
    getLeadDetail: (leadId: string) => Promise<LeadDetail | null>;
    getDashboardStats: () => Promise<DashboardStats | null>;
    addActivity: (leadId: string, tipo: string, descricao: string) => Promise<{
        success: boolean;
        error?: string;
    }>;
    loading: boolean;
    error: Error | null;
};
