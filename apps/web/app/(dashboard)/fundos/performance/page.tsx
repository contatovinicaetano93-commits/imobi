import type { Metadata } from "next";
import { SimpleLineChart } from "@/components/fundos/SimpleLineChart";
import { SimpleBarChart } from "@/components/fundos/SimpleBarChart";
import {
  mockPerformanceMetrics,
  mockROIHistory,
  mockDefaultHistory,
  mockStatusDistribution,
} from "@/lib/fundos-mock-data";
import { formatarBRL } from "@imbobi/core";

export const metadata: Metadata = {
  title: "Performance — Dashboard de Fundos — imbobi",
};

export default function PerformancePage() {
  const metrics = [
    {
      label: "Ticket Médio",
      value: formatarBRL(mockPerformanceMetrics.ticketMedio),
    },
    {
      label: "Taxa Média",
      value: `${(mockPerformanceMetrics.taxaMedia * 100).toFixed(2)}% a.m.`,
    },
    {
      label: "Prazo Médio",
      value: `${mockPerformanceMetrics.prazoMedio} meses`,
    },
    {
      label: "Default Rate",
      value: `${(mockPerformanceMetrics.defaultRate * 100).toFixed(1)}%`,
    },
    {
      label: "Recovery Rate",
      value: `${(mockPerformanceMetrics.recoveryRate * 100).toFixed(0)}%`,
    },
    {
      label: "Juros Acumulados",
      value: formatarBRL(mockPerformanceMetrics.jurosAcumulados),
    },
    {
      label: "Provisão para Risco",
      value: formatarBRL(mockPerformanceMetrics.provisaoPaRisco),
    },
    {
      label: "ROI Projetado",
      value: `${(mockPerformanceMetrics.roiProjetado * 100).toFixed(1)}% a.a.`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Análise de Performance</h2>
        <p className="text-gray-600">KPIs e métricas detalhadas de performance do portfolio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white rounded-2xl p-6 border border-gray-200">
            <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SimpleLineChart
          title="ROI ao Longo do Tempo"
          data={mockROIHistory.map((d) => ({ month: d.month, value: d.roi }))}
          yAxisLabel="%"
        />
        <SimpleLineChart
          title="Taxa de Inadimplência (Trend)"
          data={mockDefaultHistory.map((d) => ({ month: d.month, value: d.rate }))}
          yAxisLabel="%"
        />
      </div>

      <SimpleBarChart
        title="Portfolio por Status"
        data={mockStatusDistribution.map((d) => ({ label: d.status, value: d.value, color: d.color }))}
      />
    </div>
  );
}
