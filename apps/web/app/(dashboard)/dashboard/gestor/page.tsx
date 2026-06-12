"use client";

import { useEffect, useState } from "react";
import type { ManagerStats } from "@/lib/api";
import Link from "next/link";
import { ShieldCheck, FileCheck2, Building2, CreditCard, Clock, AlertTriangle } from "lucide-react";

const DEMO_STATS: ManagerStats = {
  filaAprovacoes: 7,
  filaKyc: 4,
  creditosAtivos: 18,
  obrasAtivas: 12,
};

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
    fetch('/api/proxy/manager/dashboard')
      .then((r) => {
        if (!r.ok) throw new Error('Erro ao carregar dados');
        return r.json() as Promise<ManagerStats>;
      })
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

  const isDemo = error || !stats;
  const s = stats ?? DEMO_STATS;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero gestor — roxo */}
      <div style={{ background: "linear-gradient(135deg, #3b0764 0%, #4c1d95 100%)", borderRadius: 16, padding: "1.5rem 2rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
              <ShieldCheck size={18} color="#a78bfa" />
              <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Painel do Gestor</p>
            </div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.4rem" }}>Fila de Aprovações</h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
              {s.filaAprovacoes + s.filaKyc} {s.filaAprovacoes + s.filaKyc === 1 ? "item pendente" : "itens pendentes"} de análise
            </p>
          </div>
          {isDemo && (
            <span style={{ fontSize: "0.65rem", background: "rgba(251,191,36,0.2)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "0.3rem 0.6rem", whiteSpace: "nowrap", flexShrink: 0 }}>
              Demo
            </span>
          )}
        </div>
        {(s.filaAprovacoes > 10 || s.filaKyc > 10) && (
          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
            <AlertTriangle size={14} color="#f87171" />
            <p style={{ fontSize: "0.75rem", color: "#fca5a5", margin: 0 }}>Fila crítica — mais de 10 itens aguardando aprovação</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="Etapas Pendentes"
          value={s.filaAprovacoes}
          color={s.filaAprovacoes > 10 ? "red" : s.filaAprovacoes > 5 ? "yellow" : "green"}
          href="/dashboard/gestor/etapas"
        />
        <StatCard
          label="KYC Pendentes"
          value={s.filaKyc}
          color={s.filaKyc > 10 ? "red" : s.filaKyc > 5 ? "yellow" : "green"}
          href="/dashboard/gestor/kyc"
        />
        <StatCard
          label="Créditos Ativos"
          value={s.creditosAtivos}
          color="green"
          href="/dashboard/credito"
        />
        <StatCard
          label="Obras em Execução"
          value={s.obrasAtivas}
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
              aria-label={`Revisar Etapas com ${s.filaAprovacoes} itens pendentes`}
            >
              <span className="font-medium text-xs sm:text-sm text-blue-900">Revisar Etapas</span>
              <span className="text-xs sm:text-sm bg-blue-200 text-blue-900 px-2 py-1 rounded font-semibold">
                {s.filaAprovacoes}
              </span>
            </Link>
            <Link
              href="/dashboard/gestor/kyc"
              className="flex items-center justify-between p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 min-h-12 sm:min-h-auto"
              aria-label={`Revisar KYC com ${s.filaKyc} itens pendentes`}
            >
              <span className="font-medium text-xs sm:text-sm text-purple-900">Revisar KYC</span>
              <span className="text-xs sm:text-sm bg-purple-200 text-purple-900 px-2 py-1 rounded font-semibold">
                {s.filaKyc}
              </span>
            </Link>
            <Link
              href="/dashboard/gestor/due-diligence/nova"
              className="flex items-center justify-between p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-12 sm:min-h-auto"
              aria-label="Nova Análise de Empreendimento"
            >
              <span className="font-medium text-xs sm:text-sm text-green-900">Nova Análise de Empreendimento</span>
              <span className="text-xs text-green-700 font-semibold">Due Diligence</span>
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
