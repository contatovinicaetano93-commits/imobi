"use client";

import { useEffect, useState } from "react";
import {
  Users, Building2, CreditCard, ShieldCheck, Settings, ChevronRight,
  Copy, Eye, EyeOff, AlertTriangle, Banknote, Wrench, FileCheck2,
  Activity, ListChecks, Megaphone,
} from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { AdminOverview, AtividadeRecente } from "@/lib/api";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

const TEST_USERS = [
  { role: "ADMIN",      email: "admin@imobi.com.br",      senha: "Admin@123",      label: "Administrador" },
  { role: "GESTOR",     email: "gestor@imobi.com.br",     senha: "Gestor@123",     label: "Gestor de Fundo" },
  { role: "ENGENHEIRO", email: "eng@imobi.com.br",         senha: "Eng@123",        label: "Engenheiro" },
  { role: "COMERCIAL",  email: "comercial@imobi.com.br",  senha: "Comercial@123",  label: "Comercial" },
  { role: "CONSTRUTOR", email: "construtor@imobi.com.br", senha: "Construtor@123", label: "Construtor" },
];

const DEMO_OVERVIEW: AdminOverview = {
  totalUsuarios: 142,
  obrasAtivas: 23,
  obrasTotal: 61,
  creditoAprovado: 8_450_000,
  creditoLiberado: 5_120_000,
  kycPendentes: 7,
  etapasPendentes: 12,
  visitasAgendadas: 9,
  filaLiberacao: 3,
};

const DEMO_ATIVIDADES: AtividadeRecente[] = [
  { id: "a1", tipo: "ETAPA_APROVADA",    descricao: "Etapa Fundação aprovada — Residencial Vila Nova (liberação de R$ 96.000 na fila)",   criadoEm: new Date(Date.now() - 14 * 60_000).toISOString() },
  { id: "a2", tipo: "KYC_ENVIADO",       descricao: "Novo documento KYC enviado para análise — usuário T. Almeida",                       criadoEm: new Date(Date.now() - 42 * 60_000).toISOString() },
  { id: "a3", tipo: "EVIDENCIA_GPS",     descricao: "Evidência fotográfica validada por GPS (PostGIS) — Sobrado Jd. das Acácias",         criadoEm: new Date(Date.now() - 2 * 3_600_000).toISOString() },
  { id: "a4", tipo: "CREDITO_SOLICITADO",descricao: "Nova solicitação de crédito — R$ 280.000 / 36 meses",                               criadoEm: new Date(Date.now() - 5 * 3_600_000).toISOString() },
  { id: "a5", tipo: "VISITA_CONCLUIDA",  descricao: "Vistoria de engenharia concluída — etapa Estrutura",                                 criadoEm: new Date(Date.now() - 8 * 3_600_000).toISOString() },
];

function tempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const card: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(12,26,61,0.08)",
  borderRadius: 16,
  overflow: "hidden",
};

const jost: React.CSSProperties = { fontFamily: "'Jost', sans-serif" };

export default function AdminPage() {
  const [showSenhas, setShowSenhas] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [atividades, setAtividades] = useState<AtividadeRecente[] | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/admin/overview")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: AdminOverview | null) => {
        if (d) { setOverview(d); } else { setOverview(DEMO_OVERVIEW); setIsDemo(true); }
      });
    fetch("/api/proxy/admin/atividades?limit=8")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: AtividadeRecente[] | null) => setAtividades(d && d.length > 0 ? d : DEMO_ATIVIDADES));
  }, []);

  function copiar(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const ov = overview ?? DEMO_OVERVIEW;
  const pctLiberado = ov.creditoAprovado > 0 ? Math.round((ov.creditoLiberado / ov.creditoAprovado) * 100) : 0;
  const pendenciasTotal = ov.kycPendentes + ov.etapasPendentes + ov.filaLiberacao;

  return (
    <div style={{ ...jost, maxWidth: 1024 }} className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: MINT, ...jost }}>
            Admin
          </p>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3rem)",
            color: NAVY, letterSpacing: "0.02em", lineHeight: 1.05, marginTop: 4,
          }}>
            CENTRO DE COMANDO
          </h1>
          <p style={{ ...jost, fontSize: "0.84rem", color: "rgba(12,26,61,0.45)", marginTop: 4 }}>
            Visão geral de toda a operação IMOBI
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDemo && (
            <span style={{
              ...jost, display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.72rem", fontWeight: 600, color: "#92400e",
              background: "#fffbeb", border: "1px solid #fde68a",
              padding: "0.35rem 0.85rem", borderRadius: 999,
            }}>
              <AlertTriangle size={12} /> Demonstração
            </span>
          )}
          <a href="/dashboard/admin/usuarios" style={{
            ...jost, display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.8rem", fontWeight: 600, color: NAVY,
            border: `1px solid rgba(12,26,61,0.18)`, background: "white",
            padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none",
          }}>
            <Users size={13} /> Usuários
          </a>
          <a href="/dashboard/admin/configuracoes" style={{
            ...jost, display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.8rem", fontWeight: 700, color: "white",
            background: NAVY, padding: "0.45rem 1rem", borderRadius: 10, textDecoration: "none",
          }}>
            <Settings size={13} /> Configurações
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {overview === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={card} className="p-5">
                <div className="w-full h-3 bg-gray-100 rounded animate-pulse mb-3" />
                <div className="w-20 h-7 bg-gray-100 rounded animate-pulse" />
              </div>
            ))
          : [
              { label: "Usuários",          val: String(ov.totalUsuarios),           sub: "contas na plataforma", accent: NAVY,  icon: Users },
              { label: "Obras ativas",      val: `${ov.obrasAtivas}/${ov.obrasTotal}`, sub: "obras no total",     accent: ROYAL, icon: Building2 },
              { label: "Crédito aprovado",  val: formatarBRL(ov.creditoAprovado),    sub: "carteira total",       accent: NAVY,  icon: CreditCard },
              { label: "Liberado",          val: formatarBRL(ov.creditoLiberado),    sub: `${pctLiberado}% do aprovado`, accent: MINT, icon: Banknote },
            ].map(({ label, val, sub, accent, icon: Icon }) => (
              <div key={label} style={{ ...card, borderLeft: `3px solid ${accent}`, padding: "1.1rem 1.25rem" }}>
                <p style={{ ...jost, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(12,26,61,0.4)", marginBottom: 8 }}>
                  {label}
                </p>
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(1.4rem,3vw,1.9rem)", color: NAVY, lineHeight: 1 }}>
                  {val}
                </p>
                <p style={{ ...jost, fontSize: "0.7rem", color: "rgba(12,26,61,0.38)", marginTop: 5 }}>{sub}</p>
              </div>
            ))
        }
      </div>

      {/* Pendências + Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fila de pendências */}
        <div style={card}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
            <ListChecks size={14} color={ROYAL} />
            <span style={{ ...jost, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>Pendências da operação</span>
            {pendenciasTotal > 0 && (
              <span style={{ marginLeft: "auto", ...jost, fontSize: "0.7rem", fontWeight: 700, color: "white", background: ROYAL, padding: "0.15rem 0.55rem", borderRadius: 999 }}>
                {pendenciasTotal}
              </span>
            )}
          </div>
          <div>
            {[
              { href: "/dashboard/gestor/kyc",    icon: FileCheck2,  label: "KYC aguardando análise",     count: ov.kycPendentes },
              { href: "/dashboard/gestor/etapas", icon: ShieldCheck, label: "Etapas aguardando aprovação", count: ov.etapasPendentes },
              { href: "/dashboard/engenheiro",    icon: Wrench,      label: "Vistorias agendadas",         count: ov.visitasAgendadas },
              { href: "/dashboard/gestor",        icon: Banknote,    label: "Liberações na fila (BullMQ)", count: ov.filaLiberacao },
            ].map(({ href, icon: Icon, label, count }) => (
              <a key={label} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "0.75rem 1.25rem",
                borderBottom: "1px solid rgba(12,26,61,0.04)",
                textDecoration: "none",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(12,26,61,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <Icon size={13} color="rgba(12,26,61,0.3)" style={{ flexShrink: 0 }} />
                <span style={{ ...jost, flex: 1, fontSize: "0.8rem", color: NAVY }}>{label}</span>
                <span style={{ ...jost, fontSize: "0.82rem", fontWeight: 700, color: count > 0 ? ROYAL : "rgba(12,26,61,0.2)" }}>{count}</span>
                <ChevronRight size={12} color="rgba(12,26,61,0.2)" />
              </a>
            ))}
          </div>
        </div>

        {/* Atividade recente */}
        <div style={{ ...card, gridColumn: "span 2" }} className="lg:col-span-2">
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={14} color={MINT} />
            <span style={{ ...jost, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>Atividade recente</span>
          </div>
          {!atividades ? (
            <p style={{ ...jost, padding: "2.5rem", textAlign: "center", fontSize: "0.82rem", color: "rgba(12,26,61,0.3)" }}>Carregando…</p>
          ) : (
            <div>
              {atividades.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "0.8rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.04)" }}>
                  <span style={{ marginTop: 7, width: 6, height: 6, borderRadius: "50%", background: MINT, flexShrink: 0, display: "block" }} />
                  <p style={{ ...jost, flex: 1, fontSize: "0.8rem", color: "rgba(12,26,61,0.7)", lineHeight: 1.5 }}>{a.descricao}</p>
                  <span style={{ ...jost, fontSize: "0.7rem", color: "rgba(12,26,61,0.3)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{tempoRelativo(a.criadoEm)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acesso rápido por módulo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/admin/usuarios",      icon: Users,       title: "Gerenciar Usuários", desc: "Criar, editar e desativar contas de staff e clientes", accent: NAVY },
          { href: "/dashboard/admin/configuracoes", icon: Settings,    title: "Configurações",      desc: "Taxas, limites e parâmetros do sistema",               accent: ROYAL },
          { href: "/dashboard/gestor",              icon: ShieldCheck, title: "Painel Gestor",      desc: "Aprovação de etapas, KYC e liberações",                accent: MINT },
        ].map(({ href, icon: Icon, title, desc, accent }) => (
          <a key={href} href={href} style={{
            ...card, display: "flex", alignItems: "center", gap: 16, padding: "1.1rem 1.25rem",
            textDecoration: "none", borderLeft: `3px solid ${accent}`,
            transition: "box-shadow 0.15s",
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(12,26,61,0.10)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={17} color={accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...jost, fontWeight: 600, fontSize: "0.84rem", color: NAVY }}>{title}</p>
              <p style={{ ...jost, fontSize: "0.72rem", color: "rgba(12,26,61,0.42)", marginTop: 2 }}>{desc}</p>
            </div>
            <ChevronRight size={14} color="rgba(12,26,61,0.2)" />
          </a>
        ))}
      </div>

      {/* Acessos rápidos por perfil */}
      <div style={card}>
        <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)" }}>
          <p style={{ ...jost, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>Acessos por perfil</p>
        </div>
        <div style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {[
            { href: "/dashboard",            label: "Início",       role: "Tomador",    icon: Building2 },
            { href: "/dashboard/obras",      label: "Obras",        role: "Tomador",    icon: Building2 },
            { href: "/dashboard/engenheiro", label: "Engenharia",   role: "Engenheiro", icon: Wrench },
            { href: "/dashboard/gestor",     label: "Gestor",       role: "Gestor",     icon: ShieldCheck },
            { href: "/dashboard/fundos",     label: "Fundos",       role: "Gestor",     icon: Banknote },
            { href: "/dashboard/relatorios", label: "Relatórios",   role: "Gestor",     icon: Activity },
            { href: "/dashboard/comercial",  label: "Parceiro",     role: "Comercial",  icon: Megaphone },
            { href: "/dashboard/construtor", label: "Construtor",   role: "Construtor", icon: Building2 },
          ].map(({ href, label, role }) => (
            <a key={href} href={href} style={{
              display: "flex", flexDirection: "column", gap: 2, padding: "0.65rem 0.85rem",
              borderRadius: 10, border: "1px solid rgba(12,26,61,0.08)",
              textDecoration: "none", transition: "border-color 0.12s, background 0.12s",
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = ROYAL; el.style.background = "rgba(27,79,216,0.04)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(12,26,61,0.08)"; el.style.background = "transparent"; }}
            >
              <span style={{ ...jost, fontSize: "0.8rem", fontWeight: 600, color: NAVY }}>{label}</span>
              <span style={{ ...jost, fontSize: "0.68rem", color: "rgba(12,26,61,0.38)" }}>{role}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Credenciais de teste */}
      <div style={{ ...card, border: "1px solid rgba(251,191,36,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.9rem 1.25rem", background: "rgba(254,243,199,0.6)", borderBottom: "1px solid rgba(251,191,36,0.25)" }}>
          <AlertTriangle size={15} color="#92400e" />
          <div>
            <p style={{ ...jost, fontSize: "0.8rem", fontWeight: 700, color: "#92400e" }}>Credenciais de Teste — ambiente DEV</p>
            <p style={{ ...jost, fontSize: "0.68rem", color: "#b45309" }}>Não usar em produção. Criar usuários reais via painel de usuários.</p>
          </div>
        </div>
        <div>
          {TEST_USERS.map((u) => (
            <div key={u.email} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "0.85rem 1.25rem",
              borderBottom: "1px solid rgba(12,26,61,0.05)",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "rgba(12,26,61,0.07)", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "0.75rem", color: NAVY,
              }}>
                {u.role.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ ...jost, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>{u.label}</p>
                <p style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(12,26,61,0.45)" }}>{u.email}</p>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: "monospace", fontSize: "0.8rem", color: NAVY,
                background: "rgba(12,26,61,0.04)", border: "1px solid rgba(12,26,61,0.08)",
                padding: "0.3rem 0.75rem", borderRadius: 8,
              }}>
                <span>{showSenhas[u.email] ? u.senha : "•".repeat(u.senha.length)}</span>
                <button onClick={() => setShowSenhas((p) => ({ ...p, [u.email]: !p[u.email] }))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(12,26,61,0.35)", padding: 0, display: "flex" }}>
                  {showSenhas[u.email] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
              <button
                onClick={() => copiar(`${u.email} / ${u.senha}`, u.email)}
                style={{
                  ...jost, display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
                  padding: "0.3rem 0.75rem", borderRadius: 8,
                  border: `1px solid ${copied === u.email ? MINT : "rgba(12,26,61,0.12)"}`,
                  color: copied === u.email ? "#16a34a" : NAVY,
                  background: copied === u.email ? "rgba(74,222,128,0.08)" : "white",
                  transition: "all 0.15s",
                }}
              >
                <Copy size={11} />
                {copied === u.email ? "Copiado!" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
