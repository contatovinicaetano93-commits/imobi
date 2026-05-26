import { cookies } from "next/headers";

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

export type ObraResumo = {
  id: string; nome: string; status: string;
  geoLatitude: number; geoLongitude: number; raioValidacaoMetros: number;
  progresso?: number;
  credito?: { id: string; valorAprovado: number; valorLiberado: number; status: string } | null;
  etapas?: EtapaResumo[];
};

export type EtapaResumo = {
  id: string; nome: string; ordem: number;
  percentualObra: number; valorLiberacao: number; status: string;
  evidencias?: { id: string; fotoUrl: string; validada: boolean; criadoEm: string }[];
};

export const obrasApi = {
  listar: () => apiFetch<ObraResumo[]>("/obras"),
  buscar: (id: string) => apiFetch<ObraResumo>(`/obras/${id}`),
  progresso: (id: string) => apiFetch<number>(`/obras/${id}/progresso`),
};

// ── Crédito ───────────────────────────────────────────────────────────

export type CreditoResumo = {
  id: string; valorAprovado: number; valorLiberado: number;
  taxaMensal: number; prazoMeses: number; status: string;
  dataAprovacao?: string; dataVencimento?: string;
  obras?: { id: string; nome: string; status: string }[];
  liberacoes?: { id: string; valor: number; status: string; processadoEm?: string }[];
};

export const creditoApi = {
  meus: () => apiFetch<CreditoResumo[]>("/credito/meus"),
  extrato: (id: string) => apiFetch<CreditoResumo>(`/credito/${id}/extrato`),
};

// ── Evidências ────────────────────────────────────────────────────────

export type EvidenciaDetalhe = {
  id: string; fotoUrl: string; latCaptura: number; lngCaptura: number;
  accuracyMetros: number; distanciaObra?: number; validada: boolean;
  observacao?: string; criadoEm: string;
};

export const evidenciasApi = {
  listarPorEtapa: (etapaId: string) =>
    apiFetch<EvidenciaDetalhe[]>(`/evidencias/etapa/${etapaId}`),
};

// ── Score ─────────────────────────────────────────────────────────────

export type ScoreAtual = {
  score: number;
  nivel: string;
  cor: string;
  descricao: string;
};

export type ScoreHistorico = {
  id: string;
  score: number;
  motivo: string;
  criadoEm: string;
};

export const scoreApi = {
  atual: () => apiFetch<ScoreAtual>("/score/atual"),
  historico: (limit?: number) =>
    apiFetch<ScoreHistorico[]>(`/score/historico${limit ? `?limit=${limit}` : ""}`),
};

// ── Usuários ──────────────────────────────────────────────────────────

export type UsuarioPerfil = {
  usuarioId: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  tipo: string;
  kycStatus: string;
  criadoEm: string;
  atualizadoEm: string;
};

export const usuariosApi = {
  meuPerfil: () => apiFetch<UsuarioPerfil>("/usuarios/meu-perfil"),
  atualizarPerfil: (data: { nome?: string; telefone?: string }) =>
    apiFetch<UsuarioPerfil>("/usuarios/meu-perfil", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
