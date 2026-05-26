import type { Metadata } from "next";

export const metadata: Metadata = { title: "Detalhe da Obra — imbobi" };

// Dados mock — substituir por fetch com `cache: 'no-store'` + auth cookie
const OBRA_MOCK = {
  id: "1",
  nome: "Residência Jardins",
  endereco: "Rua das Flores, 120 — São Paulo, SP",
  progresso: 45,
  valorCredito: 180000,
  valorLiberado: 81000,
  etapas: [
    { id: "e1", nome: "Fundação",               ordem: 1, percentual: 15, status: "APROVADA",          valorLiberacao: 27000, evidencias: 4 },
    { id: "e2", nome: "Estrutura",               ordem: 2, percentual: 20, status: "APROVADA",          valorLiberacao: 36000, evidencias: 6 },
    { id: "e3", nome: "Alvenaria",               ordem: 3, percentual: 10, status: "EM_PROGRESSO",      valorLiberacao: 18000, evidencias: 2 },
    { id: "e4", nome: "Cobertura",               ordem: 4, percentual: 10, status: "PENDENTE",          valorLiberacao: 18000, evidencias: 0 },
    { id: "e5", nome: "Instalações Elétricas",   ordem: 5, percentual: 10, status: "PENDENTE",          valorLiberacao: 18000, evidencias: 0 },
    { id: "e6", nome: "Instalações Hidráulicas", ordem: 6, percentual: 10, status: "PENDENTE",          valorLiberacao: 18000, evidencias: 0 },
    { id: "e7", nome: "Revestimento",            ordem: 7, percentual: 10, status: "PENDENTE",          valorLiberacao: 18000, evidencias: 0 },
    { id: "e8", nome: "Acabamento",              ordem: 8, percentual: 10, status: "PENDENTE",          valorLiberacao: 18000, evidencias: 0 },
    { id: "e9", nome: "Entrega",                 ordem: 9, percentual:  5, status: "PENDENTE",          valorLiberacao:  9000, evidencias: 0 },
  ],
};

const STATUS_STYLE: Record<string, string> = {
  APROVADA:            "bg-green-50 text-green-700 border-green-200",
  EM_PROGRESSO:        "bg-blue-50 text-blue-700 border-blue-200",
  AGUARDANDO_VISTORIA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PENDENTE:            "bg-gray-50 text-gray-500 border-gray-200",
  REJEITADA:           "bg-red-50 text-red-700 border-red-200",
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ObraDetailPage() {
  const obra = OBRA_MOCK;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{obra.nome}</h1>
        <p className="text-gray-500 text-sm mt-1">{obra.endereco}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Crédito aprovado", value: brl(obra.valorCredito) },
          { label: "Total liberado",   value: brl(obra.valorLiberado), green: true },
          { label: "Progresso",        value: `${obra.progresso}%`,   green: true },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.green ? "text-brand-600" : "text-gray-900"}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Barra geral */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Progresso geral da obra</span>
          <span className="font-semibold text-brand-600">{obra.progresso}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all"
            style={{ width: `${obra.progresso}%` }}
          />
        </div>
      </div>

      {/* Etapas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cronograma de Etapas</h2>
        <div className="space-y-3">
          {obra.etapas.map((etapa) => (
            <div
              key={etapa.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
            >
              {/* Número */}
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                {etapa.ordem}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{etapa.nome}</p>
                <p className="text-sm text-gray-500">{etapa.percentual}% da obra · {brl(etapa.valorLiberacao)}</p>
              </div>

              {/* Evidências */}
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-gray-900">{etapa.evidencias}</p>
                <p className="text-xs text-gray-400">fotos</p>
              </div>

              {/* Status */}
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[etapa.status] ?? STATUS_STYLE["PENDENTE"]}`}>
                {etapa.status.replace(/_/g, " ")}
              </span>

              {/* Ação */}
              {etapa.status === "AGUARDANDO_VISTORIA" && (
                <a
                  href={`/dashboard/obras/${obra.id}/vistoria/${etapa.id}`}
                  className="shrink-0 bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors"
                >
                  Vistorar
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
