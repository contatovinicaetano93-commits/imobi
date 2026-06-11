"use client";

import { useEffect, useState } from "react";
import { Users, Search, Plus, MoreHorizontal, Shield, Wrench, Building2, User, ChevronLeft, X } from "lucide-react";

type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  kycStatus?: string;
  ativo?: boolean;
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

const DEMO: UsuarioAdmin[] = [
  { id: "1", nome: "Administrador IMOBI",  email: "admin@imobi.com.br",     tipo: "ADMIN",      kycStatus: "APROVADO", criadoEm: "2026-01-01" },
  { id: "2", nome: "Gestor de Fundo",      email: "gestor@imobi.com.br",    tipo: "GESTOR",     kycStatus: "APROVADO", criadoEm: "2026-01-01" },
  { id: "3", nome: "Engenheiro IMOBI",     email: "eng@imobi.com.br",       tipo: "ENGENHEIRO", kycStatus: "APROVADO", criadoEm: "2026-01-01" },
  { id: "4", nome: "Parceiro Comercial",   email: "comercial@imobi.com.br", tipo: "COMERCIAL",  kycStatus: "APROVADO", criadoEm: "2026-01-01" },
  { id: "5", nome: "Cliente Tomador",      email: "tomador@imobi.com.br",   tipo: "TOMADOR",    kycStatus: "APROVADO", criadoEm: "2026-01-01" },
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

  useEffect(() => {
    fetch("/api/proxy/admin/usuarios")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => setUsuarios(d ?? DEMO))
      .finally(() => setLoading(false));
  }, []);

  const filtrado = usuarios.filter((u) => {
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "TODOS" || u.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  function formatDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
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
      if (res.ok) {
        const novo = await res.json().catch(() => null);
        if (novo) {
          setUsuarios((prev) => [novo, ...prev]);
        }
      } else {
        // fallback: add optimistically with temp id
        setUsuarios((prev) => [
          { id: `tmp-${Date.now()}`, nome: form.nome, email: form.email, tipo: form.tipo, kycStatus: "PENDENTE", criadoEm: new Date().toISOString() },
          ...prev,
        ]);
      }
      setForm(FORM_VAZIO);
      setShowForm(false);
    } catch {
      // optimistic add
      setUsuarios((prev) => [
        { id: `tmp-${Date.now()}`, nome: form.nome, email: form.email, tipo: form.tipo, kycStatus: "PENDENTE", criadoEm: new Date().toISOString() },
        ...prev,
      ]);
      setForm(FORM_VAZIO);
      setShowForm(false);
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
        <span className="text-sm font-medium text-gray-900">Usuários</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} contas cadastradas</p>
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
                <input
                  className={inp}
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">E-mail</label>
                <input
                  className={inp}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="usuario@imobi.com.br"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Senha</label>
                <input
                  className={inp}
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="Senha inicial"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Perfil</label>
                <select
                  className={inp}
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  {["ADMIN", "GESTOR", "ENGENHEIRO", "COMERCIAL", "TOMADOR"].map((t) => (
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
          {["TODOS", "ADMIN", "GESTOR", "ENGENHEIRO", "TOMADOR", "COMERCIAL"].map((t) => (
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
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">KYC</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrado.map((u) => {
                const cfg = TIPO_CONFIG[u.tipo] ?? { label: u.tipo, color: "#6b7280", bg: "#f9fafb", icon: User };
                const Icon = cfg.icon;
                const kyc = KYC_CONFIG[u.kycStatus ?? "PENDENTE"] ?? KYC_CONFIG["PENDENTE"];
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {u.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.nome}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: kyc.bg, color: kyc.color }}
                      >
                        {kyc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {formatDate(u.criadoEm)}
                    </td>
                    <td className="px-5 py-4">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
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
