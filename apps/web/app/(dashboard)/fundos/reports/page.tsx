import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relatórios — Dashboard de Fundos — imbobi",
};

export default function ReportsPage() {
  const reports = [
    {
      name: "Relatório Mensal (Maio 2026)",
      description: "Portfolio aggregado, performance, inadimplência e recomendações",
      type: "PDF",
      size: "2.4 MB",
      date: "2026-05-27",
    },
    {
      name: "Análise de Risco",
      description: "Scoring de risco por obra, concentração geográfica, distribuição por construtor",
      type: "PDF",
      size: "1.8 MB",
      date: "2026-05-27",
    },
    {
      name: "Performance Regional",
      description: "ROI, inadimplência e benchmarks por região (SP, Curitiba, RJ, MG)",
      type: "PDF",
      size: "1.5 MB",
      date: "2026-05-27",
    },
    {
      name: "Conformidade & Compliance",
      description: "Documentação, validações, evidências GPS e vistorias presenciais",
      type: "PDF",
      size: "3.1 MB",
      date: "2026-05-27",
    },
    {
      name: "Projeção de Fluxo de Caixa",
      description: "Estimativa de retorno nos próximos 12 meses baseado em portfolio atual",
      type: "XLSX",
      size: "890 KB",
      date: "2026-05-27",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Relatórios</h2>
        <p className="text-gray-600">Download de relatórios para compliance, análise e auditoria</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reports.map((report) => (
          <div key={report.name} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-brand-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                <p className="text-gray-600 text-sm mt-2">{report.description}</p>
                <div className="flex items-center gap-6 mt-4">
                  <span className="text-xs text-gray-500">
                    <span className="font-medium">{report.type}</span> • {report.size}
                  </span>
                  <span className="text-xs text-gray-400">{report.date}</span>
                </div>
              </div>
              <button className="ml-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm whitespace-nowrap">
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📧 Relatórios Automáticos</h3>
        <p className="text-sm text-blue-800 mb-4">
          Novos relatórios são gerados automaticamente no primeiro dia de cada mês e enviados por email.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
          Configurar Email de Relatórios
        </button>
      </div>
    </div>
  );
}
