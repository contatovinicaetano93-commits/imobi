'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatarBRL } from "@imbobi/core";
import { AlertCircle, Download, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: {
    id: string;
  };
}

// Type for amortization payment
interface PagamentoExtrato {
  parcela: number;
  dataVencimento: string;
  saldoInicial: number;
  juros: number;
  amortizacao: number;
  pagamento: number;
  saldoDevedor: number;
  dataPagamento?: string;
  status: "PAGO" | "PENDENTE" | "ATRASADO";
}

export default function CreditoExtratoPage({ params }: PageProps) {
  const [credito, setCredito] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCredito = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
        const token = localStorage.getItem("access_token");

        const response = await fetch(`${API_URL}/credito/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCredito(data);
        }
      } catch (error) {
        console.error("Error fetching credit:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredito();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!credito) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/dashboard/credito" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Voltar aos créditos
        </Link>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="font-semibold text-gray-600 mb-2">Crédito não encontrado</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            O crédito que você está procurando não existe ou foi removido.
          </p>
          <a
            href="/dashboard/credito"
            className="inline-block mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Voltar aos créditos →
          </a>
        </div>
      </div>
    );
  }

  // Mock amortization data - in production, this would come from the API
  const pagamentos: PagamentoExtrato[] = Array.from({ length: credito.prazoMeses || 12 }, (_, i) => {
    const parcela = i + 1;
    const diasVencimento = parcela * 30;
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + diasVencimento);

    const saldoInicial = (credito.valorAprovado || 0) - (credito.valorLiberado || 0) * (i / (credito.prazoMeses || 1));
    const juros = (saldoInicial * (credito.taxaMensal || 0)) / 100;
    const amortizacao = (credito.valorAprovado || 0) / (credito.prazoMeses || 1);
    const pagamento = juros + amortizacao;
    const saldoDevedor = Math.max(0, saldoInicial - amortizacao);

    // First few are paid, rest are pending
    const dataPagamento = parcela <= 3 ? dataVencimento.toISOString().split('T')[0] : undefined;
    const status: PagamentoExtrato['status'] = parcela <= 3 ? "PAGO" : "PENDENTE";

    return {
      parcela,
      dataVencimento: dataVencimento.toISOString().split('T')[0],
      saldoInicial,
      juros,
      amortizacao,
      pagamento,
      saldoDevedor,
      dataPagamento,
      status,
    };
  });

  const totalPago = pagamentos
    .filter((p) => p.status === "PAGO")
    .reduce((acc, p) => acc + p.pagamento, 0);

  const totalPendente = pagamentos
    .filter((p) => p.status === "PENDENTE")
    .reduce((acc, p) => acc + p.pagamento, 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/credito" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          Voltar aos créditos
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={() => {
              // Trigger CSV download
              const csv = generateCSV(pagamentos);
              downloadCSV(csv, `extrato-credito-${credito.id}.csv`);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Extrato de Crédito</h1>
        <p className="text-sm text-gray-600 mt-1">
          Crédito #{credito.id} • Contratado em {new Date(credito.dataAprovacao || new Date()).toLocaleDateString("pt-BR")}
        </p>
      </div>

      {/* Credit Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Valor Aprovado</p>
          <p className="text-lg font-bold text-gray-900">{formatarBRL(credito.valorAprovado || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Valor Liberado</p>
          <p className="text-lg font-bold text-green-600">{formatarBRL(credito.valorLiberado || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Prazo</p>
          <p className="text-lg font-bold text-gray-900">{credito.prazoMeses} meses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Taxa Mensal</p>
          <p className="text-lg font-bold text-gray-900">{(credito.taxaMensal || 0).toFixed(3)}%</p>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-700 uppercase font-semibold mb-2">Já Pagos</p>
          <p className="text-xl font-bold text-green-700">{formatarBRL(totalPago)}</p>
          <p className="text-xs text-green-600 mt-1">{pagamentos.filter((p) => p.status === "PAGO").length} parcelas</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-700 uppercase font-semibold mb-2">A Pagar</p>
          <p className="text-xl font-bold text-blue-700">{formatarBRL(totalPendente)}</p>
          <p className="text-xs text-blue-600 mt-1">{pagamentos.filter((p) => p.status === "PENDENTE").length} parcelas</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-700 uppercase font-semibold mb-2">Total</p>
          <p className="text-xl font-bold text-gray-900">{formatarBRL(totalPago + totalPendente)}</p>
          <p className="text-xs text-gray-600 mt-1">{pagamentos.length} parcelas</p>
        </div>
      </div>

      {/* Amortization Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Cronograma de Pagamento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Parcela</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Vencimento</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Saldo Inicial</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Juros</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Amortização</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Pagamento</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Saldo Devedor</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((pagamento) => (
                <tr key={pagamento.parcela} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">#{pagamento.parcela}</td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {new Date(pagamento.dataVencimento).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">{formatarBRL(pagamento.saldoInicial)}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{formatarBRL(pagamento.juros)}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{formatarBRL(pagamento.amortizacao)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatarBRL(pagamento.pagamento)}</td>
                  <td className="px-6 py-4 text-right text-gray-700">{formatarBRL(pagamento.saldoDevedor)}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        pagamento.status === "PAGO"
                          ? "bg-green-100 text-green-800"
                          : pagamento.status === "ATRASADO"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {pagamento.status === "PAGO" ? "✓ Pago" : pagamento.status === "ATRASADO" ? "⚠ Atrasado" : "○ Pendente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Informações importantes</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>As datas de vencimento são meramente ilustrativas. Consulte seu contrato para as datas reais.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Os valores são aproximados e podem variar por questões de arredondamento.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>Em caso de pagamento antecipado, os juros serão recalculados.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function generateCSV(pagamentos: PagamentoExtrato[]): string {
  const headers = [
    "Parcela",
    "Data Vencimento",
    "Saldo Inicial",
    "Juros",
    "Amortização",
    "Pagamento",
    "Saldo Devedor",
    "Status",
  ];

  const rows = pagamentos.map((p) => [
    `#${p.parcela}`,
    p.dataVencimento,
    `R$ ${p.saldoInicial.toFixed(2)}`,
    `R$ ${p.juros.toFixed(2)}`,
    `R$ ${p.amortizacao.toFixed(2)}`,
    `R$ ${p.pagamento.toFixed(2)}`,
    `R$ ${p.saldoDevedor.toFixed(2)}`,
    p.status,
  ]);

  return [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");
}

function downloadCSV(csv: string, filename: string): void {
  const element = document.createElement("a");
  element.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
