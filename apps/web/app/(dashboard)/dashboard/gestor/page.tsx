import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel do Gestor — imbobi" };

const FILA_MOCK = [
  {
    id: "v1", obraId: "1", obraNome: "Residência Jardins",
    etapa: "Alvenaria", tomador: "João Silva",
    valorLiberacao: 18000, evidencias: 2,
    aguardandoHs: 6,
  },
  {
    id: "v2", obraId: "2", obraNome: "Sobrado Alphaville",
    etapa: "Estrutura", tomador: "Maria Souza",
    valorLiberacao: 50000, evidencias: 5,
    aguardandoHs: 24,
  },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GestorPage() {
  const totalPendente = FILA_MOCK.reduce((a, v) => a + v.valorLiberacao, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel do Gestor</h1>
          <p className="text-gray-500 text-sm mt-1">
            {FILA_MOCK.length} vistoria{FILA_MOCK.length !== 1 ? "s" : ""} pendente{FILA_MOCK.length !== 1 ? "s" : ""}
            &nbsp;·&nbsp;{brl(totalPendente)} a liberar
          </p>
        </div>
      </div>

      {FILA_MOCK.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-500">Nenhuma vistoria pendente. Tudo em dia!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {FILA_MOCK.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-4"
            >
              {/* Urgência */}
              <div
                className={`w-1.5 self-stretch rounded-full ${
                  item.aguardandoHs >= 24 ? "bg-red-400" : "bg-yellow-400"
                }`}
              />

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-gray-900">
                  {item.obraNome}
                  <span className="ml-2 text-sm font-normal text-gray-500">— {item.etapa}</span>
                </p>
                <p className="text-sm text-gray-500">{item.tomador}</p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>{item.evidencias} fotos enviadas</span>
                  <span>⏱ {item.aguardandoHs}h aguardando</span>
                </div>
              </div>

              {/* Valor */}
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400 mb-1">Liberação</p>
                <p className="text-xl font-bold text-brand-600">{brl(item.valorLiberacao)}</p>
              </div>

              {/* CTA */}
              <a
                href={`/dashboard/obras/${item.obraId}/vistoria/${item.id}`}
                className="shrink-0 bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-brand-700 transition-colors"
              >
                Vistorar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
