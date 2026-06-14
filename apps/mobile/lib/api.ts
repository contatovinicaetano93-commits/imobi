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

export const pushApi = {
  registrarToken: (fcmToken: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post("/api/v1/push-notificacoes/registrar-token", { token: fcmToken }, token ?? undefined);
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
  contarNaoLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<{ count: number }>("/api/v1/notificacoes/contar-nao-lidas", token ?? undefined);
    }),
  marcarComoLida: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<void>(`/api/v1/notificacoes/${id}/lida`, {}, token ?? undefined);
    }),
  marcarTodasComoLidas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<{ ok: boolean }>("/api/v1/notificacoes/marcar-todas-lidas", {}, token ?? undefined);
    }),
};

export const kycApi = {
  listarDocumentos: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycDocumento[]>("/api/v1/kyc/documentos", token ?? undefined);
    }),
  obterStatus: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<KycStatus>("/api/v1/kyc/status", token ?? undefined);
    }),
  uploadArquivo: async (tipo: string, uri: string, mimeType: string): Promise<KycDocumento> => {
    const token = await getToken();
    const apiUrl = process.env["EXPO_PUBLIC_API_URL"] ?? "";
    const form = new FormData();
    form.append("file", { uri, name: `kyc-${tipo}.jpg`, type: mimeType } as never);
    form.append("tipo", tipo);
    const res = await fetch(`${apiUrl}/api/v1/kyc/upload-arquivo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token ?? ""}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json() as { message?: string };
      throw new Error(err.message ?? "Erro no upload");
    }
    return res.json() as Promise<KycDocumento>;
  },
};

// ── Vistoria API (Engenheiro) ──
export const vistoriaApi = {
  listarPendentes: (limit = 20, offset = 0) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<{ etapas: EtapaVistoria[]; total: number }>(
        `/api/v1/manager/etapas-pendentes?limit=${limit}&offset=${offset}`,
        token ?? undefined
      );
    }),
  aprovar: (etapaId: string, observacoes?: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<{ ok: boolean; status: string }>(
        `/api/v1/vistoria/${etapaId}/aprovar`,
        { observacoes },
        token ?? undefined
      );
    }),
  rejeitar: (etapaId: string, motivo: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<{ ok: boolean; status: string }>(
        `/api/v1/vistoria/${etapaId}/rejeitar`,
        { motivo },
        token ?? undefined
      );
    }),
};

// ── Admin API ──
export const adminApi = {
  overview: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<AdminOverview>("/api/v1/admin/overview", token ?? undefined);
    }),
  listarEtapasAguardandoValidacao: (limit = 20, offset = 0) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<{ etapas: EtapaValidacao[]; total: number }>(
        `/api/v1/admin/etapas/aguardando-validacao?limit=${limit}&offset=${offset}`,
        token ?? undefined
      );
    }),
  validarEtapa: (etapaId: string, observacoes?: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<{ ok: boolean; status: string }>(
        `/api/v1/admin/etapas/${etapaId}/validar`,
        { observacoes },
        token ?? undefined
      );
    }),
  rejeitarEtapa: (etapaId: string, motivo: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<{ ok: boolean; status: string }>(
        `/api/v1/admin/etapas/${etapaId}/rejeitar`,
        { motivo },
        token ?? undefined
      );
    }),
};

// ── New Types ──
export type EtapaVistoria = {
  etapaId: string;
  nome: string;
  percentualObra: number;
  valorLiberacao: number;
  status: string;
  obraId: string;
  obraNome: string;
  construtor: string;
  totalEvidencias: number;
  evidencias: { evidenciaId: string; fotoUrl: string; latCaptura: number; lngCaptura: number; criadoEm: string }[];
  diasAguardando?: number;
};

export type EtapaValidacao = EtapaVistoria & {
  aprovadoPorEngenheiro: string;
  aprovadoEm: string;
  creditoStatus: string;
  valorAprovado: number;
};

export type AdminOverview = {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  visitasAgendadas: number;
  filaLiberacao: number;
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
  evidencias?: Evidencia[];
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
  notificacaoId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  lida: boolean;
  lidoEm?: string | null;
  criadoEm: string;
};

export type KycDocumento = {
  kycDocumentoId: string;
  tipo: string;
  url: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  motivo_rejeicao?: string | null;
  criadoEm: string;
};

export type KycStatus = {
  usuarioId: string;
  status: string;
  documentos: KycDocumento[];
  resumo: { pendentes: number; aprovados: number; rejeitados: number };
};
