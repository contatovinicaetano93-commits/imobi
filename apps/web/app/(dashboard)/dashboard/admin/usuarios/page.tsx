"use client";

import { Fragment, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Users, Search, Plus, Shield, Wrench, Building2, User, ChevronLeft, X,
  Lock, Unlock, Ban, CheckCircle2, SlidersHorizontal, ChevronDown, ChevronUp,
  HardHat, CreditCard, Phone, Trash2,
} from "lucide-react";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: string;
  kycStatus?: string;
  bloqueadoEm?: string | null;
  funcoesBloqueadas?: string[];
  totalObras?: number;
  totalCreditos?: number;
  criadoEm: string;
};

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  ADMIN:        { label: "Admin",         color: NAVY,      bg: "rgba(12,26,61,0.07)",  icon: Shield },
  GESTOR:       { label: "Gestor de Fundo", color: ROYAL,     bg: "rgba(27,79,216,0.08)", icon: Shield },
  GESTOR_FUNDO: { label: "Gestor de Fundo", color: ROYAL,     bg: "rgba(27,79,216,0.08)", icon: Shield },
  ENGENHEIRO:   { label: "Engenheiro",    color: "#0369a1", bg: "#f0f9ff",              icon: Wrench },
  TOMADOR:      { label: "Tomador",       color: "#16a34a", bg: "#f0fdf4",              icon: Building2 },
  COMERCIAL:    { label: "Comercial",     color: "#d97706", bg: "#fffbeb",              icon: User },
  CONSTRUTOR:   { label: "Construtor",    color: "#0891b2", bg: "#ecfeff",              icon: Building2 },
};

const KYC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  APROVADO:       { label: "Aprovado",   color: "#16a34a", bg: "#f0fdf4" },
  PENDENTE:       { label: "Pendente",   color: "#d97706", bg: "#fffbeb" },
  EM_VERIFICACAO: { label: "Em análise", color: ROYAL,     bg: "rgba(27,79,216,0.07)" },
  REJEITADO:      { label: "Rejeitado",  color: "#dc2626", bg: "#fef2f2" },
};

const FUNCAO_LABELS: Record<string, string> = {
  "obras":         "Minhas Obras",
  "credito":       "Crédito",
  "simulador":     "Simulador",
  "score":         "Score",
  "kyc":           "Documentos (KYC)",
  "notificacoes":  "Notificações",
  "engenharia":    "Painel Engenharia",
  "gestor":        "Operações (Gestor)",
  "due-diligence": "Due Diligence",
  "fundos":        "Portfolio",
  "relatorios":    "Relatórios",
  "comercial":     "Painel Comercial",
  "construtor":    "Painel Construtor",
};

const FUNCOES_POR_TIPO: Record<string, string[]> = {
  TOMADOR:    ["obras", "credito", "simulador", "score", "kyc", "notificacoes"],
  GESTOR:       ["gestor", "due-diligence", "fundos", "relatorios", "notificacoes"],
  GESTOR_FUNDO: ["gestor", "due-diligence", "fundos", "relatorios", "notificacoes"],
  ENGENHEIRO: ["engenharia", "notificacoes"],
  COMERCIAL:  ["comercial", "notificacoes"],
  CONSTRUTOR: ["obras", "construtor", "notificacoes"],
};

const DEMO: UsuarioAdmin[] = [
  { id: "1", nome: "Administrador IMOBI",  email: "admin@imobi.com.br",      tipo: "ADMIN",      kycStatus: "APROVADO", criadoEm: "2026-01-01", funcoesBloqueadas: [] },
  { id: "2", nome: "Gestor de Fundo",      email: "gestor@imobi.com.br",     tipo: "GESTOR",     kycStatus: "APROVADO", criadoEm: "2026-01-01", funcoesBloqueadas: [] },
  { id: "3", nome: "Engenheiro IMOBI",     email: "eng@imobi.com.br",        tipo: "ENGENHEIRO", kycStatus: "APROVADO", criadoEm: "2026-01-01", funcoesBloqueadas: [] },
  { id: "4", nome: "Parceiro Comercial",   email: "comercial@imobi.com.br",  tipo: "COMERCIAL",  kycStatus: "APROVADO", criadoEm: "2026-01-01", funcoesBloqueadas: [] },
  { id: "5", nome: "Construtor IMOBI",     email: "construtor@imobi.com.br", tipo: "CONSTRUTOR", kycStatus: "APROVADO", criadoEm: "2026-01-01", funcoesBloqueadas: [] },
];

type NovoUsuarioForm = { nome: string; email: string; senha: string; tipo: string };
const FORM_VAZIO: NovoUsuarioForm = { nome: "", email: "", senha: "", tipo: "TOMADOR" };

const jost: CSSProperties = { fontFamily: "'Jost', sans-serif" };
const card: CSSProperties = { background: "white", border: "1px solid rgba(12,26,61,0.08)", borderRadius: 16, overflow: "hidden" };
const inp = "w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent bg-white";

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NovoUsuarioForm>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [gerenciando, setGerenciando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/admin/usuarios")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => setUsuarios(Array.isArray(d) ? d : DEMO))
      .finally(() => setLoading(false));
  }, []);

  const filtrado = usuarios.filter((u) => {
    const matchBusca = u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "TODOS" || u.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const totalBloqueados = usuarios.filter((u) => u.bloqueadoEm).length;

  function formatDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  }

  async function patchUsuario(id: string, body: Record<string, unknown>) {
    setSalvando(id);
    setErroAcao("");
    try {
      const res = await fetch(`/api/proxy/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErroAcao((json as { message?: string })?.message ?? "Erro ao salvar alteração.");
        return;
      }
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...(json ?? body) } : u)));
    } catch {
      setErroAcao("Erro de conexão ao salvar.");
    } finally {
      setSalvando(null);
    }
  }

  function toggleBloqueioConta(u: UsuarioAdmin) {
    const bloquear = !u.bloqueadoEm;
    if (bloquear && !window.confirm(`Bloquear a conta de ${u.nome}? O usuário perderá o acesso imediatamente.`)) return;
    patchUsuario(u.id, { bloqueado: bloquear });
  }

  function toggleFuncao(u: UsuarioAdmin, funcao: string) {
    const atuais = u.funcoesBloqueadas ?? [];
    const novas = atuais.includes(funcao) ? atuais.filter((f) => f !== funcao) : [...atuais, funcao];
    patchUsuario(u.id, { funcoesBloqueadas: novas });
  }

  function alterarTipo(u: UsuarioAdmin, tipo: string) {
    if (tipo === u.tipo) return;
    patchUsuario(u.id, { tipo });
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha) { setErroForm("Preencha nome, e-mail e senha."); return; }
    setCriando(true);
    setErroForm("");
    try {
      const res = await fetch("/api/proxy/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const novo = await res.json().catch(() => null);
      if (res.ok && novo) {
        setUsuarios((prev) => [novo, ...prev]);
        setForm(FORM_VAZIO);
        setShowForm(false);
      } else {
        setErroForm((novo as { message?: string })?.message ?? "Erro ao criar usuário.");
      }
    } catch {
      setErroForm("Erro de conexão ao criar usuário.");
    } finally {
      setCriando(false);
    }
  }

  async function handleExcluir(id: string) {
    setExcluindo(true);
    setErroAcao("");
    try {
      const res = await fetch(`/api/proxy/admin/usuarios/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErroAcao((json as { message?: string })?.message ?? "Erro ao excluir usuário.");
        return;
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      setGerenciando(null);
      setConfirmDeleteId(null);
    } catch {
      setErroAcao("Erro de conexão ao excluir usuário.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div style={{ ...jost, maxWidth: 960 }} className="space-y-6">

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a href="/dashboard/admin" style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "rgba(12,26,61,0.4)", textDecoration: "none" }}>
          <ChevronLeft size={14} /> Admin
        </a>
        <span style={{ color: "rgba(12,26,61,0.2)" }}>/</span>
        <span style={{ ...jost, fontSize: "0.78rem", fontWeight: 600, color: NAVY }}>Usuários & Fiscalização</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p style={{ ...jost, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: MINT }}>Admin</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,4vw,2.5rem)", color: NAVY, lineHeight: 1.05 }}>
            USUÁRIOS
          </h1>
          <p style={{ ...jost, fontSize: "0.8rem", color: "rgba(12,26,61,0.42)", marginTop: 3 }}>
            {usuarios.length} contas cadastradas
            {totalBloqueados > 0 && <span style={{ marginLeft: 8, color: "#dc2626", fontWeight: 700 }}>· {totalBloqueados} bloqueada{totalBloqueados > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setErroForm(""); }}
          style={{
            ...jost, display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: "0.8rem", fontWeight: 700, color: "white",
            background: showForm ? "rgba(12,26,61,0.6)" : NAVY,
            padding: "0.5rem 1.1rem", borderRadius: 10, border: "none", cursor: "pointer",
            transition: "background 0.15s", flexShrink: 0,
          }}
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? "Cancelar" : "Criar usuário"}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div style={card}>
          <div style={{ padding: "0.9rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)" }}>
            <p style={{ ...jost, fontSize: "0.82rem", fontWeight: 600, color: NAVY }}>Novo usuário</p>
          </div>
          <form onSubmit={handleCriar} style={{ padding: "1.25rem" }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "nome",  label: "Nome",   type: "text",  placeholder: "Nome completo" },
                { key: "email", label: "E-mail", type: "email", placeholder: "usuario@imobi.com.br" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label style={{ ...jost, display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 6 }}>{label}</label>
                  <input className={inp} style={{ fontFamily: "'Jost', sans-serif" }} type={type} placeholder={placeholder} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} required />
                </div>
              ))}
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 6 }}>Senha</label>
                <div style={{ position: "relative" }}>
                  <input className={inp} style={{ fontFamily: "'Jost', sans-serif", paddingRight: "2.5rem" }} type={showSenha ? "text" : "password"} placeholder="Senha inicial" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} required />
                  <button type="button" onClick={() => setShowSenha(v => !v)} tabIndex={-1} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(12,26,61,0.4)", lineHeight: 1, padding: 4 }} aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}>
                    {showSenha
                      ? <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ ...jost, display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(12,26,61,0.45)", marginBottom: 6 }}>Perfil</label>
                <select className={inp} style={{ fontFamily: "'Jost', sans-serif" }} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  {["ADMIN", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR", "TOMADOR"].map((t) => (
                    <option key={t} value={t}>{TIPO_CONFIG[t]?.label ?? t}</option>
                  ))}
                </select>
              </div>
            </div>
            {erroForm && <p style={{ ...jost, fontSize: "0.78rem", color: "#dc2626" }}>{erroForm}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={criando}
                style={{ ...jost, fontSize: "0.8rem", fontWeight: 700, color: "white", background: NAVY, padding: "0.5rem 1.25rem", borderRadius: 10, border: "none", cursor: "pointer", opacity: criando ? 0.6 : 1 }}
              >
                {criando ? "Criando..." : "Criar usuário"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} color="rgba(12,26,61,0.35)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...jost, width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, border: "1px solid rgba(12,26,61,0.12)", borderRadius: 10, fontSize: "0.82rem", outline: "none", color: NAVY }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["TODOS", "ADMIN", "GESTOR", "GESTOR_FUNDO", "ENGENHEIRO", "TOMADOR", "COMERCIAL", "CONSTRUTOR"].map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              style={{
                ...jost, fontSize: "0.72rem", fontWeight: 600,
                padding: "0.4rem 0.75rem", borderRadius: 8, cursor: "pointer", transition: "all 0.12s",
                border: filtroTipo === t ? `1px solid ${NAVY}` : "1px solid rgba(12,26,61,0.12)",
                background: filtroTipo === t ? NAVY : "white",
                color: filtroTipo === t ? "white" : "rgba(12,26,61,0.5)",
              }}
            >
              {t === "TODOS" ? "Todos" : (TIPO_CONFIG[t]?.label ?? t)}
            </button>
          ))}
        </div>
      </div>

      {erroAcao && (
        <p style={{ ...jost, fontSize: "0.8rem", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.75rem 1rem" }}>{erroAcao}</p>
      )}

      {/* Table */}
      <div style={card}>
        {loading ? (
          <p style={{ ...jost, padding: "3rem", textAlign: "center", fontSize: "0.82rem", color: "rgba(12,26,61,0.3)" }}>Carregando...</p>
        ) : filtrado.length === 0 ? (
          <p style={{ ...jost, padding: "3rem", textAlign: "center", fontSize: "0.82rem", color: "rgba(12,26,61,0.3)" }}>Nenhum usuário encontrado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(12,26,61,0.07)", background: "rgba(12,26,61,0.02)" }}>
                {["Usuário", "Perfil", "Status", "KYC", "Cadastro", ""].map((h, i) => (
                  <th key={i} style={{
                    ...jost, textAlign: "left", fontSize: "0.6rem", fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "rgba(12,26,61,0.35)", padding: "0.75rem 1.1rem",
                    display: ["Perfil","Status","KYC","Cadastro"].includes(h) ? undefined : undefined,
                  }}
                    className={["Status","KYC","Cadastro"].includes(h) ? "hidden lg:table-cell" : h === "Perfil" ? "hidden md:table-cell" : ""}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrado.map((u) => {
                const cfg = TIPO_CONFIG[u.tipo] ?? { label: u.tipo, color: "#6b7280", bg: "#f9fafb", icon: User };
                const Icon = cfg.icon;
                const kyc = KYC_CONFIG[u.kycStatus ?? "PENDENTE"] ?? KYC_CONFIG["PENDENTE"];
                const bloqueado = !!u.bloqueadoEm;
                const aberto = gerenciando === u.id;
                const funcoesDoTipo = FUNCOES_POR_TIPO[u.tipo] ?? [];
                const nFuncoesBloq = (u.funcoesBloqueadas ?? []).filter((f) => funcoesDoTipo.includes(f)).length;
                return (
                  <Fragment key={u.id}>
                    <tr style={{
                      borderBottom: "1px solid rgba(12,26,61,0.05)",
                      background: bloqueado ? "rgba(220,38,38,0.03)" : aberto ? "rgba(27,79,216,0.03)" : "transparent",
                      transition: "background 0.1s",
                    }}>
                      <td style={{ padding: "0.85rem 1.1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: cfg.bg, color: cfg.color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "0.72rem",
                            opacity: bloqueado ? 0.5 : 1,
                          }}>
                            {u.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ ...jost, fontSize: "0.82rem", fontWeight: 600, color: bloqueado ? "rgba(12,26,61,0.35)" : NAVY, textDecoration: bloqueado ? "line-through" : "none" }}>{u.nome}</p>
                            <p style={{ ...jost, fontSize: "0.7rem", color: "rgba(12,26,61,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1.1rem" }} className="hidden md:table-cell">
                        <span style={{
                          ...jost, display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: "0.7rem", fontWeight: 700,
                          padding: "0.25rem 0.65rem", borderRadius: 999,
                          background: cfg.bg, color: cfg.color,
                        }}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1.1rem" }} className="hidden lg:table-cell">
                        {bloqueado ? (
                          <span style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: 999, background: "#fef2f2", color: "#dc2626" }}>
                            <Ban size={10} /> Bloqueado
                          </span>
                        ) : nFuncoesBloq > 0 ? (
                          <span style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: 999, background: "#fffbeb", color: "#d97706" }}>
                            <Lock size={10} /> {nFuncoesBloq} restrita{nFuncoesBloq > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: 999, background: "rgba(74,222,128,0.12)", color: "#16a34a" }}>
                            <CheckCircle2 size={10} /> Ativo
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1.1rem" }} className="hidden lg:table-cell">
                        <span style={{ ...jost, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: 999, background: kyc.bg, color: kyc.color }}>
                          {kyc.label}
                        </span>
                      </td>
                      <td style={{ ...jost, padding: "0.85rem 1.1rem", fontSize: "0.78rem", color: "rgba(12,26,61,0.4)" }} className="hidden lg:table-cell">
                        {formatDate(u.criadoEm)}
                      </td>
                      <td style={{ padding: "0.85rem 1.1rem" }}>
                        <button
                          onClick={() => setGerenciando(aberto ? null : u.id)}
                          style={{
                            ...jost, display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: "0.72rem", fontWeight: 600,
                            padding: "0.35rem 0.75rem", borderRadius: 8, cursor: "pointer",
                            border: aberto ? `1px solid ${NAVY}` : "1px solid rgba(12,26,61,0.12)",
                            background: aberto ? NAVY : "white",
                            color: aberto ? "white" : "rgba(12,26,61,0.5)",
                            transition: "all 0.12s",
                          }}
                        >
                          <SlidersHorizontal size={11} />
                          Gerenciar
                          {aberto ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        </button>
                      </td>
                    </tr>

                    {aberto && (
                      <tr>
                        <td colSpan={6} style={{ padding: "0 1.1rem 1.1rem", background: "rgba(27,79,216,0.02)" }}>
                          <div style={{ background: "white", border: "1px solid rgba(12,26,61,0.08)", borderRadius: 12, padding: "1.25rem" }} className="space-y-5">
                            {/* Info linha */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem" }}>
                              {[
                                { icon: Phone,    val: u.telefone || "—" },
                                { icon: HardHat,  val: `${u.totalObras ?? 0} obra${(u.totalObras ?? 0) !== 1 ? "s" : ""}` },
                                { icon: CreditCard, val: `${u.totalCreditos ?? 0} crédito${(u.totalCreditos ?? 0) !== 1 ? "s" : ""}` },
                              ].map(({ icon: Icon, val }) => (
                                <span key={val} style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "rgba(12,26,61,0.5)" }}>
                                  <Icon size={13} color="rgba(12,26,61,0.3)" /> {val}
                                </span>
                              ))}
                              {u.bloqueadoEm && (
                                <span style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
                                  <Ban size={13} /> Bloqueado em {formatDate(u.bloqueadoEm)}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* Conta */}
                              <div className="space-y-3">
                                <p style={{ ...jost, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(12,26,61,0.35)" }}>Conta</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <label style={{ ...jost, fontSize: "0.78rem", color: "rgba(12,26,61,0.5)" }}>Perfil:</label>
                                  <select
                                    style={{ ...jost, fontSize: "0.8rem", border: "1px solid rgba(12,26,61,0.12)", borderRadius: 8, padding: "0.3rem 0.75rem", background: "white", color: NAVY, outline: "none" }}
                                    value={u.tipo}
                                    disabled={salvando === u.id}
                                    onChange={(e) => alterarTipo(u, e.target.value)}
                                  >
                                    {["ADMIN", "GESTOR", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR", "TOMADOR"].map((t) => (
                                      <option key={t} value={t}>{TIPO_CONFIG[t]?.label ?? t}</option>
                                    ))}
                                  </select>
                                </div>
                                <button
                                  onClick={() => toggleBloqueioConta(u)}
                                  disabled={salvando === u.id}
                                  style={{
                                    ...jost, display: "inline-flex", alignItems: "center", gap: 6,
                                    fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                                    padding: "0.45rem 1rem", borderRadius: 10,
                                    border: bloqueado ? "1px solid #bbf7d0" : "1px solid #fecaca",
                                    background: bloqueado ? "#f0fdf4" : "#fef2f2",
                                    color: bloqueado ? "#16a34a" : "#dc2626",
                                    opacity: salvando === u.id ? 0.5 : 1,
                                    transition: "all 0.12s",
                                  }}
                                >
                                  {bloqueado ? <Unlock size={13} /> : <Ban size={13} />}
                                  {salvando === u.id ? "Salvando..." : bloqueado ? "Desbloquear conta" : "Bloquear conta"}
                                </button>
                                <p style={{ ...jost, fontSize: "0.7rem", color: "rgba(12,26,61,0.35)", lineHeight: 1.5 }}>
                                  Bloquear a conta derruba as sessões ativas e impede novo login até a liberação.
                                </p>
                              </div>

                              {/* Funções */}
                              <div className="space-y-3">
                                <p style={{ ...jost, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(12,26,61,0.35)" }}>Funções do painel</p>
                                {u.tipo === "ADMIN" ? (
                                  <p style={{ ...jost, fontSize: "0.78rem", color: "rgba(12,26,61,0.4)" }}>Contas ADMIN têm acesso total — funções não podem ser restritas.</p>
                                ) : funcoesDoTipo.length === 0 ? (
                                  <p style={{ ...jost, fontSize: "0.78rem", color: "rgba(12,26,61,0.4)" }}>Nenhuma função controlável para este perfil.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {funcoesDoTipo.map((f) => {
                                      const fBloqueada = (u.funcoesBloqueadas ?? []).includes(f);
                                      return (
                                        <button
                                          key={f}
                                          onClick={() => toggleFuncao(u, f)}
                                          disabled={salvando === u.id}
                                          style={{
                                            ...jost, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                                            fontSize: "0.8rem", cursor: "pointer",
                                            padding: "0.65rem 0.85rem", borderRadius: 8,
                                            border: fBloqueada ? "1px solid #fecaca" : "1px solid rgba(12,26,61,0.08)",
                                            background: fBloqueada ? "#fef2f2" : "rgba(12,26,61,0.02)",
                                            color: fBloqueada ? "#dc2626" : NAVY,
                                            opacity: salvando === u.id ? 0.5 : 1,
                                            transition: "all 0.12s",
                                          }}
                                        >
                                          <span style={{ fontWeight: 500 }}>{FUNCAO_LABELS[f] ?? f}</span>
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", fontWeight: 700 }}>
                                            {fBloqueada ? (
                                              <><Lock size={10} /> Bloqueada</>
                                            ) : (
                                              <><Unlock size={10} color="#16a34a" /> <span style={{ color: "#16a34a" }}>Liberada</span></>
                                            )}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                <p style={{ ...jost, fontSize: "0.7rem", color: "rgba(12,26,61,0.35)", lineHeight: 1.5 }}>
                                  Funções bloqueadas somem do menu do usuário no próximo login (até 15 min para sessões ativas).
                                </p>
                              </div>
                            </div>

                            {/* Danger zone */}
                            <div style={{ borderTop: "1px solid rgba(220,38,38,0.15)", paddingTop: "1rem" }}>
                              <p style={{ ...jost, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#dc2626", marginBottom: "0.75rem" }}>Zona de risco</p>
                              {confirmDeleteId === u.id ? (
                                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.85rem 1rem" }}>
                                  <p style={{ ...jost, fontSize: "0.8rem", fontWeight: 600, color: "#dc2626", margin: "0 0 4px" }}>Excluir conta de {u.nome}?</p>
                                  <p style={{ ...jost, fontSize: "0.72rem", color: "#9ca3af", margin: "0 0 0.75rem" }}>Esta ação é permanente e não pode ser desfeita.</p>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() => handleExcluir(u.id)}
                                      disabled={excluindo}
                                      style={{ ...jost, fontSize: "0.78rem", fontWeight: 700, background: "#dc2626", color: "white", border: "none", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer", opacity: excluindo ? 0.6 : 1 }}
                                    >
                                      {excluindo ? "Excluindo..." : "Sim, excluir conta"}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      style={{ ...jost, fontSize: "0.78rem", fontWeight: 600, background: "white", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer" }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(u.id)}
                                  disabled={salvando === u.id}
                                  style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", padding: "0.45rem 1rem", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", opacity: salvando === u.id ? 0.5 : 1, transition: "all 0.12s" }}
                                >
                                  <Trash2 size={13} /> Excluir conta
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && usuarios.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <Users size={36} color="rgba(12,26,61,0.12)" style={{ margin: "0 auto 12px" }} />
          <p style={{ ...jost, fontSize: "0.82rem", color: "rgba(12,26,61,0.3)" }}>Nenhuma conta cadastrada ainda.</p>
        </div>
      )}
    </div>
  );
}
