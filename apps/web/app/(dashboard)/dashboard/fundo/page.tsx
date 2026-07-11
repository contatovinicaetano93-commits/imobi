"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, Wallet, TrendingUp } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import { managerCanonicoApi, type ManagerDashboardCanonico } from "@/lib/api";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

const ZERO: ManagerDashboardCanonico = {
  obrasPorEtapa: {},
  tranchesPorStatus: {},
  dre: { capitalContratado: 0, capitalLiberado: 0, capitalPendente: 0 },
};

export default function FundoDashboardPage() {
  const [data, setData] = useState<ManagerDashboardCanonico>(ZERO);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    managerCanonicoApi.dashboard()
      .then(setData)
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro ao carregar dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  const dre = data.dre;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0C1A3D]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Dashboard do fundo
        </h1>
        <p className="mt-1 text-sm text-gray-500">Visão read-only da carteira e saúde operacional.</p>
      </div>

      {erro && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Wallet} label="Capital contratado" value={formatarBRL(Number(dre.capitalContratado))} />
        <KpiCard icon={TrendingUp} label="Capital liberado" value={formatarBRL(Number(dre.capitalLiberado))} />
        <KpiCard icon={BarChart3} label="Pendente liberação" value={formatarBRL(Number(dre.capitalPendente))} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Panel title="Obras por etapa" icon={Building2}>
          {Object.entries(data.obrasPorEtapa).length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma obra na carteira.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(data.obrasPorEtapa).map(([etapa, count]) => (
                <li key={etapa} className="flex justify-between text-sm">
                  <span className="text-gray-600">{etapa.replace(/_/g, " ")}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Tranches por status" icon={BarChart3}>
          {Object.entries(data.tranchesPorStatus).length === 0 ? (
            <p className="text-sm text-gray-400">Sem tranches registradas.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(data.tranchesPorStatus).map(([status, count]) => (
                <li key={status} className="flex justify-between text-sm">
                  <span className="text-gray-600">{status.replace(/_/g, " ")}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <Icon size={18} className="mb-3 text-[#7c3aed]" />
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0C1A3D]">{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={16} className="text-[#1B4FD8]" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}
