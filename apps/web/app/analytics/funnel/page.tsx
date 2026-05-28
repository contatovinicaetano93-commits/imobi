"use client";

import { useEffect, useState } from "react";

interface FunnelMetrics {
  signup: number;
  kycUpload: number;
  kycApproved: number;
  creditRequested: number;
  creditApproved: number;
  paymentProcessed: number;
}

export default function FunnelPage() {
  const [data, setData] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v1/analytics/funnel");
        if (!response.ok) throw new Error("Failed to fetch funnel data");
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
        <div className="text-lg text-gray-600">Carregando funnel analytics...</div>
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

  const stages = [
    { label: "Signup", value: data.signup, color: "bg-blue-500" },
    { label: "KYC Upload", value: data.kycUpload, color: "bg-blue-600" },
    { label: "KYC Aprovado", value: data.kycApproved, color: "bg-blue-700" },
    { label: "Crédito Solicitado", value: data.creditRequested, color: "bg-green-600" },
    { label: "Crédito Aprovado", value: data.creditApproved, color: "bg-green-700" },
    { label: "Pagamento Processado", value: data.paymentProcessed, color: "bg-emerald-700" },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Funnel de Conversão</h1>
        <p className="text-gray-600 mt-2">Progressão de usuários através do pipeline</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 border border-gray-200 space-y-6">
        {stages.map((stage, index) => {
          const percentage = (stage.value / maxValue) * 100;
          const prevValue = index === 0 ? stage.value : stages[index - 1].value;
          const conversionRate = ((stage.value / prevValue) * 100).toFixed(1);

          return (
            <div key={stage.label} className="space-y-2">
              <div className="flex justify-between items-baseline">
                <h3 className="text-lg font-semibold text-gray-900">{stage.label}</h3>
                <div className="flex gap-4">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{stage.value}</span>
                    <span className="text-sm text-gray-600 ml-2">usuários</span>
                  </div>
                  {index > 0 && (
                    <div>
                      <span className="text-lg font-semibold text-blue-600">{conversionRate}%</span>
                      <span className="text-sm text-gray-600 ml-1">conversão</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-12 overflow-hidden">
                <div
                  className={`${stage.color} h-full transition-all flex items-center px-4 text-white font-semibold`}
                  style={{ width: `${percentage}%` }}
                >
                  {percentage > 10 && `${percentage.toFixed(0)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Taxa de Conversão Geral</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-700">Signup → Pagamento</span>
            <span className="font-bold text-brand-700">
              {data.paymentProcessed > 0 ? ((data.paymentProcessed / data.signup) * 100).toFixed(2) : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Signup → Crédito Aprovado</span>
            <span className="font-bold text-brand-700">
              {data.creditApproved > 0 ? ((data.creditApproved / data.signup) * 100).toFixed(2) : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Crédito Solicitado → Crédito Aprovado</span>
            <span className="font-bold text-brand-700">
              {data.creditRequested > 0 ? ((data.creditApproved / data.creditRequested) * 100).toFixed(2) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
