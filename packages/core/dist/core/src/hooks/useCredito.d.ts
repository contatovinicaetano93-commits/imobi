import type { SimulacaoCreditoInput, SolicitacaoCreditoInput } from "@imbobi/schemas";
import { type SimulacaoResult } from "../utils/credito";
export interface LiberacaoResumo {
    liberacaoId: string;
    valor: number;
    status: string;
    criadoEm: string;
    motivo?: string;
}
export interface Credito {
    creditoId: string;
    valorAprovado: number;
    valorLiberado: number;
    taxaMensal: number;
    prazoMeses: number;
    status: string;
    liberacoes: LiberacaoResumo[];
}
export declare function useCredito(token?: string): {
    simular: (input: SimulacaoCreditoInput) => SimulacaoResult;
    solicitar: (input: SolicitacaoCreditoInput) => Promise<Credito | null>;
    listar: () => Promise<Credito[] | null>;
    extrato: (creditoId: string) => Promise<Credito | null>;
    creditos: Credito[];
    creditoAtual: Credito | null;
    simulacao: SimulacaoResult | null;
    loading: boolean;
    error: Error | null;
};
