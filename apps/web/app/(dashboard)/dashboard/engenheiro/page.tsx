import type { Metadata } from "next";
import { engenheirosApi, type Visita } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { VisitQueue } from "./_components/VisitQueue";
import { DynamicVisitQueueClient } from "./_components/DynamicVisitQueueClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Portal do Engenheiro — imbobi" };

export default async function EngenheiroPortalPage() {
  const visitas = await engenheirosApi.listarVisitas().catch(() => []);

  const agendadas = visitas.filter((v: Visita) => v.status === "AGENDADA");
  const iniciadas = visitas.filter((v: Visita) => v.status === "INICIADA");
  const concluidas = visitas.filter((v: Visita) => v.status === "CONCLUIDA");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Fila de Visitas</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Gerencie suas inspeções de obra</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Agendadas", value: String(agendadas.length), color: "bg-blue-50 border-blue-100" },
          { label: "Iniciadas", value: String(iniciadas.length), color: "bg-yellow-50 border-yellow-100" },
          { label: "Concluídas", value: String(concluidas.length), color: "bg-green-50 border-green-100" },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-2xl p-4 sm:p-6 border ${kpi.color}`}>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">{kpi.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Visit Queue Component */}
      <DynamicVisitQueueClient visits={visitas} />

      {/* Próximas Visitas - Resumo */}
      <section aria-labelledby="next-visits-title">
        <h2 id="next-visits-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Próximas Visitas</h2>
        {agendadas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400">Nenhuma visita agendada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agendadas.slice(0, 3).map((visita: Visita) => (
              <a
                key={visita.visitaId}
                href={`/dashboard/engenheiro/${visita.visitaId}`}
                className="bg-white rounded-xl border border-gray-100 p-3 sm:p-6 hover:shadow-md hover:border-brand-200 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 min-h-24 sm:min-h-auto flex flex-col justify-center"
                aria-label={`Visita em ${visita.obra.nome}, agendada em ${new Date(visita.dataAgendada).toLocaleDateString('pt-BR')}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-base">{visita.obra.nome}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{visita.obra.endereco}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Agendada em {new Date(visita.dataAgendada).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      Agendada
                    </span>
                  </div>
                </div>
              </a>
            ))}
            {agendadas.length > 3 && (
              <a
                href="#"
                className="text-center py-3 text-brand-600 font-semibold text-sm hover:text-brand-700"
              >
                Ver todas as {agendadas.length} visitas →
              </a>
            )}
          </div>
        )}
      </section>

      {/* Em Andamento */}
      {iniciadas.length > 0 && (
        <section aria-labelledby="in-progress-title">
          <h2 id="in-progress-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Em Andamento</h2>
          <div className="space-y-3">
            {iniciadas.map((visita: Visita) => (
              <a
                key={visita.visitaId}
                href={`/dashboard/engenheiro/${visita.visitaId}`}
                className="bg-white rounded-xl border border-yellow-200 bg-yellow-50 p-3 sm:p-6 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 min-h-24 sm:min-h-auto flex flex-col justify-center"
                aria-label={`Visita em progresso em ${visita.obra.nome}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-xs sm:text-base">{visita.obra.nome}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{visita.obra.endereco}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                      Iniciada
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Histórico */}
      {concluidas.length > 0 && (
        <section aria-labelledby="completed-title">
          <h2 id="completed-title" className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Concluídas</h2>
          <div className="space-y-3">
            {concluidas.slice(0, 5).map((visita: Visita) => (
              <a
                key={visita.visitaId}
                href={`/dashboard/engenheiro/${visita.visitaId}`}
                className="bg-white rounded-xl border border-gray-100 p-3 sm:p-6 hover:shadow-md transition-all opacity-75 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-24 sm:min-h-auto flex flex-col justify-center"
                aria-label={`Visita concluída em ${visita.obra.nome}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-600 text-xs sm:text-base">{visita.obra.nome}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">{visita.obra.endereco}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Concluída
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
