import type { Jornada } from "@/lib/api";

export type JornadaStepDef = {
  id: string;
  label: string;
  shortLabel: string;
};

export const TOMADOR_STEPS: JornadaStepDef[] = [
  { id: "kyc", label: "Documentos", shortLabel: "KYC" },
  { id: "viabilidade", label: "Viabilidade", shortLabel: "Dossiê" },
  { id: "obra", label: "Obra", shortLabel: "Obra" },
  { id: "credito", label: "Crédito", shortLabel: "Crédito" },
  { id: "aguardando", label: "Análise", shortLabel: "Análise" },
  { id: "acompanhar", label: "Acompanhar", shortLabel: "Obra ativa" },
];

export const GESTOR_STEPS: JornadaStepDef[] = [
  { id: "gestor_ok", label: "Indicadores", shortLabel: "KPIs" },
];

export function getStepsForJornada(jornada: Jornada): JornadaStepDef[] {
  return jornada.perfil === "gestor" ? GESTOR_STEPS : TOMADOR_STEPS;
}

export function getPassoIndex(jornada: Jornada): number {
  const steps = getStepsForJornada(jornada);
  const idx = steps.findIndex((s) => s.id === jornada.passoAtual);
  return idx >= 0 ? idx : 0;
}

/** Número do passo atual (1-based) — alinhado com a barra de progresso. */
export function getPassoNumero(jornada: Jornada): number {
  return getPassoIndex(jornada) + 1;
}
