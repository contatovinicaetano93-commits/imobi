import type { Metadata } from "next";
import { obrasServerApi, creditoServerApi, type ObraResumo, type CreditoResumo, type EtapaResumo } from "@/lib/api.server";
import { formatarBRL } from "@imbobi/core";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Dashboard — imbobi" };

export default async function DashboardPage() {
  const [obras, creditos] = await Promise.all([
    obrasServerApi.listar().catch(() => []),
    creditoServerApi.meus().catch(() => []),
  ]);

  const ativas = obras.filter((o: ObraResumo) => o.status === "EM_ANDAMENTO");
  const creditoAtivo = creditos.find((c: CreditoResumo) => c.status === "ATIVO");
  const saldoDisponivel = creditoAtivo
    ? Number(creditoAtivo.valorAprovado) - Number(creditoAtivo.valorLiberado)
    : 0;
  const totalEtapas = obras.flatMap((o: ObraResumo) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e: EtapaResumo) => e.status === "APROVADA");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Crédito disponível", value: formatarBRL(saldoDisponivel), sub: creditoAtivo ? "crédito ativo" : "sem crédito ativo" },
          { label: "Obras ativas", value: String(ativas.length), sub: `${obras.length} no total` },
          { label: "Etapas concluídas", value: `${etapasAprovadas.length} / ${totalEtapas.length}`, sub: totalEtapas.length ? `${Math.round((etapasAprovadas.length / totalEtapas.length) * 100)}%` : "—" },
          { label: "Aguardando vistoria", value: String(totalEtapas.filter((e: EtapaResumo) => e.status === "AGUARDANDO_VISTORIA").length), sub: "etapas" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Obras em andamento</h2>
          <a href="/dashboard/obras" className="text-sm text-brand-600 font-medium">Ver todas →</a>
        </div>

        {ativas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-gray-400 text-sm">Nenhuma obra em andamento.</p>
            <a href="/dashboard/obras" className="mt-3 inline-block text-brand-600 text-sm font-semibold">
              Cadastrar obra →
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {ativas.map((obra: ObraResumo) => (
              <a
                key={obra.id}
                href={`/dashboard/obras/${obra.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{obra.nome}</p>
                  <p className="text-sm text-gray-500">
                    {obra.credito ? formatarBRL(Number(obra.credito.valorLiberado)) + " liberado" : "sem crédito"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <div className="h-2 w-28 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${obra.progresso ?? 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-8">
                      {obra.progresso ?? 0}%
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
