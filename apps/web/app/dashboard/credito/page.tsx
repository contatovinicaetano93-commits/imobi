"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CreditSimulation {
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
  cet: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function CreditPage() {
  const router = useRouter();
  const [valor, setValor] = useState(50000);
  const [prazo, setPrazo] = useState(24);
  const [tipoObra, setTipoObra] = useState("RESIDENCIAL");
  const [simulacao, setSimulacao] = useState<CreditSimulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("http://localhost:4000/api/v1/credito/simular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          valorSolicitado: valor,
          prazoMeses: prazo,
          tipoObra: tipoObra,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.message === "string"
            ? err.message
            : Array.isArray(err.message)
            ? err.message[0]
            : "Falha ao simular crédito"
        );
      }

      const data = await res.json();
      setSimulacao(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao simular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Simulador de Crédito
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Calcule as condições de financiamento para seu projeto
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Dados do Financiamento
            </h2>

            {/* Valor */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Solicitado
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="10000"
                  value={valor}
                  onChange={(e) => setValor(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>
              <div className="flex justify-between items-end mt-3">
                <span className="text-3xl font-bold text-brand-600">
                  {formatCurrency(valor)}
                </span>
                <span className="text-xs text-gray-500">
                  R$ 10 mil - R$ 1 milhão
                </span>
              </div>
            </div>

            {/* Prazo */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prazo de Pagamento
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="12"
                  max="180"
                  step="1"
                  value={prazo}
                  onChange={(e) => setPrazo(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>
              <div className="flex justify-between items-end mt-3">
                <span className="text-3xl font-bold text-brand-600">
                  {prazo}
                </span>
                <span className="text-xs text-gray-500">meses (12-180)</span>
              </div>
            </div>

            {/* Tipo de Obra */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Obra
              </label>
              <select
                value={tipoObra}
                onChange={(e) => setTipoObra(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-brand-500 outline-none transition"
              >
                <option value="RESIDENCIAL">Residencial</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="MISTO">Misto</option>
              </select>
            </div>

            {/* Simulate Button */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full bg-brand-600 text-white font-semibold py-3 rounded-2xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Simulando..." : "Simular"}
            </button>
          </div>

          {/* Result Section */}
          <div className="lg:sticky lg:top-8">
            {simulacao ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Resultado da Simulação
                </h3>

                <div className="space-y-5">
                  {/* Monthly Payment */}
                  <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Parcela Mensal
                    </p>
                    <p className="text-3xl font-bold text-brand-600">
                      {formatCurrency(simulacao.parcelaMensal)}
                    </p>
                  </div>

                  {/* Total Interest */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Juros Totais</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(simulacao.totalJuros)}
                    </p>
                  </div>

                  {/* Total Amount */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Valor Total a Pagar</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(simulacao.totalPago)}
                    </p>
                  </div>

                  {/* CET */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">CET (Taxa Efetiva)</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {simulacao.cet.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Custo Efetivo Total ao ano
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-600 text-center">
                    Valor solicitado: {formatCurrency(valor)} em {prazo} meses
                  </p>
                  <p className="text-xs text-gray-600 text-center mt-1">
                    Tipo de obra: {tipoObra}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="text-5xl mb-3">💰</div>
                <p className="text-gray-600">
                  Configure os dados e clique em "Simular" para ver as condições
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
