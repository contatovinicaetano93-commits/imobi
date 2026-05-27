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
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="mes" stroke="#6b7280" />
          <YAxis
            stroke="#6b7280"
            tickFormatter={formatCurrency}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="esperado"
            stroke="#10b981"
            strokeWidth={2}
            name="ROI Esperado"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="real"
            stroke="#3b82f6"
            strokeWidth={2}
            name="ROI Real"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
