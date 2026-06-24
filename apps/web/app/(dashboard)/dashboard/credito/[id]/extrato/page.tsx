import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import { creditoApi } from "@/lib/api";
import { ExtratoActions } from "@/components/credito/ExtratoActions";
import { CronogramaTable } from "@/components/credito/CronogramaTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Extrato de Crédito — imbobi" };

type PageProps = {
  params: { id: string };
};

export default async function CreditoExtratoPage({ params }: PageProps) {
  const extrato = await creditoApi.extrato(params.id).catch(() => null);

  if (!extrato) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link
          href="/dashboard/credito"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos créditos
        </Link>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-600 mb-2">Crédito não encontrado</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            O crédito que você está procurando não existe ou você não tem permissão para visualizá-lo.
          </p>
        </div>
      </div>
    );
  }

  const { resumo, cronograma } = extrato;

  return (
    <div className="max-w-5xl space-y-6 print:max-w-none">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/credito"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 print:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar aos créditos
        </Link>
        <ExtratoActions creditoId={extrato.creditoId} cronograma={cronograma} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Extrato de Crédito</h1>
        <p className="text-sm text-gray-600 mt-1">
          Crédito #{extrato.creditoId.slice(0, 8)} • Contratado em{" "}
          {new Date(extrato.criadoEm).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Valor Aprovado</p>
          <p className="text-lg font-bold text-gray-900">{formatarBRL(extrato.valorAprovado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Valor Liberado</p>
          <p className="text-lg font-bold text-green-600">{formatarBRL(extrato.valorLiberado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Prazo</p>
          <p className="text-lg font-bold text-gray-900">{extrato.prazoMeses} meses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Taxa Mensal</p>
          <p className="text-lg font-bold text-gray-900">
            {(extrato.taxaMensal * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-700 uppercase font-semibold mb-2">Já Pagos</p>
          <p className="text-xl font-bold text-green-700">{formatarBRL(resumo.totalPago)}</p>
          <p className="text-xs text-green-600 mt-1">{resumo.parcelasPagas} parcelas</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-700 uppercase font-semibold mb-2">A Pagar</p>
          <p className="text-xl font-bold text-blue-700">{formatarBRL(resumo.totalPendente)}</p>
          <p className="text-xs text-blue-600 mt-1">{resumo.parcelasPendentes} parcelas</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-700 uppercase font-semibold mb-2">Total em Juros</p>
          <p className="text-xl font-bold text-gray-900">{formatarBRL(resumo.totalJuros)}</p>
          <p className="text-xs text-gray-600 mt-1">{cronograma.length} parcelas no cronograma</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Cronograma de Pagamento</h2>
        </div>
        <CronogramaTable cronograma={cronograma} />
      </div>

      {extrato.liberacoes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Liberações de Obra</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {extrato.liberacoes.map((lib) => (
              <div key={lib.liberacaoId} className="flex justify-between items-center px-6 py-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{formatarBRL(lib.valor)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(lib.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-xs font-semibold text-gray-600">{lib.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 print:hidden">
        <h3 className="font-semibold text-blue-900 mb-3">Informações importantes</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• O cronograma usa amortização constante sobre o valor liberado (ou aprovado, se ainda não houve liberação).</li>
          <li>• Parcelas marcadas como pagas refletem liberações concluídas registradas no sistema.</li>
          <li>• Valores podem variar por arredondamento; consulte seu contrato para datas oficiais.</li>
        </ul>
      </div>
    </div>
  );
}
