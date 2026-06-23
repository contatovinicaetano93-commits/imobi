import type { ObraResumo } from "@/lib/api";

export type ObraFilterState = {
  searchTerm: string;
  status: string;
  cidade: string;
  valorMin: string;
  valorMax: string;
};

export const DEFAULT_OBRA_FILTERS: ObraFilterState = {
  searchTerm: "",
  status: "todas",
  cidade: "",
  valorMin: "",
  valorMax: "",
};

export function filterObras(obras: ObraResumo[], filters: ObraFilterState): ObraResumo[] {
  const term = filters.searchTerm.trim().toLowerCase();
  const cidade = filters.cidade.trim().toLowerCase();
  const min = filters.valorMin ? Number(filters.valorMin) : null;
  const max = filters.valorMax ? Number(filters.valorMax) : null;

  return obras.filter((obra) => {
    if (filters.status !== "todas" && obra.status !== filters.status) {
      return false;
    }

    if (term) {
      const haystack = `${obra.nome} ${obra.endereco ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (cidade) {
      const endereco = (obra.endereco ?? "").toLowerCase();
      if (!endereco.includes(cidade)) return false;
    }

    if (min !== null && !Number.isNaN(min)) {
      const valor = obra.credito?.valorAprovado;
      if (valor == null || Number(valor) < min) return false;
    }

    if (max !== null && !Number.isNaN(max)) {
      const valor = obra.credito?.valorAprovado;
      if (valor == null || Number(valor) > max) return false;
    }

    return true;
  });
}

export function countActiveObraFilters(filters: ObraFilterState): number {
  let count = 0;
  if (filters.searchTerm.trim()) count++;
  if (filters.status !== "todas") count++;
  if (filters.cidade.trim()) count++;
  if (filters.valorMin.trim()) count++;
  if (filters.valorMax.trim()) count++;
  return count;
}
