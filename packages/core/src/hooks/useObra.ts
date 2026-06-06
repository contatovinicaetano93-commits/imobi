"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "../services/api-client";
import type { CriarObraInput } from "@imbobi/schemas";

export interface EtapaResumo {
  etapaId: string;
  nome: string;
  status: string;
  ordem: number;
}

export interface Obra {
  obraId: string;
  nome: string;
  status: string;
  areaM2: number;
  geoLatitude: number;
  geoLongitude: number;
  raioValidacaoMetros: number;
  endereco: unknown;
  etapas: EtapaResumo[];
  criadoEm: string;
}

interface ObrasState {
  obras: Obra[];
  obraAtual: Obra | null;
  progresso: number | null;
  loading: boolean;
  error: Error | null;
}

export function useObra(token?: string) {
  const [state, setState] = useState<ObrasState>({
    obras: [],
    obraAtual: null,
    progresso: null,
    loading: false,
    error: null,
  });

  const listar = useCallback(async (): Promise<Obra[] | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const obras = await apiClient.get<Obra[]>("/obras", token);
      setState((s) => ({ ...s, obras, loading: false }));
      return obras;
    } catch (err) {
      const error = err instanceof ApiError ? err : new Error("Falha ao carregar obras");
      setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
  }, [token]);

  const buscar = useCallback(
    async (obraId: string): Promise<Obra | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const obra = await apiClient.get<Obra>(`/obras/${obraId}`, token);
        setState((s) => ({ ...s, obraAtual: obra, loading: false }));
        return obra;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao carregar obra");
        setState((s) => ({ ...s, loading: false, error }));
        return null;
      }
    },
    [token]
  );

  const criar = useCallback(
    async (input: CriarObraInput): Promise<Obra | null> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const obra = await apiClient.post<Obra>("/obras", input, token);
        setState((s) => ({ ...s, obras: [obra, ...s.obras], obraAtual: obra, loading: false }));
        return obra;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha ao criar obra");
        setState((s) => ({ ...s, loading: false, error }));
        return null;
      }
    },
    [token]
  );

  const buscarProgresso = useCallback(
    async (obraId: string): Promise<number | null> => {
      try {
        const res = await apiClient.get<{ progresso: number }>(
          `/obras/${obraId}/progresso`,
          token
        );
        setState((s) => ({ ...s, progresso: res.progresso }));
        return res.progresso;
      } catch {
        return null;
      }
    },
    [token]
  );

  return { ...state, listar, buscar, criar, buscarProgresso };
}
