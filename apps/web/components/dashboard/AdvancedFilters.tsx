"use client";

import { useState } from "react";

export type FilterState = {
  status: "todas" | "pendente" | "aprovada" | "rejeitada";
  dataInicio: string;
  dataFim: string;
  obraType: string;
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
    };
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters =
    filters.status !== "todas" ||
    filters.dataInicio ||
    filters.dataFim ||
    filters.obraType;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">Filtros Avançados</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
              {[
                filters.status !== "todas" ? 1 : 0,
                filters.dataInicio ? 1 : 0,
                filters.dataFim ? 1 : 0,
                filters.obraType ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                handleFilterChange(
                  "status",
                  e.target.value as FilterState["status"]
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas</option>
              <option value="pendente">Pendente</option>
              <option value="aprovada">Aprovada</option>
              <option value="rejeitada">Rejeitada</option>
            </select>
          </div>

          {/* Date Range - Start */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Data Início
            </label>
            <input
              type="date"
              value={filters.dataInicio}
              onChange={(e) =>
                handleFilterChange("dataInicio", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Range - End */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.dataFim}
              onChange={(e) => handleFilterChange("dataFim", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Obra Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tipo Obra
            </label>
            <select
              value={filters.obraType}
              onChange={(e) => handleFilterChange("obraType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
              <option value="industrial">Industrial</option>
              <option value="reforma">Reforma</option>
            </select>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="w-full px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
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
