import { useState, useCallback } from 'react';
import { LeadDetail, Lead, DashboardStats, LeadsListResponse } from '@imbobi/schemas';
import { apiClient, ApiError } from '../services/api-client';

interface ComercialApiState {
  loading: boolean;
  error: Error | null;
}

export function useComercialApi(token?: string) {
  const [state, setState] = useState<ComercialApiState>({
    loading: false,
    error: null,
  });

  const getLeads = useCallback(
    async (
      page: number = 1,
      pageSize: number = 12,
      searchTerm: string = ''
    ): Promise<LeadsListResponse | null> => {
      setState({ loading: true, error: null });
      try {
        const offset = (page - 1) * pageSize;
        const filters = JSON.stringify({ searchTerm });
        const query = new URLSearchParams({
          limit: pageSize.toString(),
          offset: offset.toString(),
          filters,
        });

        const response = await apiClient.get<LeadsListResponse>(
          `/api/comercial/leads?${query}`,
          token
        );
        setState({ loading: false, error: null });
        return response;
      } catch (error) {
        const err = error instanceof ApiError ? error : new Error('Failed to fetch leads');
        setState({ loading: false, error: err });
        return null;
      }
    },
    [token]
  );

  const getLeadDetail = useCallback(
    async (leadId: string): Promise<LeadDetail | null> => {
      setState({ loading: true, error: null });
      try {
        const response = await apiClient.get<LeadDetail>(
          `/api/comercial/leads/${leadId}`,
          token
        );
        setState({ loading: false, error: null });
        return response;
      } catch (error) {
        const err = error instanceof ApiError ? error : new Error('Failed to fetch lead detail');
        setState({ loading: false, error: err });
        return null;
      }
    },
    [token]
  );

  const getDashboardStats = useCallback(
    async (): Promise<DashboardStats | null> => {
      setState({ loading: true, error: null });
      try {
        const response = await apiClient.get<DashboardStats>(
          `/api/comercial/dashboard/stats`,
          token
        );
        setState({ loading: false, error: null });
        return response;
      } catch (error) {
        const err = error instanceof ApiError ? error : new Error('Failed to fetch dashboard stats');
        setState({ loading: false, error: err });
        return null;
      }
    },
    [token]
  );

  const addActivity = useCallback(
    async (
      leadId: string,
      tipo: string,
      descricao: string
    ): Promise<{ success: boolean; error?: string }> => {
      setState({ loading: true, error: null });
      try {
        await apiClient.post(
          `/api/comercial/leads/${leadId}/atividades`,
          { tipo, descricao },
          token
        );
        setState({ loading: false, error: null });
        return { success: true };
      } catch (error) {
        const err = error instanceof ApiError ? error : new Error('Failed to add activity');
        setState({ loading: false, error: err });
        return { success: false, error: err.message };
      }
    },
    [token]
  );

  return {
    ...state,
    getLeads,
    getLeadDetail,
    getDashboardStats,
    addActivity,
  };
}
