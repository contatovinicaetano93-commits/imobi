'use client';

import { useEffect, useState } from 'react';
import type { Lead } from '@imbobi/schemas';
import { comercialApi } from '@/lib/api';
import { LeadCard } from '@/components/dashboard/comercial/LeadCard';

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 12;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLeads = async () => {
      try {
        setLoading(true);
        const offset = (page - 1) * pageSize;
        const data = await comercialApi.listarLeads(pageSize, offset, searchTerm || undefined);
        setLeads(data.leads);
        setTotal(data.total);
      } catch {
        // ignore aborted requests
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchLeads, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
          + Novo Lead
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-500">Nenhum lead encontrado</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <LeadCard key={lead.leadId} lead={lead} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(Math.max(1, page - 1))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
