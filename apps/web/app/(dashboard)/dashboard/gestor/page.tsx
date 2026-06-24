"use client";

import { useEffect, useState } from "react";
import type { ManagerStats, Jornada } from "@/lib/api";
import { obterJornadaResiliente, mensagemErroJornada } from "@/lib/jornada-fetch";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Zap, Lightbulb } from "lucide-react";
import { fetchManagerDashboard } from "@/lib/fetch-manager-dashboard";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { PanelToolbar } from "@/components/dashboard/PanelToolbar";
import { NextStepHero } from "@/components/dashboard/NextStepHero";
import { JornadaError } from "@/components/dashboard/JornadaError";
import { GuidedFlowShell } from "@/components/dashboard/GuidedFlowShell";
import { BETA_MVP_MODE } from "@/lib/beta-mvp";

const GESTOR_PANELS = [
  { id: "acoes-rapidas", priority: "primary" as const },
  { id: "dicas", priority: "secondary" as const },
];

const ZERO_STATS: ManagerStats = {
  filaAprovacoes: 0,
  filaKyc: 0,
  creditosAtivos: 0,
  obrasAtivas: 0,
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

function StatSkeleton() {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 sm:p-6 animate-pulse min-h-32">
      <div className="h-3 bg-gray-200 rounded w-2/5 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

export default function GestorPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jornadaErro, setJornadaErro] = useState<string | null>(null);

  const loadStats = () => {
    setLoading(true);
    setError(null);
    fetchManagerDashboard()
      .then(setStats)
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Erro ao carregar dados do painel';
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (BETA_MVP_MODE) {
      setLoading(true);
      setJornadaErro(null);
      obterJornadaResiliente()
        .then(setJornada)
        .catch((err) => {
          setJornada(null);
          setJornadaErro(mensagemErroJornada(err));
        })
        .finally(() => setLoading(false));
      return;
    }
    loadStats();
  }, []);

  const s = stats ?? ZERO_STATS;

  if (BETA_MVP_MODE) {
    if (loading) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <p className="text-sm text-gray-500">Carregando seu próximo passo…</p>
        </div>
      );
    }
    if (!jornada) {
      return (
        <div className="flex min-h-[70vh] items-start justify-center p-4 pt-8 sm:p-6">
          <JornadaError message={jornadaErro ?? undefined} />
        </div>
      );
    }
    if (jornada) {
      return (
        <GuidedFlowShell variant="gestor" hideStepRail>
          <NextStepHero jornada={jornada} variant="gestor" />
        </GuidedFlowShell>
      );
    }
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-violet-900 mb-1">Carregando painel do Gestor do Fundo…</p>
          <p className="text-xs text-violet-700">
            Se demorar, a API no Render está acordando (plano gratuito). Pode levar até 2 minutos na primeira visita.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-red-700 font-medium">{error}</p>
          <button
            type="button"
            onClick={loadStats}
            className="text-sm font-semibold text-red-700 underline shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {/* Hero gestor — roxo */}
      <div style={{ background: "linear-gradient(135deg, #3b0764 0%, #4c1d95 100%)", borderRadius: 16, padding: "1.5rem 2rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
              <ShieldCheck size={18} color="#a78bfa" />
              <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Gestor do Fundo</p>
            </div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 0.4rem" }}>Painel de Operações</h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
              {s.filaAprovacoes + s.filaKyc} {s.filaAprovacoes + s.filaKyc === 1 ? "item pendente" : "itens pendentes"} de análise
            </p>
          </div>
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

      <PanelToolbar sections={GESTOR_PANELS} />

      <div className="space-y-4">
        <PanelSection
          id="acoes-rapidas"
          title="Ações Rápidas"
          icon={<Zap className="w-4 h-4 text-violet-600" />}
          priority="primary"
          badge={s.filaAprovacoes + s.filaKyc}
          summary={`${s.filaAprovacoes + s.filaKyc} itens na fila`}
          urgency={s.filaAprovacoes > 10 || s.filaKyc > 10 ? "critical" : s.filaAprovacoes + s.filaKyc > 0 ? "warning" : "none"}
        >
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
        </PanelSection>

        <PanelSection
          id="dicas"
          title="Dicas"
          icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
          priority="secondary"
          summary="Boas práticas de revisão"
        >
          <div className="space-y-2 text-xs sm:text-sm text-gray-600">
            <p>• Priorize itens na fila vermelha ({`>`} 24h)</p>
            <p>• Revise com atenção à geolocalização</p>
            <p>• Documente motivos de rejeição</p>
            <p>• Valide completude de KYC antes de aprovar</p>
          </div>
        </PanelSection>
      </div>
    </div>
  );
}
