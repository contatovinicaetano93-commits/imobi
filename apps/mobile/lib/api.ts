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
  overview: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<AdminOverview>("/api/v1/admin/overview", token ?? undefined);
    }),
  etapasParaValidar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<AdminEtapaValidar[]>("/api/v1/admin/etapas/validar", token ?? undefined);
    }),
  validarEtapa: (etapaId: string, aprovado: boolean, motivo?: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post(`/api/v1/admin/etapas/${etapaId}/validar`, { aprovado, motivo }, token ?? undefined);
    }),
};

export type AdminOverview = {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  filaLiberacao: number;
};

export type AdminEtapaValidar = {
  etapaId: string;
  nome: string;
  percentualObra: number;
  obraId: string;
  obraNome: string;
  construtor: string;
  valorParcela: number;
  aguardandoDesde: string;
};

export const vistoriaApi = {
  listar: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<VistoriaItem[]>("/api/v1/engenheiros/visitas", token ?? undefined);
    }),
  obter: (etapaId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<VistoriaDetalhe>(`/api/v1/engenheiros/visitas/${etapaId}`, token ?? undefined);
    }),
  aprovar: (etapaId: string, observacoes?: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post(`/api/v1/vistoria/${etapaId}/aprovar`, { observacoes }, token ?? undefined);
    }),
  rejeitar: (etapaId: string, motivo: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post(`/api/v1/vistoria/${etapaId}/rejeitar`, { motivo }, token ?? undefined);
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

export type VistoriaItem = {
  etapaId: string;
  etapaNome: string;
  status: string;
  percentualObra: number;
  valorLiberacao: number;
  obraId: string;
  obraNome: string;
  obraEndereco: string;
  totalEvidencias: number;
  aguardandoDesde: string;
};

export type VistoriaDetalhe = {
  etapaId: string;
  etapaNome: string;
  status: string;
  percentualObra: number;
  valorLiberacao: number;
  obraId: string;
  obraNome: string;
  obraEndereco: string;
  obraLat: number;
  obraLng: number;
  raioMetros: number;
  aguardandoDesde: string;
  evidencias: {
    evidenciaId: string;
    fotoUrl: string;
    latCaptura: number;
    lngCaptura: number;
    accuracyMetros: number | null;
    distanciaObra: number | null;
    validada: boolean;
    criadoEm: string;
  }[];
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
