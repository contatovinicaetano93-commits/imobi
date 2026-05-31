'use client';

import { LeadActivity } from '@imbobi/schemas';

interface ConversionTimelineProps {
  activities: LeadActivity[];
}

const activityTypeColor: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-800',
  EMAIL: 'bg-purple-100 text-purple-800',
  MEETING: 'bg-green-100 text-green-800',
  PROPOSAL: 'bg-orange-100 text-orange-800',
  VISIT: 'bg-yellow-100 text-yellow-800',
  FOLLOW_UP: 'bg-cyan-100 text-cyan-800',
  NOTE: 'bg-gray-100 text-gray-800',
};

export function ConversionTimeline({ activities }: ConversionTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-gray-500 text-center py-8">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    activityTypeColor[activity.tipo] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.tipo}
                  </span>
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
    </div>
  );
}
