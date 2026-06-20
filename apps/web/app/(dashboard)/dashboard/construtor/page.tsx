import type { Metadata } from "next";
import Link from "next/link";
import {
  CreditCard, Building2, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Upload, FileText, Download, Send, RefreshCw, PlusCircle, Bell,
  Banknote, TrendingUp, Calendar, Wrench, AlertCircle, ChevronRight,
  HardHat, BarChart3, XCircle,
} from "lucide-react";
import {
  creditoApi, obrasApi, kycApi, notificacoesApi,
  type CreditoResumo, type ObraResumo, type KycStatus, type Notificacao,
} from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { PanelToolbar } from "@/components/dashboard/PanelToolbar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel Construtor — IMOBI" };

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

// ── helpers ──────────────────────────────────────────────────────────────────

function calcParcela(principal: number, taxaMensal: number, prazoMeses: number): number {
  if (!principal || !taxaMensal || !prazoMeses) return 0;
  const r = taxaMensal / 100;
  return principal * (r * Math.pow(1 + r, prazoMeses)) / (Math.pow(1 + r, prazoMeses) - 1);
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── sub-components ────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function ConstrutorPage() {
  const [creditos, obras, kycStatus, notifs] = await Promise.all([
    creditoApi.meus().catch(() => [] as CreditoResumo[]),
    obrasApi.listar().catch(() => [] as ObraResumo[]),
    kycApi.obterStatus().catch(() => null as KycStatus | null),
    notificacoesApi.listarNaoLidas().catch(() => [] as Notificacao[]),
  ]);

  const credito = creditos.find((c) => c.status === "ATIVO") ?? creditos[0] ?? null;
  const valorAprovado   = credito ? Number(credito.valorAprovado)  : 0;
  const valorLiberado   = credito ? Number(credito.valorLiberado)  : 0;
  const saldoDisponivel = valorAprovado - valorLiberado;
  const taxaMensal      = credito ? Number(credito.taxaMensal)     : 0;
  const prazoMeses      = credito ? Number(credito.prazoMeses)     : 0;
  const parcela         = calcParcela(valorLiberado, taxaMensal, prazoMeses);

  // Prazo restante: assume dataAprovacao + prazoMeses
  const dataInicio = credito?.dataAprovacao ? new Date(credito.dataAprovacao) : new Date();
  const dataVenc   = credito?.dataVencimento
    ? new Date(credito.dataVencimento)
    : addMonths(dataInicio, prazoMeses);
  const hoje       = new Date();
  const mesesRestantes = Math.max(0, Math.round((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  // Próximas parcelas
  const proximasParcelas = Array.from({ length: 3 }, (_, i) => {
    const venc = addMonths(hoje, i + 1);
    venc.setDate(10); // vencimento dia 10
    return { venc, valor: parcela };
  });

  // Etapas (tranches)
  const todasEtapas = obras.flatMap((o) =>
    (o.etapas ?? []).map((e) => ({ ...e, obraNome: o.nome, obraId: o.id }))
  );
  const etapasLiberadas  = todasEtapas.filter((e) => ["CONCLUIDA", "APROVADA"].includes(e.status));
  const etapasPendentes  = todasEtapas.filter((e) => e.status === "AGUARDANDO_VISTORIA");
  const etapasFuturas    = todasEtapas.filter((e) => !["CONCLUIDA", "APROVADA", "AGUARDANDO_VISTORIA"].includes(e.status));
  const pctObra          = todasEtapas.length ? Math.round(etapasLiberadas.length / todasEtapas.length * 100) : 0;

  // Docs
  const docsTotal      = kycStatus?.documentos?.length ?? 0;
  const docsAprovados  = kycStatus?.resumo?.aprovados ?? 0;
  const docsPendentes  = kycStatus?.resumo?.pendentes ?? 0;
  const docsRejeitados = kycStatus?.resumo?.rejeitados ?? 0;

  // Alertas
  const alertas: { tipo: "warn" | "error" | "info"; msg: string; href: string }[] = [];
  if (docsPendentes > 0) alertas.push({ tipo: "warn", msg: `${docsPendentes} documento(s) aguardando análise`, href: "/dashboard/kyc" });
  if (docsRejeitados > 0) alertas.push({ tipo: "error", msg: `${docsRejeitados} documento(s) rejeitado(s) — reenvie`, href: "/dashboard/kyc" });
  if (etapasPendentes.length > 0) alertas.push({ tipo: "info", msg: `${etapasPendentes.length} etapa(s) aguardando vistoria do engenheiro`, href: "/dashboard/obras" });
  if (notifs.length > 0) alertas.push({ tipo: "info", msg: `${notifs.length} notificação(ões) não lida(s)`, href: "/dashboard/notificacoes" });

  // Liberações do crédito (extrato de desembolsos)
  const liberacoes = credito?.liberacoes ?? [];

  const construtorPanels = [
    { id: "cronograma-pagamentos", priority: "primary" as const },
    { id: "cronograma-liberacoes", priority: (etapasPendentes.length > 0 ? "critical" : "primary") as const },
    { id: "medicao-obra", priority: "secondary" as const },
    { id: "documentos-kyc", priority: (docsRejeitados > 0 ? "critical" : docsPendentes > 0 ? "primary" : "secondary") as const },
    { id: "extrato-operacao", priority: "secondary" as const },
    { id: "solicitacoes", priority: "primary" as const },
    ...(notifs.length > 0 ? [{ id: "notificacoes", priority: "primary" as const }] : []),
    { id: "contratos-documentos", priority: "secondary" as const },
  ];

  return (
    <div className="flex flex-col gap-4 pb-10 max-w-2xl">

      {/* ── Alertas ─────────────────────────────────────────────────── */}
      {alertas.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertas.map((a, i) => {
            const bg = a.tipo === "error" ? "bg-red-50 border-red-200 text-red-700" : a.tipo === "warn" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-blue-50 border-blue-200 text-blue-700";
            const Icon = a.tipo === "error" ? XCircle : a.tipo === "warn" ? AlertTriangle : Bell;
            return (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Link key={i} href={a.href as any} className={`flex items-center gap-2.5 border rounded-xl px-3.5 py-2.5 text-xs font-medium transition hover:opacity-80 ${bg}`}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {a.msg}
                <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Hero: operação de crédito ────────────────────────────────── */}
      {credito ? (
        <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a2f5e 100%)`, borderRadius: 20, padding: "1.5rem 1.75rem", color: "white" }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                Operação ativa
              </p>
              <p style={{ fontSize: "1.15rem", fontWeight: 700, margin: "4px 0 0" }}>
                {credito.obras?.[0]?.nome ?? "Crédito IMOBI"}
              </p>
            </div>
            <span style={{ fontSize: "0.65rem", background: "rgba(74,222,128,0.15)", color: MINT, border: "1px solid rgba(74,222,128,0.3)", borderRadius: 20, padding: "4px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
              Ativo
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Saldo devedor",    value: formatarBRL(valorLiberado),   highlight: true },
              { label: "Total aprovado",   value: formatarBRL(valorAprovado),   highlight: false },
              { label: "Taxa contratada",  value: `${taxaMensal}% a.m.`,        highlight: false },
              { label: "Prazo restante",   value: `${mesesRestantes} meses`,    highlight: false },
            ].map(({ label, value, highlight }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "0.65rem 0.85rem" }}>
                <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>{label}</p>
                <p style={{ fontSize: highlight ? "1rem" : "0.9rem", fontWeight: 700, margin: "3px 0 0", color: highlight ? MINT : "white" }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/credito" style={{ fontSize: "0.72rem", fontWeight: 600, background: MINT, color: NAVY, borderRadius: 8, padding: "0.45rem 0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <FileText size={12} /> Extrato completo
            </Link>
            <Link href="/dashboard/simulador" style={{ fontSize: "0.72rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 8, padding: "0.45rem 0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <BarChart3 size={12} /> Simular novo crédito
            </Link>
          </div>
        </div>
      ) : (
        <Card className="p-6 text-center">
          <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Nenhuma operação ativa</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Simule e solicite crédito IMOBI para sua obra</p>
          <Link href="/dashboard/simulador" style={{ display: "inline-block", background: ROYAL, color: "white", borderRadius: 10, padding: "0.55rem 1.25rem", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
            Fazer simulação
          </Link>
        </Card>
      )}

        </Card>
      )}

      <PanelToolbar sections={construtorPanels} />

      {/* ── Cronograma de pagamentos ─────────────────────────────────── */}
      <PanelSection
        flush
        id="cronograma-pagamentos"
        title="Cronograma de Pagamentos"
        icon={<Calendar className="w-4 h-4" />}
        priority="primary"
        href="/dashboard/credito"
        badge={parcela > 0 ? formatarBRL(parcela) : undefined}
        summary={parcela > 0 ? `Parcela ${formatarBRL(parcela)}/mês` : "Sem parcelas"}
      >
        {parcela > 0 ? (
          <Card>
            <div className="p-4 pb-2 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Parcela mensal estimada</p>
                <p className="text-base font-bold text-gray-900">{formatarBRL(parcela)}</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {proximasParcelas.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${i === 0 ? "bg-blue-50" : "bg-gray-50"}`}>
                      <Calendar className={`w-3.5 h-3.5 ${i === 0 ? "text-blue-600" : "text-gray-300"}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{fmtDate(p.venc)}</p>
                      <p className="text-[11px] text-gray-400">{i === 0 ? "Próxima parcela" : `Parcela +${i + 1}`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{formatarBRL(p.valor)}</p>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <button className="text-xs text-blue-600 font-medium hover:underline px-2 py-2.5 -my-2.5">Boleto</button>
                      <span className="text-gray-200">|</span>
                      <button className="text-xs text-blue-600 font-medium hover:underline px-2 py-2.5 -my-2.5">PIX</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 rounded-b-2xl">
              <Link href="/dashboard/credito" className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800 transition">
                Ver histórico completo de pagamentos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-xs text-gray-400">Nenhuma parcela calculada. Solicite crédito para visualizar o cronograma.</p>
            <Link href="/dashboard/simulador" style={{ display: "inline-block", marginTop: 10, background: ROYAL, color: "white", borderRadius: 10, padding: "0.45rem 1rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
              Simular crédito
            </Link>
          </Card>
        )}
      </PanelSection>

      {/* ── Cronograma de liberações ─────────────────────────────────── */}
      <PanelSection
        flush
        id="cronograma-liberacoes"
        title="Cronograma de Liberações"
        icon={<Banknote className="w-4 h-4" />}
        priority={etapasPendentes.length > 0 ? "critical" : "primary"}
        href="/dashboard/obras"
        badge={etapasPendentes.length > 0 ? `${etapasPendentes.length} ag. vistoria` : todasEtapas.length}
        summary={`${etapasLiberadas.length} liberadas · ${pctObra}% da obra`}
        urgency={etapasPendentes.length > 0 ? "warning" : "none"}
      >
        {todasEtapas.length > 0 ? (
          <Card className="overflow-hidden">
            {/* sumário */}
            <div className="grid grid-cols-3 gap-0 border-b border-gray-50">
              {[
                { label: "Liberadas", count: etapasLiberadas.length, color: "#16a34a", bg: "#f0fdf4" },
                { label: "Ag. vistoria", count: etapasPendentes.length, color: "#d97706", bg: "#fffbeb" },
                { label: "Futuras", count: etapasFuturas.length, color: "#6b7280", bg: "#f9fafb" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className="flex flex-col items-center py-3 gap-0.5" style={{ background: bg }}>
                  <p className="text-lg font-black tabular-nums" style={{ color }}>{count}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            {/* lista */}
            <div className="divide-y divide-gray-50">
              {todasEtapas.slice(0, 6).map((e) => {
                const isLib  = ["CONCLUIDA", "APROVADA"].includes(e.status);
                const isPend = e.status === "AGUARDANDO_VISTORIA";
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isLib ? "bg-green-50" : isPend ? "bg-amber-50" : "bg-gray-50"}`}>
                      {isLib ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : isPend ? <Clock className="w-3.5 h-3.5 text-amber-500" /> : <Clock className="w-3.5 h-3.5 text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{e.nome}</p>
                      <p className="text-[11px] text-gray-400 truncate">{(e as any).obraNome} · {e.percentualObra}% da obra</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-900">{formatarBRL(e.valorLiberacao)}</p>
                      <p className={`text-[11px] font-medium ${isLib ? "text-green-600" : isPend ? "text-amber-500" : "text-gray-400"}`}>
                        {isLib ? "Liberada" : isPend ? "Ag. vistoria" : "Pendente"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {todasEtapas.length > 6 && (
              <div className="px-4 py-3 bg-gray-50 rounded-b-2xl">
                <Link href="/dashboard/obras" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                  Ver todas as {todasEtapas.length} etapas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Nenhuma etapa cadastrada. Crie uma obra para definir as tranches.</p>
            <Link href="/dashboard/obras/nova" style={{ display: "inline-block", marginTop: 12, background: ROYAL, color: "white", borderRadius: 10, padding: "0.45rem 1rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
              Cadastrar obra
            </Link>
          </Card>
        )}
      </PanelSection>

      {/* ── Status da medição de obra ─────────────────────────────────── */}
      <PanelSection
        id="medicao-obra"
        title="Medição de Obra"
        icon={<Wrench className="w-4 h-4" />}
        priority="secondary"
        href="/dashboard/obras"
        summary={`${pctObra}% evolução física`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* evolução física */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-xs font-semibold text-gray-700">Evolução física</p>
            </div>
            <p className="text-2xl font-black text-green-600 mb-1">{pctObra}%</p>
            <p className="text-[11px] text-gray-400 mb-2">{etapasLiberadas.length} de {todasEtapas.length} etapas aprovadas</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctObra}%` }} />
            </div>
          </Card>
          {/* última vistoria */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-semibold text-gray-700">Última vistoria</p>
            </div>
            {etapasPendentes.length > 0 ? (
              <>
                <p className="text-xs font-bold text-amber-600 mb-0.5">Vistoria agendada</p>
                <p className="text-[11px] text-gray-500 mb-2">{etapasPendentes[0].nome}</p>
                <Link href="/dashboard/obras" className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5 hover:underline">
                  Ver detalhes <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            ) : etapasLiberadas.length > 0 ? (
              <>
                <p className="text-xs font-bold text-green-600 mb-0.5">Última aprovada</p>
                <p className="text-[11px] text-gray-500">{etapasLiberadas.at(-1)?.nome}</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Sem vistoria registrada</p>
            )}
          </Card>
        </div>
        {/* obras em andamento */}
        {obras.filter((o) => ["EM_EXECUCAO", "EM_ANDAMENTO"].includes(o.status)).length > 0 && (
          <Card className="mt-3 overflow-hidden">
            {obras.filter((o) => ["EM_EXECUCAO", "EM_ANDAMENTO"].includes(o.status)).map((o, i, arr) => (
              <Link key={o.id} href={`/dashboard/obras/${o.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`} style={{ textDecoration: "none" }}>
                <Building2 className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{o.nome}</p>
                  <p className="text-[11px] text-gray-400">{o.etapas?.length ?? 0} etapas cadastradas</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${o.progresso ?? 0}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 min-w-[26px] text-right">{o.progresso ?? 0}%</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </PanelSection>

      {/* ── Upload de documentos ──────────────────────────────────────── */}
      <PanelSection
        flush
        id="documentos-kyc"
        title="Documentos & KYC"
        icon={<Upload className="w-4 h-4" />}
        priority={docsRejeitados > 0 ? "critical" : docsPendentes > 0 ? "primary" : "secondary"}
        href="/dashboard/kyc"
        badge={docsPendentes + docsRejeitados > 0 ? docsPendentes + docsRejeitados : undefined}
        summary={`${docsAprovados} aprovados · ${docsPendentes} pendentes`}
        urgency={docsRejeitados > 0 ? "critical" : docsPendentes > 0 ? "warning" : "none"}
      >
        <Card>
          {/* status geral */}
          <div className="grid grid-cols-3 gap-0 border-b border-gray-50">
            {[
              { label: "Aprovados", count: docsAprovados, color: "#16a34a", bg: "#f0fdf4" },
              { label: "Pendentes", count: docsPendentes, color: "#d97706", bg: "#fffbeb" },
              { label: "Rejeitados", count: docsRejeitados, color: "#dc2626", bg: "#fef2f2" },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="flex flex-col items-center py-3 gap-0.5" style={{ background: bg }}>
                <p className="text-lg font-black tabular-nums" style={{ color }}>{count}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          {/* docs recentes */}
          {kycStatus?.documentos && kycStatus.documentos.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {kycStatus.documentos.slice(0, 4).map((doc) => {
                const isAprov = doc.status === "APROVADO";
                const isRej   = doc.status === "REJEITADO";
                return (
                  <div key={doc.kycDocumentoId} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isAprov ? "bg-green-50" : isRej ? "bg-red-50" : "bg-amber-50"}`}>
                      {isAprov ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : isRej ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{doc.tipo.replace(/_/g, " ")}</p>
                      {doc.motivo_rejeicao && <p className="text-[11px] text-red-500 truncate">{doc.motivo_rejeicao}</p>}
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isAprov ? "bg-green-50 text-green-700" : isRej ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                      {isAprov ? "Aprovado" : isRej ? "Rejeitado" : "Em análise"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-gray-400">Nenhum documento enviado ainda.</p>
              <Link href="/dashboard/kyc" style={{ display: "inline-block", marginTop: 10, background: ROYAL, color: "white", borderRadius: 10, padding: "0.45rem 1rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                Enviar documentos
              </Link>
            </div>
          )}
          <div className="px-4 py-3 bg-gray-50 rounded-b-2xl">
            <Link href="/dashboard/kyc" className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800 transition">
              <Upload className="w-3 h-3" /> Enviar ou gerenciar documentos <ArrowRight className="w-3 h-3 ml-auto" />
            </Link>
          </div>
        </Card>
      </PanelSection>

      {/* ── Extrato da operação ───────────────────────────────────────── */}
      <PanelSection
        flush
        id="extrato-operacao"
        title="Extrato da Operação"
        icon={<FileText className="w-4 h-4" />}
        priority="secondary"
        href="/dashboard/credito"
        summary={liberacoes.length > 0 ? `${liberacoes.length} desembolso(s)` : "Sem movimentações"}
      >
        {liberacoes.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-50">
              {liberacoes.slice(0, 5).map((lib, i) => (
                <div key={lib.id ?? i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${lib.status === "PROCESSADO" ? "bg-green-50" : "bg-gray-50"}`}>
                    <Banknote className={`w-3.5 h-3.5 ${lib.status === "PROCESSADO" ? "text-green-600" : "text-gray-300"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">Desembolso</p>
                    <p className="text-[11px] text-gray-400">
                      {lib.processadoEm ? new Date(lib.processadoEm).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-green-700">+{formatarBRL(Number(lib.valor))}</p>
                    <p className={`text-[11px] font-medium ${lib.status === "PROCESSADO" ? "text-green-600" : "text-amber-500"}`}>
                      {lib.status === "PROCESSADO" ? "Processado" : "Pendente"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {credito && (
              <div className="grid grid-cols-3 border-t border-gray-50 bg-gray-50 rounded-b-2xl">
                {[
                  { label: "Total desembolsado", value: formatarBRL(valorLiberado), color: "#16a34a" },
                  { label: "Juros estimados", value: formatarBRL(Math.max(0, parcela * prazoMeses - valorLiberado)), color: "#d97706" },
                  { label: "Disponível para liberar", value: formatarBRL(saldoDisponivel), color: ROYAL },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center py-3 px-2 gap-0.5 text-center">
                    <p className="text-xs font-bold tabular-nums" style={{ color }}>{value}</p>
                    <p className="text-xs text-gray-400 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <FileText className="w-7 h-7 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Nenhum desembolso registrado ainda.</p>
          </Card>
        )}
      </PanelSection>

      {/* ── Solicitações ──────────────────────────────────────────────── */}
      <PanelSection
        id="solicitacoes"
        title="Solicitações"
        icon={<Send className="w-4 h-4" />}
        priority="primary"
        summary="Tranches, renegociação, comitê"
      >
        <div className="flex flex-col gap-2">
          {[
            { label: "Nova tranche",         sub: "Solicite liberação de recursos para a próxima etapa",  icon: PlusCircle,  href: "/dashboard/credito#solicitar-parcela", color: ROYAL },
            { label: "Renegociação",          sub: "Ajuste de prazo, taxa ou condições da operação",       icon: RefreshCw,   href: "/dashboard/credito#renegociacao",        color: "#7c3aed" },
            { label: "Novo crédito",          sub: "Inicie uma nova operação para outro empreendimento",   icon: Send,        href: "/dashboard/simulador",                   color: "#16a34a" },
            { label: "Comitê de crédito",     sub: "Acompanhe ou solicite análise pelo comitê",            icon: BarChart3,   href: "/dashboard/comite",                      color: "#0891b2" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ].map(({ label, sub, icon: Icon, href, color }) => (
            <Link key={href} href={href as any} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: 14, padding: "0.9rem 1rem", textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: color + "12", borderRadius: 10, padding: 9, flexShrink: 0 }}>
                <Icon size={15} color={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-400">{sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-200 shrink-0" />
            </Link>
          ))}
        </div>
      </PanelSection>

      {/* ── Notificações recentes ─────────────────────────────────────── */}
      {notifs.length > 0 && (
        <PanelSection
          flush
          id="notificacoes"
          title="Notificações"
          icon={<Bell className="w-4 h-4" />}
          priority="primary"
          href="/dashboard/notificacoes"
          badge={notifs.length}
          summary={`${notifs.length} não lida(s)`}
        >
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-50">
              {notifs.slice(0, 4).map((n) => (
                <div key={n.notificacaoId} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{n.titulo}</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{n.mensagem}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{new Date(n.criadoEm).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 rounded-b-2xl">
              <Link href="/dashboard/notificacoes" className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                Ver todas as notificações <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </PanelSection>
      )}

      {/* ── Contratos para download ───────────────────────────────────── */}
      <PanelSection
        flush
        id="contratos-documentos"
        title="Contratos & Documentos"
        icon={<Download className="w-4 h-4" />}
        priority="secondary"
        href="/dashboard/credito"
        summary="Contrato, garantias, laudos"
      >
        <Card>
          <div className="divide-y divide-gray-50">
            {[
              { label: "Contrato de crédito",       sub: "Cédula de Crédito Imobiliário — assinada",  disponivel: !!credito },
              { label: "Termo de garantia",          sub: "Alienação fiduciária do imóvel",             disponivel: !!credito },
              { label: "Cronograma de desembolso",   sub: "Previsão de liberações por etapa",           disponivel: todasEtapas.length > 0 },
              { label: "Laudo de avaliação",         sub: "Último laudo técnico do engenheiro",         disponivel: etapasLiberadas.length > 0 },
            ].map(({ label, sub, disponivel }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${disponivel ? "bg-blue-50" : "bg-gray-50"}`}>
                  <FileText className={`w-4 h-4 ${disponivel ? "text-blue-600" : "text-gray-300"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${disponivel ? "text-gray-800" : "text-gray-400"}`}>{label}</p>
                  <p className="text-[11px] text-gray-400">{sub}</p>
                </div>
                {disponivel ? (
                  <Link href="/dashboard/credito" style={{ display: "flex", alignItems: "center", gap: 4, background: "#eff6ff", color: ROYAL, borderRadius: 8, padding: "5px 10px", fontSize: "0.68rem", fontWeight: 600, textDecoration: "none" }}>
                    <Download size={11} /> Baixar
                  </Link>
                ) : (
                  <span className="text-[11px] text-gray-300 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">
                    Indisponível
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </PanelSection>

    </div>
  );
}
