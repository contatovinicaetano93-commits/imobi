"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  AlertTriangle,
  Building2,
  FileCheck2,
  Clock,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Wallet,
  Activity,
} from "lucide-react";
import {
  managerApi,
  type EtapaPendente,
  type KycPendente,
  type ManagerDreOperacional,
  type ManagerStats,
} from "@/lib/api";
import { fetchManagerDashboard } from "@/lib/fetch-manager-dashboard";
import { formatarBRL } from "@imbobi/core";

const ZERO_DRE: ManagerDreOperacional = {
  carteiraAprovada: 0,
  capitalDesembolsado: 0,
  saldoADesembolsar: 0,
  capitalEmPipe: 0,
  valorPipeVistoria: 0,
  valorAguardandoPagamento: 0,
  taxaUtilizacaoPct: 0,
  inadimplenciaPct: 0,
  pipePctCarteira: 0,
  creditosQuitados: 0,
  creditosVencidos: 0,
  creditosSuspensos: 0,
  saude: "saudavel",
  linhas: [],
};

const ZERO_STATS: ManagerStats = {
  filaAprovacoes: 0,
  filaKyc: 0,
  creditosAtivos: 0,
  obrasAtivas: 0,
  dre: ZERO_DRE,
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

  const className = `group block rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${tones[tone]}`;
  const footer = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueTone[tone]}`}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-gray-500">{hint}</p> : null}
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 opacity-0 transition group-hover:opacity-100">
        Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </>
  );

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {footer}
      </a>
    );
  }

  return (
    <div className={className}>
      {footer}
    </div>
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

function dreSaudeLabel(saude: ManagerDreOperacional["saude"]) {
  if (saude === "critico") return "Crítico";
  if (saude === "atencao") return "Atenção";
  return "Saudável";
}

function dreSaudeStyles(saude: ManagerDreOperacional["saude"]) {
  if (saude === "critico") {
    return {
      badge: "bg-red-100 text-red-800 border-red-200",
      ring: "border-red-100 bg-red-50/40",
    };
  }
  if (saude === "atencao") {
    return {
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      ring: "border-amber-100 bg-amber-50/40",
    };
  }
  return {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ring: "border-emerald-100 bg-emerald-50/40",
  };
}

function pctTone(pct: number, warnAt: number, criticalAt: number): "ok" | "warn" | "critical" {
  if (pct >= criticalAt) return "critical";
  if (pct >= warnAt) return "warn";
  return "ok";
}

function linhaTipoLabel(tipo: ManagerDreOperacional["linhas"][number]["tipo"]) {
  if (tipo === "entrada") return "Comprometido";
  if (tipo === "realizado") return "Realizado";
  if (tipo === "disponivel") return "Disponível";
  return "Pendente";
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
      managerApi.listarEtapasPendentes(15, 0, { status: "pendente" }).catch(() => ({ etapas: [], total: 0 })),
      managerApi.listarKycPendentes(15, 0).catch(() => ({ documentos: [], total: 0 })),
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
  const dre = s.dre ?? ZERO_DRE;
  const dreStyles = dreSaudeStyles(dre.saude);
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
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Operação do fundo</h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            DRE operacional, KPIs e amostras do pipe — tudo nesta tela. Somente leitura.
          </p>
          {!loading ? (
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${dreStyles.badge}`}
            >
              <Activity className="h-3.5 w-3.5" />
              Saúde da operação: {dreSaudeLabel(dre.saude)}
            </span>
          ) : null}
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

      <section aria-label="DRE operacional" className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${dreStyles.ring}`}>
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">DRE operacional</h2>
            <p className="text-xs text-gray-500">Visão financeira agregada da carteira e do capital em circulação</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Carteira aprovada</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">{formatarBRL(dre.carteiraAprovada)}</p>
            <p className="mt-1 text-xs text-gray-500">Comprometido com tomadores ativos</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Capital desembolsado</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">
              {formatarBRL(dre.capitalDesembolsado)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Utilização {dre.taxaUtilizacaoPct.toFixed(1)}% da carteira
            </p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Saldo a desembolsar</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-violet-700">
              {formatarBRL(dre.saldoADesembolsar)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Aprovado, ainda não liberado</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Capital em pipe</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700">{formatarBRL(dre.capitalEmPipe)}</p>
            <p className="mt-1 text-xs text-gray-500">{dre.pipePctCarteira.toFixed(1)}% da carteira</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium text-gray-500">Taxa de utilização</p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                pctTone(dre.taxaUtilizacaoPct, 60, 85) === "ok"
                  ? "text-emerald-700"
                  : pctTone(dre.taxaUtilizacaoPct, 60, 85) === "warn"
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              {dre.taxaUtilizacaoPct.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium text-gray-500">Inadimplência (vencidos)</p>
            <p
              className={`mt-1 text-xl font-bold tabular-nums ${
                pctTone(dre.inadimplenciaPct, 2, 5) === "ok"
                  ? "text-emerald-700"
                  : pctTone(dre.inadimplenciaPct, 2, 5) === "warn"
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              {dre.inadimplenciaPct.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {dre.creditosVencidos} crédito(s) vencido(s) · {dre.creditosSuspensos} suspenso(s)
            </p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/90 p-4">
            <p className="text-xs font-medium text-gray-500">Créditos quitados</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">{dre.creditosQuitados}</p>
            <p className="mt-1 text-xs text-gray-500">Operações encerradas com sucesso</p>
          </div>
        </div>

        {dre.linhas.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-white/80 bg-white/90">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <Wallet className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-gray-900">Demonstrativo simplificado</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2 font-medium">Linha</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {dre.linhas.map((linha) => (
                  <tr key={linha.label} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{linha.label}</td>
                    <td className="px-4 py-3 text-gray-500">{linhaTipoLabel(linha.tipo)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatarBRL(linha.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {dre.saude !== "saudavel" ? (
          <div
            className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${
              dre.saude === "critico"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm">
              {dre.saude === "critico"
                ? "Indicadores fora da faixa saudável — revisar inadimplência e volume em pipe com o time IMOBI."
                : "Operação em atenção — acompanhar evolução de pipe e créditos suspensos."}
            </p>
          </div>
        ) : null}
      </section>

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
            href="#secao-etapas"
            tone="ok"
          />
          <KpiCard
            label="Obras em execução"
            value={s.obrasAtivas}
            hint="Empreendimentos com obra ativa"
            href="#secao-etapas"
            tone="ok"
          />
          <KpiCard
            label="KYC na fila"
            value={s.filaKyc}
            hint="Documentos aguardando análise interna"
            href="#secao-kyc"
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
            href="#secao-etapas"
            tone={pipeTone(s.filaAprovacoes)}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section
          id="secao-etapas"
          className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-600" />
            <h2 className="font-semibold text-gray-900">Etapas recentes no pipe</h2>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : etapas.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhuma etapa pendente no momento.</p>
          ) : (
            <ul className="space-y-2">
              {etapas.map((e) => (
                <li key={e.etapaId}>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3">
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="secao-kyc"
          className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-violet-600" />
            <h2 className="font-semibold text-gray-900">KYC recente na fila</h2>
          </div>
          {loading ? (
            <ListSkeleton />
          ) : kyc.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhum documento KYC pendente.</p>
          ) : (
            <ul className="space-y-2">
              {kyc.map((doc) => (
                <li key={doc.kycDocumentoId}>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{doc.usuario.nome}</p>
                      <p className="truncate text-xs text-gray-500">
                        {doc.tipo} · {doc.usuario.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Pendente
                    </span>
                  </div>
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
