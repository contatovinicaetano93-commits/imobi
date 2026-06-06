import type { Metadata } from "next";
import { obrasApi, creditoApi, type ObraResumo, type CreditoResumo, type EtapaResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Dashboard — imbobi" };

export default async function DashboardPage() {
  const [obras, creditos] = await Promise.all([
    obrasApi.listar().catch(() => []),
    creditoApi.meus().catch(() => []),
  ]);

  const ativas = obras.filter((o: ObraResumo) => o.status === "EM_ANDAMENTO");
  const creditoAtivo = creditos.find((c: CreditoResumo) => c.status === "ATIVO");
  const saldoDisponivel = creditoAtivo
    ? Number(creditoAtivo.valorAprovado) - Number(creditoAtivo.valorLiberado)
    : 0;
  const totalEtapas = obras.flatMap((o: ObraResumo) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e: EtapaResumo) => e.status === "APROVADA");

  const kpis = [
    { label: "Crédito disponível", value: formatarBRL(saldoDisponivel), sub: creditoAtivo ? "crédito ativo" : "sem crédito ativo", style: { background: "#1B4FD8", color: "white" } },
    { label: "Obras ativas", value: String(ativas.length), sub: `${obras.length} no total`, style: { background: "#22C55E", color: "white" } },
    { label: "Etapas concluídas", value: `${etapasAprovadas.length} / ${totalEtapas.length}`, sub: totalEtapas.length ? `${Math.round((etapasAprovadas.length / totalEtapas.length) * 100)}%` : "—", style: { background: "white", border: "1.5px solid #E2E8F0" } },
    { label: "Aguardando vistoria", value: String(totalEtapas.filter((e: EtapaResumo) => e.status === "AGUARDANDO_VISTORIA").length), sub: "etapas", style: { background: "white", border: "1.5px solid #E2E8F0" } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>
        Visão Geral
      </h1>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              borderRadius: 16, padding: "1.5rem",
              boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
              ...kpi.style,
            }}
          >
            <p style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.4rem", opacity: 0.75 }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", color: kpi.style.color ?? "#0F172A" }}>
              {kpi.value}
            </p>
            <p style={{ fontSize: "0.72rem", marginTop: "0.25rem", opacity: 0.6 }}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Obras em andamento */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0F172A" }}>Obras em andamento</h2>
          <a href="/dashboard/obras" style={{ fontSize: "0.82rem", color: "#1B4FD8", fontWeight: 600, textDecoration: "none" }}>
            Ver todas →
          </a>
        </div>

        {ativas.length === 0 ? (
          <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #E2E8F0", padding: "2.5rem", textAlign: "center" }}>
            <p style={{ color: "#94A3B8", fontSize: "0.875rem" }}>Nenhuma obra em andamento.</p>
            <a href="/dashboard/obras" style={{ marginTop: "0.75rem", display: "inline-block", color: "#1B4FD8", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              Cadastrar obra →
            </a>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #E2E8F0", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", overflow: "hidden" }}>
            {ativas.map((obra: ObraResumo, i: number) => (
              <a
                key={obra.id}
                href={`/dashboard/obras/${obra.id}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "1rem 1.5rem",
                  borderTop: i > 0 ? "1px solid #F1F5F9" : "none",
                  textDecoration: "none", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "white"; }}
              >
                <div>
                  <p style={{ fontWeight: 600, color: "#0F172A", fontSize: "0.9rem" }}>{obra.nome}</p>
                  <p style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.15rem" }}>
                    {obra.credito ? formatarBRL(Number(obra.credito.valorLiberado)) + " liberado" : "sem crédito"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ height: 6, width: 96, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${obra.progresso ?? 0}%`, background: "#22C55E", borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1B4FD8", width: 32 }}>
                    {obra.progresso ?? 0}%
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
