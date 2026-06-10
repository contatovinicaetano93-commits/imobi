"use client";

import { useEffect, useState } from "react";
import { Users, Search, Plus, MoreHorizontal, Shield, Wrench, Building2, User, ChevronLeft, RefreshCw } from "lucide-react";

type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  criadoEm: string;
  ultimoAcesso?: string;
};

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<{className?:string}> }> = {
  ADMIN:      { label: "Admin",      color: "#7c3aed", bg: "#f5f3ff", icon: Shield },
  GESTOR:     { label: "Gestor",     color: "#1B4FD8", bg: "#eff6ff", icon: Shield },
  ENGENHEIRO: { label: "Engenheiro", color: "#0369a1", bg: "#f0f9ff", icon: Wrench },
  TOMADOR:    { label: "Tomador",    color: "#16a34a", bg: "#f0fdf4", icon: Building2 },
  COMERCIAL:  { label: "Comercial",  color: "#d97706", bg: "#fffbeb", icon: User },
  CONSTRUTOR: { label: "Construtor", color: "#0891b2", bg: "#ecfeff", icon: Building2 },
};

const MOCK: UsuarioAdmin[] = [
  { id: "1", nome: "Admin Sistema",    email: "admin@imobi.com.br",     tipo: "ADMIN",      ativo: true,  criadoEm: "2025-01-01" },
  { id: "2", nome: "João Gestor",      email: "gestor@imobi.com.br",    tipo: "GESTOR",     ativo: true,  criadoEm: "2025-02-10", ultimoAcesso: "2026-06-10" },
  { id: "3", nome: "Carlos Eng.",      email: "eng@imobi.com.br",       tipo: "ENGENHEIRO", ativo: true,  criadoEm: "2025-03-15", ultimoAcesso: "2026-06-09" },
  { id: "4", nome: "Maria Tomadora",   email: "tomador@imobi.com.br",   tipo: "TOMADOR",    ativo: true,  criadoEm: "2025-04-20", ultimoAcesso: "2026-06-08" },
  { id: "5", nome: "Pedro Comercial",  email: "comercial@imobi.com.br", tipo: "COMERCIAL",  ativo: false, criadoEm: "2025-05-05" },
];

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");

  useEffect(() => {
    fetch("/api/proxy/admin/usuarios")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d) => setUsuarios(d ?? MOCK))
      .finally(() => setLoading(false));
  }, []);

  const filtrado = usuarios.filter((u) => {
    const matchBusca = u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "TODOS" || u.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  function formatDate(d?: string) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <a href="/dashboard/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4FD8] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Admin
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">Usuários</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} contas cadastradas</p>
        </div>
        <button className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity" style={{ background: "#1B4FD8" }}>
          <Plus className="w-4 h-4" /> Novo usuário
        </button>
      </div>

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
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">Último acesso</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrado.map((u) => {
                const cfg = TIPO_CONFIG[u.tipo] ?? { label: u.tipo, color: "#6b7280", bg: "#f9fafb", icon: User };
                const Icon = cfg.icon;
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                          {u.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.nome}</p>
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
                    <td className="px-5 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDate(u.criadoEm)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 hidden lg:table-cell">{formatDate(u.ultimoAcesso)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.ativo ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
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
    </div>
  );
}
