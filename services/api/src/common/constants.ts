export const QUEUE_LIBERACAO = "liberacao-parcela";

export interface LiberacaoJob {
  creditoId: string;
  etapaId: string;
  valor: number;
}
