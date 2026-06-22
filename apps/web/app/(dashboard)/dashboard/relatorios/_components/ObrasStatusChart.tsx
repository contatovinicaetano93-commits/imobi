"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ObrasPorStatus } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  EM_EXECUCAO: "Em execução",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  PLANEJAMENTO: "#94a3b8",
  EM_EXECUCAO: "#1B4FD8",
  PAUSADA: "#f59e0b",
  CONCLUIDA: "#16a34a",
  CANCELADA: "#ef4444",
};

type ObrasStatusChartProps = {
  data: ObrasPorStatus[];
};

export function ObrasStatusChart({ data }: ObrasStatusChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Nenhuma obra cadastrada.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    status: STATUS_LABEL[item.status] ?? item.status,
    quantidade: item.quantidade,
    rawStatus: item.status,
  }));

  return (
    <div className="w-full h-64 sm:h-72" role="img" aria-label="Gráfico de obras por status">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="status"
            stroke="#6b7280"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(value) => [`${value} obra(s)`, "Quantidade"]}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="quantidade" name="Obras" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.rawStatus} fill={STATUS_COLOR[entry.rawStatus] ?? "#64748b"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
