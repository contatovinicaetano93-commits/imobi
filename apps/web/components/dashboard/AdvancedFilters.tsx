"use client";

import { useState } from "react";

export type FilterState = {
  status: "todas" | "pendente" | "aprovada" | "rejeitada";
  dataInicio: string;
  dataFim: string;
  obraType: string;
  priority?: "todas" | "urgente" | "intermediaria" | "normal";
};

export type AdvancedFiltersProps = {
  onFilter: (filters: FilterState) => void;
  onReset: () => void;
};

export function AdvancedFilters({ onFilter, onReset }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    status: "todas",
    dataInicio: "",
    dataFim: "",
    obraType: "",
    priority: "todas",
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    const updatedFilters = { ...filters, [field]: value };
    setFilters(updatedFilters);
    onFilter(updatedFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      status: "todas",
      dataInicio: "",
      dataFim: "",
      obraType: "",
      priority: "todas",
    };
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters =
    filters.status !== "todas" ||
    filters.dataInicio ||
    filters.dataFim ||
    filters.obraType ||
    filters.priority !== "todas";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-expanded={isExpanded}
        aria-label="Mostrar filtros avançados"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm text-gray-900">Filtros Avançados</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full" aria-label={`${
                [
                  filters.status !== "todas" ? 1 : 0,
                  filters.dataInicio ? 1 : 0,
                  filters.dataFim ? 1 : 0,
                  filters.obraType ? 1 : 0,
                  filters.priority !== "todas" ? 1 : 0,
                ].reduce((a, b) => a + b, 0)
              } filtros ativos`}>
              {[
                filters.status !== "todas" ? 1 : 0,
                filters.dataInicio ? 1 : 0,
                filters.dataFim ? 1 : 0,
                filters.obraType ? 1 : 0,
                filters.priority !== "todas" ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label htmlFor="status-filter" className="text-xs sm:text-sm font-medium text-gray-700">Status</label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) =>
                  handleFilterChange(
                    "status",
                    e.target.value as FilterState["status"]
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-10"
                aria-label="Filtrar por status"
              >
                <option value="todas">Todas</option>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="rejeitada">Rejeitada</option>
              </select>
            </div>

            {/* Date Range - Start */}
            <div className="space-y-2">
              <label htmlFor="start-date" className="text-xs sm:text-sm font-medium text-gray-700">
                Data Início
              </label>
              <input
                id="start-date"
                type="date"
                value={filters.dataInicio}
                onChange={(e) =>
                  handleFilterChange("dataInicio", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-10"
                aria-label="Selecionar data de início"
              />
            </div>

            {/* Date Range - End */}
            <div className="space-y-2">
              <label htmlFor="end-date" className="text-xs sm:text-sm font-medium text-gray-700">
                Data Fim
              </label>
              <input
                id="end-date"
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange("dataFim", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-10"
                aria-label="Selecionar data de fim"
              />
            </div>

            {/* Obra Type Filter */}
            <div className="space-y-2">
              <label htmlFor="obra-type" className="text-xs sm:text-sm font-medium text-gray-700">
                Tipo Obra
              </label>
              <select
                id="obra-type"
                value={filters.obraType}
                onChange={(e) => handleFilterChange("obraType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-10"
                aria-label="Filtrar por tipo de obra"
              >
                <option value="">Todos</option>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
                <option value="industrial">Industrial</option>
                <option value="reforma">Reforma</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label htmlFor="priority-filter" className="text-xs sm:text-sm font-medium text-gray-700">
                Prioridade
              </label>
              <select
                id="priority-filter"
                value={filters.priority || "todas"}
                onChange={(e) =>
                  handleFilterChange("priority", e.target.value as any)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-10"
                aria-label="Filtrar por prioridade"
              >
                <option value="todas">Todas</option>
                <option value="urgente">Urgente (+24h)</option>
                <option value="intermediaria">Intermediária (12-24h)</option>
                <option value="normal">Normal (&lt;12h)</option>
              </select>
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="mt-3 sm:mt-4">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-10"
                aria-label="Limpar todos os filtros"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
