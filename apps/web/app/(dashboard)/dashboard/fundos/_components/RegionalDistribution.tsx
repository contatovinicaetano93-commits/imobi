"use client";

import { RegionalMetrics } from "./fundos-utils";
import { formatarBRL } from "@imbobi/core";

interface RegionalDistributionProps {
  data: RegionalMetrics[];
}

export function RegionalDistribution({ data }: RegionalDistributionProps) {
  return (
    <div className="space-y-4">
      {data.map((region) => (
        <div key={region.estado} className="border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">{region.estado}</h3>
            <span className="text-xs text-gray-500">{region.obrasCount} obra(s)</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Aprovado</p>
              <p className="font-semibold text-gray-900">{formatarBRL(region.totalAprovado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Liberado</p>
              <p className="font-semibold text-gray-900">{formatarBRL(region.totalLiberado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Progresso</p>
              <p className="font-semibold text-gray-900">{region.progresso}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${region.progresso}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
