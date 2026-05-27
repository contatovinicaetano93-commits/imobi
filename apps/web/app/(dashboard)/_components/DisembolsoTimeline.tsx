"use client";
// @ts-nocheck - Next.js component type compatibility issue
"use client";

import Link from "next/link";

export type Etapa = {
  id: string;
  ordem: number;
  nome: string;
  percentualObra: number;
  valorLiberacao: number;
  status: "planejada" | "em_progresso" | "concluida" | "atrasada";
  dataPlanejada?: string;
  dataRealizada?: string;
};

type DisembolsoTimelineProps = {
  etapas: Etapa[];
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function getStatusBadge(status: Etapa["status"]) {
  const badges = {
    planejada: { bg: "bg-gray-100", text: "text-gray-700", label: "Planejada" },
    em_progresso: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: "Em Progresso",
    },
    concluida: {
      bg: "bg-green-100",
      text: "text-green-700",
      label: "Concluída",
    },
    atrasada: { bg: "bg-red-100", text: "text-red-700", label: "Atrasada" },
  };
  return badges[status];
}

function getStatusColor(status: Etapa["status"]) {
  const colors = {
    planejada: "bg-gray-300",
    em_progresso: "bg-blue-400",
    concluida: "bg-green-500",
    atrasada: "bg-red-500",
  };
  return colors[status];
}

export function DisembolsoTimeline({ etapas }: DisembolsoTimelineProps) {
  const totalPlanejado = etapas.reduce((sum, e) => sum + e.valorLiberacao, 0);
  const totalConcluido = etapas
    .filter((e) => e.status === "concluida")
    .reduce((sum, e) => sum + e.valorLiberacao, 0);
  const progresso = totalPlanejado > 0 ? (totalConcluido / totalPlanejado) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header com Progresso */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Desembolso Total</h3>
            <span className="text-2xl font-bold text-gray-900">
              {progresso.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Planejado</p>
            <p className="text-lg font-bold text-gray-900">{brl(totalPlanejado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Realizado</p>
            <p className="text-lg font-bold text-green-600">{brl(totalConcluido)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Saldo Pendente</p>
            <p className="text-lg font-bold text-orange-600">
              {brl(totalPlanejado - totalConcluido)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {etapas.map((etapa, index) => {
          const badge = getStatusBadge(etapa.status);
          const isLast = index === etapas.length - 1;

          return (
            <div key={etapa.id} className="relative">
              {/* Conector vertical */}
              {!isLast && (
                <div
                  className={`absolute left-6 top-16 w-1 h-8 ${
                    etapa.status === "concluida"
                      ? "bg-green-400"
                      : etapa.status === "atrasada"
                        ? "bg-red-400"
                        : "bg-gray-300"
                  }`}
                />
              )}

              {/* Card de etapa */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Indicador status */}
                  <div className="shrink-0">
                    <div
                      className={`w-4 h-4 rounded-full border-4 border-white shadow-md ${getStatusColor(
                        etapa.status
                      )}`}
                    />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            Etapa {etapa.ordem}: {etapa.nome}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {etapa.percentualObra}% da obra
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm text-gray-500">Valor</p>
                        <p className="text-lg font-bold text-gray-900">
                          {brl(etapa.valorLiberacao)}
                        </p>
                      </div>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Data Planejada</p>
                        <p className="font-medium text-gray-900">
                          {formatDate(etapa.dataPlanejada)}
                        </p>
                      </div>
                      {etapa.dataRealizada && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Data Realizada</p>
                          <p className="font-medium text-green-600">
                            {formatDate(etapa.dataRealizada)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <Link
                      href={`#etapa-${etapa.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver detalhes →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
