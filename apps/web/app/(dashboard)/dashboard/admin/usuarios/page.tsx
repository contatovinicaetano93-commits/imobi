"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Users, Search, Plus, Shield, Wrench, Building2, User, ChevronLeft, X,
  Lock, Unlock, Ban, CheckCircle2, SlidersHorizontal, ChevronDown, ChevronUp,
  HardHat, CreditCard, Phone,
} from "lucide-react";

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

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  ADMIN:      { label: "Admin",      color: "#7c3aed", bg: "#f5f3ff", icon: Shield },
  GESTOR:     { label: "Gestor",     color: "#1B4FD8", bg: "#eff6ff", icon: Shield },
  ENGENHEIRO: { label: "Engenheiro", color: "#0369a1", bg: "#f0f9ff", icon: Wrench },
  TOMADOR:    { label: "Tomador",    color: "#16a34a", bg: "#f0fdf4", icon: Building2 },
  COMERCIAL:  { label: "Comercial",  color: "#d97706", bg: "#fffbeb", icon: User },
  CONSTRUTOR: { label: "Construtor", color: "#0891b2", bg: "#ecfeff", icon: Building2 },
};

const KYC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  APROVADO:       { label: "Aprovado",    color: "#16a34a", bg: "#f0fdf4" },
  PENDENTE:       { label: "Pendente",    color: "#d97706", bg: "#fffbeb" },
  EM_VERIFICACAO: { label: "Em análise",  color: "#1B4FD8", bg: "#eff6ff" },
  REJEITADO:      { label: "Rejeitado",   color: "#dc2626", bg: "#fef2f2" },
};

// Rótulos das funções controláveis pelo admin (chaves = FUNCOES_PAINEL do @imbobi/schemas)
const FUNCAO_LABELS: Record<string, string> = {
  "obras":         "Minhas Obras",
  "credito":       "Crédito",
  "simulador":     "Simulador",
  "score":         "Score",
  "kyc":           "Documentos (KYC)",
  "notificacoes":  "Notificações",
  "engenharia":    "Painel Engenharia",
  "gestor":        "Painel Gestor",
  "due-diligence": "Due Diligence",
  "fundos":        "Fundos",
  "relatorios":    "Relatórios",
  "comercial":     "Painel Comercial",
  "construtor":    "Painel Construtor",
};

// Funções relevantes por perfil (espelha o menu lateral de cada painel)
const FUNCOES_POR_TIPO: Record<string, string[]> = {
  TOMADOR:    ["obras", "credito", "simulador", "score", "kyc", "notificacoes"],
  GESTOR:     ["gestor", "due-diligence", "fundos", "relatorios", "notificacoes"],
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

const inp = "w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent bg-white";

type NovoUsuarioForm = {
  nome: string;
  email: string;
  senha: string;
  tipo: string;
};

const FORM_VAZIO: NovoUsuarioForm = { nome: "", email: "", senha: "", tipo: "TOMADOR" };

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NovoUsuarioForm>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [erroForm, setErroForm] = useState("");
  const [gerenciando, setGerenciando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState("");

  useEffect(() => {
    fetch("/api/proxy/admin/usuarios")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => setUsuarios(Array.isArray(d) ? d : DEMO))
      .finally(() => setLoading(false));
  }, []);

  const filtrado = usuarios.filter((u) => {
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase());
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
      if (json) {
        setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...json } : u)));
      }
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
    const novas = atuais.includes(funcao)
      ? atuais.filter((f) => f !== funcao)
      : [...atuais, funcao];
    patchUsuario(u.id, { funcoesBloqueadas: novas });
  }

  function alterarTipo(u: UsuarioAdmin, tipo: string) {
    if (tipo === u.tipo) return;
    patchUsuario(u.id, { tipo });
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha) {
      setErroForm("Preencha nome, e-mail e senha.");
      return;
    }
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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <a href="/dashboard/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4FD8] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Admin
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">Usuários & Fiscalização</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {usuarios.length} contas cadastradas
            {totalBloqueados > 0 && (
              <span className="ml-2 text-red-600 font-semibold">· {totalBloqueados} bloqueada{totalBloqueados > 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); setErroForm(""); }}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity"
          style={{ background: "#1B4FD8" }}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancelar" : "Criar usuário"}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Novo usuário</h2>
          <form onSubmit={handleCriar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nome</label>
                <input className={inp} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">E-mail</label>
                <input className={inp} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="usuario@imobi.com.br" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Senha</label>
                <input className={inp} type="password" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} placeholder="Senha inicial" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Perfil</label>
                <select className={inp} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  {["ADMIN", "GESTOR", "ENGENHEIRO", "COMERCIAL", "CONSTRUTOR", "TOMADOR"].map((t) => (
                    <option key={t} value={t}>{TIPO_CONFIG[t]?.label ?? t}</option>
                  ))}
                </select>
              </div>
            </div>
            {erroForm && <p className="text-xs text-red-600">{erroForm}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={criando}
                className="text-sm font-semibold px-5 py-2 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "#1B4FD8" }}
              >
                {criando ? "Criando..." : "Criar usuário"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "ADMIN", "GESTOR", "ENGENHEIRO", "TOMADOR", "COMERCIAL", "CONSTRUTOR"].map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                filtroTipo === t
                  ? "border-[#1B4FD8] bg-blue-50 text-[#1B4FD8]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {t === "TODOS" ? "Todos" : (TIPO_CONFIG[t]?.label ?? t)}
            </button>
          ))}
        </div>
      </div>

      {erroAcao && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{erroAcao}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : filtrado.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Usuário</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden md:table-cell">Perfil</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">KYC</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
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
                    <tr className={`transition-colors ${bloqueado ? "bg-red-50/40" : "hover:bg-gray-50"} ${aberto ? "bg-blue-50/40" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: cfg.bg, color: cfg.color, opacity: bloqueado ? 0.5 : 1 }}
                          >
                            {u.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${bloqueado ? "text-gray-400 line-through" : "text-gray-900"}`}>{u.nome}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {bloqueado ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                            <Ban className="w-3 h-3" /> Bloqueado
                          </span>
                        ) : nFuncoesBloq > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                            <Lock className="w-3 h-3" /> {nFuncoesBloq} função{nFuncoesBloq > 1 ? "ões" : ""} restrita{nFuncoesBloq > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: kyc.bg, color: kyc.color }}>
                          {kyc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 hidden lg:table-cell">
                        {formatDate(u.criadoEm)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setGerenciando(aberto ? null : u.id)}
                          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                            aberto
                              ? "border-[#1B4FD8] bg-blue-50 text-[#1B4FD8]"
                              : "border-gray-200 text-gray-600 hover:border-[#1B4FD8] hover:text-[#1B4FD8]"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Gerenciar
                          {aberto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>

                    {/* Painel de fiscalização */}
                    {aberto && (
                      <tr>
                        <td colSpan={6} className="px-5 pb-5 pt-1 bg-blue-50/40">
                          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
                            {/* Info do usuário */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                              <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{u.telefone || "—"}</span>
                              <span className="inline-flex items-center gap-1.5"><HardHat className="w-3.5 h-3.5 text-gray-400" />{u.totalObras ?? 0} obra{(u.totalObras ?? 0) !== 1 ? "s" : ""}</span>
                              <span className="inline-flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-gray-400" />{u.totalCreditos ?? 0} crédito{(u.totalCreditos ?? 0) !== 1 ? "s" : ""}</span>
                              {u.bloqueadoEm && (
                                <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                                  <Ban className="w-3.5 h-3.5" /> Bloqueado em {formatDate(u.bloqueadoEm)}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {/* Conta */}
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conta</p>
                                <div className="flex items-center gap-3">
                                  <label className="text-xs text-gray-500">Perfil:</label>
                                  <select
                                    className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
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
                                  className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
                                    bloqueado
                                      ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                  }`}
                                >
                                  {bloqueado ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                  {salvando === u.id ? "Salvando..." : bloqueado ? "Desbloquear conta" : "Bloquear conta"}
                                </button>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  Bloquear a conta derruba as sessões ativas e impede novo login até a liberação.
                                </p>
                              </div>

                              {/* Funções do painel */}
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Funções do painel</p>
                                {u.tipo === "ADMIN" ? (
                                  <p className="text-xs text-gray-400">Contas ADMIN têm acesso total — funções não podem ser restritas.</p>
                                ) : funcoesDoTipo.length === 0 ? (
                                  <p className="text-xs text-gray-400">Nenhuma função controlável para este perfil.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {funcoesDoTipo.map((f) => {
                                      const fBloqueada = (u.funcoesBloqueadas ?? []).includes(f);
                                      return (
                                        <button
                                          key={f}
                                          onClick={() => toggleFuncao(u, f)}
                                          disabled={salvando === u.id}
                                          className={`w-full flex items-center justify-between gap-2 text-sm px-3.5 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                                            fBloqueada
                                              ? "border-red-100 bg-red-50/60 text-red-600"
                                              : "border-gray-100 bg-gray-50/60 text-gray-700 hover:border-gray-200"
                                          }`}
                                        >
                                          <span className="font-medium">{FUNCAO_LABELS[f] ?? f}</span>
                                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                            {fBloqueada ? (
                                              <><Lock className="w-3.5 h-3.5" /> Bloqueada</>
                                            ) : (
                                              <><Unlock className="w-3.5 h-3.5 text-green-600" /> <span className="text-green-700">Liberada</span></>
                                            )}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  Funções bloqueadas somem do menu do usuário no próximo login (até 15 min para sessões ativas).
                                </p>
                              </div>
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

      {/* Users icon for empty state context */}
      {!loading && usuarios.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma conta cadastrada ainda.</p>
        </div>
      )}
    </div>
  );
}
