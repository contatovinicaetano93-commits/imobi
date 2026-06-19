import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";

let _onUnauthorized: (() => void) | null = null;
let _refreshPromise: Promise<boolean> | null = null;

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function tryRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync("refreshToken");
      if (!refreshToken) return false;
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        "/auth/renovar",
        { refreshToken }
      );
      await SecureStore.setItemAsync("accessToken", res.accessToken);
      await SecureStore.setItemAsync("refreshToken", res.refreshToken);
      return true;
    } catch {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          try {
            return await fn();
          } catch (retryErr) {
            if (retryErr instanceof ApiError && retryErr.status === 401) {
              _onUnauthorized?.();
            }
            throw retryErr;
          }
        } else {
          _onUnauthorized?.();
        }
      }
      if (e.status === 403) {
        throw new ApiError(403, "Você não tem permissão para acessar este recurso.");
      }
    }
    throw e;
  }
}

export { ApiError };

export const usuariosApi = {
  obterPerfil: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<UsuarioPerfil>("/api/v1/usuarios/meu-perfil", token ?? undefined);
    }),
};

export const obrasApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Obra[]>("/api/v1/obras", token ?? undefined);
    }),
  buscar: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ObraDetalhe>(`/api/v1/obras/${obraId}`, token ?? undefined);
    }),
  progresso: (obraId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<number>(`/api/v1/obras/${obraId}/progresso`, token ?? undefined);
    }),
};

export const creditoApi = {
  meus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Credito[]>("/api/v1/credito/meus", token ?? undefined);
    }),
};

export const scoreApi = {
  obter: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ScoreData>("/api/v1/score/atual", token ?? undefined);
    }),
};

export const authApi = {
  logout: (refreshToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/auth/logout", { refreshToken }, token ?? undefined);
    }),
};

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
    }),
};

export const notificacoesApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Notificacao[]>("/api/v1/notificacoes", token ?? undefined);
    }),
  marcarLida: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post(`/api/v1/notificacoes/${id}/lida`, {}, token ?? undefined);
    }),
};

// Types
export type Obra = {
  obraId: string;
  nome: string;
  endereco: string;
  status: string;
  geoLatitude: number;
  geoLongitude: number;
  raioValidacaoMetros: number;
  etapas?: Etapa[];
};

export type ObraDetalhe = Obra & {
  credito?: { creditoId: string; valorAprovado: number; valorLiberado: number; status: string } | null;
  etapas: (Etapa & { evidencias: Evidencia[] })[];
};

export type Etapa = {
  etapaId: string;
  nome: string;
  ordem: number;
  percentualObra: number;
  valorLiberacao: number;
  status: string;
};

export type Evidencia = {
  evidenciaId: string;
  fotoUrl: string;
  validada: boolean;
  criadoEm: string;
};

export type Credito = {
  id: string;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
};

export type ScoreData = {
  score: number;
  nivel: string;
  cor: string;
  descricao: string;
};

export type UsuarioPerfil = {
  usuarioId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  criadoEm: string;
};

export type Notificacao = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  lida: boolean;
  criadoEm: string;
  link?: string;
};

export type SessaoAtiva = {
  sessionId: string;
  userAgent: string | null;
  ip: string | null;
  criadoEm: string;
  expiresAt: string;
};
