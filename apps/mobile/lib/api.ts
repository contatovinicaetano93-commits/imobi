import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";

let _onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await SecureStore.deleteItemAsync("accessToken");
      _onUnauthorized?.();
    }
    throw e;
  }
}

export { ApiError };

export const usuariosApi = {
  obterPerfil: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<UsuarioPerfil>("/api/v1/usuarios/me", token ?? undefined);
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
      return apiClient.get<ScoreData>("/api/v1/score", token ?? undefined);
    }),
};

export const authApi = {
  logout: (refreshToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/auth/logout", { refreshToken }, token ?? undefined);
    }),
};

export const adminApi = {
  listarUsuarios: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<AdminUsuario[]>("/api/v1/admin/usuarios", token ?? undefined);
    }),
  criarUsuario: (body: { nome: string; email: string; senha: string; tipo: string }) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<AdminUsuario>("/api/v1/admin/usuarios", body, token ?? undefined);
    }),
  atualizarUsuario: (id: string, body: { bloqueado?: boolean; tipo?: string }) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<AdminUsuario>(`/api/v1/admin/usuarios/${id}`, body, token ?? undefined);
    }),
};

export const kycApi = {
  listarPendentes: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycDocumento[]>("/api/v1/kyc/pendentes", token ?? undefined);
    }),
  aprovar: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch(`/api/v1/kyc/${id}/aprovar`, {}, token ?? undefined);
    }),
  rejeitar: (id: string, motivo: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch(`/api/v1/kyc/${id}/rejeitar`, { motivo }, token ?? undefined);
    }),
};

export const notificacoesApi = {
  listar: (limit = 20, offset = 0) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<{ notificacoes: Notificacao[]; total: number }>(
        `/api/v1/notificacoes?limit=${limit}&offset=${offset}`,
        token ?? undefined
      );
    }),
  marcarLida: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch(`/api/v1/notificacoes/${id}/lida`, {}, token ?? undefined);
    }),
  marcarTodasLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch("/api/v1/notificacoes/marcar-todas-lidas", {}, token ?? undefined);
    }),
  deletar: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.delete(`/api/v1/notificacoes/${id}`, token ?? undefined);
    }),
};

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
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
  creditoId: string;
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

export type AdminUsuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  bloqueadoEm: string | null;
  criadoEm: string;
  totalObras: number;
  totalCreditos: number;
};

export type KycDocumento = {
  kycDocumentoId: string;
  usuarioId: string;
  tipo: string;
  url: string;
  status: string;
  motivo_rejeicao?: string | null;
  criadoEm: string;
  usuario: { nome: string; email: string; cpf: string };
};

export type Notificacao = {
  notificacaoId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  lida: boolean;
  lidoEm?: string | null;
  criadoEm: string;
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
