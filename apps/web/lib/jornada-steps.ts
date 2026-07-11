import type { Jornada } from "@/lib/api";
import { ACCOUNT_ROUTE_PREFIXES } from "@/lib/canonical-flow";

export type JornadaStepDef = {
  id: string;
  label: string;
  shortLabel: string;
};

export const CLIENTE_STEPS: JornadaStepDef[] = [
  { id: "KYC_PENDENTE", label: "Documentos", shortLabel: "KYC" },
  { id: "DOSSIE_EM_ANALISE", label: "Análise", shortLabel: "Análise" },
  { id: "APROVADO", label: "Obra", shortLabel: "Obra" },
  { id: "OBRA_CADASTRADA", label: "Homologação", shortLabel: "Homolog." },
  { id: "HOMOLOGADA", label: "Início", shortLabel: "Início" },
  { id: "EM_ANDAMENTO", label: "Tranches", shortLabel: "Tranches" },
  { id: "QUITADO", label: "Quitado", shortLabel: "Quitado" },
];

export function getStepsForJornada(jornada: Jornada): JornadaStepDef[] {
  return jornada.role === "FUNDO" ? [] : CLIENTE_STEPS;
}

export function getPassoIndex(jornada: Jornada): number {
  const steps = getStepsForJornada(jornada);
  const idx = jornada.etapaAtual
    ? steps.findIndex((s) => s.id === jornada.etapaAtual)
    : -1;
  return idx >= 0 ? idx : 0;
}

export function getPassoNumero(jornada: Jornada): number {
  return getPassoIndex(jornada) + 1;
}

export function isAccountRoute(pathname: string): boolean {
  return ACCOUNT_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
