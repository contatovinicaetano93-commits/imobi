"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "../services/api-client";
import type { SimulacaoCreditoInput, SolicitacaoCreditoInput } from "@imbobi/schemas";
import { simularCredito, type SimulacaoResult } from "../utils/credito";

export interface LiberacaoResumo {
  liberacaoId: string;
  valor: number;
  status: string;
  criadoEm: string;
  motivo?: string;
}

export interface Credito {
  creditoId: string;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
  liberacoes: LiberacaoResumo[];
}

interface CreditoState {
  creditos: Credito[];
  creditoAtual: Credito | null;
  simulacao: SimulacaoResult | null;
  loading: boolean;
  error: Error | null;
}

export function useCredito(token?: string) {
  const [state, setState] = useState<CreditoState>({
    creditos: [],
    creditoAtual: null,
    simulacao: null,
    loading: false,
    error: null,
  });

  const simular = useCallback(
    (input: SimulacaoCreditoInput): SimulacaoResult => {
      const TAXA_MENSAL = 0.0099;
      const resultado = simularCredito(input.valorSolicitado, TAXA_MENSAL, input.prazoMeses);
      setState((s) => ({ ...s, simulacao: resultado }));
      return resultado;
    },
    []
  );

  const solicitar = useCallback(
    async (input: SolicitacaoCreditoInput): Promise<Credito | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const credito = await apiClient.post<Credito>("/credito/solicitar", input, token);
        setState((s) => ({ ...s, creditos: [credito, ...s.creditos], loading: false }));
        return credito;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao solicitar crédito");
        setState((s) => ({ ...s, loading: false, error }));
        return null;
      }
    },
    [token]
  );

  const listar = useCallback(async (): Promise<Credito[] | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const creditos = await apiClient.get<Credito[]>("/credito", token);
      setState((s) => ({ ...s, creditos, loading: false }));
      return creditos;
    } catch (err) {
      const error = err instanceof ApiError ? err : new Error("Falha ao carregar créditos");
      setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
  }, [token]);

  const extrato = useCallback(
    async (creditoId: string): Promise<Credito | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const credito = await apiClient.get<Credito>(`/credito/${creditoId}/extrato`, token);
        setState((s) => ({ ...s, creditoAtual: credito, loading: false }));
        return credito;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao carregar extrato");
        setState((s) => ({ ...s, loading: false, error }));
        return null;
      }
    },
    [token]
  );

  return { ...state, simular, solicitar, listar, extrato };
}
