const _base = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
const API_URL = _base.endsWith("/api/v1") ? _base : `${_base}/api/v1`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const isClient = typeof window !== "undefined";
  const url = isClient ? `/api/proxy${path}` : `${API_URL}${path}`;

  const headers: Record<string, string> = {};
  if (!isClient) {
    try {
      const { cookies } = await import("next/headers");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jar = await (cookies as any)();
      const token = jar?.get?.("access_token")?.value;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch { /* not in Next.js server component context */ }
  }
  // Do NOT set Content-Type — browser/fetch sets multipart boundary automatically

  const res = await fetch(url, { method: "POST", headers, body: formData, cache: "no-store" });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isClient = typeof window !== "undefined";
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  let url: string;
  if (isClient) {
    // Client-side: route through Next.js proxy so httpOnly cookie is forwarded server-side
    url = `/api/proxy${path}`;
  } else {
    url = `${API_URL}${path}`;
    try {
      const { cookies } = await import("next/headers");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jar = await (cookies as any)();
      const token = jar?.get?.("access_token")?.value;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch { /* not in Next.js server component context */ }
  }

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    ...(isClient ? {} : { credentials: "include" }),
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

export type CriarObraPayload = {
  nome: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  geo: {
    latitude: number;
    longitude: number;
    raioValidacaoMetros?: number;
  };
  areaM2: number;
  datainicioISO?: string;
  dataConclusaoPrevistaISO: string;
  creditoId?: string;
};

export type ObraCriada = {
  obraId: string;
  nome: string;
  status: string;
};

export const obrasApi = {
  listar: () => apiFetch<ObraResumo[]>("/obras"),
  buscar: (id: string) => apiFetch<ObraResumo>(`/obras/${id}`),
  progresso: (id: string) => apiFetch<number>(`/obras/${id}/progresso`),
  criar: (data: CriarObraPayload) =>
    apiFetch<ObraCriada>("/obras", { method: "POST", body: JSON.stringify(data) }),
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
  upload: (
    file: File,
    data: {
      etapaId: string;
      latitude: number;
      longitude: number;
      accuracyMetros: number;
      timestampCaptura: string;
      descricao?: string;
    }
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("etapaId", data.etapaId);
    form.append("latitude", String(data.latitude));
    form.append("longitude", String(data.longitude));
    form.append("accuracyMetros", String(data.accuracyMetros));
    form.append("timestampCaptura", data.timestampCaptura);
    if (data.descricao) form.append("descricao", data.descricao);
    return apiUpload<EvidenciaDetalhe>("/evidencias", form);
  },
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

// ── KYC ───────────────────────────────────────────────────────────────

export type KycDocumento = {
  kycDocumentoId: string;
  tipo: string;
  url: string;
  status: string;
  motivo_rejeicao?: string;
  analisadoEm?: string;
  criadoEm: string;
};

export type KycStatus = {
  usuarioId: string;
  status: string;
  documentos: KycDocumento[];
  resumo: { pendentes: number; aprovados: number; rejeitados: number };
};

export const kycApi = {
  uploadArquivo: (file: File, tipo: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("tipo", tipo);
    return apiUpload<KycDocumento>("/kyc/upload-arquivo", form);
  },
  listarDocumentos: () => apiFetch<KycDocumento[]>("/kyc/documentos"),
  obterStatus: () => apiFetch<KycStatus>("/kyc/status"),
  verificarKycCompleto: () => apiFetch<{ completo: boolean; documentos: KycDocumento[] }>("/kyc/verificar"),
};

// ── Manager ───────────────────────────────────────────────────────────

export type EtapaPendente = {
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
    usuario: { usuarioId: string; nome: string; email: string; cpf: string };
    credito?: { creditoId: string; valorAprovado: number };
  };
};

export type EtapaDetalhe = EtapaPendente & {
  status: string;
  evidencias: Array<{ evidenciaId: string; fotoUrl: string; criadoEm: string }>;
  obra: EtapaPendente["obra"] & {
    geoLatitude?: number;
    geoLongitude?: number;
    raioValidacaoMetros?: number;
  };
};

export type KycPendente = {
  kycDocumentoId: string;
  tipo: string;
  url: string;
  criadoEm: string;
  usuario: {
    usuarioId: string;
    nome: string;
    email: string;
    cpf: string;
    kycStatus: string;
  };
};

export type ManagerStats = {
  filaAprovacoes: number;
  filaKyc: number;
  creditosAtivos: number;
  obrasAtivas: number;
};

export type EtapaAuditEntry = {
  auditId: string;
  acaoTipo: string;
  gerenciador: string;
  gerenciadorEmail: string;
  observacoes?: string;
  criadoEm: string;
};

export type KycAuditEntry = {
  auditId: string;
  acaoTipo: string;
  gerenciador: string;
  gerenciadorEmail: string;
  motivo?: string;
  criadoEm: string;
};

export const managerApi = {
  dashboard: () => apiFetch<ManagerStats>("/manager/dashboard"),
  listarEtapasPendentes: (
    limit?: number,
    offset?: number,
    filters?: {
      status?: "todas" | "pendente" | "aprovada" | "rejeitada";
      dataInicio?: string;
      dataFim?: string;
      obraType?: string;
      priority?: "todas" | "urgente" | "intermediaria" | "normal";
      searchTerm?: string;
    }
  ) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    if (filters?.status && filters.status !== "todas") params.set("status", filters.status);
    if (filters?.dataInicio) params.set("dataInicio", filters.dataInicio);
    if (filters?.dataFim) params.set("dataFim", filters.dataFim);
    if (filters?.obraType) params.set("obraType", filters.obraType);
    if (filters?.priority && filters.priority !== "todas") params.set("priority", filters.priority);
    if (filters?.searchTerm) params.set("searchTerm", filters.searchTerm);

    const queryString = params.toString();
    return apiFetch<{ etapas: EtapaPendente[]; total: number }>(
      `/manager/etapas-pendentes${queryString ? `?${queryString}` : ""}`
    );
  },
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
  obterEtapaAuditLog: (id: string) => apiFetch<EtapaAuditEntry[]>(`/manager/etapas/${id}/audit-log`),
  obterKycAuditLog: (id: string) => apiFetch<KycAuditEntry[]>(`/manager/kyc/${id}/audit-log`),
};

// ── Engenheiros ──────────────────────────────────────────────────────

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

export const engenheirosApi = {
  listarVisitas: () => apiFetch<Visita[]>("/engenheiros/visitas"),
  atualizarValidacao: (visitaId: string, data: { status?: string; dataAgendada?: string; observacoes?: string }) =>
    apiFetch(`/engenheiros/visitas/${visitaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ── Notificações ──────────────────────────────────────────────────────

export type Notificacao = {
  notificacaoId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  lidoEm?: string;
  criadoEm: string;
};

export type NotificacaoListResponse = {
  notificacoes: Notificacao[];
  total: number;
};

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
