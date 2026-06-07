'use client';

import { useEffect, useState } from 'react';
import { LeadDetail } from '@imbobi/schemas';
import { ScoreBreakdown } from '@/components/dashboard/comercial/ScoreBreakdown';
import { ConversionTimeline } from '@/components/dashboard/comercial/ConversionTimeline';

interface LeadDetailPageProps {
  params: { id: string };
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = params;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/comercial/leads/${id}`);
        if (response.ok) {
          const data: LeadDetail = await response.json();
          setLead(data);
        }
      } catch (error) {
        console.error('Failed to fetch lead:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Carregando detalhes do lead...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Lead não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{lead.clienteNome}</h1>
          <p className="text-gray-600 mt-1">{lead.clienteEmail}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Editar</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Atividade
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Telefone</p>
            <p className="font-semibold">{lead.clienteTelefone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fonte</p>
            <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{lead.fonte}</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Segmento</p>
            <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {lead.segmentoCliente}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estágio</p>
            <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
              {lead.stage?.nome || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {lead.scoreHistorico && lead.scoreHistorico.length > 0 && (
            <ScoreBreakdown score={lead.scoreHistorico[0]} />
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-4">Próximas Ações</h3>
          <div className="space-y-3">
            {lead.proximoAcompanhamento && (
              <div>
                <p className="text-sm text-gray-600">Próx. Acompanhamento</p>
                <p className="font-semibold">
                  {new Date(lead.proximoAcompanhamento).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Agendar Contato
            </button>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Enviar Proposta
            </button>
          </div>
        </div>
      </div>

      {lead.atividades && lead.atividades.length > 0 && (
        <ConversionTimeline activities={lead.atividades} />
      )}
    </div>
  );
}
