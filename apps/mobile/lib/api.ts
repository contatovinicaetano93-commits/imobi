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
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("userRole");
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

export const engenheirosApi = {
  visitas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<VisitaEngenheiro[]>("/engenheiros/visitas", token ?? undefined);
    }),
};

export const parceirosApi = {
  resumo: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ParceiroResumo>("/parceiros/resumo", token ?? undefined);
    }),
  operacoes: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<OperacaoIndicada[]>("/parceiros/operacoes", token ?? undefined);
    }),
};

export const managerApi = {
  dashboard: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ManagerStats>("/manager/dashboard", token ?? undefined);
    }),
  etapasPendentes: (limit = 5) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<EtapasPendentesResponse>(`/manager/etapas-pendentes?limit=${limit}`, token ?? undefined);
    }),
  kycPendentes: (limit = 5) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycPendentesResponse>(`/manager/kyc-pendentes?limit=${limit}`, token ?? undefined);
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

export type VisitaStatus = "AGENDADA" | "INICIADA" | "CONCLUIDA" | "REPROVADA";

export type VisitaEngenheiro = {
  visitaId: string;
  status: VisitaStatus | string;
  etapaId: string;
  etapaNome: string;
  obraId: string;
  obraNome: string;
  dataAgendada: string;
  observacoes?: string | null;
  obra: {
    nome: string;
    endereco: string;
  };
  criadoEm: string;
};

export type ParceiroResumo = {
  comissoesAReceber: number;
  comissoesPagasMes: number;
  comissoesPagasTotal: number;
  operacoesAtivas: number;
  taxaAprovacao: number;
  codigoIndicacao: string;
};

export type OperacaoIndicada = {
  id: string;
  codigo: string;
  clienteRef: string;
  status: string;
  valorBase: number;
  percentualComissao: number;
  valorComissao: number;
  comissaoStatus: string;
  validadeIndicacao: string;
  criadoEm: string;
};

export type ManagerStats = {
  filaAprovacoes: number;
  filaKyc: number;
  creditosAtivos: number;
  obrasAtivas: number;
};

export type EtapaPendenteMobile = {
  etapaId: string;
  nome: string;
  ordem: number;
  percentualObra: number;
  valorLiberacao: number;
  evidenciasCount: number;
  criadoEm: string;
  obra: {
    obraId: string;
    nome: string;
    endereco: string;
    usuario?: {
      usuarioId: string;
      nome: string;
      email: string;
      cpf?: string;
    };
    credito?: {
      creditoId: string;
      valorAprovado: number;
    } | null;
  };
};

export type EtapasPendentesResponse = {
  etapas: EtapaPendenteMobile[];
  total: number;
};

export type KycPendenteMobile = {
  kycDocumentoId: string;
  tipo: string;
  status: string;
  criadoEm: string;
  usuario?: {
    usuarioId: string;
    nome: string;
    email: string;
    cpf?: string;
    kycStatus?: string;
  };
};

export type KycPendentesResponse = {
  documentos: KycPendenteMobile[];
  total: number;
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
