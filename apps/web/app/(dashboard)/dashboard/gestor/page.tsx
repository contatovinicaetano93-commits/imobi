"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  AlertTriangle,
  Building2,
  FileCheck2,
  Clock,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  managerApi,
  type EtapaPendente,
  type KycPendente,
  type ManagerStats,
} from "@/lib/api";
import { fetchManagerDashboard } from "@/lib/fetch-manager-dashboard";
import { formatarBRL } from "@imbobi/core";

const ZERO_STATS: ManagerStats = {
  filaAprovacoes: 0,
  filaKyc: 0,
  creditosAtivos: 0,
  obrasAtivas: 0,
};

function KpiCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href: string;
  tone: "neutral" | "warn" | "critical" | "ok";
}) {
  const tones = {
    neutral: "border-gray-100 bg-white",
    warn: "border-amber-100 bg-amber-50/60",
    critical: "border-red-100 bg-red-50/60",
    ok: "border-emerald-100 bg-emerald-50/60",
  };
  const valueTone = {
    neutral: "text-gray-900",
    warn: "text-amber-700",
    critical: "text-red-700",
    ok: "text-emerald-700",
  };

  return (
    <Link
      href={href as "/dashboard/gestor"}
      className={`group block rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${tones[tone]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueTone[tone]}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-gray-500">{hint}</p> : null}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 opacity-0 transition group-hover:opacity-100">
        Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

function pipeTone(count: number): "ok" | "warn" | "critical" {
  if (count > 10) return "critical";
  if (count > 5) return "warn";
  return "ok";
}

export default function GestorPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [etapas, setEtapas] = useState<EtapaPendente[]>([]);
  const [kyc, setKyc] = useState<KycPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchManagerDashboard(),
      managerApi.listarEtapasPendentes(5, 0, { status: "pendente" }).catch(() => ({ etapas: [], total: 0 })),
      managerApi.listarKycPendentes(5, 0).catch(() => ({ documentos: [], total: 0 })),
    ])
      .then(([dashboard, etapasRes, kycRes]) => {
        setStats(dashboard);
        setEtapas(etapasRes.etapas ?? []);
        setKyc(kycRes.documentos ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar indicadores");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const s = stats ?? ZERO_STATS;
  const filaTotal = s.filaAprovacoes + s.filaKyc;
  const valorPipe = etapas.reduce((acc, e) => acc + Number(e.valorLiberacao ?? 0), 0);

  if (loading && !stats) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
        <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 pb-12 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Gestor do fundo</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Operação em tempo real</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Números agregados da operação IMOBI — créditos, obras e filas internas. Somente leitura.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </header>

      {error ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button type="button" onClick={load} className="text-sm font-semibold text-red-700 underline">
            Tentar novamente
          </button>
        </div>
      ) : null}

      {filaTotal > 10 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-800">
            Pipe elevado — {filaTotal} itens aguardando processamento interno (KYC + etapas).
          </p>
        </div>
      ) : null}

      <section aria-label="Indicadores principais">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">KPIs da operação</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Créditos ativos"
            value={s.creditosAtivos}
            hint="Operações financiadas em andamento"
            href="/dashboard/gestor/etapas"
            tone="ok"
          />
          <KpiCard
            label="Obras em execução"
            value={s.obrasAtivas}
            hint="Empreendimentos com obra ativa"
            href="/dashboard/gestor/etapas"
            tone="ok"
          />
          <KpiCard
            label="KYC na fila"
            value={s.filaKyc}
            hint="Documentos aguardando análise interna"
            href="/dashboard/gestor/kyc"
            tone={pipeTone(s.filaKyc)}
          />
          <KpiCard
            label="Etapas no pipe"
            value={s.filaAprovacoes}
            hint={
              valorPipe > 0
                ? `${formatarBRL(valorPipe)} aguardando vistoria/liberação`
                : "Etapas aguardando vistoria"
            }
            href="/dashboard/gestor/etapas"
            tone={pipeTone(s.filaAprovacoes)}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-600" />
              <h2 className="font-semibold text-gray-900">Etapas recentes no pipe</h2>
            </div>
            <Link
              href="/dashboard/gestor/etapas"
              className="text-xs font-semibold text-violet-700 hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : etapas.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhuma etapa pendente no momento.</p>
          ) : (
            <ul className="space-y-2">
              {etapas.map((e) => (
                <li key={e.etapaId}>
                  <Link
                    href={`/dashboard/gestor/etapas/${e.etapaId}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{e.obra.nome}</p>
                      <p className="truncate text-xs text-gray-500">
                        {e.nome} · {formatarBRL(Number(e.valorLiberacao ?? 0))}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-700">
                      <Clock className="h-3.5 w-3.5" />
                      Pipe
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-violet-600" />
              <h2 className="font-semibold text-gray-900">KYC recente na fila</h2>
            </div>
            <Link href="/dashboard/gestor/kyc" className="text-xs font-semibold text-violet-700 hover:underline">
              Ver todos
            </Link>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : kyc.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhum documento KYC pendente.</p>
          ) : (
            <ul className="space-y-2">
              {kyc.map((doc) => (
                <li key={doc.kycDocumentoId}>
                  <Link
                    href={`/dashboard/gestor/kyc/${doc.kycDocumentoId}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{doc.usuario.nome}</p>
                      <p className="truncate text-xs text-gray-500">
                        {doc.tipo} · {doc.usuario.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Pendente
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-gray-400">
        Aprovações, comitê e pagamentos são internos ao IMOBI — este painel é apenas informativo.
      </p>
    </div>
  );
}
