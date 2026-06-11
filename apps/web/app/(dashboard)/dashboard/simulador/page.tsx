"use client";

import { useSimuladorCredito } from "@imbobi/core/hooks";
import { formatarBRL, formatarPercentual } from "@imbobi/core";

export default function SimuladorPage() {
  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Simulador de Crédito</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Valor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor desejado: <span className="font-bold text-[#1B4FD8]">{formatarBRL(valorSolicitado)}</span>
          </label>
          <input
            type="range"
            min={10000}
            max={1000000}
            step={5000}
            value={valorSolicitado}
            onChange={(e) => setValorSolicitado(Number(e.target.value))}
            className="w-full accent-[#1B4FD8]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>R$ 10.000</span>
            <span>R$ 1.000.000</span>
          </div>
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prazo: <span className="font-bold text-[#1B4FD8]">{prazoMeses} meses</span>
          </label>
          <input
            type="range"
            min={12}
            max={180}
            step={12}
            value={prazoMeses}
            onChange={(e) => setPrazoMeses(Number(e.target.value))}
            className="w-full accent-[#1B4FD8]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>12 meses</span>
            <span>180 meses</span>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="rounded-2xl text-white p-6 grid grid-cols-2 gap-6" style={{ background: "#1B4FD8" }}>
        <ResultItem label="Parcela mensal" value={formatarBRL(resultado.parcelaMensal)} big />
        <ResultItem label="Total pago" value={formatarBRL(resultado.totalPago)} />
        <ResultItem label="Total de juros" value={formatarBRL(resultado.totalJuros)} />
        <ResultItem label="CET ao ano" value={formatarPercentual(resultado.cet)} />
      </div>

      <a
        href={`/dashboard/credito/solicitar?valor=${valorSolicitado}&prazo=${prazoMeses}`}
        className="block text-center font-semibold py-4 rounded-2xl transition-colors"
        style={{ background: "#1B4FD8", color: "white" }}
      >
        Solicitar este crédito
      </a>
    </div>
  );
}

function ResultItem({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-blue-200 text-xs mb-1">{label}</p>
      <p className={`font-bold ${big ? "text-3xl" : "text-xl"}`}>{value}</p>
    </div>
  );
}
