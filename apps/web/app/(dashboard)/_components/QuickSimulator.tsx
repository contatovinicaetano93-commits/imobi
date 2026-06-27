"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { formatarBRL } from "@imbobi/core";

interface QuickSimulatorProps {
  creditoAprovado?: number;
  creditoLiberado?: number;
}

export function QuickSimulator({
  creditoAprovado = 100000,
  creditoLiberado = 50000,
}: QuickSimulatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [simulacao, setSimulacao] = useState({
    valor: creditoAprovado - creditoLiberado,
    prazo: 12,
    taxa: 1.5,
  });

  const calculoParcela =
    (simulacao.valor * (simulacao.taxa / 100)) /
    (1 - Math.pow(1 + simulacao.taxa / 100, -simulacao.prazo));

  const saldoDisponivel = creditoAprovado - creditoLiberado;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <Calculator className="w-5 h-5 text-[#1B4FD8]" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-600">Simulador Rápido</p>
            <p className="text-sm sm:text-base font-bold text-gray-900">
              {formatarBRL(saldoDisponivel)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">disponível</p>
          </div>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 sm:p-6 space-y-4">
          {/* Valor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-semibold text-gray-700">
                Valor a Simular
              </label>
              <span className="text-sm font-bold text-[#1B4FD8]">
                {formatarBRL(simulacao.valor)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={saldoDisponivel}
              value={simulacao.valor}
              onChange={(e) => setSimulacao({ ...simulacao, valor: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B4FD8]"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={simulacao.valor}
                onChange={(e) => setSimulacao({ ...simulacao, valor: Number(e.target.value) })}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-500">R$</span>
            </div>
          </div>

          {/* Prazo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-semibold text-gray-700">Prazo</label>
              <span className="text-sm font-bold text-[#1B4FD8]">{simulacao.prazo} meses</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={simulacao.prazo}
              onChange={(e) => setSimulacao({ ...simulacao, prazo: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1B4FD8]"
            />
          </div>

          {/* Taxa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-semibold text-gray-700">Taxa Mensal</label>
              <span className="text-sm font-bold text-[#1B4FD8]">{simulacao.taxa.toFixed(2)}%</span>
            </div>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 font-medium">
              Taxa fixa de mercado (não editável)
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 mt-4">
            <p className="text-xs text-[#1B4FD8] font-semibold">PARCELA MENSAL ESTIMADA</p>
            <p className="text-2xl font-bold text-gray-900">{formatarBRL(calculoParcela)}</p>
            <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-blue-100">
              <div>
                <p className="text-blue-700/70">Total a Pagar</p>
                <p className="font-semibold text-gray-900">
                  {formatarBRL(calculoParcela * simulacao.prazo)}
                </p>
              </div>
              <div>
                <p className="text-blue-700/70">Juros Totais</p>
                <p className="font-semibold text-gray-900">
                  {formatarBRL(calculoParcela * simulacao.prazo - simulacao.valor)}
                </p>
              </div>
            </div>
          </div>

          <a
            href="/dashboard/credito"
            className="block w-full text-center px-4 py-2 text-sm font-semibold text-[#1B4FD8] hover:text-blue-800 border-t border-gray-100 pt-4"
          >
            Ver meus créditos →
          </a>
        </div>
      )}
    </div>
  );
}
