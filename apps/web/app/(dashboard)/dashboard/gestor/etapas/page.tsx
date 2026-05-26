"use client";
import React from "react";

import { useEffect, useState } from "react";
import { managerApi, type EtapaPendente } from "@/lib/api";
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
  const limit = 20;

  useEffect(() => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Etapas Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.total} etapa{data.total !== 1 ? "s" : ""} aguardando aprovação
          </p>
        </div>
      </div>

      {data.etapas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-500">Nenhuma etapa pendente no momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.etapas.map((etapa) => {
            const horas = hoursAgo(etapa.criadoEm);
            const urgente = horas >= 24;

            return (
              <div
                key={etapa.etapaId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
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
                      <span>⏱ {horas}h aguardando</span>
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
