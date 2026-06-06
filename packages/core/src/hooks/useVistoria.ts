"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "../services/api-client";
import type { AprovarVistoriaInput, RejeitarVistoriaInput } from "@imbobi/schemas";

export interface EtapaVistoria {
  etapaId: string;
  obraId: string;
  nome: string;
  status: string;
  percentualObra: number;
  ordem: number;
  dataConclusaoReal?: string;
}

interface VistoriaState {
  loading: boolean;
  error: Error | null;
}

export function useVistoria(token?: string) {
  const [state, setState] = useState<VistoriaState>({
    loading: false,
    error: null,
  });

  const aprovar = useCallback(
    async (
      etapaId: string,
      input: AprovarVistoriaInput
    ): Promise<{ ok: boolean } | null> => {
      setState({ loading: true, error: null });
      try {
        const res = await apiClient.patch<{ ok: boolean }>(
          `/etapas/${etapaId}/aprovar`,
          { observacao: input.observacoes },
          token
        );
        setState({ loading: false, error: null });
        return res;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao aprovar etapa");
        setState({ loading: false, error });
        return null;
      }
    },
    [token]
  );

  const rejeitar = useCallback(
    async (
      etapaId: string,
      input: RejeitarVistoriaInput
    ): Promise<{ ok: boolean } | null> => {
      setState({ loading: true, error: null });
      try {
        const res = await apiClient.patch<{ ok: boolean }>(
          `/etapas/${etapaId}/rejeitar`,
          { motivo: input.motivo },
          token
        );
        setState({ loading: false, error: null });
        return res;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao rejeitar etapa");
        setState({ loading: false, error });
        return null;
      }
    },
    [token]
  );

  const listarPorObra = useCallback(
    async (obraId: string): Promise<EtapaVistoria[] | null> => {
      setState({ loading: true, error: null });
      try {
        const etapas = await apiClient.get<EtapaVistoria[]>(
          `/etapas/obra/${obraId}`,
          token
        );
        setState({ loading: false, error: null });
        return etapas;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao carregar etapas");
        setState({ loading: false, error });
        return null;
      }
    },
    [token]
  );

  return { ...state, aprovar, rejeitar, listarPorObra };
}
