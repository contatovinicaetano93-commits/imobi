"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { RoiDataPoint } from "./fundos-utils";

interface PortfolioChartProps {
  data: RoiDataPoint[];
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return `R$ ${value}`;
  };

  return (
    <div className="w-full h-64 sm:h-80 md:h-96" role="img" aria-label="Gráfico de evolução de ROI esperado vs real ao longo do tempo">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="mes"
            stroke="#6b7280"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6b7280"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
          />
          <Line
            type="monotone"
            dataKey="esperado"
            stroke="#10b981"
            strokeWidth={2}
            name="ROI Esperado"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
          />
          <Line
            type="monotone"
            dataKey="real"
            stroke="#3b82f6"
            strokeWidth={2}
            name="ROI Real"
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
