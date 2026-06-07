import type { Metadata } from "next";
import Link from "next/link";
import {
  CreditCard,
  TrendingDown,
  Wallet,
  Percent,
  Calendar,
  ArrowRight,
  Building2,
  BarChart3,
} from "lucide-react";
import { creditoApi, type CreditoResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Crédito — imbobi" };

function gerarCalendarioPagamento(
  valorAprovado: number,
  valorLiberado: number,
  taxaMensal: number,
  prazoMeses: number,
  dataAprovacao?: string
) {
  const calendário = [];
  const dataInicial = dataAprovacao ? new Date(dataAprovacao) : new Date();
  let saldoDevedor = valorLiberado;

  for (let i = 1; i <= prazoMeses; i++) {
    const dataPagamento = new Date(dataInicial);
    dataPagamento.setMonth(dataPagamento.getMonth() + i);

    const juros = saldoDevedor * taxaMensal;
    const parcelaPrincipal = valorLiberado / prazoMeses;
    const parcelaTotal = parcelaPrincipal + juros;
    saldoDevedor -= parcelaPrincipal;

    calendário.push({
      parcela: i,
      dataPagamento,
      principal: parcelaPrincipal,
      juros,
      total: parcelaTotal,
      saldoDevedor: Math.max(0, saldoDevedor),
    });
  }

  return calendário;
}

export default async function CreditoPage() {
  const creditos = await creditoApi.meus().catch(() => [] as CreditoResumo[]);

  if (creditos.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <CreditCard className="w-6 h-6 text-[#1B4FD8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crédito</h1>
            <p className="text-sm text-gray-500">Gerencie seus créditos de obra</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4">
          <div className="p-5 bg-gray-50 rounded-2xl">
            <CreditCard className="w-12 h-12 text-gray-300" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Nenhum crédito ativo</h2>
            <p className="text-sm text-gray-400 max-w-xs">
              Você ainda não tem créditos aprovados. Use o simulador para calcular o melhor crédito.
            </p>
          </div>
          <Link
            href="/dashboard/simulador"
            className="mt-2 inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200"
          >
            <BarChart3 className="w-4 h-4" />
            Simular Crédito
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-xl">
          <CreditCard className="w-6 h-6 text-[#1B4FD8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Crédito</h1>
          <p className="text-sm text-gray-500">
            {creditos.length} crédito{creditos.length !== 1 ? "s" : ""} encontrado{creditos.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {creditos.map((credito) => {
        const calendário = gerarCalendarioPagamento(
          credito.valorAprovado,
          credito.valorLiberado,
          credito.taxaMensal,
          credito.prazoMeses,
          credito.dataAprovacao
        );

        const totalJuros = calendário.reduce((sum, p) => sum + p.juros, 0);
        const totalPago = calendário.reduce((sum, p) => sum + p.total, 0);
        const pctLiberado = credito.valorAprovado > 0
          ? Math.round((credito.valorLiberado / credito.valorAprovado) * 100)
          : 0;

        return (
          <div key={credito.creditoId} className="space-y-6">
            {/* Credit Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5 w-full bg-[#1B4FD8]" />
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
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
                      <p className="text-xl font-bold text-gray-900">
                        {credito.prazoMeses}x
                      </p>
                    </div>
                  </div>
                </div>

                {/* Liberation Progress */}
                <div className="mt-6 pt-5 border-t border-gray-50">
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

            {/* Cost Breakdown */}
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
                <p className="text-2xl font-bold text-red-600">
                  {formatarBRL(totalJuros)}
                </p>
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
                  {formatarBRL(totalPago)}
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
                  {credito.valorLiberado > 0
                    ? ((totalJuros / credito.valorLiberado) * 100).toFixed(1)
                    : "0.0"}%
                </p>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-gray-500" />
                </div>
                <h3 className="font-semibold text-gray-900">Calendário de Pagamento</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Parcela
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Vencimento
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Principal
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Juros
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total
                      </th>
                      <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Saldo Devedor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendário.map((p, idx) => (
                      <tr
                        key={p.parcela}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}
                      >
                        <td className="py-3 px-5">
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-[#1B4FD8] text-xs font-bold rounded-lg">
                            {p.parcela}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {p.dataPagamento.toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatarBRL(p.principal)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-500 font-medium">
                          {formatarBRL(p.juros)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatarBRL(p.total)}
                        </td>
                        <td className="py-3 px-5 text-right text-gray-500">
                          {formatarBRL(p.saldoDevedor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Related Works */}
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
                      key={obra.obraId ?? obra.id}
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
                        href={`/dashboard/obras/${obra.obraId ?? obra.id}`}
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
