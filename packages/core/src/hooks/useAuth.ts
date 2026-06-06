"use client";

import { useState, useCallback } from "react";
import { apiClient, ApiError } from "../services/api-client";
import type { LoginInput, CadastroUsuarioInput, TipoUsuario, KycStatus } from "@imbobi/schemas";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  kycStatus: KycStatus;
}

export interface AuthState {
  usuario: UsuarioAutenticado | null;
  token: string | null;
  loading: boolean;
  error: Error | null;
}

export interface AuthActions {
  login: (input: LoginInput) => Promise<boolean>;
  cadastrar: (input: CadastroUsuarioInput) => Promise<boolean>;
  logout: () => void;
  limparErro: () => void;
}

export function useAuth(
  onTokenChange?: (token: string | null) => void
): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    usuario: null,
    token: null,
    loading: false,
    error: null,
  });

  const login = useCallback(
    async (input: LoginInput): Promise<boolean> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await apiClient.post<{
          accessToken: string;
          usuario: UsuarioAutenticado;
        }>("/auth/login", input);

        setState({ usuario: res.usuario, token: res.accessToken, loading: false, error: null });
        onTokenChange?.(res.accessToken);
        return true;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha no login");
        setState((s) => ({ ...s, loading: false, error }));
        return false;
      }
    },
    [onTokenChange]
  );

  const cadastrar = useCallback(
    async (input: CadastroUsuarioInput): Promise<boolean> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await apiClient.post<{
          accessToken: string;
          usuario: UsuarioAutenticado;
        }>("/auth/register", input);

        setState({ usuario: res.usuario, token: res.accessToken, loading: false, error: null });
        onTokenChange?.(res.accessToken);
        return true;
      } catch (err) {
        const error = err instanceof ApiError ? err : new Error("Falha no cadastro");
        setState((s) => ({ ...s, loading: false, error }));
        return false;
      }
    },
    [onTokenChange]
  );

  const logout = useCallback(() => {
    setState({ usuario: null, token: null, loading: false, error: null });
    onTokenChange?.(null);
  }, [onTokenChange]);

  const limparErro = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, login, cadastrar, logout, limparErro };
}
