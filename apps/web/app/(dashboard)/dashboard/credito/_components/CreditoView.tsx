import Link from "next/link";
import type { Route } from "next";
import {
  CreditCard,
  TrendingDown,
  Wallet,
  Percent,
  Calendar,
  ArrowRight,
  Building2,
  BarChart3,
  FileText,
} from "lucide-react";
import { gerarCronogramaPagamento, resumirCronograma, formatarBRL } from "@imbobi/core";
import type { CreditoResumo } from "@/lib/api";
import { EmptyState } from "@/app/(dashboard)/_components/EmptyState";
import { CronogramaTable } from "@/components/credito/CronogramaTable";

function cronogramaDoCredito(credito: CreditoResumo) {
  const valorPrincipal =
    credito.valorLiberado > 0 ? credito.valorLiberado : credito.valorAprovado;

  const parcelasPagas: Record<number, string> = {};
  credito.liberacoes
    ?.filter((lib) => lib.status === "CONCLUIDA" && lib.processadoEm)
    .forEach((lib, index) => {
      parcelasPagas[index + 1] = lib.processadoEm!.slice(0, 10);
    });

  return gerarCronogramaPagamento({
    valorPrincipal,
    taxaMensalDecimal: credito.taxaMensal,
    prazoMeses: credito.prazoMeses,
    dataInicio: credito.dataAprovacao,
    parcelasPagas: Object.keys(parcelasPagas).length > 0 ? parcelasPagas : undefined,
  });
}

type Props = {
  creditos: CreditoResumo[];
  /** Oculta o cabeçalho (usado quando embutido em outra tela, ex.: Minha operação). */
  hideHeader?: boolean;
};

/** Visão de crédito reutilizável (página /credito e aba de Minha operação). */
export function CreditoView({ creditos, hideHeader = false }: Props) {
  if (creditos.length === 0) {
    return (
      <div className="max-w-4xl">
        {!hideHeader && (
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <CreditCard className="w-6 h-6 text-[#1B4FD8]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crédito</h1>
              <p className="text-sm text-gray-500">Gerencie seus créditos de obra</p>
            </div>
          </div>
        )}
        <EmptyState
          icon={CreditCard}
          title="Nenhum crédito ativo"
          description="Você ainda não tem créditos aprovados. Envie a documentação do empreendimento para iniciar a análise."
          action={{ label: "Enviar projeto", href: "/dashboard/proposta-credito" as Route, icon: BarChart3 }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {!hideHeader && (
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <CreditCard className="w-6 h-6 text-[#1B4FD8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crédito</h1>
            <p className="text-sm text-gray-500">
              {creditos.length} crédito{creditos.length !== 1 ? "s" : ""} encontrado
              {creditos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/dashboard/credito/solicitar"
            className="ml-auto inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <CreditCard className="w-4 h-4" />
            Solicitar Crédito
          </Link>
        </div>
      )}

      {creditos.map((credito) => {
        const cronograma = cronogramaDoCredito(credito);
        const resumo = resumirCronograma(cronograma);
        const pctLiberado =
          credito.valorAprovado > 0
            ? Math.round((credito.valorLiberado / credito.valorAprovado) * 100)
            : 0;

        return (
          <div key={credito.id} className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 w-full bg-[#1B4FD8]" />
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-xl shrink-0">
                        <Wallet className="w-4 h-4 text-[#1B4FD8]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          Aprovado
                        </p>
                        <p className="text-xl font-bold text-[#1B4FD8]">
                          {formatarBRL(credito.valorAprovado)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-xl shrink-0">
                        <TrendingDown className="w-4 h-4 text-[#16a34a]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          Liberado
                        </p>
                        <p className="text-xl font-bold text-[#16a34a]">
                          {formatarBRL(credito.valorLiberado)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-xl shrink-0">
                        <Percent className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          Taxa Mensal
                        </p>
                        <p className="text-xl font-bold text-gray-900">
                          {(credito.taxaMensal * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-xl shrink-0">
                        <Calendar className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          Prazo
                        </p>
                        <p className="text-xl font-bold text-gray-900">{credito.prazoMeses}x</p>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/credito/${credito.id}/extrato`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 border border-blue-100 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Extrato completo
                  </Link>
                </div>

                <div className="pt-2 border-t border-gray-50">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                    <span className="font-semibold">Valor liberado</span>
                    <span className="font-bold text-gray-700">{pctLiberado}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#16a34a] rounded-full transition-all"
                      style={{ width: `${pctLiberado}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-red-50 rounded-lg">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Total em Juros
                  </p>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatarBRL(resumo.totalJuros)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Wallet className="w-3.5 h-3.5 text-[#1B4FD8]" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Total a Pagar
                  </p>
                </div>
                <p className="text-2xl font-bold text-[#1B4FD8]">
                  {formatarBRL(resumo.totalPago + resumo.totalPendente)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-gray-50 rounded-lg">
                    <Percent className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                    Custo Efetivo Total
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {(credito.valorLiberado || credito.valorAprovado) > 0
                    ? (
                        (resumo.totalJuros / (credito.valorLiberado || credito.valorAprovado)) *
                        100
                      ).toFixed(1)
                    : "0.0"}
                  %
                </p>
              </div>
            </div>

            <div
              id="parcelas"
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-24"
            >
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-xl">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Calendário de Pagamento</h3>
                </div>
                <Link
                  href={`/dashboard/credito/${credito.id}/extrato`}
                  className="text-sm font-semibold text-[#1B4FD8] hover:underline"
                >
                  Ver extrato →
                </Link>
              </div>
              <CronogramaTable cronograma={cronograma} compact />
            </div>

            {credito.obras && credito.obras.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-xl">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Obras Financiadas</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {credito.obras.map((obra) => (
                    <div
                      key={obra.id}
                      className="flex justify-between items-center px-6 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-xl">
                          <Building2 className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{obra.nome}</p>
                          <p className="text-xs text-gray-400">
                            {obra.status.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/obras/${obra.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 transition-colors"
                      >
                        Ver detalhes
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
