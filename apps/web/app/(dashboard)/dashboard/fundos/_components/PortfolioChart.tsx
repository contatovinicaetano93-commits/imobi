"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { RoiDataPoint } from "./fundos-utils";

interface PortfolioChartProps {
  data: RoiDataPoint[];
}

function PortfolioChartComponent({ data }: PortfolioChartProps) {
  const formatCurrency = useMemo(
    () => (value: number) => {
      if (value >= 1000000) {
        return `R$ ${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `R$ ${(value / 1000).toFixed(1)}K`;
      }
      return `R$ ${value}`;
    },
    []
  );

  const chartConfig = useMemo(
    () => ({
      margin: { top: 5, right: 30, left: 0, bottom: 5 },
      colors: {
        esperado: "#10b981",
        real: "#3b82f6",
      },
    }),
    []
  );

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={chartConfig.margin}>
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
            stroke={chartConfig.colors.esperado}
            strokeWidth={2}
            name="ROI Esperado"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="real"
            stroke={chartConfig.colors.real}
            strokeWidth={2}
            name="ROI Real"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const PortfolioChart = useMemo(
  () => PortfolioChartComponent,
  []
) as typeof PortfolioChartComponent;
