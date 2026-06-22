import type { Metadata } from "next";
import { managerApi } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { PortfolioChart } from "./_components/PortfolioChart";
import { RegionalDistribution } from "./_components/RegionalDistribution";
import { InadimplenciaMetrics } from "./_components/InadimplenciaMetrics";
import { ReportExport } from "./_components/ReportExport";
import {
  aggregateByRegion,
  calculateRoiTimeline,
  calculateInadimplenciaRate,
} from "./_components/fundos-utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Portfolio — Gestor de Fundo — IMOBI" };

export default async function FundosPage() {
  const portfolio = await managerApi.portfolio().catch(() => null);

  const creditos = (portfolio?.creditos ?? []).map((c) => ({
    id: c.id,
    valorAprovado: c.valorAprovado,
    valorLiberado: c.valorLiberado,
    taxaMensal: c.taxaMensal,
    prazoMeses: c.prazoMeses,
    status: c.status,
    obras: [] as { id: string; nome: string; status: string }[],
    liberacoes: [] as { id: string; valor: number; status: string; processadoEm?: string }[],
  }));

  const obras = (portfolio?.obras ?? []).map((o) => ({
    id: o.id,
    nome: o.nome,
    status: o.status,
    endereco: o.endereco,
    geoLatitude: 0,
    geoLongitude: 0,
    raioValidacaoMetros: 100,
    etapas: o.etapas.map((e) => ({
      id: e.etapaId,
      nome: "",
      ordem: 0,
      percentualObra: e.percentualObra,
      valorLiberacao: 0,
      status: e.status,
    })),
  }));

  const totalDesembolsado = portfolio?.creditoTotalLiberado ?? 0;
  const creditoTotalAprovado = portfolio?.creditoTotalAprovado ?? 0;
  const creditoTotalLiberado = portfolio?.creditoTotalLiberado ?? 0;
  const obrasProgresso = obras.filter((o) => o.status === "EM_EXECUCAO");
  const totalEtapas = obras.flatMap((o) => o.etapas ?? []);
  const etapasAprovadas = totalEtapas.filter((e) => e.status === "CONCLUIDA");
  const etapasAguardandoVistoria = totalEtapas.filter(
    (e) => e.status === "AGUARDANDO_VISTORIA",
  );
  const roiEsperado = creditoTotalAprovado * ((portfolio?.roiEstimadoPct ?? 15) / 100);
  const inadimplenciaRate = portfolio?.inadimplenciaRate ?? 0;

  const regionalMetrics = aggregateByRegion(obras, creditos);
  const roiTimeline = calculateRoiTimeline(creditos);
  const inadimplenciaData = calculateInadimplenciaRate(creditos);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
        <p className="text-sm text-gray-500">Visão agregada do fundo</p>
      </div>

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
            <p className="text-xs text-gray-400">
              Baseado em {portfolio?.roiEstimadoPct ?? 15}% sobre crédito liberado
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Etapas aguardando vistoria
          </h2>
          <div className="space-y-3">
            <p className="text-2xl font-bold text-orange-600">
              {portfolio?.etapasAguardandoVistoria ?? etapasAguardandoVistoria.length}
            </p>
            <p className="text-sm text-gray-500">
              etapas prontas para validação técnica
            </p>
            <a
              href="/dashboard/gestor/etapas"
              className="inline-block text-sm text-[#1B4FD8] font-medium hover:text-[#1638a8]"
            >
              Ver fila →
            </a>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Evolução de ROI</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <PortfolioChart data={roiTimeline} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Taxa de Inadimplência</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <InadimplenciaMetrics data={inadimplenciaData} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por região</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {regionalMetrics.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma obra em progresso.</p>
          ) : (
            <RegionalDistribution data={regionalMetrics} />
          )}
        </div>
      </section>

      <section>
        <ReportExport
          regional={regionalMetrics}
          roiData={roiTimeline}
          inadimplenciaData={inadimplenciaData}
          creditos={creditos}
        />
      </section>

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
