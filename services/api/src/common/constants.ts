export const QUEUE_LIBERACAO = "liberacao-parcela";
export const QUEUE_NOTIFICACAO = "notificacao";
export const QUEUE_ANALISE_FRAUDE = "analise-fraude";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  liberacaoId: string;
  valor: number;
}

export interface NotificacaoJob {
  usuarioId: string;
  canal: "inApp" | "push" | "email" | "todos";
  tipoNotificacao: string;
  titulo: string;
  mensagem: string;
  link?: string;
  email?: string;
  nomeUsuario?: string;
  pushTipo?: "ETAPA_APROVADA" | "PARCELA_LIBERADA" | "KYC_APROVADO" | "KYC_REJEITADO" | "GERAL";
  dados?: Record<string, string>;
}

export interface AnaliseFraudeJob {
  evidenciaId: string;
  obraId: string;
  usuarioId: string;
  etapaId: string;
  latCaptura: number;
  lngCaptura: number;
  accuracyMetros?: number;
  timestampCaptura: string;
}

export const ETAPA_STATUS_MAP = {
  pendente: "AGUARDANDO_VISTORIA",
  aprovada: "APROVADA",
  rejeitada: "REJEITADA",
} as const;
