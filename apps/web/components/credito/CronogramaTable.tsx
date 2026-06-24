import { formatarBRL } from "@imbobi/core";
import type { CreditoExtratoParcela } from "@/lib/api";

type Props = {
  cronograma: CreditoExtratoParcela[];
  compact?: boolean;
};

const STATUS_LABEL: Record<CreditoExtratoParcela["status"], string> = {
  PAGO: "✓ Pago",
  ATRASADO: "⚠ Atrasado",
  PENDENTE: "○ Pendente",
};

const STATUS_CLASS: Record<CreditoExtratoParcela["status"], string> = {
  PAGO: "bg-green-100 text-green-800",
  ATRASADO: "bg-red-100 text-red-800",
  PENDENTE: "bg-blue-100 text-blue-800",
};

export function CronogramaTable({ cronograma, compact = false }: Props) {
  const cellPad = compact ? "py-3 px-4" : "py-4 px-6";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={`${cellPad} text-left font-semibold text-gray-700`}>Parcela</th>
            <th className={`${cellPad} text-right font-semibold text-gray-700`}>Vencimento</th>
            <th className={`${cellPad} text-right font-semibold text-gray-700`}>Saldo Inicial</th>
            <th className={`${cellPad} text-right font-semibold text-gray-700`}>Juros</th>
            <th className={`${cellPad} text-right font-semibold text-gray-700`}>Amortização</th>
            <th className={`${cellPad} text-right font-semibold text-gray-700`}>Pagamento</th>
            <th className={`${cellPad} text-right font-semibold text-gray-700`}>Saldo Devedor</th>
            <th className={`${cellPad} text-center font-semibold text-gray-700`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {cronograma.map((pagamento) => (
            <tr
              key={pagamento.parcela}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className={`${cellPad} font-semibold text-gray-900`}>#{pagamento.parcela}</td>
              <td className={`${cellPad} text-right text-gray-700`}>
                {new Date(`${pagamento.dataVencimento}T12:00:00`).toLocaleDateString("pt-BR")}
              </td>
              <td className={`${cellPad} text-right text-gray-700`}>
                {formatarBRL(pagamento.saldoInicial)}
              </td>
              <td className={`${cellPad} text-right text-gray-700`}>
                {formatarBRL(pagamento.juros)}
              </td>
              <td className={`${cellPad} text-right text-gray-700`}>
                {formatarBRL(pagamento.amortizacao)}
              </td>
              <td className={`${cellPad} text-right font-semibold text-gray-900`}>
                {formatarBRL(pagamento.pagamento)}
              </td>
              <td className={`${cellPad} text-right text-gray-700`}>
                {formatarBRL(pagamento.saldoDevedor)}
              </td>
              <td className={`${cellPad} text-center`}>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASS[pagamento.status]}`}
                >
                  {STATUS_LABEL[pagamento.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
