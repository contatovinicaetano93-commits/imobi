"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CreditoLiberadoMensal } from "@/lib/api";

type CreditoLiberadoChartProps = {
  data: CreditoLiberadoMensal[];
};

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function CreditoLiberadoChart({ data }: CreditoLiberadoChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Nenhuma liberação registrada nos últimos 12 meses.
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72" role="img" aria-label="Gráfico de volume de crédito liberado por mês">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="mes"
            stroke="#6b7280"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#6b7280"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11 }}
            width={72}
          />
          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            }
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            name="Crédito liberado"
            stroke="#1B4FD8"
            strokeWidth={2}
            dot={{ r: 3, fill: "#1B4FD8" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
