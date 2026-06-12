"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Users, Building2, ShieldCheck, Settings,
  Copy, Eye, EyeOff, AlertTriangle, FileCheck2,
  Activity, TrendingUp, TrendingDown, BarChart3, AlertCircle,
  Clock, Zap, ArrowRight, Target, Banknote,
} from "lucide-react";
import { formatarBRL } from "@imbobi/core";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

const j: CSSProperties = { fontFamily: "'Jost', sans-serif" };
const bc: CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };
const card: CSSProperties = { background: "white", border: "1px solid rgba(12,26,61,0.08)", borderRadius: 16, overflow: "hidden" };

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO = {
  portfolio: {
    carteiraAtiva: 42_800_000,
    meta: 100_000_000,
    metaData: "dez/2026",
    desembolsado: 28_500_000,
    aDesembolsar: 14_300_000,
    taxaMediaPonderada: 1.72,
    taxaMeta: 1.8,
    spreadEfetivo: 0.84,
    receitaJuros: 487_600,
    receitaEstruturacao: 1_284_000,
    receitaOperacional: 2_996_000,
    receitaProjetada: 5_200_000,
    ebitdaRealizado: 3_016_000,
    ebitdaProjetado: 4_576_000,
    ebitdaMeta: 65.6,
    ebitdaMargem: 63.8,
    ticketMedioPorOperacao: 2_140_000,
    ticketMedioPorIncorporadora: 5_350_000,
    operacoesAtivas: 20,
  },
  risco: {
    inadimplencia: [
      { aging: "15 dias", valor: 180_000, pct: 0.42 },
      { aging: "30 dias", valor: 95_000,  pct: 0.22 },
      { aging: "60 dias", valor: 40_000,  pct: 0.09 },
      { aging: "90+ dias",valor: 12_000,  pct: 0.03 },
    ],
    pdd: 85_000,
    concentracao: [
      { nome: "Construtora Alpha",   valor: 8_500_000, pct: 19.9 },
      { nome: "Incorporadora Beta",  valor: 7_200_000, pct: 16.8 },
      { nome: "Grupo Gama",          valor: 5_100_000, pct: 11.9 },
      { nome: "Delta Empreend.",     valor: 3_800_000, pct: 8.9  },
    ],
    ltvMedio: 68.2,
    coberturaGarantias: 142.5,
    watchlist: 2,
    covenantsViolados: 1,
  },
  pipeline: {
    funil: [
      { etapa: "Lead",       qtde: 23, valor: 67_000_000 },
      { etapa: "Análise",    qtde: 14, valor: 41_000_000 },
      { etapa: "Aprovação",  qtde: 8,  valor: 27_000_000 },
      { etapa: "Contrato",   qtde: 5,  valor: 18_000_000 },
      { etapa: "Desembolso", qtde: 3,  valor: 9_000_000  },
    ],
    taxaConversao: 13.0,
    cicloMedioDias: 45,
    incorporadorasAtivas: 8,
    pipelineTotal: 137_000_000,
  },
  obras: [
    { nome: "Residencial Vila Nova",     fisicoP: 45, financeiroP: 38, status: "ATRASADO",  trancheData: "2026-06-28", trancheValor: 96_000  },
    { nome: "Sobrado Jd. das Acácias",   fisicoP: 62, financeiroP: 64, status: "NO_PRAZO",  trancheData: "2026-07-10", trancheValor: 120_000 },
    { nome: "Edifício Central Park",     fisicoP: 28, financeiroP: 22, status: "ADIANTADO", trancheData: "2026-07-22", trancheValor: 240_000 },
    { nome: "Condomínio Sol Nascente",   fisicoP: 81, financeiroP: 80, status: "NO_PRAZO",  trancheData: "2026-08-15", trancheValor: 85_000  },
    { nome: "Townhouses Lote 7",         fisicoP: 15, financeiroP: 9,  status: "ATRASADO",  trancheData: "2026-07-05", trancheValor: 180_000 },
    { nome: "Conj. Residencial Ipê",     fisicoP: 53, financeiroP: 52, status: "NO_PRAZO",  trancheData: "2026-07-30", trancheValor: 145_000 },
  ],
  operacional: {
    aprovacoes: [
      { tipo: "Crédito",    desc: "Solicitação R$ 400k — Construhome Ltda.",   urgencia: "ALTA",  data: new Date(Date.now() - 3_600_000 * 2).toISOString()  },
      { tipo: "Desembolso", desc: "Liberação parcela #3 — Vila Nova",          urgencia: "MEDIA", data: new Date(Date.now() - 3_600_000 * 5).toISOString()  },
      { tipo: "Tranche",    desc: "Etapa Estrutura concluída — Central Park",  urgencia: "BAIXA", data: new Date(Date.now() - 3_600_000 * 12).toISOString() },
    ],
    kyc: [
      { nome: "Rodrigo M.",   email: "rodrigo@construhome.com", etapa: "Docs enviados",          dias: 4 },
      { nome: "Fernanda O.",  email: "fernanda@inco.com.br",   etapa: "Verificação em andamento", dias: 7 },
      { nome: "Paulo S.",     email: "paulo@construtecn.com",  etapa: "Aguardando documentos",    dias: 1 },
    ],
    documentosVencendo: [
      { doc: "Alvará de Construção", obra: "Jd. das Acácias",  venc: "2026-07-15" },
      { doc: "ART Engenharia",       obra: "Townhouses Lote 7", venc: "2026-06-25" },
      { doc: "Matrícula Atualizada", obra: "Edif. Central Park",venc: "2026-08-01" },
    ],
    auditoria: [
      { acao: "Aprovação de etapa",  usuario: "gestor@imobi.com.br",  desc: "Etapa Fundação — Jd. Acácias", data: new Date(Date.now() - 3_600_000 * 1).toISOString() },
      { acao: "KYC aprovado",        usuario: "admin@imobi.com.br",   desc: "Rodrigo M. — Construhome",     data: new Date(Date.now() - 3_600_000 * 3).toISOString() },
      { acao: "Taxa alterada",       usuario: "admin@imobi.com.br",   desc: "Taxa padrão 1.89% → 1.72%",   data: new Date(Date.now() - 3_600_000 * 8).toISOString() },
      { acao: "Usuário bloqueado",   usuario: "admin@imobi.com.br",   desc: "Conta Fornecedor XYZ",         data: new Date(Date.now() - 3_600_000 * 24).toISOString() },
    ],
    logs: [
      { servico: "SES Email",    status: "OK",   exec: "há 2 min",  msg: "27 emails entregues" },
      { servico: "BullMQ",       status: "OK",   exec: "há 8 min",  msg: "3 jobs na fila, 0 falhos" },
      { servico: "PostGIS GPS",  status: "OK",   exec: "há 12 min", msg: "Validação GPS ativa" },
      { servico: "Webhook S3",   status: "WARN", exec: "há 1h",     msg: "Timeout em 2 uploads" },
    ],
  },
  credenciais: [
    { role: "ADMIN",      email: "admin@imobi.com.br",      senha: "Admin@123",      label: "Administrador" },
    { role: "GESTOR",     email: "gestor@imobi.com.br",     senha: "Gestor@123",     label: "Gestor de Fundo" },
    { role: "ENGENHEIRO", email: "eng@imobi.com.br",         senha: "Eng@123",        label: "Engenheiro" },
    { role: "COMERCIAL",  email: "comercial@imobi.com.br",  senha: "Comercial@123",  label: "Comercial" },
    { role: "CONSTRUTOR", email: "construtor@imobi.com.br", senha: "Construtor@123", label: "Construtor" },
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

function KpiCard({ label, value, sub, accent = NAVY, delta, children }: {
  label: string; value: string; sub?: string; accent?: string; delta?: number; children?: ReactNode;
}) {
  return (
    <div style={{ ...card, borderLeft: `3px solid ${accent}`, padding: "1.1rem 1.25rem" }}>
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

// ─── Tab Views ────────────────────────────────────────────────────────────────

function TabPortfolio() {
  const p = DEMO.portfolio;
  const metaPct = Math.round((p.carteiraAtiva / p.meta) * 100);
  const receitaTotal = p.receitaJuros + p.receitaEstruturacao + p.receitaOperacional;
  const ebitdaPct = p.ebitdaMargem;

  return (
    <div className="space-y-6">
      {/* Carteira */}
      <div style={card}>
        <SectionHeader title="Carteira Ativa" icon={<TrendingUp size={14} color={MINT} />} />
        <div style={{ padding: "1.25rem" }} className="space-y-4">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <div>
              <p style={{ ...bc, fontWeight: 800, fontSize: "clamp(1.8rem,3.5vw,2.4rem)", color: NAVY, lineHeight: 1 }}>
                {formatarBRL(p.carteiraAtiva)}
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
        <KpiCard label="Ticket Méd./Operação" value={formatarBRL(p.ticketMedioPorOperacao)} sub={`${p.operacoesAtivas} operações ativas`} accent={NAVY} />
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
            { label: "Operações ativas",       val: `${DEMO.portfolio.operacoesAtivas}` },
            { label: "Incorporadoras",         val: `${DEMO.pipeline.incorporadorasAtivas}` },
            { label: "Pipeline total",         val: formatarBRL(DEMO.pipeline.pipelineTotal) },
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
              <Bar pct={(pct / 1) * 20} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
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
            const widthPct = Math.round((qtde / maxQtde) * 100);
            const convPct = i > 0 ? Math.round((qtde / pl.funil[i-1].qtde) * 100) : 100;
            return (
              <div key={etapa}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5 }}>
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
                  <div style={{ textAlign: "right", minWidth: 110 }}>
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
              const pct = Math.round((val / DEMO.portfolio.carteiraAtiva) * 100);
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
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="No Prazo"   value={String(noPrazo)}   sub="obras" accent={MINT} />
        <KpiCard label="Atrasadas"  value={String(atrasadas)} sub="obras" accent="#dc2626" />
        <KpiCard label="Adiantadas" value={String(adiantadas)}sub="obras" accent={ROYAL} />
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

function TabOperacional() {
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
        <div key={u.email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.8rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.05)" }}>
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
          <a href="/dashboard/admin/usuarios" style={{ ...j, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 600, color: NAVY, border: "1px solid rgba(12,26,61,0.18)", background: "white", padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none" }}>
            <Users size={13} /> Usuários
          </a>
          <a href="/dashboard/admin/configuracoes" style={{ ...j, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 700, color: "white", background: NAVY, padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none" }}>
            <Settings size={13} /> Configurações
          </a>
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
              padding: "0.6rem 1rem", fontSize: "0.8rem", fontWeight: tab === id ? 700 : 500,
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
      {tab === "portfolio"   && <TabPortfolio />}
      {tab === "risco"       && <TabRisco />}
      {tab === "pipeline"    && <TabPipeline />}
      {tab === "obras"       && <TabObras />}
      {tab === "operacional" && <TabOperacional />}
    </div>
  );
}
