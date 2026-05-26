import type { Metadata } from "next";

export const metadata: Metadata = { title: "Minhas Obras — imbobi" };

export default function ObrasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Obras</h1>
        <a
          href="/dashboard/obras/nova"
          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          + Nova Obra
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {OBRAS_MOCK.map((obra) => (
          <a
            key={obra.id}
            href={`/dashboard/obras/${obra.id}`}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{obra.nome}</h3>
                <p className="text-sm text-gray-500">{obra.endereco}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[obra.status]}`}>
                {obra.status}
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progresso geral</span>
                <span>{obra.progresso}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${obra.progresso}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-500">
              <span>Crédito: {obra.valorCredito}</span>
              <span>Liberado: {obra.valorLiberado}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "Em andamento": "bg-blue-50 text-blue-700",
  "Planejamento": "bg-yellow-50 text-yellow-700",
  "Concluída": "bg-green-50 text-green-700",
  "Pausada": "bg-gray-50 text-gray-600",
};

const OBRAS_MOCK = [
  {
    id: "1",
    nome: "Residência Jardins",
    endereco: "São Paulo, SP",
    status: "Em andamento",
    progresso: 45,
    valorCredito: "R$ 180.000",
    valorLiberado: "R$ 81.000",
  },
  {
    id: "2",
    nome: "Sobrado Alphaville",
    endereco: "Barueri, SP",
    status: "Em andamento",
    progresso: 20,
    valorCredito: "R$ 250.000",
    valorLiberado: "R$ 50.000",
  },
];
