'use client';

import { useEffect, useState } from 'react';
import { LeadDetail } from '@imbobi/schemas';
import { ScoreBreakdown } from '@/components/dashboard/comercial/ScoreBreakdown';
import { ConversionTimeline } from '@/components/dashboard/comercial/ConversionTimeline';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { use } from 'react';

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = use(params);
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
          <Button variant="outline">Editar</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            + Atividade
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600">Telefone</p>
            <p className="font-semibold">{lead.clienteTelefone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fonte</p>
            <Badge className="mt-1">{lead.fonte}</Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">Segmento</p>
            <Badge variant="outline" className="mt-1">
              {lead.segmentoCliente}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-600">Estágio</p>
            <Badge variant="secondary" className="mt-1">
              {lead.stageName}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {lead.scoreHistorico && lead.scoreHistorico.length > 0 && (
            <ScoreBreakdown score={lead.scoreHistorico[0]} />
          )}
        </div>

        <Card className="p-6">
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
            <Button className="w-full" variant="outline">
              Agendar Contato
            </Button>
            <Button className="w-full" variant="outline">
              Enviar Proposta
            </Button>
          </div>
        </Card>
      </div>

      {lead.atividades && lead.atividades.length > 0 && (
        <ConversionTimeline activities={lead.atividades} />
      )}
    </div>
  );
}
