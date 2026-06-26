"use client";

import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  MapPin,
  Download,
  CreditCard,
  BarChart3,
  AlertTriangle,
  ClipboardList,
  DollarSign,
} from "lucide-react";
import type { ObraResumo, CreditoResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";
import { PortfolioChart } from "./PortfolioChart";
import { RegionalDistribution } from "./RegionalDistribution";
import { InadimplenciaMetrics } from "./InadimplenciaMetrics";
import { ReportExport } from "./ReportExport";
import { CapitalFundoAdmin } from "./CapitalFundoAdmin";
import type {
  RegionalMetrics,
  RoiDataPoint,
  InadimplenciaDataPoint,
} from "./fundos-utils";

type Props = {
  isAdmin: boolean;
  portfolioError?: string;
  obras: ObraResumo[];
  creditos: CreditoResumo[];
  totalDesembolsado: number;
  creditoTotalAprovado: number;
  obrasProgressoCount: number;
  etapasAprovadasCount: number;
  totalEtapasCount: number;
  inadimplenciaRate: number;
  roiEsperado: number;
  etapasAguardandoVistoriaCount: number;
  regionalMetrics: RegionalMetrics[];
  roiTimeline: RoiDataPoint[];
  inadimplenciaData: InadimplenciaDataPoint[];
};

export function FundosPageClient({
  isAdmin,
  portfolioError,
  obras,
  creditos,
  totalDesembolsado,
  creditoTotalAprovado,
  obrasProgressoCount,
  etapasAprovadasCount,
  totalEtapasCount,
  inadimplenciaRate,
  roiEsperado,
  etapasAguardandoVistoriaCount,
  regionalMetrics,
  roiTimeline,
  inadimplenciaData,
}: Props) {
  const panels = [
    ...(isAdmin ? [{ id: "fundos-capital", priority: "primary" as const }] : []),
    { id: "fundos-kpis", priority: "primary" as const },
    { id: "fundos-resumo", priority: "primary" as const },
    { id: "fundos-roi", priority: "primary" as const },
    { id: "fundos-inadimplencia", priority: "secondary" as const },
    { id: "fundos-regional", priority: "secondary" as const },
    { id: "fundos-export", priority: "secondary" as const },
    { id: "fundos-creditos", priority: "primary" as const },
  ];

  return (
    <DashboardPanelShell
      panels={panels}
      maxWidth="lg"
      beforeTabs={
        portfolioError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {portfolioError} Faça logout/login. Se persistir, redeploy a API no Render (commit recente).
          </div>
        ) : undefined
      }
      content={
        <>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Carteira do Fundo</h1>
            <p className="text-sm text-gray-500 mt-1">Visão consolidada da operação</p>
          </div>

          {isAdmin && (
            <PanelSection
              id="fundos-capital"
              title="Capital disponível"
              icon={<DollarSign className="w-4 h-4 text-[#1B4FD8]" />}
              priority="primary"
              summary="Configuração Admin do fundo"
            >
              <CapitalFundoAdmin />
            </PanelSection>
          )}

          <PanelSection
            id="fundos-kpis"
            title="Indicadores principais"
            icon={<Wallet className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            summary={`${formatarBRL(totalDesembolsado)} desembolsado · ${obrasProgressoCount} obras ativas`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <p className="text-sm text-gray-500 mb-1">Total desembolsado</p>
                <p className="text-2xl font-bold text-gray-900">{formatarBRL(totalDesembolsado)}</p>
                <p className="text-xs text-gray-400 mt-1">de {formatarBRL(creditoTotalAprovado)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <p className="text-sm text-gray-500 mb-1">Obras em progresso</p>
                <p className="text-2xl font-bold text-gray-900">{obrasProgressoCount}</p>
                <p className="text-xs text-gray-400 mt-1">{obras.length} no total</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <p className="text-sm text-gray-500 mb-1">Etapas completadas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {etapasAprovadasCount} / {totalEtapasCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalEtapasCount
                    ? `${Math.round((etapasAprovadasCount / totalEtapasCount) * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                <p className="text-sm text-gray-500 mb-1">Inadimplência</p>
                <p className="text-2xl font-bold text-gray-900">{inadimplenciaRate}%</p>
                <p className="text-xs text-gray-400 mt-1">taxa de não pagamento</p>
              </div>
            </div>
          </PanelSection>

          <PanelSection
            id="fundos-resumo"
            title="ROI e vistorias"
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            priority="primary"
            summary={`ROI ${formatarBRL(roiEsperado)} · ${etapasAguardandoVistoriaCount} aguardando vistoria`}
            urgency={etapasAguardandoVistoriaCount > 3 ? "warning" : "none"}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">ROI esperado</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Retorno anual estimado</p>
                    <p className="text-2xl font-bold text-green-600">{formatarBRL(roiEsperado)}</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: "100%" }} />
                  </div>
                  <p className="text-xs text-gray-400">Baseado em 15% de retorno anual</p>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Etapas aguardando vistoria</h3>
                <div className="space-y-3">
                  <p className="text-2xl font-bold text-orange-600">{etapasAguardandoVistoriaCount}</p>
                  <p className="text-sm text-gray-500">etapas prontas para validação técnica</p>
                  <Link
                    href="/dashboard/gestor/etapas"
                    className="inline-block text-sm text-[#1B4FD8] font-medium hover:text-[#1638a8]"
                  >
                    Ver fila →
                  </Link>
                </div>
              </div>
            </div>
          </PanelSection>

          <PanelSection
            id="fundos-roi"
            title="Evolução de ROI"
            icon={<BarChart3 className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            summary={`${roiTimeline.length} ponto(s) na série`}
          >
            <PortfolioChart data={roiTimeline} />
          </PanelSection>

          <PanelSection
            id="fundos-inadimplencia"
            title="Taxa de inadimplência"
            icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
            priority="secondary"
            summary={`${inadimplenciaRate}% atual`}
          >
            <InadimplenciaMetrics data={inadimplenciaData} />
          </PanelSection>

          <PanelSection
            id="fundos-regional"
            title="Distribuição por região"
            icon={<MapPin className="w-4 h-4 text-gray-500" />}
            priority="secondary"
            summary={
              regionalMetrics.length === 0
                ? "Sem obras em progresso"
                : `${regionalMetrics.length} região(ões)`
            }
          >
            {regionalMetrics.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma obra em progresso.</p>
            ) : (
              <RegionalDistribution data={regionalMetrics} />
            )}
          </PanelSection>

          <PanelSection
            id="fundos-export"
            title="Exportar relatório"
            icon={<Download className="w-4 h-4 text-gray-500" />}
            priority="secondary"
            summary="CSV da carteira consolidada"
          >
            <ReportExport
              regional={regionalMetrics}
              roiData={roiTimeline}
              inadimplenciaData={inadimplenciaData}
              creditos={creditos}
            />
          </PanelSection>

          <PanelSection
            id="fundos-creditos"
            title="Linhas de crédito"
            icon={<CreditCard className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            badge={creditos.length || undefined}
            summary={
              creditos.length === 0
                ? "Nenhuma linha ativa"
                : `${creditos.length} linha(s) de crédito`
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditos.length === 0 ? (
                <div className="col-span-full rounded-xl border border-gray-100 p-6 text-center">
                  <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Nenhuma linha de crédito ativa.</p>
                </div>
              ) : (
                creditos.map((credito) => (
                  <div
                    key={credito.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/30 p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Crédito #{credito.id.slice(0, 8)}
                      </h3>
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </PanelSection>
        </>
      }
    />
  );
}
