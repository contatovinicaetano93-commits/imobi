"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { RegionalMetrics } from "./fundos-utils";
import { formatarBRL } from "@imbobi/core";

interface RegionalDistributionProps {
  data: RegionalMetrics[];
}

export function RegionalDistribution({ data }: RegionalDistributionProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Sem dados de distribuição regional.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    estado: d.estado,
    aprovado: d.totalAprovado,
    liberado: d.totalLiberado,
  }));

  return (
    <div className="w-full space-y-6">
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="estado" stroke="#6b7280" />
            <YAxis
              stroke="#6b7280"
              tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(0)}M`}
            />
            <Tooltip
              formatter={(value) => formatarBRL(value as number)}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            <Bar dataKey="aprovado" fill="#3b82f6" name="Aprovado" radius={[8, 8, 0, 0]} />
            <Bar dataKey="liberado" fill="#10b981" name="Liberado" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Obras</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Aprovado</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Liberado</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Liberação %</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Progresso Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((region) => {
              const liberacaoPerc = region.totalAprovado > 0
                ? ((region.totalLiberado / region.totalAprovado) * 100).toFixed(1)
                : "0.0";

              return (
                <tr key={region.estado} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{region.estado}</td>
                  <td className="py-3 px-4 text-gray-600">{region.obrasCount}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{formatarBRL(region.totalAprovado)}</td>
                  <td className="py-3 px-4 text-right text-gray-900">{formatarBRL(region.totalLiberado)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${liberacaoPerc}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{liberacaoPerc}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-semibold ${
                      region.progresso >= 75 ? "text-green-600" :
                      region.progresso >= 50 ? "text-yellow-600" :
                      "text-orange-600"
                    }`}>
                      {region.progresso}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
