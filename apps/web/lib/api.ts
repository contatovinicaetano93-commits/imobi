import { getApiV1Url } from "@/lib/api-base";

const API_URL = getApiV1Url();

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

export type CreditoExtratoParcela = {
  parcela: number;
  dataVencimento: string;
  saldoInicial: number;
  juros: number;
  amortizacao: number;
  pagamento: number;
  saldoDevedor: number;
  dataPagamento?: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
};

export type CreditoExtrato = {
  creditoId: string;
  valorSolicitado: number;
  valorAprovado: number;
  valorLiberado: number;
  taxaMensal: number;
  prazoMeses: number;
  status: string;
  criadoEm: string;
  cronograma: CreditoExtratoParcela[];
  resumo: {
    totalPago: number;
    totalPendente: number;
    totalJuros: number;
    parcelasPagas: number;
    parcelasPendentes: number;
  };
  liberacoes: {
    liberacaoId: string;
    valor: number;
    status: string;
    criadoEm: string;
    processadoEm?: string;
    motivo?: string;
  }[];
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
  extrato: (id: string) => apiFetch<CreditoExtrato>(`/credito/${id}/extrato`),
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
  avatarUrl?: string | null;
  contaBancaria?: {
    titular: string | null;
    banco: string | null;
    agencia: string | null;
    numero: string | null;
    pix: string | null;
  };
  criadoEm: string;
  atualizadoEm: string;
};

export type PreferenciaCanal = {
  email: boolean;
  push: boolean;
  inApp: boolean;
};

export type PreferenciasNotificacao = Record<string, PreferenciaCanal>;

export const usuariosApi = {
  meuPerfil: () => apiFetch<UsuarioPerfil>("/usuarios/meu-perfil"),
  atualizarPerfil: (data: { nome: string; telefone: string }) =>
    apiFetch<UsuarioPerfil>("/usuarios/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  uploadAvatar: async (file: File): Promise<UsuarioPerfil> => {
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/proxy/usuarios/me/avatar", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ApiError(res.status, body.message ?? "Falha no upload do avatar");
    }
    return res.json() as Promise<UsuarioPerfil>;
  },
  obterPreferencias: () =>
    apiFetch<PreferenciasNotificacao>("/usuarios/me/preferencias"),
  salvarPreferencias: (data: PreferenciasNotificacao) =>
    apiFetch<PreferenciasNotificacao>("/usuarios/me/preferencias", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  atualizarContaBancaria: (data: {
    contaTitular: string;
    contaBanco: string;
    contaAgencia: string;
    contaNumero: string;
    contaPix?: string;
  }) =>
    apiFetch<UsuarioPerfil>("/usuarios/me/conta-bancaria", {
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
  resumo: { pendentes: number; aprovados: number; rejeitados: number; totalTipos?: number };
};

export const kycApi = {
  uploadDocumentoArquivo: async (file: File, tipo: string): Promise<KycDocumento> => {
    const form = new FormData();
    form.append("tipo", tipo);
    form.append("file", file);
    const res = await fetch("/api/proxy/kyc/upload", {
      method: "POST",
      body: form,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ApiError(res.status, body.message ?? "Falha no upload do documento");
    }
    return res.json() as Promise<KycDocumento>;
  },
  /** @deprecated Use uploadDocumentoArquivo */
  uploadDocumento: (tipo: string, url: string) =>
    apiFetch<KycDocumento>("/kyc/upload", {
      method: "POST",
      body: JSON.stringify({ tipo, url }),
    }),
  listarDocumentos: () => apiFetch<KycDocumento[]>("/kyc/documentos"),
  obterStatus: () => apiFetch<KycStatus>("/kyc/status"),
  verificarKycCompleto: () => apiFetch<{ completo: boolean; documentos: KycDocumento[] }>("/kyc/verificar"),
};

import { JornadaResponseSchema, type JornadaResponse } from "@imbobi/schemas";

export type Jornada = JornadaResponse;

export const jornadaApi = {
  obter: async (): Promise<Jornada> => {
    const raw = await apiFetch<unknown>("/jornada");
    return JornadaResponseSchema.parse(raw);
  },
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
  getCarteira: () =>
    apiFetch<{
      totalObras: number;
      totalCreditos: number;
      valorTotalCreditos: number;
      valorPagoCreditos: number;
      obras: Array<{
        id: string;
        nome: string;
        endereco: string;
        cidade: string;
        status: string;
        totalUnidades: number;
        unidadesDisp: number;
      }>;
      creditos: Array<{
        id: string;
        usuarioId: string;
        usuarioNome: string;
        valor: number;
        status: string;
        dataAprovacao?: string;
        dataVencimento?: string;
        valorPago: number;
      }>;
    }>("/manager/carteira"),
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
  aprovarKyc: (id: string) =>
    apiFetch(`/manager/kyc/${id}/aprovar`, { method: "PATCH" }),
  rejeitarKyc: (id: string, motivo: string) =>
    apiFetch(`/manager/kyc/${id}/rejeitar`, { method: "PATCH", body: JSON.stringify({ motivo }) }),
  obterEtapaAuditLog: (id: string) => apiFetch<EtapaAuditEntry[]>(`/manager/etapas/${id}/audit-log`),
  obterKycAuditLog: (id: string) => apiFetch<KycAuditEntry[]>(`/manager/kyc/${id}/audit-log`),
  aprovarEtapa: (id: string, observacao?: string) =>
    apiFetch(`/manager/etapas/${id}/aprovar`, {
      method: "PATCH",
      body: JSON.stringify({ observacao }),
    }),
  rejeitarEtapa: (id: string, motivo: string) =>
    apiFetch(`/manager/etapas/${id}/rejeitar`, {
      method: "PATCH",
      body: JSON.stringify({ motivo }),
    }),
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
  aprovarVistoria: (visitaId: string, observacao?: string) =>
    apiFetch(`/engenheiros/visitas/${visitaId}/aprovar`, {
      method: "PATCH",
      body: JSON.stringify({ observacao }),
    }),
  rejeitarVistoria: (visitaId: string, motivo: string) =>
    apiFetch(`/engenheiros/visitas/${visitaId}/rejeitar`, {
      method: "PATCH",
      body: JSON.stringify({ motivo }),
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

export type AdminObraResumo = {
  id: string;
  nome: string;
  status: string;
  tomador?: string;
};

export type AdminSearchTipo = "usuario" | "obra" | "dossie" | "documento";

export type AdminSearchHit = {
  tipo: AdminSearchTipo;
  id: string;
  titulo: string;
  subtitulo?: string;
  status?: string;
  href: string;
  criadoEm: string;
};

export type AdminSearchResponse = {
  q: string;
  total: number;
  resultados: AdminSearchHit[];
};

export type AdminFilasResponse = {
  kycPendentes: number;
  viabilidadePendentes: number;
  propostasPublicasPendentes: number;
  obrasAguardandoHomologacao: number;
  liberacoesAguardandoPagamento: number;
  etapasAguardandoVistoria: number;
  atualizadoEm: string;
};

export type LiberacaoAguardandoPagamento = {
  liberacaoId: string;
  etapaId: string | null;
  valor: number;
  status: string;
  criadoEm: string;
  tomador?: string;
  email?: string;
  conta: {
    banco?: string | null;
    agencia?: string | null;
    numero?: string | null;
    pix?: string | null;
    titular?: string | null;
  };
  obra: { obraId: string; nome: string } | null;
};

export const adminApi = {
  overview: () => apiFetch<AdminOverview>("/admin/overview"),
  metricas: () => apiFetch<AdminMetricas>("/admin/metricas"),
  filas: () => apiFetch<AdminFilasResponse>("/admin/filas"),
  buscar: (q: string, limit = 20) =>
    apiFetch<AdminSearchResponse>(
      `/admin/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
  atividades: (limit?: number) =>
    apiFetch<AtividadeRecente[]>(`/admin/atividades${limit ? `?limit=${limit}` : ""}`),
  listarObras: (limit = 50) =>
    apiFetch<AdminObraResumo[]>(`/admin/obras?limit=${limit}`),
  homologarObra: (obraId: string) =>
    apiFetch(`/admin/obras/${obraId}/homologar`, { method: "PATCH" }),
  reprovarHomologacao: (obraId: string, motivo: string) =>
    apiFetch(`/admin/obras/${obraId}/reprovar-homologacao`, {
      method: "PATCH",
      body: JSON.stringify({ motivo }),
    }),
  listarLiberacoesAguardandoPagamento: () =>
    apiFetch<LiberacaoAguardandoPagamento[]>("/admin/liberacoes/aguardando-pagamento"),
  confirmarPagamento: (liberacaoId: string, referenciaPagamento?: string) =>
    apiFetch(`/admin/liberacoes/${liberacaoId}/confirmar-pagamento`, {
      method: "PATCH",
      body: JSON.stringify({ referenciaPagamento }),
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

// ── Dossiê de viabilidade ─────────────────────────────────────────────

export type EstagioObraDossie = "NOVO" | "EM_ANDAMENTO" | "ENTRADA_TARDIA";
export type DossieStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "EM_ANALISE"
  | "APROVADO"
  | "REPROVADO";
export type DossieChecklistItemStatus =
  | "PENDENTE"
  | "ENVIADO"
  | "APROVADO"
  | "REPROVADO"
  | "NA";

export type DossieChecklistItem = {
  id: string;
  itemId: string;
  titulo: string;
  obrigatorio: boolean;
  status: DossieChecklistItemStatus;
  documentoId?: string | null;
  observacao?: string | null;
};

export type DossieResumo = {
  id: string;
  nomeEmpreendimento: string;
  estagioObra: EstagioObraDossie | null;
  status: DossieStatus;
  percentualFisico?: number | null;
  dataBase?: string | null;
  obraId?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  enviadoEm?: string | null;
};

export type DossieDetalhe = DossieResumo & {
  tipologia?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  observacaoAdmin?: string | null;
  checklistItens: DossieChecklistItem[];
  obra?: { obraId: string; nome: string; status: string } | null;
};

export type TipoCreditoProposta = "OBRA_NOVA" | "OBRA_EM_ANDAMENTO" | "CREDITO_PONTE";

export type ChecklistTemplateResponse = {
  tipoCredito?: TipoCreditoProposta;
  estagio: EstagioObraDossie;
  meta?: {
    id: string;
    label: string;
    descricao: string;
    checklistPdf: string;
    estagioObra?: EstagioObraDossie;
  };
  itens: Array<{
    itemId: string;
    titulo: string;
    obrigatorio: boolean;
    blocoId: string;
    blocoTitulo: string;
  }>;
  tiposDisponiveis?: Array<{
    id: TipoCreditoProposta;
    label: string;
    descricao: string;
    checklistPdf: string;
  }>;
  estagiosDisponiveis?: Array<{
    id: EstagioObraDossie;
    label: string;
    descricao: string;
    percentualObraMin?: number;
    percentualObraMax?: number;
  }>;
};

export type CriarDossiePayload = {
  tipoCredito?: TipoCreditoProposta;
  estagioObra?: EstagioObraDossie;
  nomeEmpreendimento: string;
  percentualFisico?: number;
  dataBase?: string;
  obraId?: string;
  narrativa?: string;
};

export type PropostaAdminResumo = {
  id: string;
  tipoCredito: TipoCreditoProposta;
  nomeEmpreendimento: string;
  nomeContato: string;
  email: string;
  telefone: string;
  empresa: string | null;
  status: string;
  usuarioId: string | null;
  criadoEm: string;
};

export const propostasApi = {
  checklistTemplate: (tipo: TipoCreditoProposta) =>
    fetch(`/api/proxy/propostas/checklist-template?tipo=${tipo}`).then(async (res) => {
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? "Erro ao carregar checklist.");
        }
        throw new Error("Erro ao carregar tipos de operação. Tente novamente.");
      }
      if (!contentType.includes("application/json")) {
        throw new Error("Erro ao carregar tipos de operação. Tente novamente.");
      }
      try {
        return (await res.json()) as ChecklistTemplateResponse;
      } catch {
        throw new Error("Erro ao carregar tipos de operação. Tente novamente.");
      }
    }),
  enviar: (form: FormData) =>
    fetch("/api/proxy/propostas", { method: "POST", body: form }).then(async (res) => {
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Erro ao enviar proposta.");
      }
      return res.json() as Promise<{ id: string; status: string; mensagem: string }>;
    }),
  listarAdmin: () => apiFetch<PropostaAdminResumo[]>("/propostas"),
};

export const dossiesApi = {
  checklistTemplate: (tipoOrEstagio: TipoCreditoProposta | EstagioObraDossie) => {
    const isTipo = ["OBRA_NOVA", "OBRA_EM_ANDAMENTO", "CREDITO_PONTE"].includes(tipoOrEstagio);
    const q = isTipo ? `tipo=${tipoOrEstagio}` : `estagio=${tipoOrEstagio}`;
    return apiFetch<ChecklistTemplateResponse>(`/dossies/checklist-template?${q}`);
  },
  listar: () => apiFetch<DossieResumo[]>("/dossies"),
  buscar: (id: string) => apiFetch<DossieDetalhe>(`/dossies/${id}`),
  criar: (data: CriarDossiePayload) =>
    apiFetch<DossieDetalhe>("/dossies", { method: "POST", body: JSON.stringify(data) }),
  atualizar: (
    id: string,
    data: {
      nomeEmpreendimento?: string;
      percentualFisico?: number | null;
      dataBase?: string | null;
      checklistItens?: Array<{
        itemId: string;
        status?: DossieChecklistItemStatus;
        documentoId?: string | null;
        observacao?: string | null;
      }>;
    },
  ) =>
    apiFetch<DossieDetalhe>(`/dossies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  enviar: (id: string) =>
    apiFetch<DossieDetalhe>(`/dossies/${id}/enviar`, { method: "POST" }),
  atualizarStatus: (id: string, status: DossieStatus, observacaoAdmin?: string) =>
    apiFetch<DossieDetalhe>(`/dossies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, observacaoAdmin }),
    }),
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
  listarSolicitacoesPendentes: () =>
    apiFetch<SolicitacaoCredito[]>("/admin/solicitacoes?status=PENDENTE&semComite=true"),
  iniciarComite: (solicitacaoId: string) =>
    apiFetch<ComiteDigital & { solicitacao: SolicitacaoCredito }>("/admin/comite/iniciar", {
      method: "POST",
      body: JSON.stringify({ solicitacaoId }),
    }),
};
