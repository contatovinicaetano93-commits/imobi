"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HardHat, LayoutGrid, List, Map, Plus } from "lucide-react";
import type { ObraResumo } from "@/lib/api";
import { fluxoApi } from "@/lib/api";
import { FlowGateBanner } from "@/components/FlowGateBanner";
import { proximoPassoFluxo } from "@/lib/flow-gates";
import { ObraCard } from "./ObraCard";
import { ObraFilters } from "./ObraFilters";
import { ObrasMap } from "./ObrasMap";
import {
  DEFAULT_OBRA_FILTERS,
  filterObras,
  type ObraFilterState,
} from "./filter-obras";

type ViewMode = "cards" | "list" | "map";

type ObrasSearchClientProps = {
  initialObras: ObraResumo[];
};

export function ObrasSearchClient({ initialObras }: ObrasSearchClientProps) {
  const [filters, setFilters] = useState<ObraFilterState>(DEFAULT_OBRA_FILTERS);
  const [view, setView] = useState<ViewMode>("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fluxo, setFluxo] = useState<Awaited<ReturnType<typeof fluxoApi.status>> | null>(null);

  useEffect(() => {
    fluxoApi.status().then(setFluxo).catch(() => null);
  }, []);

  const gate = proximoPassoFluxo(fluxo);

  const filtered = useMemo(
    () => filterObras(initialObras, filters),
    [initialObras, filters]
  );

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: "cards", icon: LayoutGrid, label: "Cards" },
    { mode: "list", icon: List, label: "Lista" },
    { mode: "map", icon: Map, label: "Mapa" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minhas Obras</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length === 0
              ? "Nenhuma obra encontrada"
              : `${filtered.length} de ${initialObras.length} obra${initialObras.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/dashboard/obras/nova"
          className="inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova Obra
        </Link>
      </div>

      {gate && <FlowGateBanner {...gate} />}

      {initialObras.length > 0 && (
        <>
          <ObraFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_OBRA_FILTERS)}
          />

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {viewButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  view === mode
                    ? "bg-white text-[#1B4FD8] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                aria-pressed={view === mode}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {initialObras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4">
          <div className="p-5 bg-gray-50 rounded-2xl">
            <HardHat className="w-12 h-12 text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 text-lg mb-1">Nenhuma obra cadastrada</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Comece cadastrando sua primeira obra para acompanhar o progresso e gerenciar créditos.
            </p>
          </div>
          <Link
            href="/dashboard/obras/nova"
            className="mt-2 inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Cadastrar primeira obra
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-500">
          Nenhuma obra corresponde aos filtros. Tente ajustar a busca.
        </div>
      ) : view === "map" ? (
        <div className="space-y-4">
          <ObrasMap
            obras={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {selectedId && (() => {
            const selected = filtered.find((o) => o.id === selectedId);
            return selected ? (
              <div className="max-w-md">
                <ObraCard obra={selected} variant="list" />
              </div>
            ) : null;
          })()}
        </div>
      ) : view === "list" ? (
        <div className="space-y-3">
          {filtered.map((obra) => (
            <ObraCard key={obra.id} obra={obra} variant="list" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((obra) => (
            <ObraCard key={obra.id} obra={obra} variant="card" />
          ))}
        </div>
      )}
    </div>
  );
}
