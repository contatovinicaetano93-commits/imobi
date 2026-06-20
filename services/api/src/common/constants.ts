export const QUEUE_LIBERACAO = "liberacao-parcela";
export const QUEUE_EMAIL = "email";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  liberacaoId: string;
  valor: number;
}

export type EmailJobTipo =
  | "BEM_VINDO"
  | "ETAPA_APROVADA"
  | "PARCELA_LIBERADA"
  | "KYC_APROVADO"
  | "KYC_REJEITADO"
  | "RECUPERACAO_SENHA"
  | "CONTA_EXCLUIDA";

export interface EmailJob {
  tipo: EmailJobTipo;
  payload: {
    nome: string;
    email: string;
    etapaNome?: string;
    obraNome?: string;
    valor?: number;
    motivo?: string;
    token?: string;
  };
}

export const ETAPA_STATUS_MAP = {
  pendente: "AGUARDANDO_VISTORIA",
  aprovada: "CONCLUIDA",
  rejeitada: "REPROVADA",
} as const;
