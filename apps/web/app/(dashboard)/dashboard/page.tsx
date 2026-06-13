import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2, CreditCard, BarChart3, FileText, TrendingUp, Clock,
  ArrowRight, HardHat, Bell, Download, Send, RefreshCw, PlusCircle,
  CheckCircle2, AlertTriangle, Wrench, Banknote, Calendar,
} from "lucide-react";
import { obrasApi, creditoApi, type ObraResumo, type CreditoResumo, type EtapaResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — IMOBI" };

const NAVY = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

function decodeJwt(token: string): { role?: string; exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(base64 + "===".slice(0, (4 - base64.length % 4) % 4), "base64").toString("utf-8"));
  } catch { return null; }
}

function decodeRole(token: string): string | null {
  const d = decodeJwt(token);
  if (!d) return null;
  if (d.exp && d.exp < Math.floor(Date.now() / 1000)) return "__expired__";
  return d.role ?? null;
}

const STATUS_LABEL: Record<string, string> = {
  EM_EXECUCAO: "Em andamento", EM_ANDAMENTO: "Em andamento",
  PLANEJAMENTO: "Planejamento", CONCLUIDA: "Concluída",
  PAUSADA: "Pausada", CANCELADA: "Cancelada",
};
const STATUS_BADGE: Record<string, string> = {
  EM_EXECUCAO:  "bg-blue-50 text-blue-700",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700",
  PLANEJAMENTO: "bg-gray-100 text-gray-600",
  CONCLUIDA:    "bg-green-50 text-green-700",
  PAUSADA:      "bg-yellow-50 text-yellow-700",
  CANCELADA:    "bg-red-50 text-red-600",
};

export default async function DashboardPage() {
  const jar = await cookies();
  const token = jar.get("access_token")?.value;
  const role = token ? decodeRole(token) : null;

  if (!token || role === "__expired__") redirect("/login");
  if (role === "ADMIN")                         redirect("/dashboard/admin");
  if (role === "GESTOR")                        redirect("/dashboard/gestor");
  if (role === "ENGENHEIRO")                    redirect("/dashboard/engenheiro");
  if (role === "COMERCIAL" || role === "PARCEIRO") redirect("/dashboard/comercial");
  if (role === "GESTOR_OBRA")                   redirect("/dashboard/engenheiro");
  if (role === "CONSTRUTOR" || role === "TOMADOR") redirect("/dashboard/construtor");

  const [obras, creditos] = await Promise.all([
    obrasApi.listar().catch(() => [] as ObraResumo[]),
    creditoApi.meus().catch(() => [] as CreditoResumo[]),
  ]);

  const creditoAtivo = creditos.find((c: CreditoResumo) => c.status === "ATIVO");
  const valorAprovado   = creditoAtivo ? Number(creditoAtivo.valorAprovado)  : 0;
  const valorLiberado   = creditoAtivo ? Number(creditoAtivo.valorLiberado)  : 0;
  const saldoDisponivel = valorAprovado - valorLiberado;

  const ativas = obras.filter((o: ObraResumo) => ["EM_EXECUCAO","EM_ANDAMENTO"].includes(o.status));
  const allEtapas    = obras.flatMap((o: ObraResumo) => o.etapas ?? []);
  const aprovadas    = allEtapas.filter((e: EtapaResumo) => ["CONCLUIDA","APROVADA"].includes(e.status));
  const pendentes    = allEtapas.filter((e: EtapaResumo) => e.status === "AGUARDANDO_VISTORIA");
  const pctEtapas    = allEtapas.length ? Math.round(aprovadas.length / allEtapas.length * 100) : 0;

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Hero: crédito ativo ─────────────────────────────── */}
      {creditoAtivo ? (
        <div style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #1a2f5e 100%)`,
          borderRadius: 18, padding: "1.5rem 1.75rem", color: "white",
          display: "flex", flexDirection: "column", gap: "1rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>Operação ativa</p>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: "4px 0 0" }}>{creditoAtivo.obras?.[0]?.nome ?? "Crédito IMOBI"}</p>
            </div>
            <span style={{ fontSize: "0.68rem", background: "rgba(74,222,128,0.15)", color: MINT, border: "1px solid rgba(74,222,128,0.3)", borderRadius: 20, padding: "4px 10px", fontWeight: 600 }}>
              Ativo
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            {[
              { label: "Saldo devedor",    value: formatarBRL(valorLiberado) },
              { label: "Total aprovado",   value: formatarBRL(valorAprovado) },
              { label: "Disponível",       value: formatarBRL(saldoDisponivel) },
              { label: "Taxa contratada",  value: (creditoAtivo as any).taxaMensal ? `${(creditoAtivo as any).taxaMensal}% a.m.` : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "0.65rem 0.85rem" }}>
                <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>{label}</p>
                <p style={{ fontSize: "0.95rem", fontWeight: 700, margin: "2px 0 0" }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/dashboard/credito" style={{ fontSize: "0.75rem", fontWeight: 600, background: MINT, color: NAVY, borderRadius: 8, padding: "0.5rem 1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CreditCard size={13} /> Ver extrato
            </Link>
            <Link href="/dashboard/credito#parcelas" style={{ fontSize: "0.75rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 8, padding: "0.5rem 1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar size={13} /> Parcelas
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ background: "#f9fafb", border: "1.5px dashed #d1d5db", borderRadius: 18, padding: "1.5rem", textAlign: "center" }}>
          <CreditCard style={{ margin: "0 auto 8px", color: "#d1d5db" }} size={28} />
          <p style={{ fontWeight: 600, color: "#374151", margin: 0 }}>Nenhuma operação de crédito ativa</p>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: "4px 0 12px" }}>Simule e solicite crédito IMOBI</p>
          <Link href="/dashboard/simulador" style={{ fontSize: "0.78rem", fontWeight: 600, background: ROYAL, color: "white", borderRadius: 8, padding: "0.5rem 1.1rem", textDecoration: "none" }}>
            Fazer simulação
          </Link>
        </div>
      )}

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Disponível",        value: formatarBRL(saldoDisponivel), sub: "para liberar",    icon: Banknote,     color: ROYAL,     bg: "#eff6ff" },
          { label: "Obras ativas",      value: String(ativas.length),        sub: `${obras.length} total`,  icon: Building2,    color: "#16a34a", bg: "#f0fdf4" },
          { label: "Etapas aprovadas",  value: `${aprovadas.length}/${allEtapas.length}`, sub: `${pctEtapas}% concluído`, icon: CheckCircle2, color: "#0891b2", bg: "#ecfeff" },
          { label: "Aguard. vistoria",  value: String(pendentes.length),     sub: "etapas",         icon: Clock,        color: "#d97706", bg: "#fffbeb" },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: 14, padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ background: bg, borderRadius: 8, padding: 6 }}>
                <Icon size={14} color={color} />
              </div>
              <p style={{ fontSize: "0.65rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
            </div>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color, margin: 0 }}>{value}</p>
            <p style={{ fontSize: "0.68rem", color: "#9ca3af", margin: "2px 0 0" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Cronograma de liberação ───────────────────────── */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: NAVY, margin: 0 }}>Cronograma de Liberação</h2>
          <Link href="/dashboard/obras" style={{ fontSize: "0.72rem", color: ROYAL, textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            Ver obras <ArrowRight size={12} />
          </Link>
        </div>
        {allEtapas.length > 0 ? (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #f3f4f6", overflow: "hidden" }}>
            {allEtapas.slice(0, 5).map((etapa: EtapaResumo, i: number) => {
              const isAprov = ["CONCLUIDA","APROVADA"].includes(etapa.status);
              const isPend  = etapa.status === "AGUARDANDO_VISTORIA";
              return (
                <div key={etapa.id ?? i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.75rem 1rem", borderTop: i > 0 ? "1px solid #f9fafb" : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: isAprov ? "#f0fdf4" : isPend ? "#fffbeb" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isAprov ? <CheckCircle2 size={14} color="#16a34a" /> : isPend ? <AlertTriangle size={14} color="#d97706" /> : <Clock size={14} color="#9ca3af" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: NAVY, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etapa.nome ?? `Etapa ${i + 1}`}</p>
                    <p style={{ fontSize: "0.68rem", color: "#9ca3af", margin: 0 }}>{etapa.status?.replace(/_/g, " ")}</p>
                  </div>
                  {(etapa as any).valorParcela && (
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: isAprov ? "#16a34a" : NAVY, margin: 0, whiteSpace: "nowrap" }}>
                      {formatarBRL(Number((etapa as any).valorParcela))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "#f9fafb", borderRadius: 14, padding: "1.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: 0 }}>Nenhuma etapa cadastrada ainda.</p>
          </div>
        )}
      </section>

      {/* ── Medição / Vistoria ────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>Medição & Vistoria</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <div style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Wrench size={14} color={ROYAL} />
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", margin: 0 }}>Última inspeção</p>
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: NAVY, margin: 0 }}>
              {pendentes.length > 0 ? "Vistoria agendada" : ativas.length > 0 ? "Sem data agendada" : "—"}
            </p>
            <p style={{ fontSize: "0.68rem", color: "#9ca3af", margin: "2px 0 0" }}>Engenheiro IMOBI</p>
          </div>
          <div style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TrendingUp size={14} color="#16a34a" />
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7280", margin: 0 }}>Evolução física</p>
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#16a34a", margin: 0 }}>{pctEtapas}% aprovado</p>
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4, marginTop: 8 }}>
              <div style={{ height: "100%", width: `${pctEtapas}%`, background: "#16a34a", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Ações rápidas ─────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Obras",        icon: HardHat,      href: "/dashboard/obras",      bg: ROYAL,    c: "white" },
            { label: "Crédito",      icon: CreditCard,   href: "/dashboard/credito",    bg: "#16a34a", c: "white" },
            { label: "Simulador",    icon: BarChart3,    href: "/dashboard/simulador",  bg: NAVY,     c: "white" },
            { label: "Documentos",   icon: FileText,     href: "/dashboard/kyc",        bg: "#0891b2", c: "white" },
            { label: "Score",        icon: TrendingUp,   href: "/dashboard/score",      bg: "#7c3aed", c: "white" },
            { label: "Notificações", icon: Bell,         href: "/dashboard/notificacoes", bg: "#d97706", c: "white" },
          ].map(({ label, icon: Icon, href, bg, c }) => (
            <Link key={href} href={href as any} style={{ background: bg, color: c, borderRadius: 14, padding: "1rem", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "opacity 0.15s" }}>
              <Icon size={20} />
              <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Solicitações ─────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>Solicitar</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Nova parcela / tranche",  sub: "Solicite liberação de recursos",      icon: PlusCircle,  href: "/dashboard/credito#solicitar-parcela" },
            { label: "Renegociação",             sub: "Prazo, taxa ou condições",            icon: RefreshCw,   href: "/dashboard/credito#renegociacao" },
            { label: "Novo crédito",             sub: "Inicie uma nova operação de crédito", icon: Send,        href: "/dashboard/simulador" },
            { label: "Download de contratos",    sub: "Contratos assinados da operação",     icon: Download,    href: "/dashboard/credito#contratos" },
          ].map(({ label, sub, icon: Icon, href }) => (
            <Link key={href} href={href as any} style={{ background: "white", border: "1px solid #f3f4f6", borderRadius: 12, padding: "0.85rem 1rem", textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#eff6ff", borderRadius: 8, padding: 8, flexShrink: 0 }}>
                <Icon size={14} color={ROYAL} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: NAVY, margin: 0 }}>{label}</p>
                <p style={{ fontSize: "0.68rem", color: "#9ca3af", margin: 0 }}>{sub}</p>
              </div>
              <ArrowRight size={14} color="#d1d5db" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Obras em andamento ───────────────────────────── */}
      {ativas.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: NAVY, margin: 0 }}>Obras em andamento</h2>
            <Link href="/dashboard/obras" style={{ fontSize: "0.72rem", color: ROYAL, textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #f3f4f6", overflow: "hidden" }}>
            {ativas.map((obra: ObraResumo, i: number) => (
              <Link key={obra.id} href={`/dashboard/obras/${obra.id}` as any} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1rem", borderTop: i > 0 ? "1px solid #f9fafb" : "none", textDecoration: "none" }}>
                <HardHat size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: NAVY, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{obra.nome}</p>
                  <p style={{ fontSize: "0.68rem", color: "#9ca3af", margin: 0 }}>
                    {obra.credito ? `${formatarBRL(Number(obra.credito.valorLiberado))} liberado` : "sem crédito vinculado"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "3px 8px", borderRadius: 20 }} className={STATUS_BADGE[obra.status] ?? "bg-gray-100 text-gray-500"}>
                    {STATUS_LABEL[obra.status] ?? obra.status.replace(/_/g, " ")}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ height: 4, width: 60, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${obra.progresso ?? 0}%`, background: "#16a34a", borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6b7280", minWidth: 28 }}>{obra.progresso ?? 0}%</span>
                  </div>
                  <ArrowRight size={13} color="#d1d5db" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
