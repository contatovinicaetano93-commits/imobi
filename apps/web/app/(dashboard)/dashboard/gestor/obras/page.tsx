"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { managerApi, type ObraGestor } from "@/lib/api";
import Link from "next/link";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "EM_EXECUCAO", label: "Em Andamento" },
  { value: "CONCLUIDA", label: "Concluída" },
  { value: "PAUSADA", label: "Suspensa" },
  { value: "CANCELADA", label: "Cancelada" },
];

const STATUS_STYLE: Record<string, string> = {
  EM_EXECUCAO: "bg-blue-50 text-blue-700",
  PLANEJAMENTO: "bg-yellow-50 text-yellow-700",
  CONCLUIDA: "bg-green-50 text-green-700",
  PAUSADA: "bg-gray-50 text-gray-600",
  CANCELADA: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  EM_EXECUCAO: "Em Andamento",
  PLANEJAMENTO: "Planejamento",
  CONCLUIDA: "Concluída",
  PAUSADA: "Suspensa",
  CANCELADA: "Cancelada",
};

function GestorObrasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ obras: ObraGestor[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODAS");
  const limit = 20;

  useEffect(() => {
    const s = searchParams.get("status") || "TODAS";
    const q = searchParams.get("q") || "";
    setStatusFilter(s);
    setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    managerApi
      .listarObras(limit, offset, { status: statusFilter, searchTerm })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [offset, statusFilter, searchTerm]);

  const updateFilters = (newStatus: string, newSearch: string) => {
    const params = new URLSearchParams();
    if (newStatus && newStatus !== "TODAS") params.set("status", newStatus);
    if (newSearch) params.set("q", newSearch);
    router.push(`?${params.toString()}`);
    setOffset(0);
  };

  const stats = {
    total: data?.total ?? 0,
    ativas: data?.obras.filter((o) => o.status === "EM_EXECUCAO").length ?? 0,
    concluidas: data?.obras.filter((o) => o.status === "CONCLUIDA").length ?? 0,
    suspensas: data?.obras.filter((o) => o.status === "PAUSADA" || o.status === "CANCELADA").length ?? 0,
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todas as Obras</h1>
          <p className="text-gray-500 text-sm mt-1">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todas as Obras</h1>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const pages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = offset / limit + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Todas as Obras</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data?.total ?? 0} obra{(data?.total ?? 0) !== 1 ? "s" : ""} encontrada{(data?.total ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600">Ativas</p>
          <p className="text-2xl font-bold text-blue-700">{stats.ativas}</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
          <p className="text-xs text-green-600">Concluídas</p>
          <p className="text-2xl font-bold text-green-700">{stats.concluidas}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Suspensas/Canceladas</p>
          <p className="text-2xl font-bold text-gray-600">{stats.suspensas}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou endereço..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            updateFilters(statusFilter, e.target.value);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                updateFilters(opt.value, searchTerm);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!data || data.obras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🏗️</p>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== "TODAS"
              ? "Nenhuma obra encontrada com os filtros selecionados"
              : "Nenhuma obra cadastrada no sistema"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Tomador</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Endereço</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Progresso</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Etapas</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden xl:table-cell">Crédito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.obras.map((obra) => (
                  <tr
                    key={obra.obraId}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/obras/${obra.obraId}`)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{obra.nome}</p>
                      <p className="text-xs text-gray-400 lg:hidden truncate max-w-[180px]">{obra.endereco}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-gray-700">{obra.tomador?.nome ?? "—"}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-gray-600 max-w-[220px] truncate">{obra.endereco}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                          STATUS_STYLE[obra.status] ?? "bg-gray-50 text-gray-500"
                        }`}
                      >
                        {STATUS_LABEL[obra.status] ?? obra.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${obra.progresso}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{obra.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-gray-700">
                        {obra.etapasConcluidas}/{obra.etapasTotal}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      {obra.credito ? (
                        <div>
                          <p className="text-gray-700">{brl(obra.credito.valorLiberado)}</p>
                          <p className="text-xs text-gray-400">de {brl(obra.credito.valorAprovado)}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Página {currentPage} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!data || offset + limit >= data.total}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GestorObrasPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Todas as Obras</h1>
            <p className="text-gray-500 text-sm mt-1">Carregando...</p>
          </div>
        </div>
      }
    >
      <GestorObrasContent />
    </Suspense>
  );
}
