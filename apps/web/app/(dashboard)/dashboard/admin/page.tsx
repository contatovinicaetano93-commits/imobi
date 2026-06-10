"use client";

import { useEffect, useState } from "react";
import { Users, Building2, CreditCard, ShieldCheck, Settings, ChevronRight, Copy, Eye, EyeOff, RefreshCw, AlertTriangle } from "lucide-react";

const TEST_USERS = [
  { role: "ADMIN",      email: "admin@imobi.com.br",      senha: "Admin@123",    label: "Administrador",    color: "#7c3aed", bg: "#f5f3ff" },
  { role: "GESTOR",     email: "gestor@imobi.com.br",     senha: "Gestor@123",   label: "Gestor de Fundo",  color: "#1B4FD8", bg: "#eff6ff" },
  { role: "ENGENHEIRO", email: "eng@imobi.com.br",        senha: "Eng@123",      label: "Engenheiro",       color: "#0369a1", bg: "#f0f9ff" },
  { role: "TOMADOR",    email: "tomador@imobi.com.br",    senha: "Tomador@123",  label: "Tomador (cliente)",color: "#16a34a", bg: "#f0fdf4" },
  { role: "COMERCIAL",  email: "comercial@imobi.com.br",  senha: "Comercial@123",label: "Comercial",        color: "#d97706", bg: "#fffbeb" },
];

type SystemStats = {
  totalUsuarios: number;
  totalObras: number;
  totalCreditos: number;
  creditosAtivos: number;
};

export default function AdminPage() {
  const [showSenhas, setShowSenhas] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    fetch("/api/proxy/admin/stats")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d) => setStats(d ?? { totalUsuarios: "–", totalObras: "–", totalCreditos: "–", creditosAtivos: "–" } as unknown as SystemStats));
  }, []);

  function copiar(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function toggleSenha(email: string) {
    setShowSenhas((p) => ({ ...p, [email]: !p[email] }));
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de usuários, sistema e credenciais de teste</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/admin/usuarios" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors">
            <Users className="w-4 h-4" /> Usuários
          </a>
          <a href="/dashboard/admin/configuracoes" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors hover:opacity-90" style={{ background: "#1B4FD8" }}>
            <Settings className="w-4 h-4" /> Configurações
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,     label: "Usuários",        val: stats?.totalUsuarios,  color: "#1B4FD8" },
          { icon: Building2, label: "Obras",            val: stats?.totalObras,     color: "#0369a1" },
          { icon: CreditCard,label: "Créditos",         val: stats?.totalCreditos,  color: "#7c3aed" },
          { icon: ShieldCheck,label:"Créditos ativos",  val: stats?.creditosAtivos, color: "#16a34a" },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "15" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{val ?? "–"}</p>
          </div>
        ))}
      </div>

      {/* Test Credentials */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Credenciais de Teste — ambiente DEV</p>
            <p className="text-xs text-amber-600">Não usar em produção. Criar usuários reais via painel de usuários.</p>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {TEST_USERS.map((u) => (
            <div key={u.email} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: u.bg, color: u.color }}>
                {u.role.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{u.label}</p>
                <p className="text-xs text-gray-500 font-mono">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
                <span>{showSenhas[u.email] ? u.senha : "•".repeat(u.senha.length)}</span>
                <button onClick={() => toggleSenha(u.email)} className="text-gray-400 hover:text-gray-600">
                  {showSenhas[u.email] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                onClick={() => copiar(`${u.email} / ${u.senha}`, u.email)}
                className="shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied === u.email ? "Copiado!" : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/admin/usuarios",        icon: Users,     title: "Gerenciar Usuários",    desc: "Criar, editar e desativar contas",     color: "#1B4FD8" },
          { href: "/dashboard/admin/configuracoes",   icon: Settings,  title: "Configurações",         desc: "Taxas, limites e parâmetros do sistema", color: "#7c3aed" },
          { href: "/dashboard/gestor",                icon: ShieldCheck,title:"Painel Gestor",          desc: "Aprovação de etapas e KYC",             color: "#0369a1" },
        ].map(({ href, icon: Icon, title, desc, color }) => (
          <a key={href} href={href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "15" }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </a>
        ))}
      </div>

      {/* System Links */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Acessos rápidos por perfil</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/dashboard",            label: "Início",         role: "Tomador" },
            { href: "/dashboard/obras",      label: "Obras",          role: "Tomador" },
            { href: "/dashboard/engenheiro", label: "Vistorias",      role: "Engenheiro" },
            { href: "/dashboard/gestor",     label: "Gestor",         role: "Gestor" },
            { href: "/dashboard/fundos",     label: "Fundos",         role: "Gestor" },
            { href: "/dashboard/relatorios", label: "Relatórios",     role: "Gestor" },
            { href: "/dashboard/comercial",  label: "Comercial",      role: "Comercial" },
            { href: "/dashboard/construtor", label: "Construtor",     role: "Construtor" },
          ].map(({ href, label, role }) => (
            <a key={href} href={href} className="flex flex-col gap-1 p-3 rounded-xl border border-gray-100 hover:border-[#1B4FD8] hover:bg-blue-50 transition-colors">
              <span className="text-sm font-semibold text-gray-900">{label}</span>
              <span className="text-xs text-gray-400">{role}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
