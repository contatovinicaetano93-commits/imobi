'use client';

import { Lead } from '@imbobi/schemas';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface LeadCardProps {
  lead: Lead & { scoreHistorico?: { scoreFinal: number; probabilidadeClosing: number }[] };
}

export function LeadCard({ lead }: LeadCardProps) {
  const latestScore = lead.scoreHistorico?.[0];
  const scoreFinal = latestScore?.scoreFinal ?? 0;

  const scoreColor =
    scoreFinal >= 80 ? 'bg-green-500' :
    scoreFinal >= 60 ? 'bg-yellow-500' :
    scoreFinal >= 40 ? 'bg-orange-500' :
    'bg-red-500';

  return (
    <Link href={`/dashboard/comercial/leads/${lead.leadId}`}>
      <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
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
            <Badge variant="outline">{lead.fonte}</Badge>
            <Badge variant="outline">{lead.segmentoCliente}</Badge>
            {lead.stageName && <Badge variant="secondary">{lead.stageName}</Badge>}
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>{lead.clienteTelefone}</span>
          {latestScore && (
            <span>Closing: {Math.round(latestScore.probabilidadeClosing * 100)}%</span>
          )}
        </div>
      </Card>
    </Link>
  );
}
