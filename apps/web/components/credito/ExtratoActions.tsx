"use client";

import { Download, Printer } from "lucide-react";
import type { CreditoExtratoParcela } from "@/lib/api";

type Props = {
  creditoId: string;
  cronograma: CreditoExtratoParcela[];
};

export function ExtratoActions({ creditoId, cronograma }: Props) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors print:hidden"
      >
        <Printer className="w-4 h-4" />
        Imprimir
      </button>
      <button
        type="button"
        onClick={() => downloadCSV(cronograma, `extrato-credito-${creditoId}.csv`)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4FD8] text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors print:hidden"
      >
        <Download className="w-4 h-4" />
        Baixar CSV
      </button>
    </div>
  );
}

function downloadCSV(cronograma: CreditoExtratoParcela[], filename: string): void {
  const headers = [
    "Parcela",
    "Vencimento",
    "Saldo Inicial",
    "Juros",
    "Amortização",
    "Pagamento",
    "Saldo Devedor",
    "Status",
  ];

  const rows = cronograma.map((p) => [
    String(p.parcela),
    p.dataVencimento,
    p.saldoInicial.toFixed(2),
    p.juros.toFixed(2),
    p.amortizacao.toFixed(2),
    p.pagamento.toFixed(2),
    p.saldoDevedor.toFixed(2),
    p.status,
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const element = document.createElement("a");
  element.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
