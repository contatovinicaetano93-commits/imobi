import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vistoria de Etapa — imbobi" };

// Mock — substituir por fetch real
const VISTORIA_MOCK = {
  obraId: "1", obraNome: "Residência Jardins",
  etapa: {
    id: "e3", nome: "Alvenaria", percentual: 10, valorLiberacao: 18000,
    evidencias: [
      { id: "ev1", fotoUrl: "https://placehold.co/800x600/dcfce7/166534?text=Foto+1", criadoEm: "2026-05-20T10:30:00Z", lat: -23.5505, lng: -46.6333, distanciaObra: 12 },
      { id: "ev2", fotoUrl: "https://placehold.co/800x600/dcfce7/166534?text=Foto+2", criadoEm: "2026-05-21T14:15:00Z", lat: -23.5507, lng: -46.6335, distanciaObra: 8 },
    ],
  },
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VistoriaPage() {
  const { etapa, obraNome } = VISTORIA_MOCK;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 flex gap-2">
        <a href="/dashboard/obras" className="hover:text-brand-600">Obras</a>
        <span>/</span>
        <a href="/dashboard/obras/1" className="hover:text-brand-600">{obraNome}</a>
        <span>/</span>
        <span className="text-gray-900 font-medium">Vistoria: {etapa.nome}</span>
      </div>

      {/* Info etapa */}
      <div className="bg-white rounded-2xl border border-yellow-200 p-5 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mb-1">Aguardando vistoria</p>
            <h1 className="text-xl font-bold text-gray-900">{etapa.nome}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Liberação ao aprovar</p>
            <p className="text-2xl font-bold text-brand-600">{brl(etapa.valorLiberacao)}</p>
          </div>
        </div>
      </div>

      {/* Evidências */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Evidências enviadas ({etapa.evidencias.length})
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {etapa.evidencias.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <img src={ev.fotoUrl} alt="Evidência" className="w-full aspect-video object-cover" />
              <div className="p-4 space-y-1">
                <p className="text-xs text-gray-500">
                  {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  ✓ A {ev.distanciaObra}m da obra
                </p>
                <p className="text-xs text-gray-400">
                  {ev.lat.toFixed(6)}, {ev.lng.toFixed(6)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações do gestor */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Parecer do gestor</h3>
        <textarea
          placeholder="Observações (opcional)..."
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          rows={3}
        />
        <div className="flex gap-3 mt-4">
          <button className="flex-1 bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 transition-colors">
            ✓ Aprovar etapa
          </button>
          <button className="flex-1 border border-red-300 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors">
            ✗ Rejeitar
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-3">
          Ao aprovar, {brl(etapa.valorLiberacao)} serão liberados automaticamente.
        </p>
      </div>
    </div>
  );
}
