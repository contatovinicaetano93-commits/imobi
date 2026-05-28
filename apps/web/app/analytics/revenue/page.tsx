"use client";

import { useEffect, useState } from "react";

interface RevenueMetrics {
  totalOriginationValue: number;
  totalReleasedValue: number;
  avgLoanSize: number;
  totalInterestGenerated: number;
  disbursementRate: number;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v1/analytics/revenue");
        if (!response.ok) throw new Error("Failed to fetch revenue data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Carregando revenue metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">Erro: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Sem dados disponíveis</div>
      </div>
    );
  }

  const metrics = [
    {
      label: "Total de Crédito Originado",
      value: `R$ ${(data.totalOriginationValue / 1000).toFixed(1)}k`,
      description: "Valor total de crédito aprovado",
    },
    {
      label: "Total de Crédito Liberado",
      value: `R$ ${(data.totalReleasedValue / 1000).toFixed(1)}k`,
      description: "Valor total de crédito desembolsado",
    },
    {
      label: "Tamanho Médio do Empréstimo",
      value: `R$ ${(data.avgLoanSize / 1000).toFixed(1)}k`,
      description: "Valor médio por empréstimo",
    },
    {
      label: "Total de Juros Gerados",
      value: `R$ ${(data.totalInterestGenerated / 1000).toFixed(1)}k`,
      description: "Receita total de juros",
    },
    {
      label: "Taxa de Desembolso",
      value: `${data.disbursementRate.toFixed(1)}%`,
      description: "Percentual de crédito liberado vs originado",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Métricas de Receita</h1>
        <p className="text-gray-600 mt-2">Análise de origination e desembolso (últimos 90 dias)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <p className="text-sm font-medium text-gray-600">{metric.label}</p>
            <p className="text-3xl font-bold text-brand-700 mt-3">{metric.value}</p>
            <p className="text-sm text-gray-600 mt-2">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Análise de Fluxo de Crédito</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-gray-700">Crédito Originado</span>
                <span className="text-sm font-medium text-gray-600">
                  R$ {(data.totalOriginationValue / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm font-medium text-gray-700">Crédito Liberado</span>
                <span className="text-sm font-medium text-gray-600">
                  R$ {(data.totalReleasedValue / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{
                    width: `${Math.min((data.totalReleasedValue / data.totalOriginationValue) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">Taxa de desembolso: {data.disbursementRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo Financeiro</h2>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-700">Origination</span>
              <span className="font-semibold text-gray-900">R$ {(data.totalOriginationValue / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-700">Desembolso</span>
              <span className="font-semibold text-gray-900">R$ {(data.totalReleasedValue / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-700">Juros Gerados</span>
              <span className="font-semibold text-green-700">R$ {(data.totalInterestGenerated / 1000).toFixed(1)}k</span>
            </div>
            <div className="flex justify-between py-3 text-lg">
              <span className="font-semibold text-gray-900">Receita Total</span>
              <span className="font-bold text-brand-700">
                R$ {((data.totalInterestGenerated + data.totalReleasedValue) / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
