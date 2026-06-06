"use client";

import { useSimuladorCredito } from "@imbobi/core";
import { formatarBRL, formatarPercentual } from "@imbobi/core";
import { Calculator, ArrowRight, TrendingUp, Wallet, Percent, Banknote } from "lucide-react";

function ResultCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <div className="bg-[#1B4FD8] rounded-2xl p-6 col-span-full sm:col-span-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-blue-200" />
          <p className="text-blue-200 text-xs font-medium">{label}</p>
        </div>
        <p className="text-4xl font-bold text-white">{value}</p>
        <p className="text-blue-200 text-xs mt-1">por mês</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <p className="text-gray-500 text-xs font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function SimuladorPage() {
  const { valorSolicitado, setValorSolicitado, prazoMeses, setPrazoMeses, resultado } =
    useSimuladorCredito();

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-[#1B4FD8]/10 rounded-xl">
          <Calculator className="w-6 h-6 text-[#1B4FD8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulador de Crédito</h1>
          <p className="text-sm text-gray-500 mt-0.5">Simule as condições antes de solicitar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna de inputs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Configurar Simulação</p>

            {/* Valor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Valor desejado</label>
                <span className="text-base font-bold text-[#1B4FD8]">{formatarBRL(valorSolicitado)}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={1000000}
                step={5000}
                value={valorSolicitado}
                onChange={(e) => setValorSolicitado(Number(e.target.value))}
                className="w-full h-2 accent-[#1B4FD8] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>R$ 10.000</span>
                <span>R$ 1.000.000</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Prazo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Prazo de pagamento</label>
              <span className="text-base font-bold text-[#1B4FD8]">{prazoMeses} meses</span>
            </div>
            <input
              type="range"
              min={12}
              max={180}
              step={12}
              value={prazoMeses}
              onChange={(e) => setPrazoMeses(Number(e.target.value))}
              className="w-full h-2 accent-[#1B4FD8] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>12 meses</span>
              <span>180 meses (15 anos)</span>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Resumo da configuração */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumo da Configuração</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor solicitado</span>
                <span className="font-semibold text-gray-900">{formatarBRL(valorSolicitado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prazo</span>
                <span className="font-semibold text-gray-900">{prazoMeses} meses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna de resultado */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard
              label="Parcela mensal"
              value={formatarBRL(resultado.parcelaMensal)}
              icon={Wallet}
              highlight
            />
            <ResultCard
              label="Total pago"
              value={formatarBRL(resultado.totalPago)}
              icon={Banknote}
            />
            <ResultCard
              label="Total de juros"
              value={formatarBRL(resultado.totalJuros)}
              icon={TrendingUp}
            />
            <ResultCard
              label="CET ao ano"
              value={formatarPercentual(resultado.cet)}
              icon={Percent}
            />
          </div>

          {/* CTA */}
          <a
            href="/dashboard/credito/solicitar"
            className="flex items-center justify-center gap-2 w-full bg-[#1B4FD8] text-white font-semibold py-4 rounded-2xl hover:bg-[#1e40af] transition-colors group"
          >
            Solicitar este crédito
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center px-2">
            Simulação com caráter informativo. Condições reais sujeitas à análise de crédito.
          </p>
        </div>
      </div>
    </div>
  );
}
