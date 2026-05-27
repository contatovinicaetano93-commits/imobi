"use client";
// @ts-nocheck - Next.js component type compatibility issue
"use client";

import Link from "next/link";

export type Report = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "inspecao" | "tecnico" | "financeiro" | "andamento";
  dataRelatorio: string;
  url?: string;
};

type ReportLinkProps = {
  reports: Report[];
  etapaId: string;
};

function getReportIcon(tipo: string) {
  const icons = {
    inspecao: "🔍",
    tecnico: "⚙️",
    financeiro: "📊",
    andamento: "📈",
  };
  return icons[tipo as keyof typeof icons] || "📄";
}

function getReportColor(tipo: string) {
  const colors = {
    inspecao: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900",
    tecnico: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900",
    financeiro: "bg-green-50 hover:bg-green-100 border-green-200 text-green-900",
    andamento: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900",
  };
  return colors[tipo as keyof typeof colors] || "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900";
}

function getReportLabel(tipo: string) {
  const labels = {
    inspecao: "Inspeção",
    tecnico: "Relatório Técnico",
    financeiro: "Relatório Financeiro",
    andamento: "Andamento",
  };
  return labels[tipo as keyof typeof labels] || "Relatório";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ReportLink({ reports, etapaId }: ReportLinkProps) {
  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-4xl mb-3">📄</p>
        <p className="text-gray-600 text-sm mb-4">Nenhum relatório disponível para esta etapa</p>
        <Link
          href={`#request-report-${etapaId}`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Solicitar relatório →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`rounded-xl border p-4 transition-all hover:shadow-md ${getReportColor(
              report.tipo
            )}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl shrink-0">
                {getReportIcon(report.tipo)}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{report.titulo}</h4>
                <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-white bg-opacity-50">
                  {getReportLabel(report.tipo)}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {report.descricao}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600">
                {formatDate(report.dataRelatorio)}
              </p>

              {report.url ? (
                <a
                  href={report.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-current hover:underline"
                >
                  Acessar
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ) : (
                <span className="text-xs text-gray-500">Processando...</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={`#manage-reports-${etapaId}`}
        className="block text-center py-3 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200"
      >
        Gerenciar relatórios →
      </Link>
    </div>
  );
}
