"use client";



import { useEffect, useState } from "react";
import { managerApi, type ManagerStats } from "@/lib/api";
import Link from "next/link";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: "red" | "yellow" | "green"; href: string }) {
  const bgColor = color === "red" ? "bg-red-50" : color === "yellow" ? "bg-yellow-50" : "bg-green-50";
  const textColor = color === "red" ? "text-red-600" : color === "yellow" ? "text-yellow-600" : "text-green-600";
  const borderColor = color === "red" ? "border-red-100 focus:ring-red-500" : color === "yellow" ? "border-yellow-100 focus:ring-yellow-500" : "border-green-100 focus:ring-green-500";

  return (
    <Link href={href as any}>
      <div className={`${bgColor} rounded-2xl border border-gray-100 p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow min-h-32 sm:min-h-auto flex flex-col justify-center focus:outline-none focus:ring-2 ${borderColor} focus:ring-offset-2`} role="link" tabIndex={0} aria-label={`${label}: ${value} itens`}>
        <p className="text-xs sm:text-sm text-gray-600 mb-2">{label}</p>
        <p className={`text-2xl sm:text-3xl font-bold ${textColor}`}>{value}</p>
      </div>
    </Link>
  );
}

export default function GestorPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    managerApi
      .dashboard()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel do Gestor</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const effectiveStats = stats ?? { filaAprovacoes: 0, filaKyc: 0, creditosAtivos: 0, obrasAtivas: 0 };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel do Gestor</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {effectiveStats.filaAprovacoes + effectiveStats.filaKyc} itens pendentes de análise
        </p>
      </div>

      {error && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="Etapas Pendentes"
          value={effectiveStats.filaAprovacoes}
          color={effectiveStats.filaAprovacoes > 10 ? "red" : effectiveStats.filaAprovacoes > 5 ? "yellow" : "green"}
          href="/dashboard/gestor/etapas"
        />
        <StatCard
          label="KYC Pendentes"
          value={effectiveStats.filaKyc}
          color={effectiveStats.filaKyc > 10 ? "red" : effectiveStats.filaKyc > 5 ? "yellow" : "green"}
          href="/dashboard/gestor/kyc"
        />
        <StatCard
          label="Créditos Ativos"
          value={effectiveStats.creditosAtivos}
          color="green"
          href="/dashboard/credito"
        />
        <StatCard
          label="Obras em Execução"
          value={effectiveStats.obrasAtivas}
          color="green"
          href="/dashboard/obras"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/gestor/etapas"
              className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-12 sm:min-h-auto"
              aria-label={`Revisar Etapas com ${effectiveStats.filaAprovacoes} itens pendentes`}
            >
              <span className="font-medium text-xs sm:text-sm text-blue-900">Revisar Etapas</span>
              <span className="text-xs sm:text-sm bg-blue-200 text-blue-900 px-2 py-1 rounded font-semibold">
                {effectiveStats.filaAprovacoes}
              </span>
            </Link>
            <Link
              href="/dashboard/gestor/kyc"
              className="flex items-center justify-between p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 min-h-12 sm:min-h-auto"
              aria-label={`Revisar KYC com ${effectiveStats.filaKyc} itens pendentes`}
            >
              <span className="font-medium text-xs sm:text-sm text-purple-900">Revisar KYC</span>
              <span className="text-xs sm:text-sm bg-purple-200 text-purple-900 px-2 py-1 rounded font-semibold">
                {effectiveStats.filaKyc}
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="font-bold text-sm sm:text-base text-gray-900 mb-4">Dicas</h2>
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
            <p>• Priorize itens na fila vermelha ({`>`} 24h)</p>
            <p>• Revise com atenção às geolocalização</p>
            <p>• Documente motivos de rejeição</p>
            <p>• Valide completude de KYC antes de aprovar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
