"use client";

type CreditComparisonProps = {
  simulado: {
    valor: number;
    taxa: number;
    prazo: number;
    parcelaMensal: number;
  };
  aprovado: {
    valor: number;
    taxa: number;
    prazo: number;
    parcelaMensal: number;
    liberado: number;
    disponivel: number;
  };
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percent(v: number) {
  return v.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 2 });
}

export function CreditSimulator({ simulado, aprovado }: CreditComparisonProps) {
  const diferenca = aprovado.valor - simulado.valor;
  const pctDiferenca = (diferenca / simulado.valor) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Simulado */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-25 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Simulado</h3>
          <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
            Pré-aprovação
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Valor Total</p>
            <p className="text-3xl font-bold text-blue-600">
              {brl(simulado.valor)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Taxa Mensal</p>
              <p className="text-lg font-semibold text-gray-900">
                {percent(simulado.taxa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Prazo</p>
              <p className="text-lg font-semibold text-gray-900">
                {simulado.prazo} meses
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500 mb-1">Parcela Mensal</p>
            <p className="text-2xl font-bold text-blue-600">
              {brl(simulado.parcelaMensal)}
            </p>
          </div>
        </div>
      </div>

      {/* Aprovado */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-25 rounded-2xl border border-green-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Aprovado</h3>
          <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
            Crédito Ativo
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-sm text-gray-600">Valor Total</p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded ${
                  diferenca > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {diferenca > 0 ? "+" : ""}{pctDiferenca.toFixed(1)}%
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {brl(aprovado.valor)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Taxa Mensal</p>
              <p className="text-lg font-semibold text-gray-900">
                {percent(aprovado.taxa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Prazo</p>
              <p className="text-lg font-semibold text-gray-900">
                {aprovado.prazo} meses
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-green-100">
            <p className="text-xs text-gray-500 mb-1">Parcela Mensal</p>
            <p className="text-2xl font-bold text-green-600">
              {brl(aprovado.parcelaMensal)}
            </p>
          </div>

          {/* Disponibilidade */}
          <div className="pt-4 border-t border-green-200 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-700">Liberado</p>
                <p className="text-sm font-bold text-gray-900">
                  {brl(aprovado.liberado)}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(aprovado.liberado / aprovado.valor) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Disponível</p>
                <p className="text-sm font-bold text-blue-600">
                  {brl(aprovado.disponivel)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
