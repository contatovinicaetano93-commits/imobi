import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — imbobi" };

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className={`text-xs mt-1 ${kpi.up ? "text-green-600" : "text-red-500"}`}>
              {kpi.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Obras em andamento */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Obras em andamento</h2>
          <a href="/dashboard/obras" className="text-sm text-brand-600 font-medium">Ver todas →</a>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {OBRAS_MOCK.map((obra) => (
            <div key={obra.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-gray-900">{obra.nome}</p>
                <p className="text-sm text-gray-500">{obra.endereco}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${obra.progresso}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{obra.progresso}%</span>
                </div>
                <p className="text-xs text-gray-400">Próxima: {obra.proximaEtapa}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const KPI_CARDS = [
  { label: "Crédito disponível", value: "R$ 87.500", delta: "+R$ 12.500 liberado hoje", up: true },
  { label: "Obras ativas", value: "2", delta: "1 aguardando vistoria", up: false },
  { label: "Etapas concluídas", value: "5 / 18", delta: "27% do total", up: true },
  { label: "Próxima liberação", value: "R$ 15.000", delta: "Revestimento aprovado", up: true },
];

const OBRAS_MOCK = [
  { id: "1", nome: "Residência Jardins", endereco: "São Paulo, SP", progresso: 45, proximaEtapa: "Revestimento" },
  { id: "2", nome: "Sobrado Alphaville", endereco: "Barueri, SP", progresso: 20, proximaEtapa: "Estrutura" },
];
