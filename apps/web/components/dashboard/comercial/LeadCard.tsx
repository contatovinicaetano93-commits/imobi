'use client';

import { type LeadItem } from '@/lib/api';
import Link from 'next/link';

interface LeadCardProps {
  lead: LeadItem;
}

export function LeadCard({ lead }: LeadCardProps) {
  const latestScore = lead.scoreHistorico?.[0];
  const scoreFinal = latestScore?.scoreFinal ?? 0;

  const scoreColor =
    scoreFinal >= 80 ? 'bg-green-500' :
    scoreFinal >= 60 ? 'bg-yellow-500' :
    scoreFinal >= 40 ? 'bg-orange-500' :
    'bg-red-500';

  const badgeColor = (value: string) => {
    const colorMap: Record<string, string> = {
      PARCEIRO: 'bg-blue-100 text-blue-800',
      INDICACAO: 'bg-purple-100 text-purple-800',
      WEBSITE: 'bg-indigo-100 text-indigo-800',
      OFFLINE: 'bg-gray-100 text-gray-800',
      NOVO: 'bg-pink-100 text-pink-800',
      RETORNO: 'bg-green-100 text-green-800',
      CONCORRENTE: 'bg-orange-100 text-orange-800',
    };
    return colorMap[value] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Link href={`/dashboard/comercial/leads/${lead.leadId}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900">{lead.clienteNome}</h3>
            <p className="text-sm text-gray-500">{lead.clienteEmail}</p>
          </div>
          <div className={`${scoreColor} text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-sm`}>
            {Math.round(scoreFinal)}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex gap-2 flex-wrap">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badgeColor(lead.fonte)}`}>
              {lead.fonte}
            </span>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${badgeColor(lead.segmentoCliente)}`}>
              {lead.segmentoCliente}
            </span>
            {lead.stage && (
              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                {lead.stage.nome}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>{lead.clienteTelefone}</span>
          {latestScore && (
            <span>Closing: {Math.round(latestScore.probabilidadeClosing * 100)}%</span>
          )}
        </div>
      </div>
    </Link>
  );
}
