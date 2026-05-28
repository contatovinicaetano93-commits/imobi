"use client";

import { useEffect, useState } from "react";
import type { AnalyticsOverview } from "@imbobi/schemas";

interface OverviewMetrics {
  totalSignups: number;
  totalLogins: number;
  kycUploadRate: number;
  kycApprovalRate: number;
  creditRequestRate: number;
  creditApprovalRate: number;
  paymentsProcessed: number;
  totalCreditOriginationValue: number;
  totalCreditReleasedValue: number;
  stagesCompleted: number;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v1/analytics/overview");
        if (!response.ok) throw new Error("Failed to fetch analytics data");
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
        <div className="text-lg text-gray-600">Carregando analytics...</div>
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

  const kpis = [
    {
      label: "Total Signups",
      value: data.totalSignups,
      suffix: "",
    },
    {
      label: "Taxa de KYC Upload",
      value: data.kycUploadRate.toFixed(1),
      suffix: "%",
    },
    {
      label: "Taxa de KYC Aprovação",
      value: data.kycApprovalRate.toFixed(1),
      suffix: "%",
    },
    {
      label: "Taxa de Solicitação de Crédito",
      value: data.creditRequestRate.toFixed(1),
      suffix: "%",
    },
    {
      label: "Taxa de Aprovação de Crédito",
      value: data.creditApprovalRate.toFixed(1),
      suffix: "%",
    },
    {
      label: "Pagamentos Processados",
      value: data.paymentsProcessed,
      suffix: "",
    },
    {
      label: "Total de Crédito Originado",
      value: `R$ ${(data.totalCreditOriginationValue / 1000).toFixed(1)}k`,
      suffix: "",
    },
    {
      label: "Total de Crédito Liberado",
      value: `R$ ${(data.totalCreditReleasedValue / 1000).toFixed(1)}k`,
      suffix: "",
    },
    {
      label: "Etapas Completas",
      value: data.stagesCompleted,
      suffix: "",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Overview de Analytics</h1>
        <p className="text-gray-600 mt-2">KPIs principais (últimos 90 dias)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
            <div className="mt-2 flex items-baseline">
              <span className="text-3xl font-bold text-brand-700">{kpi.value}</span>
              {kpi.suffix && <span className="ml-2 text-lg text-gray-600">{kpi.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Análise de Funnel</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Signups → KYC Upload</span>
              <span className="text-sm font-medium text-gray-600">{data.kycUploadRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-700 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(data.kycUploadRate, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">KYC Upload → KYC Aprovado</span>
              <span className="text-sm font-medium text-gray-600">{data.kycApprovalRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-700 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(data.kycApprovalRate, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">KYC Aprovado → Crédito Solicitado</span>
              <span className="text-sm font-medium text-gray-600">{data.creditRequestRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-700 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(data.creditRequestRate, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Crédito Solicitado → Crédito Aprovado</span>
              <span className="text-sm font-medium text-gray-600">{data.creditApprovalRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-700 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(data.creditApprovalRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
