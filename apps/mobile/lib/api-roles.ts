import * as SecureStore from "expo-secure-store";
import { ApiError } from "@imbobi/core";
import { apiFetch, withAuthApi } from "./api";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("accessToken");
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeEtapaPendente(raw: Record<string, unknown>): EtapaPendente {
  const obra = raw.obra as Record<string, unknown> | undefined;
  return {
    etapaId: asString(raw.etapaId ?? raw.id),
    nome: asString(raw.nome),
    status: asString(raw.status, "AGUARDANDO_VISTORIA"),
    obra: obra
      ? { obraId: asString(obra.obraId ?? obra.id), nome: asString(obra.nome) }
      : undefined,
  };
}

function normalizeKycPendente(raw: Record<string, unknown>): KycPendente {
  const usuario = raw.usuario as Record<string, unknown> | undefined;
  if (usuario) {
    return {
      kycDocumentoId: asString(raw.kycDocumentoId ?? raw.id),
      usuarioId: asString(usuario.usuarioId ?? usuario.id),
      nome: asString(usuario.nome),
      email: asString(usuario.email),
      kycStatus: asString(usuario.kycStatus, "PENDENTE"),
      tipo: asString(raw.tipo),
    };
  }
  return {
    kycDocumentoId: asString(raw.kycDocumentoId ?? raw.id),
    usuarioId: asString(raw.usuarioId ?? raw.id),
    nome: asString(raw.nome),
    email: asString(raw.email),
    kycStatus: asString(raw.kycStatus, "PENDENTE"),
    tipo: asString(raw.tipo),
  };
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
  kycDocumentoId: string;
  usuarioId: string;
  nome?: string;
  email?: string;
  kycStatus?: string;
  tipo?: string;
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
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.get<AdminOverview>("/admin/overview", token ?? undefined);
    }),
  obras: (limit = 20) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.get<{ obras: unknown[]; total: number }>(
        `/admin/obras?limit=${limit}`,
        token ?? undefined,
      );
    }),
};

export const managerApi = {
  dashboard: () =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.get<ManagerDashboard>("/manager/dashboard", token ?? undefined);
    }),
  etapasPendentes: () =>
    withAuthApi(async () => {
      const token = await getToken();
      const data = await apiFetch.get<{ etapas: unknown[]; total?: number } | unknown[]>(
        "/manager/etapas-pendentes",
        token ?? undefined,
      );
      const list = Array.isArray(data) ? data : data.etapas ?? [];
      return list.map((e) => normalizeEtapaPendente(e as Record<string, unknown>));
    }),
  kycPendentes: () =>
    withAuthApi(async () => {
      const token = await getToken();
      const data = await apiFetch.get<{ documentos: unknown[]; total?: number } | unknown[]>(
        "/manager/kyc-pendentes",
        token ?? undefined,
      );
      const list = Array.isArray(data) ? data : data.documentos ?? [];
      return list.map((d) => normalizeKycPendente(d as Record<string, unknown>));
    }),
  aprovarEtapa: (id: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.patch<{ ok: boolean }>(`/manager/etapas/${id}/aprovar`, {}, token ?? undefined);
    }),
  rejeitarEtapa: (id: string, motivo: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.patch<{ ok: boolean }>(
        `/manager/etapas/${id}/rejeitar`,
        { motivo },
        token ?? undefined,
      );
    }),
  aprovarKyc: (id: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.patch<{ ok: boolean }>(`/manager/kyc/${id}/aprovar`, {}, token ?? undefined);
    }),
  rejeitarKyc: (id: string, motivo: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.patch<{ ok: boolean }>(
        `/manager/kyc/${id}/rejeitar`,
        { motivo },
        token ?? undefined,
      );
    }),
};

export const engenheiroApi = {
  visitas: () =>
    withAuthApi(async () => {
      const token = await getToken();
      const data = await apiFetch.get<VisitaEng[] | { visitas: VisitaEng[] }>(
        "/engenheiros/visitas",
        token ?? undefined,
      );
      return Array.isArray(data) ? data : data.visitas ?? [];
    }),
  visitaDetalhe: (visitaId: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.get<Record<string, unknown>>(
        `/engenheiros/visitas/${visitaId}`,
        token ?? undefined,
      );
    }),
  atualizarVisita: (visitaId: string, body: { status: string; observacoes?: string }) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.patch<{ ok: boolean }>(
        `/engenheiros/visitas/${visitaId}`,
        body,
        token ?? undefined,
      );
    }),
};

export const comiteApi = {
  listar: (status?: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      const q = status ? `?status=${status}` : "";
      const data = await apiFetch.get<{ comites: ComiteItem[] } | ComiteItem[]>(
        `/comite${q}`,
        token ?? undefined,
      );
      return Array.isArray(data) ? data : data.comites ?? [];
    }),
  minhas: () =>
    withAuthApi(async () => {
      const token = await getToken();
      const data = await apiFetch.get<SolicitacaoComite[] | { solicitacoes: SolicitacaoComite[] }>(
        "/comite/minhas",
        token ?? undefined,
      );
      return Array.isArray(data) ? data : data.solicitacoes ?? [];
    }),
  solicitar: (body: {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    finalidade: string;
    obraId?: string;
    observacoes?: string;
  }) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.post<SolicitacaoComite>("/comite/solicitar", body, token ?? undefined);
    }),
  votar: (
    comiteId: string,
    voto: "APROVAR" | "AJUSTAR" | "REPROVAR",
    justificativa?: string,
    taxaFinal?: number,
  ) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.post<{ ok: boolean }>(
        `/comite/${comiteId}/votar`,
        {
          voto,
          justificativa,
          condicoes: taxaFinal != null ? `taxa:${taxaFinal}` : undefined,
        },
        token ?? undefined,
      );
    }),
  parecer: (comiteId: string, parecerTecnico: string) =>
    withAuthApi(async () => {
      const token = await getToken();
      return apiFetch.post<{ ok: boolean }>(
        `/comite/${comiteId}/parecer`,
        { parecerTecnico },
        token ?? undefined,
      );
    }),
};

export { ApiError };
