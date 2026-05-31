'use client';

import { LeadActivity } from '@imbobi/schemas';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConversionTimelineProps {
  activities: LeadActivity[];
}

const activityTypeColor: Record<string, string> = {
  CALL_OUTBOUND: 'bg-blue-100 text-blue-800',
  CALL_INBOUND: 'bg-blue-100 text-blue-800',
  EMAIL_SENT: 'bg-purple-100 text-purple-800',
  EMAIL_RECEIVED: 'bg-purple-100 text-purple-800',
  MEETING_SCHEDULED: 'bg-green-100 text-green-800',
  MEETING_COMPLETED: 'bg-green-100 text-green-800',
  PROPOSAL_SENT: 'bg-orange-100 text-orange-800',
  DOCUMENT_REQUESTED: 'bg-yellow-100 text-yellow-800',
  PAYMENT_RECEIVED: 'bg-green-100 text-green-800',
  STAGE_CHANGED: 'bg-indigo-100 text-indigo-800',
  NOTE_ADDED: 'bg-gray-100 text-gray-800',
  FOLLOW_UP_SET: 'bg-cyan-100 text-cyan-800',
};

export function ConversionTimeline({ activities }: ConversionTimelineProps) {
  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-500 text-center py-8">Nenhuma atividade registrada</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-6">Timeline de Atividades</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              {index < activities.length - 1 && (
                <div className="w-0.5 h-12 bg-gray-200 my-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className={activityTypeColor[activity.tipo] || 'bg-gray-100 text-gray-800'}>
                    {activity.tipo.replace(/_/g, ' ')}
                  </Badge>
                  <p className="text-sm text-gray-700 mt-2">{activity.descricao}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(activity.criadoEm).toLocaleDateString('pt-BR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
