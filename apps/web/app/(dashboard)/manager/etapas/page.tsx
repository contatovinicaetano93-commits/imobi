'use client';

import { useState, useEffect } from 'react';
import { managerApi, type EtapaPendente } from '@/lib/api';
import { formatarBRL } from '@imbobi/core';

const ITEMS_PER_PAGE = 20;

export default function EtapasPendentesPage() {
  const [etapas, setEtapas] = useState<EtapaPendente[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEtapas = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * ITEMS_PER_PAGE;
        const result = await managerApi.listarEtapasPendentes(ITEMS_PER_PAGE, offset);
        setEtapas(result.etapas);
        setTotal(result.total);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar etapas');
        setEtapas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEtapas();
  }, [currentPage]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Etapas Pendentes</h1>
        <a href="/dashboard/manager" className="text-sm text-brand-600 font-medium">← Voltar</a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-gray-500">Carregando etapas...</p>
        </div>
      ) : etapas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-4">✨</p>
          <p className="text-gray-500 mb-4">Nenhuma etapa pendente no momento.</p>
          <a href="/dashboard/manager" className="text-brand-600 text-sm font-semibold">
            Voltar ao painel
          </a>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Etapa</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Obra</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Valor</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Evidências</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {etapas.map((etapa) => (
                    <tr key={etapa.etapaId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {etapa.nome}
                        <span className="block text-xs text-gray-500">{etapa.percentualObra}% da obra</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{etapa.obra.nome}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{etapa.obra.usuario.nome}</div>
                        <div className="text-xs text-gray-500">{etapa.obra.usuario.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatarBRL(etapa.valorLiberacao)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                          {etapa.evidenciasCount} foto{etapa.evidenciasCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(etapa.criadoEm).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <a
                          href={`/dashboard/manager/etapas/${etapa.etapaId}`}
                          className="text-brand-600 font-medium hover:text-brand-700"
                        >
                          Revisar →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-brand-600 text-white'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próxima →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
