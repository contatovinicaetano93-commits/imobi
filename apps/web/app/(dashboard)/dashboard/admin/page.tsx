"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  CreditCard,
  ShieldCheck,
  Settings,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Banknote,
  Wrench,
  FileCheck2,
  Activity,
  ListChecks,
  Megaphone,
} from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { AdminOverview, AtividadeRecente } from "@/lib/api";

const TEST_USERS = [
  { role: "ADMIN",      email: "admin@imobi.com.br",      senha: "Admin@123",    label: "Administrador",    color: "#7c3aed", bg: "#f5f3ff" },
  { role: "GESTOR",     email: "gestor@imobi.com.br",     senha: "Gestor@123",   label: "Gestor de Fundo",  color: "#1B4FD8", bg: "#eff6ff" },
  { role: "ENGENHEIRO", email: "eng@imobi.com.br",        senha: "Eng@123",      label: "Engenheiro",       color: "#0369a1", bg: "#f0f9ff" },
  { role: "TOMADOR",    email: "tomador@imobi.com.br",    senha: "Tomador@123",  label: "Tomador (cliente)",color: "#16a34a", bg: "#f0fdf4" },
  { role: "COMERCIAL",  email: "comercial@imobi.com.br",  senha: "Comercial@123",label: "Comercial",        color: "#d97706", bg: "#fffbeb" },
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
  { id: "a1", tipo: "ETAPA_APROVADA",   descricao: "Etapa Fundação aprovada — Residencial Vila Nova (liberação de R$ 96.000 na fila)", criadoEm: new Date(Date.now() - 14 * 60_000).toISOString() },
  { id: "a2", tipo: "KYC_ENVIADO",      descricao: "Novo documento KYC enviado para análise — usuário T. Almeida", criadoEm: new Date(Date.now() - 42 * 60_000).toISOString() },
  { id: "a3", tipo: "EVIDENCIA_GPS",    descricao: "Evidência fotográfica validada por GPS (PostGIS) — Sobrado Jd. das Acácias", criadoEm: new Date(Date.now() - 2 * 3_600_000).toISOString() },
  { id: "a4", tipo: "CREDITO_SOLICITADO", descricao: "Nova solicitação de crédito — R$ 280.000 / 36 meses", criadoEm: new Date(Date.now() - 5 * 3_600_000).toISOString() },
  { id: "a5", tipo: "VISITA_CONCLUIDA", descricao: "Vistoria de engenharia concluída — etapa Estrutura", criadoEm: new Date(Date.now() - 8 * 3_600_000).toISOString() },
];

function tempoRelativo(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

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

  function toggleSenha(email: string) {
    setShowSenhas((p) => ({ ...p, [email]: !p[email] }));
  }

  const ov = overview ?? DEMO_OVERVIEW;
  const pctLiberado = ov.creditoAprovado > 0 ? Math.round((ov.creditoLiberado / ov.creditoAprovado) * 100) : 0;
  const pendenciasTotal = ov.kycPendentes + ov.etapasPendentes + ov.filaLiberacao;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Centro de Comando</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral de toda a operação IMOBI</p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              Dados de demonstração
            </span>
          )}
          <a href="/dashboard/admin/usuarios" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors">
            <Users className="w-4 h-4" /> Usuários
          </a>
          <a href="/dashboard/admin/configuracoes" className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors hover:opacity-90" style={{ background: "#1B4FD8" }}>
            <Settings className="w-4 h-4" /> Configurações
          </a>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Users,     label: "Usuários",       val: String(ov.totalUsuarios),          color: "#1B4FD8", sub: "contas na plataforma" },
          { icon: Building2, label: "Obras ativas",   val: `${ov.obrasAtivas}`,               color: "#0369a1", sub: `de ${ov.obrasTotal} no total` },
          { icon: CreditCard,label: "Crédito aprovado", val: formatarBRL(ov.creditoAprovado), color: "#7c3aed", sub: "carteira total" },
          { icon: Banknote,  label: "Crédito liberado", val: formatarBRL(ov.creditoLiberado), color: "#16a34a", sub: `${pctLiberado}% do aprovado` },
        ].map(({ icon: Icon, label, val, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "14" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums">{val}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Pendências + Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fila de pendências */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-[#1B4FD8]" />
            <h2 className="text-sm font-semibold text-gray-900">Pendências da operação</h2>
            {pendenciasTotal > 0 && (
              <span className="ml-auto text-xs font-bold text-white bg-[#1B4FD8] px-2 py-0.5 rounded-full tabular-nums">{pendenciasTotal}</span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { href: "/dashboard/gestor/kyc",    icon: FileCheck2,  label: "KYC aguardando análise",        count: ov.kycPendentes },
              { href: "/dashboard/gestor/etapas", icon: ShieldCheck, label: "Etapas aguardando aprovação",    count: ov.etapasPendentes },
              { href: "/dashboard/engenheiro",    icon: Wrench,      label: "Vistorias agendadas",            count: ov.visitasAgendadas },
              { href: "/dashboard/gestor",        icon: Banknote,    label: "Liberações na fila (BullMQ)",    count: ov.filaLiberacao },
            ].map(({ href, icon: Icon, label, count }) => (
              <a key={label} href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${count > 0 ? "text-[#1B4FD8]" : "text-gray-300"}`}>{count}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Atividade recente */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#16a34a]" />
            <h2 className="text-sm font-semibold text-gray-900">Atividade recente</h2>
          </div>
          {!atividades ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Carregando…</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {atividades.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0" />
                  <p className="flex-1 text-sm text-gray-700 leading-snug">{a.descricao}</p>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">{tempoRelativo(a.criadoEm)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Nav por módulo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/admin/usuarios",      icon: Users,      title: "Gerenciar Usuários", desc: "Criar, editar e desativar contas de staff e clientes", color: "#1B4FD8" },
          { href: "/dashboard/admin/configuracoes", icon: Settings,   title: "Configurações",      desc: "Taxas, limites e parâmetros do sistema",               color: "#7c3aed" },
          { href: "/dashboard/gestor",              icon: ShieldCheck,title: "Painel Gestor",      desc: "Aprovação de etapas, KYC e liberações",                color: "#0369a1" },
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

      {/* Acessos por perfil */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Acessos rápidos por perfil</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <a key={href} href={href} className="flex flex-col gap-1 p-3 rounded-xl border border-gray-100 hover:border-[#1B4FD8] hover:bg-blue-50 transition-colors">
              <span className="text-sm font-semibold text-gray-900">{label}</span>
              <span className="text-xs text-gray-400">{role}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Credenciais de teste */}
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
    </div>
  );
}
