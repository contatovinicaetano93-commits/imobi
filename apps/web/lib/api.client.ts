// Client-side API functions (no next/headers)
// Use this from "use client" components

const API_URL = typeof window !== 'undefined'
  ? ((globalThis as any).NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
  : 'http://localhost:4000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiFetchClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken')
    : null;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Simulador ────────────────────────────────────────────────────────

export type SimuladorInput = {
  valorEmpreendimento: number;
  tipoObra: "TERRENO" | "CONSTRUCAO" | "ACABAMENTO" | "COMPRADOR";
  prazo: number;
};

export type SimuladorResult = {
  valorMaximoFinanciavel: number;
  parcelaMedia: number;
  taxaMensal: string;
  taxaAno: string;
  ltv: string;
  totalJuros: number;
};

export const simuladorApi = {
  calcular: (input: SimuladorInput) =>
    apiFetchClient<SimuladorResult>("/simulador/calcular", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

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

export const obrasApi = {
  listar: () => apiFetchClient<ObraResumo[]>("/obras"),
  buscar: (id: string) => apiFetchClient<ObraResumo>(`/obras/${id}`),
  progresso: (id: string) => apiFetchClient<number>(`/obras/${id}/progresso`),
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
  meus: () => apiFetchClient<CreditoResumo[]>("/credito/meus"),
  extrato: (id: string) => apiFetchClient<CreditoResumo>(`/credito/${id}/extrato`),
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
  atual: () => apiFetchClient<ScoreAtual>("/score/atual"),
  historico: (limit?: number) =>
    apiFetchClient<ScoreHistorico[]>(`/score/historico${limit ? `?limit=${limit}` : ""}`),
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
    apiFetchClient<NotificacaoListResponse>(
      `/notificacoes${limit || offset ? `?limit=${limit ?? 20}&offset=${offset ?? 0}` : ""}`
    ),
  listarNaoLidas: () => apiFetchClient<Notificacao[]>("/notificacoes/nao-lidas"),
  contarNaoLidas: () => apiFetchClient<{ count: number }>("/notificacoes/contar-nao-lidas"),
  marcarComoLida: (id: string) =>
    apiFetchClient(`/notificacoes/${id}/lida`, { method: "PATCH" }),
  marcarTudasComoLidas: () =>
    apiFetchClient("/notificacoes/marcar-todas-lidas", { method: "PATCH" }),
  deletar: (id: string) =>
    apiFetchClient(`/notificacoes/${id}`, { method: "DELETE" }),
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

export const managerApi = {
  dashboard: () => apiFetchClient<ManagerStats>("/manager/dashboard"),
  listarEtapasPendentes: (limit?: number, offset?: number) =>
    apiFetchClient<{ etapas: EtapaPendente[]; total: number }>(
      `/manager/etapas-pendentes${limit || offset ? `?limit=${limit ?? 20}&offset=${offset ?? 0}` : ""}`
    ),
  listarKycPendentes: (limit?: number, offset?: number) =>
    apiFetchClient<{ documentos: KycPendente[]; total: number }>(
      `/manager/kyc-pendentes${limit || offset ? `?limit=${limit ?? 20}&offset=${offset ?? 0}` : ""}`
    ),
  obterEtapaDetalhe: (id: string) => apiFetchClient<EtapaDetalhe>(`/manager/etapas/${id}`),
  obterKycDetalhe: (id: string) => apiFetchClient<KycPendente>(`/manager/kyc/${id}`),
  aprovarEtapa: (id: string, observacao?: string) =>
    apiFetchClient(`/manager/etapas/${id}/aprovar`, { method: "PATCH", body: JSON.stringify({ observacao }) }),
  rejeitarEtapa: (id: string, motivo: string) =>
    apiFetchClient(`/manager/etapas/${id}/rejeitar`, { method: "PATCH", body: JSON.stringify({ motivo }) }),
  batchAprovarEtapas: (ids: string[], observacao?: string) =>
    apiFetchClient(`/manager/etapas/batch-aprovar`, { method: "POST", body: JSON.stringify({ ids, observacao }) }),
  batchRejeitarEtapas: (ids: string[], motivo: string) =>
    apiFetchClient(`/manager/etapas/batch-rejeitar`, { method: "POST", body: JSON.stringify({ ids, motivo }) }),
  aprovarKyc: (id: string) =>
    apiFetchClient(`/manager/kyc/${id}/aprovar`, { method: "PATCH" }),
  rejeitarKyc: (id: string, motivo: string) =>
    apiFetchClient(`/manager/kyc/${id}/rejeitar`, { method: "PATCH", body: JSON.stringify({ motivo }) }),
};

// ── Evidências ────────────────────────────────────────────────────────

export type EvidenciaDetalhe = {
  id: string; fotoUrl: string; latCaptura: number; lngCaptura: number;
  accuracyMetros: number; distanciaObra?: number; validada: boolean;
  observacao?: string; criadoEm: string;
};

export const evidenciasApi = {
  listarPorEtapa: (etapaId: string) =>
    apiFetchClient<EvidenciaDetalhe[]>(`/evidencias/etapa/${etapaId}`),
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
  meuPerfil: () => apiFetchClient<UsuarioPerfil>("/usuarios/meu-perfil"),
  atualizarPerfil: (data: { nome?: string; telefone?: string }) =>
    apiFetchClient<UsuarioPerfil>("/usuarios/meu-perfil", {
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
  uploadDocumento: (tipo: string, url: string) =>
    apiFetchClient<KycDocumento>("/kyc/upload", {
      method: "POST",
      body: JSON.stringify({ tipo, url }),
    }),
  listarDocumentos: () => apiFetchClient<KycDocumento[]>("/kyc/documentos"),
  obterStatus: () => apiFetchClient<KycStatus>("/kyc/status"),
  verificarKycCompleto: () => apiFetchClient<{ completo: boolean; documentos: KycDocumento[] }>("/kyc/verificar"),
};

// ── Engenheiro (Inspector) ────────────────────────────────────────────

export type Visita = {
  visitaId: string;
  etapaId: string;
  obra: {
    id: string;
    nome: string;
    endereco: string;
    geoLatitude: number;
    geoLongitude: number;
    raioValidacaoMetros: number;
  };
  dataAgendada: string;
  status: "AGENDADA" | "INICIADA" | "CONCLUIDA" | "CANCELADA";
  observacoes?: string;
  criadoEm: string;
};

export type ValidacaoForm = {
  visitaId: string;
  etapaId: string;
  obraCondicoes: {
    estruturaOk: boolean;
    fundacaoOk: boolean;
    coberturaPlanejada: boolean;
    observacoes?: string;
  };
  conformidade: {
    protetoresPresentes: boolean;
    sinalizacaoOk: boolean;
    acessoSeguro: boolean;
    observacoes?: string;
  };
  observacoesGerais?: string;
  fotos: {
    id: string;
    url: string;
    latCaptura: number;
    lngCaptura: number;
    accuracyMetros: number;
    descricao?: string;
  }[];
  status: "RASCUNHO" | "ENVIADA" | "REJEITADA" | "APROVADA";
  submissaoEm?: string;
};

export const engenheirosApi = {
  listarVisitas: (filtroStatus?: string) =>
    apiFetchClient<Visita[]>(`/engenheiros/visitas${filtroStatus ? `?status=${filtroStatus}` : ""}`),
  obterVisita: (visitaId: string) =>
    apiFetchClient<Visita>(`/engenheiros/visitas/${visitaId}`),
  obterValidacao: (visitaId: string) =>
    apiFetchClient<ValidacaoForm>(`/engenheiros/validacoes/${visitaId}`),
  submeterValidacao: (visitaId: string, data: Omit<ValidacaoForm, "visitaId" | "etapaId">) =>
    apiFetchClient<ValidacaoForm>(`/engenheiros/validacoes/${visitaId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  atualizarValidacao: (visitaId: string, data: Partial<ValidacaoForm>) =>
    apiFetchClient<ValidacaoForm>(`/engenheiros/validacoes/${visitaId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  gerarRelatorioPDF: (visitaId: string) =>
    apiFetchClient<{ url: string }>(`/engenheiros/validacoes/${visitaId}/relatorio`),
  fazerUploadFoto: async (visitaId: string, formData: FormData) => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null;

    return fetch(`${API_URL}/api/v1/engenheiros/validacoes/${visitaId}/fotos`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then((res) => (res.ok ? res.json() : Promise.reject(res)));
  },
};
