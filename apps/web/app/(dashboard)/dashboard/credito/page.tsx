import type { Metadata } from "next";
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
  const creditos = await creditoApi.meus().catch(() => []);

  if (creditos.length === 0) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum crédito ativo
          </h2>
          <p className="text-gray-600 mb-6">
            Você ainda não tem créditos aprovados. Acesse o simulador para simular um crédito.
          </p>
          <a
            href="/dashboard/simulador"
            className="inline-block bg-brand-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-brand-700 transition-colors"
          >
            Simular Crédito
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
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

        return (
          <div key={credito.id} className="space-y-6">
            {/* Crédito Summary */}
            <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-6 shadow-sm">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Valor Aprovado
                  </p>
                  <p className="text-2xl font-bold text-brand-700">
                    {formatarBRL(credito.valorAprovado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Valor Liberado
                  </p>
                  <p className="text-2xl font-bold text-brand-700">
                    {formatarBRL(credito.valorLiberado)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Taxa Mensal
                  </p>
                  <p className="text-2xl font-bold text-brand-700">
                    {(credito.taxaMensal * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Prazo
                  </p>
                  <p className="text-2xl font-bold text-brand-700">
                    {credito.prazoMeses}x
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
                  Total em Juros
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {formatarBRL(totalJuros)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
                  Total a Pagar
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatarBRL(totalPago)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
                  Taxa de Juros Efetiva
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {((totalJuros / credito.valorLiberado) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Calendário de Pagamento
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Parcela
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-600">
                        Data de Vencimento
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        Principal
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        Juros
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        Total
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600">
                        Saldo Devedor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendário.map((p) => (
                      <tr
                        key={p.parcela}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {p.parcela}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {p.dataPagamento.toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatarBRL(p.principal)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {formatarBRL(p.juros)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatarBRL(p.total)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Obras Financiadas
                </h3>
                <div className="space-y-2">
                  {credito.obras.map((obra) => (
                    <div
                      key={obra.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{obra.nome}</p>
                        <p className="text-xs text-gray-500">Status: {obra.status}</p>
                      </div>
                      <a
                        href={`/dashboard/obras/${obra.id}`}
                        className="text-brand-600 hover:text-brand-700 text-sm font-semibold"
                      >
                        Ver detalhes →
                      </a>
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
