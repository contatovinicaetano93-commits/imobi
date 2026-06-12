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

// ── Dados de demonstração (exibidos enquanto a API não fornece os endpoints) ──

const DEMO_FINANCEIRO: ObraFinanceiro[] = [
  {
    obraId: "demo-1",
    nome: "Residencial Vila Nova — Casa 12",
    valorTotal: 480_000,
    valorMaterial: 268_800,
    valorMaoDeObra: 211_200,
    valorExecutado: 312_000,
    progresso: 65,
    etapaAtual: "Estrutura",
  },
  {
    obraId: "demo-2",
    nome: "Sobrado Jardim das Acácias",
    valorTotal: 320_000,
    valorMaterial: 176_000,
    valorMaoDeObra: 144_000,
    valorExecutado: 96_000,
    progresso: 30,
    etapaAtual: "Fundação",
  },
];

const DEMO_ETAPAS: EtapaProjeto[] = [
  { id: "e1", nome: "Projeto & Aprovações", ordem: 1, status: "CONCLUIDA", valorLiberacao: 48_000, percentualObra: 10, dataConclusao: "2026-02-10" },
  { id: "e2", nome: "Fundação", ordem: 2, status: "CONCLUIDA", valorLiberacao: 96_000, percentualObra: 20, dataConclusao: "2026-04-02" },
  { id: "e3", nome: "Estrutura", ordem: 3, status: "EM_ANDAMENTO", valorLiberacao: 120_000, percentualObra: 25 },
  { id: "e4", nome: "Alvenaria & Vedações", ordem: 4, status: "PENDENTE", valorLiberacao: 72_000, percentualObra: 15 },
  { id: "e5", nome: "Instalações", ordem: 5, status: "PENDENTE", valorLiberacao: 72_000, percentualObra: 15 },
  { id: "e6", nome: "Acabamento", ordem: 6, status: "PENDENTE", valorLiberacao: 48_000, percentualObra: 10 },
  { id: "e7", nome: "Vistoria Final & Habite-se", ordem: 7, status: "PENDENTE", valorLiberacao: 24_000, percentualObra: 5 },
];

const DEMO_LICENCAS: Licenca[] = [
  { id: "l1", nome: "Alvará de Construção", categoria: "CONSTRUCAO", orgao: "Prefeitura Municipal", numero: "ALV-2026/04821", status: "VALIDA", validade: "2027-03-15", obraNome: "Residencial Vila Nova" },
  { id: "l2", nome: "ART de Execução", categoria: "CONSTRUCAO", orgao: "CREA-SP", numero: "ART-28194470", status: "VALIDA", validade: "2027-01-20", obraNome: "Residencial Vila Nova" },
  { id: "l3", nome: "Projeto Aprovado", categoria: "CONSTRUCAO", orgao: "Prefeitura Municipal", numero: "PROC-11.402/26", status: "VALIDA", obraNome: "Residencial Vila Nova" },
  { id: "l4", nome: "Habite-se", categoria: "CONSTRUCAO", orgao: "Prefeitura Municipal", status: "PENDENTE", obraNome: "Residencial Vila Nova" },
  { id: "l5", nome: "Licença Ambiental", categoria: "OPERACIONAL", orgao: "CETESB", numero: "LA-09.221/25", status: "VENCENDO", validade: "2026-07-15", obraNome: "Sobrado Jd. das Acácias" },
  { id: "l6", nome: "AVCB", categoria: "OPERACIONAL", orgao: "Corpo de Bombeiros", status: "PENDENTE", obraNome: "Sobrado Jd. das Acácias" },
  { id: "l7", nome: "Ligação Definitiva de Energia", categoria: "OPERACIONAL", orgao: "Concessionária", status: "PENDENTE", obraNome: "Residencial Vila Nova" },
];

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

  const isDemo = !financeiroApi || financeiroApi.length === 0;
  const financeiro = isDemo ? DEMO_FINANCEIRO : financeiroApi;
  const licencas = licencasApi && licencasApi.length > 0 ? licencasApi : DEMO_LICENCAS;
  const etapas = DEMO_ETAPAS;

  const totalObras = financeiro.reduce((s, o) => s + o.valorTotal, 0);
  const totalMaterial = financeiro.reduce((s, o) => s + o.valorMaterial, 0);
  const totalMaoDeObra = financeiro.reduce((s, o) => s + o.valorMaoDeObra, 0);
  const totalExecutado = financeiro.reduce((s, o) => s + o.valorExecutado, 0);
  const pctExecutado = totalObras > 0 ? Math.round((totalExecutado / totalObras) * 100) : 0;

  const licencasConstrucao = licencas.filter((l) => l.categoria === "CONSTRUCAO");
  const licencasOperacionais = licencas.filter((l) => l.categoria === "OPERACIONAL");
  const licencasAtencao = licencas.filter((l) => l.status === "VENCENDO" || l.status === "VENCIDA").length;

  const agendadas = visitas.filter((v: Visita) => v.status === "AGENDADA");

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Hero engenheiro - laranja */}
      <div style={{ background: "linear-gradient(135deg, #431407 0%, #7c2d12 100%)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem", color: "white" }}>
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
          {isDemo && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.7rem", fontWeight: 600, color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 999, padding: "0.25rem 0.75rem" }}>
              <AlertTriangle size={12} />
              Dados de demonstração
            </span>
          )}
        </div>
      </div>

      {/* KPIs resumo rápido */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-2">
        {[
          { label: "Obras ativas",            value: String(financeiro.length),           color: "#ea580c" },
          { label: "Etapas aguardando",        value: String(etapas.filter(e => e.status === "PENDENTE").length), color: "#d97706" },
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

      {/* Obras — detalhamento financeiro */}
      <section aria-labelledby="obras-fin-title">
        <h2 id="obras-fin-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HardHat className="w-4 h-4 text-[#ea580c]" />
          Obras sob responsabilidade
        </h2>
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
      </section>

      {/* Pipeline de etapas */}
      <section aria-labelledby="etapas-title">
        <h2 id="etapas-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#ea580c]" />
          Etapas do projeto
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {etapas.map((etapa, idx) => {
              const done = etapa.status === "CONCLUIDA";
              const current = etapa.status === "EM_ANDAMENTO";
              return (
                <div key={etapa.id} className={`flex items-center gap-4 px-5 py-3.5 ${current ? "bg-orange-50/50" : ""}`}>
                  <div className="relative flex flex-col items-center shrink-0">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-[#16a34a]" />
                    ) : current ? (
                      <Clock className="w-5 h-5 text-[#ea580c]" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "text-gray-400" : current ? "text-[#ea580c] font-semibold" : "text-gray-700"}`}>
                      {idx + 1}. {etapa.nome}
                    </p>
                    {etapa.dataConclusao && (
                      <p className="text-xs text-gray-400">Concluída em {new Date(etapa.dataConclusao).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                  <span className="hidden sm:block text-xs text-gray-400 tabular-nums shrink-0">{etapa.percentualObra}% da obra</span>
                  <span className={`text-xs font-semibold tabular-nums shrink-0 ${done ? "text-[#16a34a]" : "text-gray-500"}`}>
                    {formatarBRL(etapa.valorLiberacao)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Licenças */}
      <section aria-labelledby="licencas-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="licencas-title" className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ea580c]" />
            Licenças e regularização
          </h2>
          {licencasAtencao > 0 && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              {licencasAtencao} exigindo atenção
            </span>
          )}
        </div>
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
      </section>

      {/* Fila de visitas */}
      <section aria-labelledby="visitas-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="visitas-title" className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-[#ea580c]" />
            Fila de visitas
          </h2>
          <span className="text-xs text-gray-400">{agendadas.length} agendada(s)</span>
        </div>
        <DynamicVisitQueueClient visits={visitas} />
      </section>
    </div>
  );
}
