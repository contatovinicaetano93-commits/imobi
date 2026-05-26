import { useState, useMemo } from "react";
import { simularCredito, type SimulacaoResult } from "../utils/credito";

const TAXA_MENSAL_DEFAULT = 0.0099; // ~1% a.m. (CET ~12,5% a.a.)

export interface SimuladorState {
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  resultado: SimulacaoResult | null;
}

export function useSimuladorCredito(taxaMensal = TAXA_MENSAL_DEFAULT) {
  const [valorSolicitado, setValorSolicitado] = useState(150_000);
  const [prazoMeses, setPrazoMeses] = useState(60);

  const resultado = useMemo<SimulacaoResult>(
    () => simularCredito(valorSolicitado, taxaMensal, prazoMeses),
    [valorSolicitado, prazoMeses, taxaMensal]
  );

  return {
    valorSolicitado,
    setValorSolicitado,
    prazoMeses,
    setPrazoMeses,
    taxaMensal,
    resultado,
  };
}
