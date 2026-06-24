import type { Metadata } from "next";
import {
  engenheirosApi,
  engenheiroObraApi,
  type Visita,
  type ObraFinanceiro,
  type EtapaProjeto,
  type Licenca,
} from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { DynamicVisitQueueClient } from "./_components/DynamicVisitQueueClient";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { PanelToolbar } from "@/components/dashboard/PanelToolbar";
import {
  Wallet,
  Package,
  Hammer,
  TrendingUp,
  HardHat,
  FileCheck2,
  ShieldCheck,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Portal do Engenheiro — IMOBI" };


const LICENCA_STATUS: Record<Licenca["status"], { label: string; cls: string }> = {
  VALIDA:   { label: "Válida",   cls: "bg-green-100 text-green-700" },
  VENCENDO: { label: "Vencendo", cls: "bg-amber-100 text-amber-700" },
  PENDENTE: { label: "Pendente", cls: "bg-gray-100 text-gray-600" },
  VENCIDA:  { label: "Vencida",  cls: "bg-red-100 text-red-700" },
};

export default async function EngenheiroPortalPage() {
  const [visitas, financeiroApi, licencasApi] = await Promise.all([
    engenheirosApi.listarVisitas().catch(() => [] as Visita[]),
    engenheiroObraApi.financeiro().catch(() => null),
    engenheiroObraApi.licencas().catch(() => null),
  ]);

  const financeiro = financeiroApi ?? [];
  const licencas = licencasApi ?? [];

  const totalObras = financeiro.reduce((s, o) => s + o.valorTotal, 0);
  const totalMaterial = financeiro.reduce((s, o) => s + o.valorMaterial, 0);
  const totalMaoDeObra = financeiro.reduce((s, o) => s + o.valorMaoDeObra, 0);
  const totalExecutado = financeiro.reduce((s, o) => s + o.valorExecutado, 0);
  const pctExecutado = totalObras > 0 ? Math.round((totalExecutado / totalObras) * 100) : 0;

  const licencasConstrucao = licencas.filter((l) => l.categoria === "CONSTRUCAO");
  const licencasOperacionais = licencas.filter((l) => l.categoria === "OPERACIONAL");
  const licencasAtencao = licencas.filter((l) => l.status === "VENCENDO" || l.status === "VENCIDA").length;

  const agendadas = visitas.filter((v: Visita) => v.status === "AGENDADA");

  const licencasPriority = licencasAtencao > 0 ? ("critical" as const) : ("primary" as const);

  const engenheiroPanels = [
    { id: "resumo-portal", priority: "primary" as const },
    { id: "fila-visitas", priority: "critical" as const },
    { id: "obras-responsabilidade", priority: "primary" as const },
    { id: "licencas", priority: licencasPriority },
    { id: "etapas-projeto", priority: "secondary" as const },
  ];

  const resumoSummary = `${financeiro.length} obras · ${agendadas.length} visitas agendadas · ${formatarBRL(totalExecutado)} executado`;

  return (
    <div className="space-y-6 max-w-6xl p-4 sm:p-6">
      <PanelToolbar sections={engenheiroPanels} />

      <PanelSection
        id="resumo-portal"
        title="Portal do Engenheiro"
        icon={<Wrench className="w-4 h-4 text-[#ea580c]" />}
        priority="primary"
        summary={resumoSummary}
        badge={agendadas.length > 0 ? agendadas.length : undefined}
      >
      <div className="space-y-4">
      <div style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#ea580c22", border: "1px solid #ea580c44", borderRadius: 8, padding: "0.4rem" }}>
            <Wrench size={18} color="#ea580c" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Portal do Engenheiro</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Vistorias e Obras</h1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
            Gerencie suas inspeções de campo e valide etapas de construção.
          </p>
        </div>
      </div>

      {/* KPIs resumo rápido */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-2">
        {[
          { label: "Obras ativas",            value: String(financeiro.length),           color: "#ea580c" },
          { label: "Vistorias agendadas",       value: String(visitas.filter((v: Visita) => v.status === "AGENDADA").length), color: "#d97706" },
          { label: "Visitas agendadas",        value: String(agendadas.length),            color: "#b45309" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* KPIs financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Wallet,    label: "Valor total das obras", value: formatarBRL(totalObras),     color: "#ea580c", sub: `${financeiro.length} obra(s) ativa(s)` },
          { icon: Package,   label: "Valor de material",     value: formatarBRL(totalMaterial),  color: "#d97706", sub: `${totalObras > 0 ? Math.round((totalMaterial / totalObras) * 100) : 0}% do orçamento` },
          { icon: Hammer,    label: "Mão de obra & serviços",value: formatarBRL(totalMaoDeObra), color: "#b45309", sub: `${totalObras > 0 ? Math.round((totalMaoDeObra / totalObras) * 100) : 0}% do orçamento` },
          { icon: TrendingUp,label: "Executado financeiro",  value: formatarBRL(totalExecutado), color: "#16a34a", sub: `${pctExecutado}% do total` },
        ].map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "14" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>
      </div>
      </PanelSection>

      <PanelSection
        id="fila-visitas"
        title="Fila de visitas"
        icon={<CalendarClock className="w-4 h-4 text-[#ea580c]" />}
        priority="critical"
        badge={agendadas.length}
        summary={`${agendadas.length} agendada(s)`}
        urgency={agendadas.length > 5 ? "warning" : "none"}
      >
        <DynamicVisitQueueClient visits={visitas} />
      </PanelSection>

      {/* Obras — detalhamento financeiro */}
      <PanelSection
        id="obras-responsabilidade"
        title="Obras sob responsabilidade"
        icon={<HardHat className="w-4 h-4 text-[#ea580c]" />}
        priority="primary"
        badge={financeiro.length}
        summary={`${financeiro.length} obra(s) · ${formatarBRL(totalExecutado)} executado`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {financeiro.map((obra) => (
            <div key={obra.obraId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{obra.nome}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Etapa atual: <span className="font-medium text-gray-600">{obra.etapaAtual}</span></p>
                </div>
                <span className="shrink-0 text-xs font-bold text-[#16a34a] bg-green-50 px-2.5 py-1 rounded-full tabular-nums">
                  {obra.progresso}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-4">
                <div className="bg-[#16a34a] h-full rounded-full transition-all" style={{ width: `${obra.progresso}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl py-2.5 px-1">
                  <p className="text-[0.65rem] text-gray-400 uppercase tracking-wide font-semibold">Total</p>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 tabular-nums mt-0.5">{formatarBRL(obra.valorTotal)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl py-2.5 px-1">
                  <p className="text-[0.65rem] text-[#1B4FD8] uppercase tracking-wide font-semibold">Material</p>
                  <p className="text-xs sm:text-sm font-bold text-[#1B4FD8] tabular-nums mt-0.5">{formatarBRL(obra.valorMaterial)}</p>
                </div>
                <div className="bg-green-50 rounded-xl py-2.5 px-1">
                  <p className="text-[0.65rem] text-[#16a34a] uppercase tracking-wide font-semibold">Executado</p>
                  <p className="text-xs sm:text-sm font-bold text-[#16a34a] tabular-nums mt-0.5">{formatarBRL(obra.valorExecutado)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PanelSection>

      {/* Licenças */}
      <PanelSection
        id="licencas"
        title="Licenças e regularização"
        icon={<ShieldCheck className="w-4 h-4 text-[#ea580c]" />}
        priority={licencasAtencao > 0 ? "critical" : "primary"}
        badge={licencasAtencao > 0 ? licencasAtencao : licencas.length}
        summary={licencasAtencao > 0 ? `${licencasAtencao} exigindo atenção` : `${licencas.length} licença(s)`}
        urgency={licencasAtencao > 0 ? "warning" : "none"}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { titulo: "Licenças de Construção", icon: FileCheck2, items: licencasConstrucao },
            { titulo: "Licenças Operacionais", icon: ShieldCheck, items: licencasOperacionais },
          ].map(({ titulo, icon: Icon, items }) => (
            <div key={titulo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((lic) => {
                  const st = LICENCA_STATUS[lic.status];
                  return (
                    <div key={lic.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{lic.nome}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {lic.orgao}
                          {lic.numero ? ` · ${lic.numero}` : ""}
                          {lic.obraNome ? ` · ${lic.obraNome}` : ""}
                        </p>
                      </div>
                      {lic.validade && (
                        <span className="hidden sm:block text-xs text-gray-400 tabular-nums shrink-0">
                          até {new Date(lic.validade).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PanelSection>

      {/* Etapas por obra */}
      <PanelSection
        id="etapas-projeto"
        title="Etapas do projeto"
        icon={<CalendarClock className="w-4 h-4 text-[#ea580c]" />}
        priority="secondary"
        summary={financeiro.length > 0 ? "Cronograma por obra" : "Nenhuma obra atribuída"}
      >
        {financeiro.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-10 text-center">
            <HardHat className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhuma obra atribuída</p>
            <p className="text-xs text-gray-400 mt-1">As etapas aparecem quando uma obra for vinculada ao seu perfil.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 text-center">
            <p className="text-sm text-gray-500">Selecione uma obra para ver o cronograma de etapas.</p>
          </div>
        )}
      </PanelSection>
    </div>
  );
}
