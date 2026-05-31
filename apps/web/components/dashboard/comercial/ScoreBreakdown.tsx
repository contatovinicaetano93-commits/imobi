'use client';

import { ConversionScore } from '@imbobi/schemas';
import { Card } from '@/components/ui/card';

interface ScoreBreakdownProps {
  score: ConversionScore;
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const factors = [
    { label: 'Fonte', value: Math.round(score.fonteScore), weight: 25 },
    { label: 'Engajamento', value: Math.round(score.engajamentoScore), weight: 25 },
    { label: 'Segmento', value: Math.round(score.segmentoScore), weight: 20 },
    { label: 'Tipo Obra', value: Math.round(score.tipoObraScore), weight: 20 },
    { label: 'Histórico', value: Math.round(score.historicoScore), weight: 10 },
  ];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="text-lg font-semibold">Score Final</h3>
          <span className="text-4xl font-bold text-blue-600">{Math.round(score.scoreFinal)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${score.scoreFinal}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Fatores (5)</h4>
        {factors.map((factor) => (
          <div key={factor.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{factor.label}</span>
              <span className="font-semibold">{factor.value}/100</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${factor.value}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{factor.weight}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-600">Probabilidade Closing</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.round(score.probabilidadeClosing * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Data Estimada</p>
          <p className="text-lg font-semibold text-gray-900">
            {new Date(score.dataEstimadaClosing).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </Card>
  );
}
