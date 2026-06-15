export const QUEUE_LIBERACAO = "liberacao-parcela";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  liberacaoId: string;
  valor: number;
}

export const ETAPA_STATUS_MAP = {
  pendente: "AGUARDANDO_VISTORIA",
  aprovada: "CONCLUIDA",
  rejeitada: "REPROVADA",
} as const;
