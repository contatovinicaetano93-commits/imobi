"use client";

import { useState, useMemo } from "react";
import {
  PRAZO_MAX_SIMULACAO_CREDITO_MESES,
  simularCredito,
  TAXA_MENSAL_SIMULACAO_CREDITO,
  type SimulacaoResult,
} from "../utils/credito";

export interface SimuladorState {
  valorSolicitado: number;
  prazoMeses: number;
  taxaMensal: number;
  resultado: SimulacaoResult | null;
}

export function useSimuladorCredito(taxaMensal = TAXA_MENSAL_SIMULACAO_CREDITO) {
  const [valorSolicitado, setValorSolicitado] = useState(150_000);
  const [prazoMeses, setPrazoMeses] = useState(PRAZO_MAX_SIMULACAO_CREDITO_MESES);

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
