import type { Metadata } from "next";
import { obrasApi, creditoApi } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const metadata: Metadata = { title: "Fundos — imbobi" };

export default async function FundosPage() {
  const [obras, creditos] = await Promise.all([
    obrasApi.listar().catch(() => []),
    creditoApi.meus().catch(() => []),
  ]);

  // Total desembolsado
  const totalDesembolsado = creditos.reduce(
    (acc, c) => acc + Number(c.valorLiberado ?? 0),
    0
  );

  // Obras em progresso
  const obrasProgresso = obras.filter(
    (o) => o.status === "EM_ANDAMENTO" || o.status === "PLANEJADA"
  );

  // Cálculos básicos
  const creditoTotalAprovado = creditos.reduce(
    (acc, c) => acc + Number(c.valorAprovado ?? 0),
    0
  );
  const creditoTotalLiberado = creditos.reduce(
    (acc, c) => acc + Number(c.valorLiberado ?? 0),
    0
  );
  const totalEtapas = obras.flatMap((o) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e) => e.status === "APROVADA");
  const etapasAguardandoVistoria = totalEtapas.filter(
    (e) => e.status === "AGUARDANDO_VISTORIA"
  );

  // Estimativa de ROI (placeholder - seria calculado no backend)
  const roiEsperado = creditoTotalAprovado * 0.15; // 15% de retorno esperado

  // Taxa de inadimplência (placeholder)
  const inadimplenciaRate = 0; // Seria calculado com dados de pagamentos

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Fundos</h1>
        <p className="text-sm text-gray-500">Visão geral de portfolio</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total desembolsado</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatarBRL(totalDesembolsado)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            de {formatarBRL(creditoTotalAprovado)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Obras em progresso</p>
          <p className="text-2xl font-bold text-gray-900">{obrasProgresso.length}</p>
          <p className="text-xs text-gray-400 mt-1">{obras.length} no total</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Etapas completadas</p>
          <p className="text-2xl font-bold text-gray-900">
            {etapasAprovadas.length} / {totalEtapas.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalEtapas.length
              ? `${Math.round((etapasAprovadas.length / totalEtapas.length) * 100)}%`
              : "—"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Inadimplência</p>
          <p className="text-2xl font-bold text-gray-900">{inadimplenciaRate}%</p>
          <p className="text-xs text-gray-400 mt-1">taxa de não pagamento</p>
        </div>
      </div>

      {/* Seção de ROI e Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ROI Esperado</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Retorno anual estimado</p>
              <p className="text-2xl font-bold text-green-600">
                {formatarBRL(roiEsperado)}
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: "100%" }} />
            </div>
            <p className="text-xs text-gray-400">Baseado em 15% de retorno anual</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Etapas aguardando vistoria
          </h2>
          <div className="space-y-3">
            <p className="text-2xl font-bold text-orange-600">
              {etapasAguardandoVistoria.length}
            </p>
            <p className="text-sm text-gray-500">
              etapas prontas para validação técnica
            </p>
            <a
              href="/dashboard/gestor/etapas"
              className="inline-block text-sm text-brand-600 font-medium hover:text-brand-700"
            >
              Ver fila →
            </a>
          </div>
        </div>
      </div>

      {/* Portfolio por região */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Distribuição por região
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500 mb-4">
            Agrupamento de obras por localização geográfica
          </p>
          {obrasProgresso.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma obra em progresso.</p>
          ) : (
            <div className="space-y-3">
              {obrasProgresso.slice(0, 5).map((obra) => (
                <div
                  key={obra.id}
                  className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-b-0"
                >
                  <a
                    href={`/dashboard/obras/${obra.id}`}
                    className="flex-1 hover:opacity-75 transition-opacity"
                  >
                    <p className="font-medium text-gray-900">{obra.nome}</p>
                    <p className="text-xs text-gray-500">
                      {obra.credito
                        ? formatarBRL(Number(obra.credito.valorLiberado)) +
                          " / " +
                          formatarBRL(Number(obra.credito.valorAprovado))
                        : "sem crédito"}
                    </p>
                  </a>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">
                      {obra.progresso ?? 0}%
                    </p>
                  </div>
                </div>
              ))}
              {obrasProgresso.length > 5 && (
                <div className="pt-3 border-t border-gray-50">
                  <a
                    href="/dashboard/obras"
                    className="text-sm text-brand-600 font-medium hover:text-brand-700"
                  >
                    Ver todas as {obrasProgresso.length} obras →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Resumo de créditos */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Linhas de crédito</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditos.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">Nenhuma linha de crédito ativa.</p>
            </div>
          ) : (
            creditos.map((credito) => (
              <div
                key={credito.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Crédito #{credito.id.slice(0, 8)}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    {credito.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Aprovado:</span>
                    <span className="font-medium text-gray-900">
                      {formatarBRL(Number(credito.valorAprovado))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Liberado:</span>
                    <span className="font-medium text-gray-900">
                      {formatarBRL(Number(credito.valorLiberado))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Taxa mensal:</span>
                    <span className="font-medium text-gray-900">
                      {(credito.taxaMensal * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prazo:</span>
                    <span className="font-medium text-gray-900">
                      {credito.prazoMeses} meses
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
