"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InadimplenciaDataPoint } from "./fundos-utils";

interface InadimplenciaMetricsProps {
  data: InadimplenciaDataPoint[];
}

export function InadimplenciaMetrics({ data }: InadimplenciaMetricsProps) {
  const avgTaxa = (data.reduce((acc, d) => acc + d.taxa, 0) / data.length).toFixed(2);
  const maxTaxa = Math.max(...data.map((d) => d.taxa)).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Taxa média</p>
          <p className="text-2xl font-bold text-gray-900">{avgTaxa}%</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Taxa máxima</p>
          <p className="text-2xl font-bold text-orange-600">{maxTaxa}%</p>
        </div>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" stroke="#6b7280" />
            <YAxis stroke="#6b7280" label={{ value: "Taxa (%)", angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value) => `${value}%`}
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
              }}
            />
            <Line
              type="monotone"
              dataKey="taxa"
              stroke="#f97316"
              strokeWidth={2}
              name="Taxa de Inadimplência"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
