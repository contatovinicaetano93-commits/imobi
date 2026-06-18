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
    { role: "GESTOR",     email: "fundo@test.com",       senha: "TestPassword123", label: "Fundo" },
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

function TabPortfolio({ overview }: { overview: ApiOverview | null }) {
  const p = DEMO.portfolio;
  const receitaTotal = p.receitaJuros + p.receitaEstruturacao + p.receitaOperacional;
  const ebitdaPct = p.ebitdaMargem;

  // Overlay real API data on top of DEMO KPIs when available
  const rawObras = overview?.obrasAtivas;
  const obrasAtivas = (typeof rawObras === "number" && isFinite(rawObras)) ? rawObras : p.operacoesAtivas;
  const rawCredito = overview?.creditoAprovado;
  const creditoAprovado = (typeof rawCredito === "number" && isFinite(rawCredito)) ? rawCredito : p.carteiraAtiva;
  const metaPct = p.meta > 0 ? Math.round((creditoAprovado / p.meta) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Carteira */}
      <div style={card}>
        <SectionHeader title="Carteira Ativa" icon={<TrendingUp size={14} color={MINT} />} />
        <div style={{ padding: "1.25rem" }} className="space-y-4">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div>
              <p style={{ ...bc, fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,2.4rem)", color: NAVY, lineHeight: 1 }}>
                {formatarBRL(creditoAprovado)}
              </p>
              <p style={{ ...j, fontSize: "0.8rem", color: "rgba(12,26,61,0.45)", marginTop: 4 }}>
                Meta {formatarBRL(p.meta)} até {p.metaData} — <strong style={{ color: ROYAL }}>{metaPct}% atingida</strong>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ ...bc, fontWeight: 800, fontSize: "1.4rem", color: NAVY }}>{metaPct}%</p>
              <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.35)" }}>da meta</p>
            </div>
          </div>
          <Bar pct={metaPct} color={MINT} bg="rgba(12,26,61,0.07)" />
          <div className="grid grid-cols-2 gap-4">
            <div style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(27,79,216,0.04)", border: "1px solid rgba(27,79,216,0.1)" }}>
              <p style={{ ...j, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: ROYAL, marginBottom: 4 }}>Desembolsado</p>
              <p style={{ ...bc, fontWeight: 800, fontSize: "1.2rem", color: NAVY }}>{formatarBRL(p.desembolsado)}</p>
            </div>
            <div style={{ padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(12,26,61,0.03)", border: "1px solid rgba(12,26,61,0.07)" }}>
              <p style={{ ...j, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.4)", marginBottom: 4 }}>A Desembolsar</p>
              <p style={{ ...bc, fontWeight: 800, fontSize: "1.2rem", color: NAVY }}>{formatarBRL(p.aDesembolsar)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Taxa + Spread */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Taxa Méd. Ponderada" value={`${p.taxaMediaPonderada.toFixed(2)}% a.m.`} sub={`meta: ${p.taxaMeta}% a.m.`} accent={p.taxaMediaPonderada >= p.taxaMeta ? MINT : "#f59e0b"} delta={((p.taxaMediaPonderada - p.taxaMeta) / p.taxaMeta) * 100} />
        <KpiCard label="Spread Efetivo" value={`${p.spreadEfetivo.toFixed(2)}%`} sub="sobre CDI" accent={ROYAL} />
        <KpiCard label="Ticket Méd./Operação" value={formatarBRL(p.ticketMedioPorOperacao)} sub={`${obrasAtivas} operações ativas`} accent={NAVY} />
        <KpiCard label="Ticket Méd./Incorporadora" value={formatarBRL(p.ticketMedioPorIncorporadora)} sub="por tomador" accent={NAVY} />
      </div>

      {/* Receita */}
      <div style={card}>
        <SectionHeader title="Receita — Realizado vs Projetado" icon={<Banknote size={14} color={ROYAL} />} />
        <div style={{ padding: "1.25rem" }} className="space-y-3">
          {[
            { label: "Juros acruados (mensal)",        val: p.receitaJuros,         pct: Math.round((p.receitaJuros / p.receitaProjetada) * 100) },
            { label: "Taxa de estruturação (3%)",      val: p.receitaEstruturacao,  pct: Math.round((p.receitaEstruturacao / p.receitaProjetada) * 100) },
            { label: "Taxa operacional (7%)",          val: p.receitaOperacional,   pct: Math.round((p.receitaOperacional / p.receitaProjetada) * 100) },
          ].map(({ label, val, pct }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ ...j, fontSize: "0.8rem", color: "rgba(12,26,61,0.65)" }}>{label}</span>
                <span style={{ ...j, fontSize: "0.8rem", fontWeight: 700, color: NAVY }}>{formatarBRL(val)}</span>
              </div>
              <Bar pct={pct} color={ROYAL} />
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(12,26,61,0.07)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...j, fontSize: "0.82rem", fontWeight: 700, color: NAVY }}>Total realizado</span>
            <div style={{ textAlign: "right" }}>
              <p style={{ ...bc, fontWeight: 800, fontSize: "1.15rem", color: NAVY }}>{formatarBRL(receitaTotal)}</p>
              <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.4)" }}>projetado: {formatarBRL(p.receitaProjetada)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* EBITDA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={card}>
          <SectionHeader title="EBITDA Mensal" icon={<BarChart3 size={14} color={NAVY} />} />
          <div style={{ padding: "1.25rem" }} className="space-y-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ ...bc, fontWeight: 800, fontSize: "1.5rem", color: NAVY }}>{formatarBRL(p.ebitdaRealizado)}</p>
              <p style={{ ...j, fontSize: "0.75rem", color: "rgba(12,26,61,0.4)" }}>projetado: {formatarBRL(p.ebitdaProjetado)}</p>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ ...j, fontSize: "0.78rem", color: "rgba(12,26,61,0.55)" }}>Margem EBITDA realizada</span>
                <span style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: ebitdaPct >= p.ebitdaMeta ? "#16a34a" : "#f59e0b" }}>{ebitdaPct.toFixed(1)}%</span>
              </div>
              <Bar pct={ebitdaPct} color={ebitdaPct >= p.ebitdaMeta ? MINT : "#fbbf24"} />
              <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.35)", marginTop: 4 }}>Benchmark: {p.ebitdaMeta}%</p>
            </div>
          </div>
        </div>
        <div style={{ ...card, display: "flex", flexDirection: "column", justifyContent: "center", padding: "1.5rem 1.25rem" }}>
          <p style={{ ...j, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(12,26,61,0.35)", marginBottom: 12 }}>Resumo de portfólio</p>
          {[
            { label: "Operações ativas",       val: `${obrasAtivas}` },
            { label: "Incorporadoras",         val: `${DEMO.pipeline.incorporadorasAtivas}` },
            { label: "Crédito aprovado",       val: formatarBRL(creditoAprovado) },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
              <span style={{ ...j, fontSize: "0.8rem", color: "rgba(12,26,61,0.5)" }}>{label}</span>
              <span style={{ ...j, fontSize: "0.8rem", fontWeight: 700, color: NAVY }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabRisco() {
  const r = DEMO.risco;
  const inadimTotalValor = r.inadimplencia.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-6">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Inadimplência Total" value={formatarBRL(inadimTotalValor)} sub={`${r.inadimplencia.reduce((s, i) => s + i.pct, 0).toFixed(2)}% da carteira`} accent="#f59e0b" />
        <KpiCard label="PDD Provisionada"    value={formatarBRL(r.pdd)}            sub="provisão p/ devedores duvidosos" accent="#dc2626" />
        <KpiCard label="LTV Médio"           value={`${r.ltvMedio}%`}              sub="loan-to-value da carteira"      accent={r.ltvMedio > 80 ? "#dc2626" : ROYAL} />
        <KpiCard label="Cobertura Garantias" value={`${r.coberturaGarantias}%`}    sub="valor garantia / saldo devedor" accent={MINT} />
      </div>

      {/* Inadimplência aging */}
      <div style={card}>
        <SectionHeader title="Inadimplência por Aging" icon={<Clock size={14} color="#f59e0b" />} />
        <div style={{ padding: "1.25rem" }} className="space-y-3">
          {r.inadimplencia.map(({ aging, valor, pct }) => (
            <div key={aging}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ ...j, fontSize: "0.8rem", fontWeight: 600, color: NAVY }}>{aging}</span>
                <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span style={{ ...j, fontSize: "0.8rem", fontWeight: 700, color: NAVY }}>{formatarBRL(valor)}</span>
                  <span style={{ ...j, fontSize: "0.72rem", color: "#dc2626", fontWeight: 700 }}>{pct.toFixed(2)}%</span>
                </div>
              </div>
              <Bar pct={pct * 20} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
            </div>
          ))}
        </div>
      </div>

      {/* Concentração */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div style={card}>
          <SectionHeader title="Concentração por Tomador" icon={<Users size={14} color={ROYAL} />} />
          <div>
            {r.concentracao.map(({ nome, valor, pct }) => (
              <div key={nome} style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ ...j, fontSize: "0.8rem", color: NAVY, fontWeight: 500 }}>{nome}</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ ...j, fontSize: "0.75rem", color: "rgba(12,26,61,0.45)" }}>{formatarBRL(valor)}</span>
                    <span style={{ ...j, fontSize: "0.75rem", fontWeight: 700, color: pct > 20 ? "#dc2626" : pct > 15 ? "#f59e0b" : NAVY }}>{pct}%</span>
                  </div>
                </div>
                <Bar pct={pct} color={pct > 20 ? "#dc2626" : pct > 15 ? "#fbbf24" : ROYAL} bg="rgba(12,26,61,0.05)" />
                {pct > 15 && <p style={{ ...j, fontSize: "0.65rem", color: pct > 20 ? "#dc2626" : "#d97706", marginTop: 3 }}>⚠ Limite 20%: {pct > 20 ? "excedido" : "atenção"}</p>}
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <SectionHeader title="Alertas de Risco" icon={<AlertCircle size={14} color="#dc2626" />} />
          <div style={{ padding: "1.25rem" }} className="space-y-3">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: 10, background: r.watchlist > 0 ? "#fef2f2" : "rgba(74,222,128,0.08)", border: `1px solid ${r.watchlist > 0 ? "#fecaca" : "rgba(74,222,128,0.25)"}` }}>
              <span style={{ ...j, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>Operações em Watchlist</span>
              <span style={{ ...bc, fontWeight: 800, fontSize: "1.4rem", color: r.watchlist > 0 ? "#dc2626" : "#16a34a" }}>{r.watchlist}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: 10, background: r.covenantsViolados > 0 ? "#fef2f2" : "rgba(74,222,128,0.08)", border: `1px solid ${r.covenantsViolados > 0 ? "#fecaca" : "rgba(74,222,128,0.25)"}` }}>
              <span style={{ ...j, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>Covenants Violados</span>
              <span style={{ ...bc, fontWeight: 800, fontSize: "1.4rem", color: r.covenantsViolados > 0 ? "#dc2626" : "#16a34a" }}>{r.covenantsViolados}</span>
            </div>
            <div style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "rgba(12,26,61,0.03)", border: "1px solid rgba(12,26,61,0.07)" }}>
              <p style={{ ...j, fontSize: "0.78rem", fontWeight: 600, color: NAVY, marginBottom: 6 }}>LTV por quartil</p>
              {[
                { label: "Q1 (≤60%)", pct: 42, color: MINT },
                { label: "Q2 (60–70%)", pct: 31, color: ROYAL },
                { label: "Q3 (70–80%)", pct: 19, color: "#f59e0b" },
                { label: "Q4 (>80%)", pct: 8, color: "#dc2626" },
              ].map(({ label, pct, color }) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ ...j, fontSize: "0.7rem", color: "rgba(12,26,61,0.55)" }}>{label}</span>
                    <span style={{ ...j, fontSize: "0.7rem", fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <Bar pct={pct} color={color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabPipeline() {
  const pl = DEMO.pipeline;
  const maxQtde = Math.max(...pl.funil.map(f => f.qtde));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Pipeline Total"    value={formatarBRL(pl.pipelineTotal)} sub={`${pl.incorporadorasAtivas} incorporadoras`} accent={MINT} />
        <KpiCard label="Taxa de Conversão" value={`${pl.taxaConversao}%`}        sub="lead → desembolso"                          accent={ROYAL} />
        <KpiCard label="Ciclo Médio"       value={`${pl.cicloMedioDias} dias`}   sub="da originação ao desembolso"                accent={NAVY} />
        <KpiCard label="Leads Ativos"      value={String(pl.funil[0].qtde)}      sub={formatarBRL(pl.funil[0].valor)}             accent={NAVY} />
      </div>

      {/* Funil */}
      <div style={card}>
        <SectionHeader title="Funil de Originação" icon={<Target size={14} color={ROYAL} />} />
        <div style={{ padding: "1.25rem" }} className="space-y-2">
          {pl.funil.map(({ etapa, qtde, valor }, i) => {
            const widthPct = maxQtde > 0 ? Math.round((qtde / maxQtde) * 100) : 0;
            const convPct = i > 0 && pl.funil[i-1].qtde > 0 ? Math.round((qtde / pl.funil[i-1].qtde) * 100) : 0;
            return (
              <div key={etapa}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5, flexWrap: "wrap" }}>
                  <div style={{ width: 80, flexShrink: 0 }}>
                    <p style={{ ...j, fontSize: "0.78rem", fontWeight: 600, color: NAVY }}>{etapa}</p>
                    {i > 0 && <p style={{ ...j, fontSize: "0.65rem", color: "rgba(12,26,61,0.35)" }}>{convPct}% conv.</p>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 28, background: "rgba(12,26,61,0.06)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                      <div style={{ position: "absolute", inset: 0, width: `${widthPct}%`, background: i === 0 ? NAVY : i === 1 ? ROYAL : i === 2 ? "#2563eb" : i === 3 ? "#3b82f6" : MINT, borderRadius: 6, transition: "width 0.6s ease" }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 10 }}>
                        <span style={{ ...bc, fontWeight: 800, fontSize: "0.9rem", color: widthPct > 25 ? "white" : NAVY }}>{qtde} operações</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 80 }}>
                    <p style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: NAVY }}>{formatarBRL(valor)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incorporadoras pipeline */}
      <div style={card}>
        <SectionHeader title="Pipeline Ativo por Incorporadora" icon={<Building2 size={14} color={NAVY} />} />
        <div style={{ padding: "1.25rem" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Construtora Alpha", "Incorporadora Beta", "Grupo Gama", "Delta Empreend.", "Constru-Tech", "INCO Ltda.", "Projetur", "Sólida Eng."].map((nome, i) => {
              const val = [8_500_000, 7_200_000, 5_100_000, 3_800_000, 2_400_000, 1_900_000, 900_000, 450_000][i];
              const pct = DEMO.portfolio.carteiraAtiva > 0 ? Math.round((val / DEMO.portfolio.carteiraAtiva) * 100) : 0;
              return (
                <div key={nome} style={{ padding: "0.75rem 0.9rem", borderRadius: 10, border: "1px solid rgba(12,26,61,0.07)" }}>
                  <p style={{ ...j, fontSize: "0.72rem", fontWeight: 600, color: NAVY, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</p>
                  <p style={{ ...bc, fontWeight: 800, fontSize: "1rem", color: NAVY }}>{formatarBRL(val)}</p>
                  <p style={{ ...j, fontSize: "0.65rem", color: "rgba(12,26,61,0.38)" }}>{pct}% da carteira</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabObras() {
  const obras = DEMO.obras;
  const atrasadas = obras.filter(o => o.status === "ATRASADO").length;
  const noPrazo   = obras.filter(o => o.status === "NO_PRAZO").length;
  const adiantadas= obras.filter(o => o.status === "ADIANTADO").length;

  const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
    ATRASADO:  { color: "#dc2626", bg: "#fef2f2", label: "Atrasado" },
    NO_PRAZO:  { color: "#16a34a", bg: "rgba(74,222,128,0.1)", label: "No prazo" },
    ADIANTADO: { color: ROYAL, bg: "rgba(27,79,216,0.07)", label: "Adiantado" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        <KpiCard label="No Prazo"   value={String(noPrazo)}   sub="obras" accent={MINT}     style={{ padding: "0.6rem 0.75rem" }} />
        <KpiCard label="Atrasadas"  value={String(atrasadas)} sub="obras" accent="#dc2626"  style={{ padding: "0.6rem 0.75rem" }} />
        <KpiCard label="Adiantadas" value={String(adiantadas)}sub="obras" accent={ROYAL}    style={{ padding: "0.6rem 0.75rem" }} />
      </div>

      {/* Tabela obras */}
      <div style={card}>
        <SectionHeader title="% Físico vs % Financeiro por Obra" icon={<Building2 size={14} color={NAVY} />} />
        <div>
          {obras.map((o) => {
            const st = STATUS_STYLE[o.status];
            const desvio = o.fisicoP - o.financeiroP;
            return (
              <div key={o.nome} style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...j, fontSize: "0.82rem", fontWeight: 600, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.nome}</p>
                    <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.38)", marginTop: 2 }}>
                      Próxima tranche: {formatarBRL(o.trancheValor)} em {fmtDate(o.trancheData)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {desvio !== 0 && (
                      <span style={{ ...j, fontSize: "0.68rem", fontWeight: 700, color: desvio < -5 ? "#dc2626" : "#d97706" }}>
                        {desvio > 0 ? "+" : ""}{desvio}pp
                      </span>
                    )}
                    <span style={{ ...j, fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ ...j, fontSize: "0.65rem", color: "rgba(12,26,61,0.4)" }}>Físico</span>
                      <span style={{ ...j, fontSize: "0.65rem", fontWeight: 700, color: NAVY }}>{o.fisicoP}%</span>
                    </div>
                    <Bar pct={o.fisicoP} color={NAVY} />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ ...j, fontSize: "0.65rem", color: "rgba(12,26,61,0.4)" }}>Financeiro</span>
                      <span style={{ ...j, fontSize: "0.65rem", fontWeight: 700, color: ROYAL }}>{o.financeiroP}%</span>
                    </div>
                    <Bar pct={o.financeiroP} color={ROYAL} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cronograma 30/60/90 dias */}
      <div style={card}>
        <SectionHeader title="Cronograma de Liberações" icon={<Clock size={14} color={MINT} />} />
        <div style={{ padding: "1.25rem" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Próximos 30 dias", obras: obras.filter(o => { const d = new Date(o.trancheData); const now = new Date(); const diff = (d.getTime() - now.getTime()) / 86_400_000; return diff >= 0 && diff <= 30; }) },
              { label: "30–60 dias",       obras: obras.filter(o => { const d = new Date(o.trancheData); const now = new Date(); const diff = (d.getTime() - now.getTime()) / 86_400_000; return diff > 30 && diff <= 60; }) },
              { label: "60–90 dias",       obras: obras.filter(o => { const d = new Date(o.trancheData); const now = new Date(); const diff = (d.getTime() - now.getTime()) / 86_400_000; return diff > 60 && diff <= 90; }) },
            ].map(({ label, obras: lista }) => (
              <div key={label} style={{ padding: "0.85rem 1rem", borderRadius: 10, border: "1px solid rgba(12,26,61,0.07)", background: "rgba(12,26,61,0.02)" }}>
                <p style={{ ...j, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.4)", marginBottom: 8 }}>{label}</p>
                {lista.length === 0 ? (
                  <p style={{ ...j, fontSize: "0.78rem", color: "rgba(12,26,61,0.3)" }}>—</p>
                ) : (
                  lista.map(o => (
                    <div key={o.nome} style={{ marginBottom: 6 }}>
                      <p style={{ ...j, fontSize: "0.78rem", fontWeight: 600, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.nome}</p>
                      <p style={{ ...j, fontSize: "0.7rem", color: ROYAL, fontWeight: 700 }}>{formatarBRL(o.trancheValor)} · {fmtDate(o.trancheData)}</p>
                    </div>
                  ))
                )}
                {lista.length > 0 && (
                  <div style={{ borderTop: "1px solid rgba(12,26,61,0.06)", marginTop: 8, paddingTop: 8 }}>
                    <p style={{ ...j, fontSize: "0.72rem", fontWeight: 700, color: NAVY }}>Total: {formatarBRL(lista.reduce((s, o) => s + o.trancheValor, 0))}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabOperacional({
  atividades,
  obras,
}: {
  atividades: ApiAtividade[] | null;
  obras: ApiObra[] | null;
}) {
  const op = DEMO.operacional;

  const URGENCIA_STYLE: Record<string, { color: string; bg: string }> = {
    ALTA:  { color: "#dc2626", bg: "#fef2f2" },
    MEDIA: { color: "#d97706", bg: "#fffbeb" },
    BAIXA: { color: "#16a34a", bg: "rgba(74,222,128,0.1)" },
  };

  return (
    <div className="space-y-6">
      {/* Aprovações pendentes */}
      <div style={card}>
        <SectionHeader title="Aprovações Pendentes" icon={<ShieldCheck size={14} color="#f59e0b" />} />
        {op.aprovacoes.length === 0 ? (
          <p style={{ ...j, padding: "2rem", textAlign: "center", fontSize: "0.82rem", color: "rgba(12,26,61,0.3)" }}>Nenhuma pendência</p>
        ) : (
          <div>
            {op.aprovacoes.map((a, i) => {
              const st = URGENCIA_STYLE[a.urgencia];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
                  <span style={{ ...j, fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0 }}>{a.urgencia}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...j, fontSize: "0.7rem", fontWeight: 700, color: ROYAL, display: "block" }}>{a.tipo}</span>
                    <span style={{ ...j, fontSize: "0.8rem", color: NAVY }}>{a.desc}</span>
                  </div>
                  <span style={{ ...j, fontSize: "0.7rem", color: "rgba(12,26,61,0.35)", flexShrink: 0 }}>há {rel(a.data)}</span>
                  <ArrowRight size={13} color="rgba(12,26,61,0.2)" style={{ flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KYC / Onboarding */}
        <div style={card}>
          <SectionHeader title="Onboarding / KYC" icon={<FileCheck2 size={14} color={ROYAL} />} />
          <div>
            {op.kyc.map(({ nome, email, etapa, dias }) => (
              <div key={email} style={{ padding: "0.8rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(27,79,216,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ ...bc, fontWeight: 800, fontSize: "0.7rem", color: ROYAL }}>{nome.slice(0, 2).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...j, fontSize: "0.8rem", fontWeight: 600, color: NAVY }}>{nome}</p>
                  <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.4)" }}>{etapa}</p>
                </div>
                <span style={{ ...j, fontSize: "0.7rem", fontWeight: 700, color: dias > 5 ? "#dc2626" : "#d97706", flexShrink: 0 }}>{dias}d em análise</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documentos vencendo */}
        <div style={card}>
          <SectionHeader title="Documentos — Alerta de Vencimento" icon={<AlertTriangle size={14} color="#f59e0b" />} />
          <div>
            {op.documentosVencendo.map(({ doc, obra, venc }) => {
              const diasParaVencer = Math.ceil((new Date(venc).getTime() - Date.now()) / 86_400_000);
              const urgente = diasParaVencer <= 30;
              return (
                <div key={doc+obra} style={{ padding: "0.8rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...j, fontSize: "0.8rem", fontWeight: 600, color: NAVY }}>{doc}</p>
                    <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.4)" }}>{obra}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ ...j, fontSize: "0.72rem", fontWeight: 700, color: urgente ? "#dc2626" : "#d97706" }}>{fmtDate(venc)}</p>
                    <p style={{ ...j, fontSize: "0.65rem", color: urgente ? "#dc2626" : "#d97706" }}>{diasParaVencer} dias</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trilha de auditoria */}
        <div style={card}>
          <SectionHeader title="Trilha de Auditoria" icon={<Activity size={14} color={NAVY} />} />
          <div>
            {op.auditoria.map(({ acao, usuario, desc, data }, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
                <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: "50%", background: MINT, flexShrink: 0, display: "block" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: NAVY }}>{acao}</p>
                  <p style={{ ...j, fontSize: "0.72rem", color: "rgba(12,26,61,0.5)" }}>{desc}</p>
                  <p style={{ ...j, fontSize: "0.65rem", color: "rgba(12,26,61,0.35)" }}>{usuario} · há {rel(data)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logs de integração */}
        <div style={card}>
          <SectionHeader title="Logs de Integração" icon={<Zap size={14} color={ROYAL} />} />
          <div style={{ padding: "1rem 1.25rem" }} className="space-y-2">
            {op.logs.map(({ servico, status, exec, msg }) => (
              <div key={servico} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.85rem", borderRadius: 10, background: status === "OK" ? "rgba(74,222,128,0.06)" : "#fffbeb", border: `1px solid ${status === "OK" ? "rgba(74,222,128,0.2)" : "#fde68a"}` }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: status === "OK" ? MINT : "#f59e0b", flexShrink: 0, display: "block" }} />
                <span style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: NAVY, flex: 1 }}>{servico}</span>
                <div style={{ textAlign: "right" }}>
                  <p style={{ ...j, fontSize: "0.7rem", color: "rgba(12,26,61,0.45)" }}>{exec}</p>
                  <p style={{ ...j, fontSize: "0.68rem", color: status === "OK" ? "#16a34a" : "#d97706", fontWeight: 600 }}>{msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Obras recentes */}
      <div style={card}>
        <SectionHeader title="Obras Recentes" icon={<Building2 size={14} color={NAVY} />} />
        <div>
          {(obras && obras.length > 0 ? obras : DEMO.obras.slice(0, 5).map((o, i) => ({ id: `demo-${i}`, nome: o.nome, status: o.status, tomador: "Incorporadora Demo" }))).map((o) => {
            const statusMap: Record<string, { color: string; bg: string; label: string }> = {
              ATRASADO:  { color: "#dc2626", bg: "#fef2f2", label: "Atrasado" },
              NO_PRAZO:  { color: "#16a34a", bg: "rgba(74,222,128,0.1)", label: "No prazo" },
              ADIANTADO: { color: ROYAL,     bg: "rgba(27,79,216,0.07)", label: "Adiantado" },
            };
            const st = statusMap[o.status] ?? { color: "rgba(12,26,61,0.5)", bg: "rgba(12,26,61,0.04)", label: o.status };
            return (
              <a
                key={o.id}
                href={o.id.startsWith("demo-") ? undefined : `/dashboard/obras/${o.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)", textDecoration: "none", cursor: o.id.startsWith("demo-") ? "default" : "pointer" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...j, fontSize: "0.82rem", fontWeight: 600, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.nome}</p>
                  {o.tomador && <p style={{ ...j, fontSize: "0.68rem", color: "rgba(12,26,61,0.4)", marginTop: 2 }}>{o.tomador}</p>}
                </div>
                <span style={{ ...j, fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: 999, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
                <ChevronRight size={13} color="rgba(12,26,61,0.25)" style={{ flexShrink: 0 }} />
              </a>
            );
          })}
        </div>
      </div>

      {/* Atividades recentes */}
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

      {/* Credenciais de teste */}
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

  useEffect(() => {
    // Fetch overview data
    fetch("/api/proxy/admin/overview")
      .then((r) => (r.ok ? r.json() as Promise<ApiOverview> : Promise.reject()))
      .then((data) => { setOverview(data); setIsDemo(false); })
      .catch(() => { setIsDemo(true); });

    // Fetch atividades
    fetch("/api/proxy/admin/atividades?limit=8")
      .then((r) => (r.ok ? r.json() as Promise<ApiAtividade[]> : Promise.reject()))
      .then((data) => { setAtividades(data); })
      .catch(() => { /* silently fallback */ });

    // Fetch obras recentes
    fetch("/api/proxy/admin/obras?limit=5")
      .then((r) => (r.ok ? r.json() as Promise<ApiObra[]> : Promise.reject()))
      .then((data) => { setObras(data); })
      .catch(() => { /* silently fallback */ });
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
          <a href="/dashboard/admin/audit-logs" style={{ ...j, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 600, color: NAVY, border: "1px solid rgba(12,26,61,0.18)", background: "white", padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none" }}>
            <Activity size={13} /> Auditoria
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
            { label: "Fundo",      role: "GESTOR",     href: "/dashboard/gestor",     color: ROYAL,     bg: "rgba(27,79,216,0.07)" },
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
      {tab === "portfolio"   && <TabPortfolio overview={overview} />}
      {tab === "risco"       && <TabRisco />}
      {tab === "pipeline"    && <TabPipeline />}
      {tab === "obras"       && <TabObras />}
      {tab === "operacional" && <TabOperacional atividades={atividades} obras={obras} />}
    </div>
  );
}
