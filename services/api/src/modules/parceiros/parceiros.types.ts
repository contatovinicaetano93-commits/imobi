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
  clienteRef: string; // "Carlos M." — sem dados sensíveis (LGPD)
  status: string;
  valorBase: number;
  percentualComissao: number;
  valorComissao: number;
  comissaoStatus: string;
  validadeIndicacao: string;
  criadoEm: string;
};

export type ContatoMailing = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status: string;
  criadoEm: string;
};
