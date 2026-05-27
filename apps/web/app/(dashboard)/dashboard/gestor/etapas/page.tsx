"use client";

import { useEffect, useState } from "react";
import { managerApi, type EtapaPendente } from "@/lib/api";
import { BulkApprovalActions } from "@/components/dashboard/BulkApprovalActions";
import { AdvancedFilters, type FilterState } from "@/components/dashboard/AdvancedFilters";
import Link from "next/link";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function hoursAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
}

export default function EtapasPage() {
  const [data, setData] = useState<{ etapas: EtapaPendente[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedEtapas, setSelectedEtapas] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    status: "todas",
    dataInicio: "",
    dataFim: "",
    obraType: "",
  });
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    managerApi
      .listarEtapasPendentes(limit, offset)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [offset]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etapas Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etapas Pendentes</h1>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error || "Erro ao carregar dados"}</p>
        </div>
      </div>
    );
  }

  const pages = Math.ceil(data.total / limit);
  const currentPage = offset / limit + 1;

  const handleSelectEtapa = (etapaId: string) => {
    setSelectedEtapas((prev) =>
      prev.includes(etapaId) ? prev.filter((id) => id !== etapaId) : [...prev, etapaId]
    );
  };

  const handleSelectAll = () => {
    setSelectedEtapas((prev) =>
      prev.length === data.etapas.length ? [] : data.etapas.map((e) => e.etapaId)
    );
  };

  const handleBulkSuccess = () => {
    setSuccessMessage(`${selectedEtapas.length} etapa(s) aprovada(s) com sucesso!`);
    setSelectedEtapas([]);
    setOffset(0);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-green-800 text-sm font-medium">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etapas Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.total} etapa{data.total !== 1 ? "s" : ""} aguardando aprovação
            {selectedEtapas.length > 0 && ` — ${selectedEtapas.length} selecionada(s)`}
          </p>
        </div>
      </div>

      <AdvancedFilters
        onFilter={(newFilters: FilterState) => {
          setFilters(newFilters);
          setOffset(0);
        }}
        onReset={() => {
          setFilters({ status: "todas", dataInicio: "", dataFim: "", obraType: "" });
          setOffset(0);
        }}
      />

      {data.etapas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-500">Nenhuma etapa pendente no momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selection Toolbar */}
          {data.etapas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedEtapas.length === data.etapas.length && data.etapas.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-brand-600 cursor-pointer"
                  title="Selecionar/desselecionar todos"
                />
                <span className="text-sm text-gray-700">
                  {selectedEtapas.length === 0
                    ? "Selecionar etapas"
                    : `${selectedEtapas.length} de ${data.etapas.length} selecionadas`}
                </span>
              </div>
            </div>
          )}

          {data.etapas.map((etapa) => {
            const horas = hoursAgo(etapa.criadoEm);
            const urgente = horas >= 24;
            const isSelected = selectedEtapas.includes(etapa.etapaId);

            return (
              <div
                key={etapa.etapaId}
                className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${
                  isSelected ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectEtapa(etapa.etapaId)}
                    className="w-5 h-5 rounded border-gray-300 text-brand-600 cursor-pointer mt-0.5 shrink-0"
                  />

                  {/* Urgência */}
                  <div
                    className={`w-1.5 h-full self-stretch rounded-full ${
                      urgente ? "bg-red-400" : horas >= 12 ? "bg-yellow-400" : "bg-green-400"
                    }`}
                  />

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{etapa.obra.nome}</p>
                          <p className="text-sm text-gray-500">
                            {etapa.nome} (etapa {etapa.ordem})
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">Liberação</p>
                          <p className="text-lg font-bold text-brand-600">{brl(etapa.valorLiberacao)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>👤 {etapa.obra.usuario.nome}</span>
                      <span>📸 {etapa.evidenciasCount} foto{etapa.evidenciasCount !== 1 ? "s" : ""}</span>
                      <span className={urgente ? "text-red-600 font-medium" : ""}>
                        ⏱ {horas}h aguardando
                      </span>
                      <span className="text-gray-400">{formatDate(etapa.criadoEm)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {etapa.percentualObra}% da obra
                      </span>
                      {etapa.obra.credito && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                          Crédito: {brl(etapa.obra.credito.valorAprovado)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="shrink-0 flex gap-2">
                    <Link
                      href={`/dashboard/gestor/etapas/${etapa.etapaId}`}
                      className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      Revisar
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BulkApprovalActions
        selectedEtapas={selectedEtapas}
        onSuccess={handleBulkSuccess}
        onError={handleError}
        isDisabled={loading}
      />

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            Página {currentPage} de {pages}
          </div>
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
              disabled={offset + limit >= data.total}
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
