"use client";

import { cookies } from "next/headers";
import type {
  ObraResumo,
  CreditoResumo,
  EvidenciaDetalhe,
  ScoreAtual,
  ScoreHistorico,
  UsuarioPerfil,
  KycDocumento,
  KycStatus,
  EtapaPendente,
  EtapaDetalhe,
  KycPendente,
  ManagerStats,
  Notificacao,
  NotificacaoListResponse,
} from "./api-types";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Obras ─────────────────────────────────────────────────────────────

export const obrasApi = {
  listar: () => apiFetch<ObraResumo[]>("/obras"),
  buscar: (id: string) => apiFetch<ObraResumo>(`/obras/${id}`),
  progresso: (id: string) => apiFetch<number>(`/obras/${id}/progresso`),
};

// ── Crédito ───────────────────────────────────────────────────────────

export const creditoApi = {
  meus: () => apiFetch<CreditoResumo[]>("/credito/meus"),
  extrato: (id: string) => apiFetch<CreditoResumo>(`/credito/${id}/extrato`),
};

// ── Evidências ────────────────────────────────────────────────────────

export const evidenciasApi = {
  listarPorEtapa: (etapaId: string) =>
    apiFetch<EvidenciaDetalhe[]>(`/evidencias/etapa/${etapaId}`),
};

// ── Score ─────────────────────────────────────────────────────────────

export const scoreApi = {
  atual: () => apiFetch<ScoreAtual>("/score/atual"),
  historico: (limit?: number) =>
    apiFetch<ScoreHistorico[]>(`/score/historico${limit ? `?limit=${limit}` : ""}`),
};

// ── Usuários ──────────────────────────────────────────────────────────

export const usuariosApi = {
  meuPerfil: () => apiFetch<UsuarioPerfil>("/usuarios/meu-perfil"),
  atualizarPerfil: (data: { nome?: string; telefone?: string }) =>
    apiFetch<UsuarioPerfil>("/usuarios/meu-perfil", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── KYC ───────────────────────────────────────────────────────────────

export const kycApi = {
  uploadDocumento: (tipo: string, url: string) =>
    apiFetch<KycDocumento>("/kyc/upload", {
      method: "POST",
      body: JSON.stringify({ tipo, url }),
    }),
  listarDocumentos: () => apiFetch<KycDocumento[]>("/kyc/documentos"),
  obterStatus: () => apiFetch<KycStatus>("/kyc/status"),
  verificarKycCompleto: () => apiFetch<{ completo: boolean; documentos: KycDocumento[] }>("/kyc/verificar"),
};

// ── Manager ───────────────────────────────────────────────────────────

export const managerApi = {
  dashboard: () => apiFetch<ManagerStats>("/manager/dashboard"),
  listarEtapasPendentes: (limit?: number, offset?: number) =>
    apiFetch<{ etapas: EtapaPendente[]; total: number }>(
      `/manager/etapas-pendentes${limit || offset ? `?limit=${limit ?? 20}&offset=${offset ?? 0}` : ""}`
    ),
  listarKycPendentes: (limit?: number, offset?: number) =>
    apiFetch<{ documentos: KycPendente[]; total: number }>(
      `/manager/kyc-pendentes${limit || offset ? `?limit=${limit ?? 20}&offset=${offset ?? 0}` : ""}`
    ),
  obterEtapaDetalhe: (id: string) => apiFetch<EtapaDetalhe>(`/manager/etapas/${id}`),
  obterKycDetalhe: (id: string) => apiFetch<KycPendente>(`/manager/kyc/${id}`),
  aprovarEtapa: (id: string, observacao?: string) =>
    apiFetch(`/manager/etapas/${id}/aprovar`, { method: "PATCH", body: JSON.stringify({ observacao }) }),
  rejeitarEtapa: (id: string, motivo: string) =>
    apiFetch(`/manager/etapas/${id}/rejeitar`, { method: "PATCH", body: JSON.stringify({ motivo }) }),
  aprovarKyc: (id: string) =>
    apiFetch(`/manager/kyc/${id}/aprovar`, { method: "PATCH" }),
  rejeitarKyc: (id: string, motivo: string) =>
    apiFetch(`/manager/kyc/${id}/rejeitar`, { method: "PATCH", body: JSON.stringify({ motivo }) }),
};

// ── Notificações ──────────────────────────────────────────────────────

export const notificacoesApi = {
  listar: (limit?: number, offset?: number) =>
    apiFetch<NotificacaoListResponse>(
      `/notificacoes${limit || offset ? `?limit=${limit ?? 20}&offset=${offset ?? 0}` : ""}`
    ),
  listarNaoLidas: () => apiFetch<Notificacao[]>("/notificacoes/nao-lidas"),
  contarNaoLidas: () => apiFetch<{ count: number }>("/notificacoes/contar-nao-lidas"),
  marcarComoLida: (id: string) =>
    apiFetch(`/notificacoes/${id}/lida`, { method: "PATCH" }),
  marcarTudasComoLidas: () =>
    apiFetch("/notificacoes/marcar-todas-lidas", { method: "PATCH" }),
  deletar: (id: string) =>
    apiFetch(`/notificacoes/${id}`, { method: "DELETE" }),
};
