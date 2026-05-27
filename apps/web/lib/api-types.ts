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

// ── Crédito ───────────────────────────────────────────────────────────

export type CreditoResumo = {
  id: string; valorAprovado: number; valorLiberado: number;
  taxaMensal: number; prazoMeses: number; status: string;
  dataAprovacao?: string; dataVencimento?: string;
  obras?: { id: string; nome: string; status: string }[];
  liberacoes?: { id: string; valor: number; status: string; processadoEm?: string }[];
};

// ── Evidências ────────────────────────────────────────────────────────

export type EvidenciaDetalhe = {
  id: string; fotoUrl: string; latCaptura: number; lngCaptura: number;
  accuracyMetros: number; distanciaObra?: number; validada: boolean;
  observacao?: string; criadoEm: string;
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
