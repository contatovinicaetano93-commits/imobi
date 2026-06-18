"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InadimplenciaDataPoint } from "./fundos-utils";

interface InadimplenciaMetricsProps {
  data: InadimplenciaDataPoint[];
}

export function InadimplenciaMetrics({ data }: InadimplenciaMetricsProps) {
  const currentRate = data.length > 0 ? data[data.length - 1].taxa : 0;
  const averageRate = data.length > 0
    ? (data.reduce((acc, d) => acc + d.taxa, 0) / data.length).toFixed(2)
    : "0.00";
  const maxRate = Math.max(...data.map((d) => d.taxa), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <p className="text-xs text-orange-700 font-medium mb-1">Taxa Atual</p>
          <p className="text-2xl font-bold text-orange-900">{currentRate}%</p>
          <p className="text-xs text-orange-600 mt-1">Mês atual</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <p className="text-xs text-yellow-700 font-medium mb-1">Taxa Média</p>
          <p className="text-2xl font-bold text-yellow-900">{averageRate}%</p>
          <p className="text-xs text-yellow-600 mt-1">Últimos 12 meses</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <p className="text-xs text-red-700 font-medium mb-1">Taxa Máxima</p>
          <p className="text-2xl font-bold text-red-900">{maxRate.toFixed(2)}%</p>
          <p className="text-xs text-red-600 mt-1">Pico registrado</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorInadimplencia" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" stroke="#6b7280" />
            <YAxis
              stroke="#6b7280"
              label={{ value: "Taxa (%)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value) => [`${(value as number).toFixed(2)}%`, "Taxa de inadimplência"]}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
              }}
            />
            <Area
              type="monotone"
              dataKey="taxa"
              stroke="#d97706"
              fillOpacity={1}
              fill="url(#colorInadimplencia)"
              name="Taxa de inadimplência"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Risk assessment */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Análise de Risco</h4>
        <div className="space-y-2 text-sm text-blue-800">
          {currentRate <= 1 && (
            <p>Taxa de inadimplência baixa. Carteira em ótima condição.</p>
          )}
          {currentRate > 1 && currentRate <= 2 && (
            <p>Taxa de inadimplência moderada. Monitorar evolução da carteira.</p>
          )}
          {currentRate > 2 && currentRate <= 3 && (
            <p>Taxa de inadimplência elevada. Recomenda-se revisão de critérios de aprovação.</p>
          )}
          {currentRate > 3 && (
            <p>Taxa de inadimplência crítica. Ação imediata necessária.</p>
          )}
        </div>
      </div>
    </div>
  );
}
