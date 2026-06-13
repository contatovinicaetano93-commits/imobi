import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CreditCard,
  BarChart3,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  HardHat,
} from "lucide-react";
import { obrasApi, creditoApi, type ObraResumo, type CreditoResumo, type EtapaResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Dashboard — imbobi" };

function decodeJwt(token: string): { role?: string; exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice(0, (4 - base64.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
  } catch { return null; }
}

function decodeRole(token: string): string | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  // Reject expired tokens — fall through to login redirect
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return "__expired__";
  return decoded.role ?? null;
}

const STATUS_LABEL: Record<string, string> = {
  EM_EXECUCAO:         "Em andamento",
  EM_ANDAMENTO:        "Em andamento",
  PLANEJAMENTO:        "Planejamento",
  CONCLUIDA:           "Concluída",
  PAUSADA:             "Pausada",
  CANCELADA:           "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  EM_EXECUCAO:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PLANEJAMENTO: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  CONCLUIDA:    "bg-green-50 text-green-700 ring-1 ring-green-200",
  PAUSADA:      "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  CANCELADA:    "bg-red-50 text-red-600 ring-1 ring-red-200",
};

export default async function DashboardPage() {
  // Redirect non-TOMADOR roles to their dedicated panels
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  const role = token ? decodeRole(token) : null;

  if (!token || role === "__expired__") redirect("/login");
  if (role === "ADMIN")       redirect("/dashboard/admin");
  if (role === "GESTOR")      redirect("/dashboard/gestor");
  if (role === "ENGENHEIRO")  redirect("/dashboard/engenheiro");
  if (role === "COMERCIAL" || role === "PARCEIRO") redirect("/dashboard/comercial");
  if (role === "GESTOR_OBRA") redirect("/dashboard/engenheiro");

  const [obras, creditos] = await Promise.all([
    obrasApi.listar().catch(() => [] as ObraResumo[]),
    creditoApi.meus().catch(() => [] as CreditoResumo[]),
  ]);

  const ativas = obras.filter((o: ObraResumo) => o.status === "EM_EXECUCAO" || o.status === "EM_ANDAMENTO");
  const creditoAtivo = creditos.find((c: CreditoResumo) => c.status === "ATIVO");
  const saldoDisponivel = creditoAtivo
    ? Number(creditoAtivo.valorAprovado) - Number(creditoAtivo.valorLiberado)
    : 0;
  const totalEtapas = obras.flatMap((o: ObraResumo) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e: EtapaResumo) => e.status === "CONCLUIDA" || e.status === "APROVADA");
  const etapasAguardando = totalEtapas.filter((e: EtapaResumo) => e.status === "AGUARDANDO_VISTORIA");
  const pctEtapas = totalEtapas.length
    ? Math.round((etapasAprovadas.length / totalEtapas.length) * 100)
    : 0;

  const kpis = [
    {
      label: "Crédito disponível",
      value: formatarBRL(saldoDisponivel),
      sub: creditoAtivo ? "crédito ativo" : "sem crédito ativo",
      icon: CreditCard,
      topColor: "bg-[#1B4FD8]",
      iconBg: "bg-blue-50",
      iconColor: "text-[#1B4FD8]",
      valueColor: "text-[#1B4FD8]",
    },
    {
      label: "Obras ativas",
      value: String(ativas.length),
      sub: `${obras.length} no total`,
      icon: Building2,
      topColor: "bg-[#16a34a]",
      iconBg: "bg-green-50",
      iconColor: "text-[#16a34a]",
      valueColor: "text-[#16a34a]",
    },
    {
      label: "Etapas concluídas",
      value: `${etapasAprovadas.length}/${totalEtapas.length}`,
      sub: totalEtapas.length ? `${pctEtapas}% do total` : "Nenhuma etapa",
      icon: TrendingUp,
      topColor: "bg-gray-300",
      iconBg: "bg-gray-50",
      iconColor: "text-gray-500",
      valueColor: "text-gray-900",
    },
    {
      label: "Aguardando vistoria",
      value: String(etapasAguardando.length),
      sub: "etapas pendentes",
      icon: Clock,
      topColor: "bg-yellow-400",
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
      valueColor: "text-gray-900",
    },
  ];

  const quickActions = [
    { label: "Obras ativas",  icon: Building2, href: "/dashboard/obras",     bg: "bg-[#1B4FD8] hover:bg-blue-800",   color: "text-white" },
    { label: "Crédito",       icon: CreditCard, href: "/dashboard/credito",   bg: "bg-[#16a34a] hover:bg-green-700",  color: "text-white" },
    { label: "Simulador",     icon: BarChart3,  href: "/dashboard/simulador", bg: "bg-[#1B4FD8] hover:bg-blue-800",   color: "text-white" },
    { label: "Documentos",    icon: FileText,   href: "/dashboard/kyc",       bg: "bg-[#16a34a] hover:bg-green-700",  color: "text-white" },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
        Visão Geral
      </h1>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex flex-col items-center justify-center gap-2.5 py-5 px-3 rounded-2xl ${action.bg} ${action.color} shadow-sm hover:shadow-md transition-all duration-200 min-h-[96px]`}
              >
                <Icon className="w-6 h-6 shrink-0 opacity-90 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-xs font-semibold text-center leading-tight">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className={`h-1 w-full ${kpi.topColor}`} />
              <div className="p-5 flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${kpi.iconBg} shrink-0`}>
                  <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 truncate">
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-bold tracking-tight leading-none ${kpi.valueColor}`}>
                    {kpi.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{kpi.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Obras em andamento */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Obras em andamento</h2>
          <Link
            href="/dashboard/obras"
            className="flex items-center gap-1 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 transition-colors"
          >
            Ver todas
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {ativas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <HardHat className="w-10 h-10 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700 mb-1">Nenhuma obra em andamento</p>
              <p className="text-sm text-gray-400">Cadastre sua primeira obra para começar.</p>
            </div>
            <Link
              href="/dashboard/obras/nova"
              className="mt-1 inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-200"
            >
              <Building2 className="w-4 h-4" />
              Cadastrar obra
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {ativas.map((obra: ObraResumo, i: number) => (
              <Link
                key={obra.id}
                href={`/dashboard/obras/${obra.id}`}
                className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div className="min-w-0 mr-4">
                  <p className="font-semibold text-gray-900 text-sm truncate">{obra.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {obra.credito
                      ? `${formatarBRL(Number(obra.credito.valorLiberado))} liberado`
                      : "sem crédito vinculado"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[obra.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABEL[obra.status] ?? obra.status.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#16a34a] rounded-full transition-all"
                        style={{ width: `${obra.progresso ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-8 text-right">
                      {obra.progresso ?? 0}%
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
