const _base = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
const API_URL = _base.endsWith("/api/v1") ? _base : `${_base}/api/v1`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Coerce an unknown API value to a finite number, returning fallback if invalid */
export function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

/** Ensure an unknown API value is an array, returning [] if not */
export function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : [];
}

let _refreshPromise: Promise<void> | null = null;

async function apiFetch<T>(path: string, init: RequestInit = {}, _retried = false): Promise<T> {
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
    if (res.status === 401 && !_retried && isClient) {
      if (!_refreshPromise) {
        _refreshPromise = fetch("/api/proxy/auth/refresh", { method: "POST", cache: "no-store" })
          .then((r) => { if (!r.ok) throw new Error("session_expired"); })
          .finally(() => { _refreshPromise = null; });
      }
      try {
        await _refreshPromise;
        return apiFetch<T>(path, init, true);
      } catch {
        throw new ApiError(401, "Sessão expirada. Faça login novamente.");
      }
    }
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json().then((data: unknown) => (data ?? {}) as T);
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

export type CreditoSolicitarPayload = {
  valorSolicitado: number;
  prazoMeses: number;
  finalidade: string;
  obraId?: string;
};

export type CreditoSimulacaoPayload = {
  valorSolicitado: number;
  prazoMeses: number;
};

export type CreditoSimulacao = {
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
};

export type CreditoSolicitacao = {
  creditoId: string;
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  parcelaMensal: number;
  status: string;
};

export const creditoApi = {
  meus: () => apiFetch<CreditoResumo[]>("/credito/meus"),
  extrato: (id: string) => apiFetch<CreditoResumo>(`/credito/${id}/extrato`),
  simular: (data: CreditoSimulacaoPayload) =>
    apiFetch<CreditoSimulacao>("/credito/simular", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  solicitar: (data: CreditoSolicitarPayload) =>
    apiFetch<CreditoSolicitacao>("/credito/solicitar", {
      method: "POST",
      body: JSON.stringify(data),
    }),
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
  upload: (data: {
    etapaId: string;
    latitude: number;
    longitude: number;
    accuracyMetros: number;
    timestampCaptura: string;
    descricao?: string;
  }) =>
    apiFetch<EvidenciaDetalhe>("/evidencias", {
      method: "POST",
      body: JSON.stringify(data),
    }),
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
  uploadDocumento: (tipo: string, url: string) =>
    apiFetch<KycDocumento>("/kyc/upload", {
      method: "POST",
      body: JSON.stringify({ tipo, url }),
    }),
  listarDocumentos: () => apiFetch<KycDocumento[]>("/kyc/documentos"),
  obterStatus: () => apiFetch<KycStatus>("/kyc/status"),
  verificarKycCompleto: () => apiFetch<{ completo: boolean; documentos: KycDocumento[] }>("/kyc/verificar"),
};

/** Upload KYC file via multipart proxy (single step — creates KYC document record). */
export function uploadKycArquivo(
  file: File,
  tipo: string,
  onProgress?: (percent: number) => void,
): Promise<KycDocumento> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/proxy/kyc/upload-arquivo");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: { message?: string } & Partial<KycDocumento> = {};
      try {
        body = JSON.parse(xhr.responseText) as typeof body;
      } catch {
        /* non-json */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as KycDocumento);
        return;
      }
      reject(new ApiError(xhr.status, body.message ?? "Erro no upload do documento"));
    };

    xhr.onerror = () => reject(new ApiError(0, "Falha de rede ao enviar documento"));
    xhr.send(fd);
  });
}

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

export type PortfolioGestor = {
  creditoTotalAprovado: number;
  creditoTotalLiberado: number;
  creditosAtivos: number;
  obrasAtivas: number;
  obrasTotal: number;
  etapasAguardandoVistoria: number;
  roiEstimadoPct: number;
  inadimplenciaRate: number;
  creditos: Array<{
    id: string;
    valorAprovado: number;
    valorLiberado: number;
    taxaMensal: number;
    prazoMeses: number;
    status: string;
  }>;
  obras: Array<{
    id: string;
    nome: string;
    status: string;
    endereco: string;
    etapas: Array<{ etapaId: string; status: string; percentualObra: number }>;
  }>;
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
  portfolio: () => apiFetch<PortfolioGestor>("/manager/portfolio"),
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

// ── Engenheiro: Financeiro, Etapas e Licenças ────────────────────────

export type ObraFinanceiro = {
  obraId: string;
  nome: string;
  valorTotal: number;
  valorMaterial: number;
  valorMaoDeObra: number;
  valorExecutado: number;
  progresso: number;
  etapaAtual: string;
};

export type EtapaProjeto = {
  id: string;
  nome: string;
  ordem: number;
  status: "CONCLUIDA" | "EM_ANDAMENTO" | "PENDENTE";
  valorLiberacao: number;
  percentualObra: number;
  dataConclusao?: string;
};

export type Licenca = {
  id: string;
  nome: string;
  categoria: "CONSTRUCAO" | "OPERACIONAL";
  orgao: string;
  numero?: string;
  status: "VALIDA" | "PENDENTE" | "VENCENDO" | "VENCIDA";
  validade?: string;
  obraNome?: string;
};

export const engenheiroObraApi = {
  financeiro: () => apiFetch<ObraFinanceiro[]>("/engenheiros/financeiro"),
  etapas: (obraId: string) => apiFetch<EtapaProjeto[]>(`/engenheiros/obras/${obraId}/etapas`),
  licencas: () => apiFetch<Licenca[]>("/engenheiros/licencas"),
};

// ── Parceiro Comercial ───────────────────────────────────────────────

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
  status: "INDICADA" | "EM_ANALISE" | "APROVADA" | "EM_OBRA" | "CONCLUIDA" | "RECUSADA";
  valorBase: number;
  percentualComissao: number;
  valorComissao: number;
  comissaoStatus: "PENDENTE" | "LIBERADA" | "PAGA";
  validadeIndicacao: string;
  criadoEm: string;
};

export type ContatoMailing = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status: "NOVO" | "CONTATADO" | "CONVERTIDO";
  criadoEm: string;
};

export const parceiroApi = {
  resumo: () => apiFetch<ParceiroResumo>("/parceiros/resumo"),
  operacoes: () => apiFetch<OperacaoIndicada[]>("/parceiros/operacoes"),
  mailing: () => apiFetch<ContatoMailing[]>("/parceiros/mailing"),
  adicionarContato: (data: { nome: string; email: string; telefone?: string }) =>
    apiFetch<ContatoMailing>("/parceiros/mailing", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Admin: visão geral da operação ───────────────────────────────────

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

export type CreditoLiberadoMensal = {
  mes: string;
  valor: number;
};

export type ObrasPorStatus = {
  status: string;
  quantidade: number;
};

export type AdminMetricas = {
  creditoLiberadoPorMes: CreditoLiberadoMensal[];
  obrasPorStatus: ObrasPorStatus[];
  taxaAprovacaoEtapas: number;
  kycPendentes: number;
  etapasAprovadas: number;
  etapasRejeitadas: number;
};

export type AtividadeRecente = {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: string;
};

export const adminApi = {
  overview: () => apiFetch<AdminOverview>("/admin/overview"),
  metricas: () => apiFetch<AdminMetricas>("/admin/metricas"),
  atividades: (limit?: number) =>
    apiFetch<AtividadeRecente[]>(`/admin/atividades${limit ? `?limit=${limit}` : ""}`),
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

// ── Comitê Digital ────────────────────────────────────────────────────

export type SolicitacaoStatus = "PENDENTE" | "EM_COMITE" | "APROVADA" | "AJUSTADA" | "REPROVADA" | "CANCELADA";
export type ComiteStatus = "ABERTO" | "EM_VOTACAO" | "ENCERRADO";
export type ComiteDecisao = "APROVADO" | "AJUSTADO" | "REPROVADO";
export type VotoDecisao = "APROVAR" | "AJUSTAR" | "REPROVAR";

export type VotoComite = {
  votoId: string;
  comiteId: string;
  votanteId: string;
  votante: { nome: string; tipo: string };
  voto: VotoDecisao;
  justificativa?: string;
  condicoes?: string;
  criadoEm: string;
};

export type ComiteDigital = {
  comiteId: string;
  solicitacaoId: string;
  parecerTecnico?: string;
  parecerEngId?: string;
  parecerEm?: string;
  status: ComiteStatus;
  decisao?: ComiteDecisao;
  decisaoMotivo?: string;
  decisaoEm?: string;
  votos: VotoComite[];
  criadoEm: string;
  atualizadoEm: string;
};

export type SolicitacaoCredito = {
  solicitacaoId: string;
  usuarioId: string;
  obraId?: string;
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  finalidade: string;
  garantias?: string;
  observacoes?: string;
  vgv?: number;
  ltv?: number;
  custoObra?: number;
  ratingCalculado?: string;
  status: SolicitacaoStatus;
  comite?: ComiteDigital;
  criadoEm: string;
  atualizadoEm: string;
  usuario?: { nome: string; email: string };
};

export type SubmeterSolicitacaoPayload = {
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  finalidade: string;
  garantias?: string;
  observacoes?: string;
  obraId?: string;
  vgv?: number;
  custoObra?: number;
  ltv?: number;
};

export const comiteApi = {
  solicitar: (data: SubmeterSolicitacaoPayload) =>
    apiFetch<SolicitacaoCredito>("/comite/solicitar", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  minhas: () => apiFetch<SolicitacaoCredito[]>("/comite/minhas"),
  parecer: (comiteId: string, parecerTecnico: string) =>
    apiFetch<ComiteDigital>(`/comite/${comiteId}/parecer`, {
      method: "POST",
      body: JSON.stringify({ parecerTecnico }),
    }),
  votar: (comiteId: string, data: { voto: VotoDecisao; justificativa?: string; condicoes?: string }) =>
    apiFetch<{ ok: boolean; totalVotos: number; quorum: number }>(`/comite/${comiteId}/votar`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listar: (status?: string) =>
    apiFetch<(ComiteDigital & { solicitacao: SolicitacaoCredito })[]>(
      `/comite${status ? `?status=${status}` : ""}`
    ),
  dossie: (comiteId: string) =>
    apiFetch<ComiteDigital & { solicitacao: SolicitacaoCredito & { usuario: { usuarioId: string; nome: string; email: string; telefone: string; kycStatus: string; tipo: string; criadoEm: string } } }>(
      `/comite/${comiteId}`
    ),
};

// ── Due Diligence ─────────────────────────────────────────────────────

export type DueDiligenceResumo = {
  id: string;
  nomeEmpreendimento: string;
  tipologia?: string | null;
  cidade?: string | null;
  uf?: string | null;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
};

export const dueDiligenceApi = {
  listar: () => apiFetch<DueDiligenceResumo[]>("/due-diligence"),
  buscar: (id: string) => apiFetch<DueDiligenceResumo>(`/due-diligence/${id}`),
};

// ── Comercial / Pipeline ──────────────────────────────────────────────

export type PipelineStage = {
  stageId: string;
  nome: string;
  ordem: number;
  cor: string;
};

export type ComercialLead = {
  leadId: string;
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  fonte?: string;
  tipoObra?: string | null;
  stageId: string;
  criadoEm: string;
  stage?: { stageId: string; nome: string; ordem: number; corHex?: string };
  scoreHistorico?: Array<{ scoreFinal: number }>;
};

export const comercialApi = {
  pipelineStages: () => apiFetch<PipelineStage[]>("/comercial/pipeline/stages"),
  listarLeads: (limit = 100, offset = 0) =>
    apiFetch<{ leads: ComercialLead[]; total: number }>(
      `/comercial/leads?limit=${limit}&offset=${offset}`
    ),
};

// ── Etapas ────────────────────────────────────────────────────────────

export const etapasApi = {
  atualizarStatus: (etapaId: string, status: string) =>
    apiFetch(`/etapas/${etapaId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// ── Documentos (upload de arquivo) ────────────────────────────────────

export type DocumentoUpload = {
  documentoId: string;
  url: string;
  nome: string;
  tipo: string;
};

export async function uploadDocumentoArquivo(
  file: File,
  opts?: { tipo?: string; nome?: string; obraId?: string },
): Promise<DocumentoUpload> {
  const fd = new FormData();
  fd.append("file", file);
  if (opts?.tipo) fd.append("tipo", opts.tipo);
  if (opts?.nome) fd.append("nome", opts.nome);
  if (opts?.obraId) fd.append("obraId", opts.obraId);

  const res = await fetch("/api/proxy/documentos", { method: "POST", body: fd });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? "Erro no upload");
  }
  return res.json() as Promise<DocumentoUpload>;
}

// ── Fluxo (gates KYC / comitê por obra) ───────────────────────────────

export type RequisitosObra = {
  obraId: string;
  kycUsuarioOk: boolean;
  kycObraOk: boolean;
  docsObraCount: number;
  docsObraMinimo: number;
  comiteOk: boolean;
  comitePendente: boolean;
  comiteStatus: string | null;
  podeSolicitarComite: boolean;
  podeLiberarEtapas: boolean;
  rolesLiberacaoEtapas?: readonly string[];
  rolesLiberacaoKyc?: readonly string[];
  gestorFundoSomenteLeitura?: boolean;
};

export type FluxoObraStatus = RequisitosObra & {
  nome: string;
  status: string;
};

export type FluxoStatus = {
  kycUsuarioCompleto: boolean;
  kycUsuarioStatus: string;
  primeiraOperacao: boolean;
  obras: FluxoObraStatus[];
  rolesLiberacaoEtapas?: readonly string[];
  rolesLiberacaoKyc?: readonly string[];
  gestorFundoSomenteLeitura?: boolean;
};

export const fluxoApi = {
  status: () => apiFetch<FluxoStatus>("/fluxo/status"),
  requisitosObra: (obraId: string) => apiFetch<RequisitosObra>(`/fluxo/obra/${obraId}`),
};
