import * as SecureStore from "expo-secure-store";
import { apiClient, ApiError } from "@imbobi/core";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    throw e;
  }
}

export type AdminOverview = {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  filaLiberacao: number;
  visitasAgendadas: number;
};

export type TaxaPolitica = {
  taxaSimulacao: number;
  minAprovacao: number;
  maxSimulacao: number;
  faixaAprovacao: string;
  mensagem: string;
};

export type ManagerDashboard = {
  filaAprovacoes: number;
  filaKyc: number;
  creditosAtivos: number;
  obrasAtivas: number;
};

export type VisitaEng = {
  visitaId: string;
  etapaId: string;
  etapaNome: string;
  obraId: string;
  obraNome: string;
  status: string;
  dataAgendada: string;
  obra?: { nome: string; endereco: string };
};

export type EtapaPendente = {
  etapaId: string;
  nome: string;
  status: string;
  obra?: { obraId: string; nome: string };
};

export type KycPendente = {
  usuarioId: string;
  nome?: string;
  email?: string;
  kycStatus?: string;
};

export type ComiteItem = {
  comiteId: string;
  status: string;
  valorSolicitado: number;
  taxaMensal?: number;
  criadoEm: string;
  obra?: { nome: string };
  solicitacao?: { status: string; taxaMensal?: number };
};

export type SolicitacaoComite = {
  solicitacaoId: string;
  status: string;
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  finalidade?: string;
  criadoEm: string;
};

export const adminApi = {
  overview: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<AdminOverview>("/admin/overview", token ?? undefined);
    }),
  obras: (limit = 20) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<{ obras: unknown[]; total: number }>(
        `/admin/obras?limit=${limit}`,
        token ?? undefined
      );
    }),
  getTaxaPolitica: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<TaxaPolitica>("/admin/taxa-referencia", token ?? undefined);
    }),
};

export const managerApi = {
  dashboard: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<ManagerDashboard>("/manager/dashboard", token ?? undefined);
    }),
  etapasPendentes: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<{ etapas: EtapaPendente[] } | EtapaPendente[]>(
        "/manager/etapas-pendentes",
        token ?? undefined
      );
      return Array.isArray(data) ? data : data.etapas ?? [];
    }),
  kycPendentes: () =>
    callApi(async () => {
      const token = await getToken();
      const data = await apiClient.get<{ documentos: KycPendente[] } | KycPendente[]>(
        "/manager/kyc-pendentes",
        token ?? undefined
      );
      return Array.isArray(data) ? data : data.documentos ?? [];
    }),
  aprovarEtapa: (id: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<{ ok: boolean }>(`/manager/etapas/${id}/aprovar`, {}, token ?? undefined);
    }),
  rejeitarEtapa: (id: string, motivo: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<{ ok: boolean }>(
        `/manager/etapas/${id}/rejeitar`,
        { motivo },
        token ?? undefined
      );
    }),
  validarEvidencia: (id: string, aprovado: boolean, observacao?: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<{ ok: boolean }>(
        `/evidencias/${id}/validar`,
        { aprovado, observacao },
        token ?? undefined
      );
    }),
};

export const engenheiroApi = {
  visitas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<VisitaEng[]>("/engenheiros/visitas", token ?? undefined);
    }),
  visitaDetalhe: (visitaId: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<Record<string, unknown>>(
        `/engenheiros/visitas/${visitaId}`,
        token ?? undefined
      );
    }),
  atualizarVisita: (visitaId: string, body: { status: string; observacoes?: string }) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.patch<{ ok: boolean }>(
        `/engenheiros/visitas/${visitaId}`,
        body,
        token ?? undefined
      );
    }),
};

export const comiteApi = {
  listar: (status?: string) =>
    callApi(async () => {
      const token = await getToken();
      const q = status ? `?status=${status}` : "";
      const data = await apiClient.get<{ comites: ComiteItem[] } | ComiteItem[]>(
        `/comite${q}`,
        token ?? undefined
      );
      return Array.isArray(data) ? data : data.comites ?? [];
    }),
  minhas: () =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.get<SolicitacaoComite[]>("/comite/minhas", token ?? undefined);
    }),
  solicitar: (body: {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    finalidade: string;
    obraId?: string;
    observacoes?: string;
  }) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<SolicitacaoComite>("/comite/solicitar", body, token ?? undefined);
    }),
  votar: (
    comiteId: string,
    voto: "APROVADO" | "REPROVADO",
    justificativa?: string,
    taxaFinal?: number
  ) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<{ ok: boolean }>(
        `/comite/${comiteId}/votar`,
        { voto, justificativa, taxaFinal },
        token ?? undefined
      );
    }),
  parecer: (comiteId: string, parecerTecnico: string) =>
    callApi(async () => {
      const token = await getToken();
      return apiClient.post<{ ok: boolean }>(
        `/comite/${comiteId}/parecer`,
        { parecerTecnico },
        token ?? undefined
      );
    }),
};
