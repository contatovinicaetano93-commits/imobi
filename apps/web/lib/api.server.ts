// Server-side API client for use in Next.js Server Components and Route Handlers.
// Calls NestJS directly (absolute URL) and reads the httpOnly access_token cookie
// for auth — bypassing the /api/proxy route which cannot be called with a relative
// URL from the server side.
import { cookies } from "next/headers";

const NEST_API =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${NEST_API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Obras (server-side) ────────────────────────────────────────────────

export type ObraResumo = {
  id: string; nome: string; status: string;
  geoLatitude: number; geoLongitude: number; raioValidacaoMetros: number;
  endereco?: string;
  progresso?: number;
  credito?: { id: string; valorAprovado: number; valorLiberado: number; status: string } | null;
  etapas?: EtapaResumo[];
};

export type EtapaResumo = {
  id: string; nome: string; ordem: number;
  percentualObra: number; valorLiberacao: number; status: string;
  evidencias?: { id: string; fotoUrl: string; validada: boolean; criadoEm: string }[];
};

export const obrasServerApi = {
  listar: () => serverFetch<ObraResumo[]>("/obras"),
  buscar: (id: string) => serverFetch<ObraResumo>(`/obras/${id}`),
  progresso: (id: string) => serverFetch<number>(`/obras/${id}/progresso`),
};

// ── Crédito (server-side) ─────────────────────────────────────────────

export type CreditoResumo = {
  id: string; valorAprovado: number; valorLiberado: number;
  taxaMensal: number; prazoMeses: number; status: string;
  dataAprovacao?: string; dataVencimento?: string;
  obras?: { id: string; nome: string; status: string }[];
  liberacoes?: { id: string; valor: number; status: string; processadoEm?: string }[];
};

export const creditoServerApi = {
  meus: () => serverFetch<CreditoResumo[]>("/credito/meus"),
  extrato: (id: string) => serverFetch<CreditoResumo>(`/credito/${id}/extrato`),
};

// ── Evidências (server-side) ───────────────────────────────────────────

export type EvidenciaDetalhe = {
  id: string; fotoUrl: string; latCaptura: number; lngCaptura: number;
  accuracyMetros: number; distanciaObra?: number; validada: boolean;
  observacao?: string; criadoEm: string;
};

export const evidenciasServerApi = {
  listarPorEtapa: (etapaId: string) =>
    serverFetch<EvidenciaDetalhe[]>(`/evidencias/etapa/${etapaId}`),
};

// ── Manager (server-side) ─────────────────────────────────────────────

export type EtapaDetalheMgr = {
  etapaId: string;
  nome: string;
  ordem: number;
  percentualObra: number;
  valorLiberacao: number;
  status: string;
  obra: {
    obraId: string;
    nome: string;
    endereco: string;
  };
};

export const managerServerApi = {
  obterEtapaDetalhe: (etapaId: string) =>
    serverFetch<EtapaDetalheMgr>(`/manager/etapas/${etapaId}`),
};

// ── Score (server-side) ───────────────────────────────────────────────

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

export const scoreServerApi = {
  atual: () => serverFetch<ScoreAtual>("/score/atual"),
  historico: (limit?: number) =>
    serverFetch<ScoreHistorico[]>(`/score/historico${limit ? `?limit=${limit}` : ""}`),
};

// ── Usuários (server-side) ────────────────────────────────────────────

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

export const usuariosServerApi = {
  meuPerfil: () => serverFetch<UsuarioPerfil>("/usuarios/meu-perfil"),
};

// ── Engenheiros (server-side) ─────────────────────────────────────────

export type Visita = {
  visitaId: string;
  status: "AGENDADA" | "INICIADA" | "CONCLUIDA";
  etapaId: string;
  etapaNome: string;
  obraId: string;
  obraNome: string;
  dataAgendada: string;
  dataInicio?: string;
  dataConclusao?: string;
  observacoes?: string;
  obra: {
    nome: string;
    endereco?: string;
  };
  criadoEm: string;
};

export const engenheirosServerApi = {
  listarVisitas: () => serverFetch<Visita[]>("/engenheiros/visitas"),
};
