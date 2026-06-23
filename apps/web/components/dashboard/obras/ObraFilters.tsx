"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { OBRA_STATUS_OPTIONS } from "./obra-status";
import type { ObraFilterState } from "./filter-obras";
import { countActiveObraFilters } from "./filter-obras";

type ObraFiltersProps = {
  filters: ObraFilterState;
  onChange: (filters: ObraFilterState) => void;
  onReset: () => void;
};

export function ObraFilters({ filters, onChange, onReset }: ObraFiltersProps) {
  const activeCount = countActiveObraFilters(filters);

  const update = (field: keyof ObraFilterState, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar por nome ou endereço..."
            value={filters.searchTerm}
            onChange={(e) => update("searchTerm", e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30 focus:border-[#1B4FD8]"
            aria-label="Buscar obras"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 hidden sm:block" />
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50"
            >
              <X className="w-3 h-3" />
              Limpar ({activeCount})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Status</span>
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30"
          >
            {OBRA_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Cidade / bairro</span>
          <input
            type="text"
            placeholder="Ex: São Paulo"
            value={filters.cidade}
            onChange={(e) => update("cidade", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Crédito mín. (R$)</span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={filters.valorMin}
            onChange={(e) => update("valorMin", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-500 mb-1 block">Crédito máx. (R$)</span>
          <input
            type="number"
            min={0}
            placeholder="Sem limite"
            value={filters.valorMax}
            onChange={(e) => update("valorMax", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/30"
          />
        </label>
      </div>
    </div>
  );
}
