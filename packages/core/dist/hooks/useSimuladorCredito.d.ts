import { type SimulacaoResult } from "../utils/credito";
export interface SimuladorState {
    valorSolicitado: number;
    prazoMeses: number;
    taxaMensal: number;
    resultado: SimulacaoResult | null;
}
export declare function useSimuladorCredito(taxaMensal?: number): {
    valorSolicitado: number;
    setValorSolicitado: import("react").Dispatch<import("react").SetStateAction<number>>;
    prazoMeses: number;
    setPrazoMeses: import("react").Dispatch<import("react").SetStateAction<number>>;
    taxaMensal: number;
    resultado: SimulacaoResult;
};
