"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Banknote,
  Building2,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  adminApi,
  safeArr,
  safeNum,
  type AdminMetricas,
  type AdminOverview,
} from "@/lib/api";
import { MetricCard } from "./_components/MetricCard";
import { CreditoLiberadoChart } from "./_components/CreditoLiberadoChart";
import { ObrasStatusChart } from "./_components/ObrasStatusChart";

function brl(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

const EMPTY_OVERVIEW: AdminOverview = {
  totalUsuarios: 0,
  obrasAtivas: 0,
  obrasTotal: 0,
  creditoAprovado: 0,
  creditoLiberado: 0,
  kycPendentes: 0,
  etapasPendentes: 0,
  visitasAgendadas: 0,
  filaLiberacao: 0,
};

const EMPTY_METRICAS: AdminMetricas = {
  creditoLiberadoPorMes: [],
  obrasPorStatus: [],
  taxaAprovacaoEtapas: 0,
  kycPendentes: 0,
  etapasAprovadas: 0,
  etapasRejeitadas: 0,
};

export default function RelatoriosPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [metricas, setMetricas] = useState<AdminMetricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.overview().catch(() => EMPTY_OVERVIEW),
      adminApi.metricas().catch(() => EMPTY_METRICAS),
    ])
      .then(([ov, met]) => {
        setOverview({
          ...EMPTY_OVERVIEW,
          ...ov,
          creditoAprovado: safeNum(ov.creditoAprovado),
          creditoLiberado: safeNum(ov.creditoLiberado),
        });
        setMetricas({
          ...EMPTY_METRICAS,
          ...met,
          taxaAprovacaoEtapas: safeNum(met.taxaAprovacaoEtapas),
          kycPendentes: safeNum(met.kycPendentes),
          etapasAprovadas: safeNum(met.etapasAprovadas),
          etapasRejeitadas: safeNum(met.etapasRejeitadas),
          creditoLiberadoPorMes: safeArr(met.creditoLiberadoPorMes),
          obrasPorStatus: safeArr(met.obrasPorStatus),
        });
      })
      .catch(() => setError("Não foi possível carregar os relatórios."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-3 inline-flex items-center gap-2 text-xs text-red-600 underline"
          >
            <RefreshCw size={12} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const ov = overview ?? EMPTY_OVERVIEW;
  const met = metricas ?? EMPTY_METRICAS;
  const kycPendentes = met.kycPendentes || ov.kycPendentes;
  const taxaAprovacao = met.taxaAprovacaoEtapas;
  const totalMesAtual =
    met.creditoLiberadoPorMes[met.creditoLiberadoPorMes.length - 1]?.valor ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div
        style={{
          background: "linear-gradient(135deg, #3b0764 0%, #4c1d95 100%)",
          borderRadius: 16,
          padding: "1.25rem 1.5rem",
          color: "white",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={18} color="#a78bfa" />
              <p className="text-xs uppercase tracking-widest text-white/50 m-0">
                Painel de Relatórios
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold m-0">Visão operacional do fundo</h1>
            <p className="text-sm text-white/65 mt-1 mb-0">
              Crédito, obras, KYC e aprovação de etapas em tempo real
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
            aria-label="Atualizar relatórios"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
        {(kycPendentes > 10 || ov.etapasPendentes > 10) && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="text-red-300 shrink-0" />
            <p className="text-xs text-red-100 m-0">
              Fila elevada — {kycPendentes} KYC e {ov.etapasPendentes} etapas aguardando ação
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Crédito liberado (total)"
          value={brl(ov.creditoLiberado)}
          sub={totalMesAtual > 0 ? `${brl(totalMesAtual)} no último mês` : "Sem liberações recentes"}
          accent="green"
          icon={<Banknote size={16} />}
        />
        <MetricCard
          label="KYC pendentes"
          value={String(kycPendentes)}
          sub={kycPendentes > 0 ? "Aguardando revisão" : "Fila zerada"}
          accent={kycPendentes > 10 ? "red" : kycPendentes > 0 ? "amber" : "green"}
          icon={<ShieldCheck size={16} />}
        />
        <MetricCard
          label="Taxa de aprovação de etapas"
          value={pct(taxaAprovacao)}
          sub={`${met.etapasAprovadas} aprovadas · ${met.etapasRejeitadas} reprovadas`}
          accent={taxaAprovacao >= 80 ? "green" : taxaAprovacao >= 60 ? "amber" : "red"}
          icon={<FileCheck2 size={16} />}
        />
        <MetricCard
          label="Obras em execução"
          value={String(ov.obrasAtivas)}
          sub={`${ov.obrasTotal} obras no total`}
          accent="blue"
          icon={<Building2 size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 text-sm sm:text-base mb-1">
            Volume de crédito liberado por mês
          </h2>
          <p className="text-xs text-gray-400 mb-4">Últimos 12 meses — parcelas concluídas</p>
          <CreditoLiberadoChart data={met.creditoLiberadoPorMes} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 text-sm sm:text-base mb-1">Obras por status</h2>
          <p className="text-xs text-gray-400 mb-4">Distribuição da carteira de obras</p>
          <ObrasStatusChart data={met.obrasPorStatus} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
        <h2 className="font-bold text-gray-900 text-sm sm:text-base mb-4">Resumo da operação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center sm:text-left">
          {[
            { label: "Crédito aprovado", value: brl(ov.creditoAprovado) },
            { label: "Etapas pendentes", value: String(ov.etapasPendentes) },
            { label: "Fila liberação", value: String(ov.filaLiberacao) },
            { label: "Visitas agendadas", value: String(ov.visitasAgendadas) },
            { label: "Usuários ativos", value: String(ov.totalUsuarios) },
            {
              label: "Liberação vs aprovado",
              value:
                ov.creditoAprovado > 0
                  ? pct((ov.creditoLiberado / ov.creditoAprovado) * 100)
                  : "—",
            },
          ].map((item) => (
            <div key={item.label} className="px-2">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/admin/kyc"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-800 text-sm font-semibold rounded-lg hover:bg-purple-100 transition-colors"
        >
          <ShieldCheck size={14} />
          Revisar KYC ({kycPendentes})
        </Link>
        <Link
          href="/dashboard/admin/vistorias"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-800 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors"
        >
          <FileCheck2 size={14} />
          Monitorar vistorias ({ov.etapasPendentes})
        </Link>
        <Link
          href="/dashboard/obras"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Building2 size={14} />
          Ver obras
        </Link>
      </div>
    </div>
  );
}
