'use client';

import { useEffect, useState } from 'react';
import { Lead } from '@imbobi/schemas';
import { LeadCard } from '@/components/dashboard/comercial/LeadCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LeadsListResponse {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 12;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const offset = (page - 1) * pageSize;
        const query = new URLSearchParams({
          limit: pageSize.toString(),
          offset: offset.toString(),
          filters: JSON.stringify({ searchTerm }),
        });

        const response = await fetch(`/api/comercial/leads?${query}`);
        if (response.ok) {
          const data: LeadsListResponse = await response.json();
          setLeads(data.leads);
          setTotal(data.total);
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchLeads, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">
          + Novo Lead
        </Button>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Carregando leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Nenhum lead encontrado</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <LeadCard key={lead.leadId} lead={lead} />
            ))}
          </div>

          {totalPages > 1 && (
            <Card className="p-4 flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                ← Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                Próxima →
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
