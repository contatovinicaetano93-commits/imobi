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

  return (
    <Link href={href}>
      <div className={`${bgColor} rounded-2xl border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow`}>
        <p className="text-sm text-gray-600 mb-2">{label}</p>
        <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
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
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Painel do Gestor</h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Painel do Gestor</h1>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error || "Erro ao carregar dados"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel do Gestor</h1>
        <p className="text-gray-500 text-sm mt-1">
          {stats.filaAprovacoes + stats.filaKyc} itens pendentes de análise
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Etapas Pendentes"
          value={stats.filaAprovacoes}
          color={stats.filaAprovacoes > 10 ? "red" : stats.filaAprovacoes > 5 ? "yellow" : "green"}
          href="/dashboard/gestor/etapas"
        />
        <StatCard
          label="KYC Pendentes"
          value={stats.filaKyc}
          color={stats.filaKyc > 10 ? "red" : stats.filaKyc > 5 ? "yellow" : "green"}
          href="/dashboard/gestor/kyc"
        />
        <StatCard
          label="Créditos Ativos"
          value={stats.creditosAtivos}
          color="green"
          href="/dashboard/credito"
        />
        <StatCard
          label="Obras em Execução"
          value={stats.obrasAtivas}
          color="green"
          href="/dashboard/obras"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/gestor/etapas"
              className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <span className="font-medium text-blue-900">Revisar Etapas</span>
              <span className="text-sm bg-blue-200 text-blue-900 px-2 py-1 rounded">
                {stats.filaAprovacoes}
              </span>
            </Link>
            <Link
              href="/dashboard/gestor/kyc"
              className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              <span className="font-medium text-purple-900">Revisar KYC</span>
              <span className="text-sm bg-purple-200 text-purple-900 px-2 py-1 rounded">
                {stats.filaKyc}
              </span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Dicas</h2>
          <div className="space-y-2 text-sm text-gray-600">
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
