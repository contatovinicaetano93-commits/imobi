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
