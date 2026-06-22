"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Users, Building2, ShieldCheck, Settings,
  Copy, Eye, EyeOff, AlertTriangle, FileCheck2,
  Activity, TrendingUp, TrendingDown, BarChart3, AlertCircle,
  Clock, Zap, ArrowRight, Target, Banknote, ChevronRight,
} from "lucide-react";
import { formatarBRL } from "@imbobi/core";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

const j: CSSProperties = { fontFamily: "'Jost', sans-serif" };
const bc: CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };
const card: CSSProperties = { background: "white", border: "1px solid rgba(12,26,61,0.08)", borderRadius: 16, overflow: "hidden" };

// ─── Demo Data ────────────────────────────────────────────────────────────────

const PANEL_HREF: Record<string, string> = {
  ADMIN:      "/dashboard/admin",
  GESTOR:     "/dashboard/gestor",
  ENGENHEIRO: "/dashboard/engenheiro",
  COMERCIAL:  "/dashboard/comercial",
  CONSTRUTOR: "/dashboard/construtor",
  TOMADOR:    "/dashboard",
};

const DEMO = {
  portfolio: {
    carteiraAtiva: 0, meta: 0, metaData: "—", desembolsado: 0, aDesembolsar: 0,
    taxaMediaPonderada: 0, taxaMeta: 0, spreadEfetivo: 0,
    receitaJuros: 0, receitaEstruturacao: 0, receitaOperacional: 0, receitaProjetada: 0,
    ebitdaRealizado: 0, ebitdaProjetado: 0, ebitdaMeta: 0, ebitdaMargem: 0,
    ticketMedioPorOperacao: 0, ticketMedioPorIncorporadora: 0, operacoesAtivas: 0,
  },
  risco: {
    inadimplencia: [] as { aging: string; valor: number; pct: number }[],
    pdd: 0,
    concentracao: [] as { nome: string; valor: number; pct: number }[],
    ltvMedio: 0, coberturaGarantias: 0, watchlist: 0, covenantsViolados: 0,
  },
  pipeline: {
    funil: [
      { etapa: "Lead",       qtde: 0, valor: 0 },
      { etapa: "Análise",    qtde: 0, valor: 0 },
      { etapa: "Aprovação",  qtde: 0, valor: 0 },
      { etapa: "Contrato",   qtde: 0, valor: 0 },
      { etapa: "Desembolso", qtde: 0, valor: 0 },
    ],
    taxaConversao: 0, cicloMedioDias: 0, incorporadorasAtivas: 0, pipelineTotal: 0,
  },
  obras: [] as { nome: string; fisicoP: number; financeiroP: number; status: string; trancheData: string; trancheValor: number }[],
  operacional: {
    aprovacoes: [] as { tipo: string; desc: string; urgencia: string; data: string }[],
    kyc: [] as { nome: string; email: string; etapa: string; dias: number }[],
    documentosVencendo: [] as { doc: string; obra: string; venc: string }[],
    auditoria: [] as { acao: string; usuario: string; desc: string; data: string }[],
    logs: [
      { servico: "API NestJS",   status: "—", exec: "—", msg: "Aguardando conexão" },
      { servico: "BullMQ",       status: "—", exec: "—", msg: "Aguardando conexão" },
      { servico: "PostGIS GPS",  status: "—", exec: "—", msg: "Aguardando conexão" },
      { servico: "AWS S3",       status: "—", exec: "—", msg: "Aguardando conexão" },
    ],
  },
  credenciais: [
    { role: "ADMIN",      email: "admin1@test.com",      senha: "TestPassword123", label: "Administrador" },
    { role: "GESTOR",     email: "fundo@test.com",       senha: "TestPassword123", label: "Gestor de Fundo" },
    { role: "ENGENHEIRO", email: "engenheiro@test.com",  senha: "TestPassword123", label: "Engenheiro" },
    { role: "COMERCIAL",  email: "comercial@test.com",   senha: "TestPassword123", label: "Comercial" },
    { role: "CONSTRUTOR", email: "construtor@test.com",  senha: "TestPassword123", label: "Construtor" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rel(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Bar({ pct, color, bg = "rgba(12,26,61,0.07)" }: { pct: number; color: string; bg?: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: bg, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
    </div>
  );
}

function KpiCard({ label, value, sub, accent = NAVY, delta, children, style: styleProp }: {
  label: string; value: string; sub?: string; accent?: string; delta?: number; children?: ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...card, borderLeft: `3px solid ${accent}`, padding: "1.1rem 1.25rem", ...styleProp }}>
      <p style={{ ...j, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(12,26,61,0.38)", marginBottom: 6 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <p style={{ ...bc, fontWeight: 800, fontSize: "clamp(1.3rem,2.5vw,1.75rem)", color: NAVY, lineHeight: 1 }}>{value}</p>
        {delta !== undefined && (
          <span style={{ ...j, fontSize: "0.7rem", fontWeight: 700, color: delta >= 0 ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", gap: 2 }}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p style={{ ...j, fontSize: "0.7rem", color: "rgba(12,26,61,0.38)", marginTop: 4 }}>{sub}</p>}
      {children}
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)", background: "rgba(12,26,61,0.015)" }}>
      {icon}
      <span style={{ ...j, fontSize: "0.82rem", fontWeight: 700, color: NAVY }}>{title}</span>
    </div>
  );
}

// ─── API Types ────────────────────────────────────────────────────────────────

type ApiOverview = {
  totalUsuarios: number;
  obrasAtivas: number;
  obrasTotal: number;
  creditoAprovado: number;
  creditoLiberado: number;
  kycPendentes: number;
  etapasPendentes: number;
  visitasAgendadas: number;
  filaLiberacao: number;
};

type ApiAtividade = {
  id: string;
  tipo: string;
  descricao: string;
  criadoEm: string;
};

type ApiObra = {
  id: string;
  nome: string;
  status: string;
  tomador?: string;
};

// ─── Tab Views ────────────────────────────────────────────────────────────────

function TabPortfolio({
  overview,
  portfolio,
}: {
  overview: ApiOverview | null;
  portfolio: {
    creditoTotalAprovado: number;
    creditoTotalLiberado: number;
    obrasAtivas: number;
    creditosAtivos: number;
    inadimplenciaRate: number;
  } | null;
}) {
  const creditoAprovado = portfolio?.creditoTotalAprovado ?? overview?.creditoAprovado ?? 0;
  const creditoLiberado = portfolio?.creditoTotalLiberado ?? overview?.creditoLiberado ?? 0;
  const obrasAtivas = portfolio?.obrasAtivas ?? overview?.obrasAtivas ?? 0;
  const aDesembolsar = Math.max(0, creditoAprovado - creditoLiberado);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Crédito aprovado" value={formatarBRL(creditoAprovado)} accent={MINT} />
        <KpiCard label="Desembolsado" value={formatarBRL(creditoLiberado)} sub="total liberado" accent={ROYAL} />
        <KpiCard label="A desembolsar" value={formatarBRL(aDesembolsar)} accent={NAVY} />
        <KpiCard label="Obras ativas" value={String(obrasAtivas)} sub={`${portfolio?.creditosAtivos ?? 0} linhas de crédito`} accent={NAVY} />
      </div>

      <div style={card}>
        <SectionHeader title="Carteira — fundo único IMOBI" icon={<TrendingUp size={14} color={MINT} />} />
        <div style={{ padding: "1.25rem" }} className="space-y-3">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...j, fontSize: "0.8rem", color: "rgba(12,26,61,0.55)" }}>Inadimplência</span>
            <span style={{ ...j, fontSize: "0.8rem", fontWeight: 700, color: NAVY }}>{portfolio?.inadimplenciaRate ?? 0}%</span>
          </div>
          <Bar pct={Math.min(portfolio?.inadimplenciaRate ?? 0, 100)} color="#f59e0b" />
          <p style={{ ...j, fontSize: "0.72rem", color: "rgba(12,26,61,0.4)" }}>
            Visão global do único fundo sócio IMOBI (gestor).
          </p>
        </div>
      </div>
    </div>
  );
}

function TabRisco({ overview, inadimplenciaRate }: { overview: ApiOverview | null; inadimplenciaRate: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Inadimplência" value={`${inadimplenciaRate}%`} sub="taxa da carteira" accent="#f59e0b" />
        <KpiCard label="KYC pendentes" value={String(overview?.kycPendentes ?? 0)} accent={ROYAL} />
        <KpiCard label="Etapas pendentes" value={String(overview?.etapasPendentes ?? 0)} accent={NAVY} />
        <KpiCard label="Fila liberação" value={String(overview?.filaLiberacao ?? 0)} accent={MINT} />
      </div>
      <div style={card}>
        <SectionHeader title="Monitoramento operacional" icon={<AlertCircle size={14} color="#dc2626" />} />
        <div style={{ padding: "1.25rem" }}>
          <p style={{ ...j, fontSize: "0.82rem", color: "rgba(12,26,61,0.55)" }}>
            Dados de aging, PDD e concentração serão alimentados conforme integração contábil. Métricas operacionais já vêm da API.
          </p>
        </div>
      </div>
    </div>
  );
}

function TabPipeline({ stats, stagesCount, leadsTotal }: {
  stats: { totalLeads: number; leadsThisWeek: number; avgScore: number; conversionRate: number } | null;
  stagesCount: number;
  leadsTotal: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Leads no pipeline" value={String(stats?.totalLeads ?? leadsTotal)} accent={MINT} />
        <KpiCard label="Leads esta semana" value={String(stats?.leadsThisWeek ?? 0)} accent={ROYAL} />
        <KpiCard label="Score médio" value={String(stats?.avgScore ?? 0)} accent={NAVY} />
        <KpiCard label="Taxa conversão" value={`${stats?.conversionRate ?? 0}%`} accent={MINT} />
      </div>
      <div style={card}>
        <SectionHeader title="Estágios comerciais" icon={<BarChart3 size={14} color={ROYAL} />} />
        <div style={{ padding: "1.25rem" }}>
          <p style={{ ...j, fontSize: "0.82rem", color: "rgba(12,26,61,0.55)" }}>
            {stagesCount} estágios configurados · {leadsTotal} leads distribuídos.
          </p>
          <a href="/dashboard/admin/pipeline" style={{ ...j, display: "inline-flex", marginTop: 12, fontSize: "0.8rem", fontWeight: 600, color: ROYAL }}>
            Abrir kanban completo →
          </a>
        </div>
      </div>
    </div>
  );
}

function TabObras({ obras, overview }: { obras: ApiObra[] | null; overview: ApiOverview | null }) {
  const lista = obras ?? [];
  const emExecucao = lista.filter((o) => o.status === "EM_EXECUCAO").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Total de obras" value={String(overview?.obrasTotal ?? lista.length)} accent={NAVY} />
        <KpiCard label="Em execução" value={String(overview?.obrasAtivas ?? emExecucao)} accent={MINT} />
        <KpiCard label="Visitas agendadas" value={String(overview?.visitasAgendadas ?? 0)} accent={ROYAL} />
      </div>
      <div style={card}>
        <SectionHeader title="Obras recentes" icon={<Building2 size={14} color={NAVY} />} />
        <div>
          {lista.length === 0 ? (
            <p style={{ ...j, fontSize: "0.82rem", color: "rgba(12,26,61,0.4)", padding: "1.25rem" }}>Nenhuma obra registrada.</p>
          ) : (
            lista.map((o) => (
              <div key={o.id} style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
                <p style={{ ...j, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>{o.nome}</p>
                <p style={{ ...j, fontSize: "0.72rem", color: "rgba(12,26,61,0.45)" }}>
                  {o.tomador ?? "—"} · {o.status.replace(/_/g, " ")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TabOperacional({
  atividades,
  obras,
  overview,
}: {
  atividades: ApiAtividade[] | null;
  obras: ApiObra[] | null;
  overview: ApiOverview | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="KYC pendentes" value={String(overview?.kycPendentes ?? 0)} accent={ROYAL} />
        <KpiCard label="Etapas pendentes" value={String(overview?.etapasPendentes ?? 0)} accent="#f59e0b" />
        <KpiCard label="Fila liberação" value={String(overview?.filaLiberacao ?? 0)} accent={MINT} />
        <KpiCard label="Usuários" value={String(overview?.totalUsuarios ?? 0)} accent={NAVY} />
      </div>

      {atividades && atividades.length > 0 && (
        <div style={card}>
          <SectionHeader title="Atividades Recentes" icon={<Activity size={14} color={MINT} />} />
          <div>
            {atividades.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
                <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: "50%", background: ROYAL, flexShrink: 0, display: "block" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: NAVY }}>{a.tipo}</p>
                  <p style={{ ...j, fontSize: "0.72rem", color: "rgba(12,26,61,0.5)" }}>{a.descricao}</p>
                  <p style={{ ...j, fontSize: "0.65rem", color: "rgba(12,26,61,0.35)", marginTop: 2 }}>há {rel(a.criadoEm)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={card}>
        <SectionHeader title="Obras recentes" icon={<Building2 size={14} color={NAVY} />} />
        <div>
          {(obras ?? []).length === 0 ? (
            <p style={{ ...j, padding: "1.25rem", fontSize: "0.82rem", color: "rgba(12,26,61,0.4)" }}>Nenhuma obra.</p>
          ) : (
            (obras ?? []).slice(0, 8).map((o) => (
              <a
                key={o.id}
                href={`/dashboard/obras/${o.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)", textDecoration: "none" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...j, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>{o.nome}</p>
                  {o.tomador && <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.4)" }}>{o.tomador}</p>}
                </div>
                <ChevronRight size={13} color="rgba(12,26,61,0.25)" />
              </a>
            ))
          )}
        </div>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <div style={{ ...card, border: "1px solid rgba(251,191,36,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.85rem 1.25rem", background: "rgba(254,243,199,0.6)", borderBottom: "1px solid rgba(251,191,36,0.25)" }}>
            <AlertTriangle size={14} color="#92400e" />
            <div>
              <p style={{ ...j, fontSize: "0.8rem", fontWeight: 700, color: "#92400e" }}>Credenciais de Teste — ambiente DEV</p>
              <p style={{ ...j, fontSize: "0.68rem", color: "#b45309" }}>Não usar em produção.</p>
            </div>
          </div>
          <CredenciaisTable />
        </div>
      )}
    </div>
  );
}

function CredenciaisTable() {
  const [showSenhas, setShowSenhas] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function copiar(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  }

  return (
    <div>
      {DEMO.credenciais.map((u) => (
        <div key={u.email} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.8rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)", flexWrap: "wrap" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "rgba(12,26,61,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ ...bc, fontWeight: 800, fontSize: "0.72rem", color: NAVY }}>{u.role.slice(0, 2)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...j, fontSize: "0.8rem", fontWeight: 600, color: NAVY }}>{u.label}</p>
            <p style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(12,26,61,0.45)" }}>{u.email}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: "0.78rem", color: NAVY, background: "rgba(12,26,61,0.04)", border: "1px solid rgba(12,26,61,0.07)", padding: "0.28rem 0.65rem", borderRadius: 8 }}>
            <span>{showSenhas[u.email] ? u.senha : "•".repeat(u.senha.length)}</span>
            <button onClick={() => setShowSenhas(p => ({ ...p, [u.email]: !p[u.email] }))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(12,26,61,0.35)", padding: 0, display: "flex" }}>
              {showSenhas[u.email] ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
          <button onClick={() => copiar(`${u.email} / ${u.senha}`, u.email)}
            style={{ ...j, display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", padding: "0.28rem 0.65rem", borderRadius: 8, border: `1px solid ${copied === u.email ? MINT : "rgba(12,26,61,0.12)"}`, color: copied === u.email ? "#16a34a" : NAVY, background: copied === u.email ? "rgba(74,222,128,0.08)" : "white", transition: "all 0.15s" }}>
            <Copy size={10} />{copied === u.email ? "Copiado!" : "Copiar"}
          </button>
          {PANEL_HREF[u.role] && (
            <a
              href={PANEL_HREF[u.role]}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...j, display: "flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", padding: "0.28rem 0.65rem", borderRadius: 8, border: "1px solid rgba(27,79,216,0.18)", color: ROYAL, background: "rgba(27,79,216,0.04)", textDecoration: "none", transition: "all 0.15s" }}
            >
              <ChevronRight size={10} />Abrir
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "portfolio",   label: "Portfólio",   icon: TrendingUp  },
  { id: "risco",       label: "Risco",       icon: AlertCircle },
  { id: "pipeline",    label: "Pipeline",    icon: BarChart3   },
  { id: "obras",       label: "Obras",       icon: Building2   },
  { id: "operacional", label: "Operacional", icon: Settings    },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>("portfolio");
  const [isDemo, setIsDemo] = useState<boolean | null>(null); // null = loading
  const [overview, setOverview] = useState<ApiOverview | null>(null);
  const [atividades, setAtividades] = useState<ApiAtividade[] | null>(null);
  const [obras, setObras] = useState<ApiObra[] | null>(null);
  const [portfolio, setPortfolio] = useState<{
    creditoTotalAprovado: number;
    creditoTotalLiberado: number;
    obrasAtivas: number;
    creditosAtivos: number;
    inadimplenciaRate: number;
  } | null>(null);
  const [comercialStats, setComercialStats] = useState<{
    totalLeads: number;
    leadsThisWeek: number;
    avgScore: number;
    conversionRate: number;
  } | null>(null);
  const [pipelineMeta, setPipelineMeta] = useState({ stagesCount: 0, leadsTotal: 0 });

  useEffect(() => {
    fetch("/api/proxy/admin/overview")
      .then((r) => (r.ok ? r.json() as Promise<ApiOverview> : Promise.reject()))
      .then((data) => { setOverview(data); setIsDemo(false); })
      .catch(() => { setIsDemo(true); });

    fetch("/api/proxy/admin/atividades?limit=8")
      .then((r) => (r.ok ? r.json() as Promise<ApiAtividade[]> : Promise.reject()))
      .then((data) => { setAtividades(data); })
      .catch(() => { /* silently fallback */ });

    fetch("/api/proxy/admin/obras?limit=20")
      .then((r) => (r.ok ? r.json() as Promise<ApiObra[]> : Promise.reject()))
      .then((data) => { setObras(data); })
      .catch(() => { /* silently fallback */ });

    fetch("/api/proxy/manager/portfolio")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setPortfolio(data); })
      .catch(() => null);

    Promise.all([
      fetch("/api/proxy/comercial/dashboard/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/proxy/comercial/pipeline/stages").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/proxy/comercial/leads?limit=1").then((r) => (r.ok ? r.json() : null)),
    ]).then(([stats, stages, leadsRes]) => {
      if (stats) setComercialStats(stats);
      setPipelineMeta({
        stagesCount: Array.isArray(stages) ? stages.length : 0,
        leadsTotal: leadsRes?.total ?? 0,
      });
    }).catch(() => null);
  }, []);

  return (
    <div style={{ ...j, maxWidth: 1100 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p style={{ ...j, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: MINT }}>Admin</p>
          <h1 style={{ ...bc, fontWeight: 800, fontSize: "clamp(2rem,5vw,3rem)", color: NAVY, letterSpacing: "0.02em", lineHeight: 1.05, marginTop: 4 }}>
            CENTRO DE COMANDO
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Data source badge */}
          <span style={{
            ...j,
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: "0.68rem", fontWeight: 700,
            padding: "0.28rem 0.65rem", borderRadius: 999,
            background: isDemo === null ? "rgba(12,26,61,0.06)" : isDemo ? "rgba(251,191,36,0.12)" : "rgba(74,222,128,0.12)",
            color: isDemo === null ? "rgba(12,26,61,0.4)" : isDemo ? "#92400e" : "#15803d",
            border: `1px solid ${isDemo === null ? "rgba(12,26,61,0.15)" : isDemo ? "rgba(251,191,36,0.35)" : "rgba(74,222,128,0.35)"}`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDemo === null ? "rgba(12,26,61,0.3)" : isDemo ? "#f59e0b" : MINT, display: "inline-block" }} />
            {isDemo === null ? "Verificando..." : isDemo ? "Demonstração" : "Dados ao vivo"}
          </span>
          <a href="/dashboard/admin/usuarios" style={{ ...j, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 600, color: NAVY, border: "1px solid rgba(12,26,61,0.18)", background: "white", padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none" }}>
            <Users size={13} /> Usuários
          </a>
          <a href="/dashboard/admin/configuracoes" style={{ ...j, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 600, color: NAVY, border: "1px solid rgba(12,26,61,0.18)", background: "white", padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none" }}>
            <Settings size={13} /> Configurações
          </a>
        </div>
      </div>

      {/* Acesso Rápido a Painéis */}
      <div style={{ ...card, border: "1px solid rgba(27,79,216,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)", background: "rgba(27,79,216,0.03)" }}>
          <Zap size={13} color={ROYAL} />
          <span style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: NAVY }}>Acesso Rápido a Painéis</span>
          <span style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.35)", marginLeft: 4 }}>abre em nova aba</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0.85rem 1.25rem" }}>
          {[
            { label: "Admin",      role: "ADMIN",      href: "/dashboard/admin",      color: NAVY,      bg: "rgba(12,26,61,0.06)"  },
            { label: "Gestor de Fundo", role: "GESTOR",     href: "/dashboard/gestor",     color: ROYAL,     bg: "rgba(27,79,216,0.07)" },
            { label: "Engenheiro", role: "ENGENHEIRO", href: "/dashboard/engenheiro", color: "#ea580c", bg: "rgba(234,88,12,0.07)"  },
            { label: "Comercial",  role: "COMERCIAL",  href: "/dashboard/comercial",  color: "#7c3aed", bg: "rgba(124,58,237,0.07)" },
            { label: "Construtor", role: "TOMADOR",    href: "/dashboard/construtor", color: "#16a34a", bg: "rgba(22,163,74,0.07)"  },
          ].map(({ label, role, href, color, bg }) => (
            <a
              key={role}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...j, display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: "0.78rem", fontWeight: 700, color, background: bg,
                padding: "0.45rem 0.9rem", borderRadius: 10, textDecoration: "none",
                border: `1px solid ${color}22`, transition: "all 0.12s",
              }}
            >
              {label}
              <ChevronRight size={11} />
            </a>
          ))}
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(12,26,61,0.08)", overflowX: "auto" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...j, display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: tab === id ? 700 : 500,
              color: tab === id ? NAVY : "rgba(12,26,61,0.42)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: `2px solid ${tab === id ? MINT : "transparent"}`,
              marginBottom: -1, whiteSpace: "nowrap", flexShrink: 0,
              transition: "all 0.12s",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "portfolio"   && <TabPortfolio overview={overview} portfolio={portfolio} />}
      {tab === "risco"       && <TabRisco overview={overview} inadimplenciaRate={portfolio?.inadimplenciaRate ?? 0} />}
      {tab === "pipeline"    && <TabPipeline stats={comercialStats} stagesCount={pipelineMeta.stagesCount} leadsTotal={pipelineMeta.leadsTotal} />}
      {tab === "obras"       && <TabObras obras={obras} overview={overview} />}
      {tab === "operacional" && <TabOperacional atividades={atividades} obras={obras} overview={overview} />}
    </div>
  );
}
