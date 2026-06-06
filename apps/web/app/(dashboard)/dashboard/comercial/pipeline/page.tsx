"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { comercialApi, LeadResumo, PipelineStage } from "@/lib/api";

const DEFAULT_STAGES: PipelineStage[] = [
  { stageId: "NOVO", nome: "Novo", ordem: 1, pipelineId: "", cor: "#3B82F6" },
  { stageId: "QUALIFICADO", nome: "Qualificado", ordem: 2, pipelineId: "", cor: "#8B5CF6" },
  { stageId: "PROPOSTA", nome: "Proposta", ordem: 3, pipelineId: "", cor: "#F59E0B" },
  { stageId: "NEGOCIACAO", nome: "Negociação", ordem: 4, pipelineId: "", cor: "#EF4444" },
  { stageId: "FECHADO", nome: "Fechado", ordem: 5, pipelineId: "", cor: "#10B981" },
  { stageId: "PERDIDO", nome: "Perdido", ordem: 6, pipelineId: "", cor: "#6B7280" },
];

const FONTE_BADGE: Record<string, string> = {
  PARCEIRO: "bg-blue-100 text-blue-800",
  INDICACAO: "bg-purple-100 text-purple-800",
  WEBSITE: "bg-indigo-100 text-indigo-800",
  OFFLINE: "bg-gray-100 text-gray-800",
  MARKETPLACE: "bg-yellow-100 text-yellow-800",
  CAMPANHA_DIGITAL: "bg-pink-100 text-pink-800",
};

function fonteBadgeColor(fonte: string): string {
  return FONTE_BADGE[fonte] || "bg-gray-100 text-gray-800";
}

function LeadCard({ lead }: { lead: LeadResumo }) {
  const score = lead.scoreHistorico?.[0]?.scoreFinal ?? 0;
  const scoreColor =
    score >= 80 ? "bg-green-500" :
    score >= 60 ? "bg-yellow-500" :
    score >= 40 ? "bg-orange-500" :
    "bg-red-500";

  const updatedAt = new Date(lead.atualizadoEm);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const lastActivity =
    diffDays === 0 ? "Hoje" :
    diffDays === 1 ? "Ontem" :
    `${diffDays}d atrás`;

  return (
    <Link href={`/dashboard/comercial/leads/${lead.leadId}`}>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer mb-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-sm text-gray-900 leading-tight flex-1 pr-2">
            {lead.clienteNome}
          </h3>
          {score > 0 && (
            <span className={`${scoreColor} text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs flex-shrink-0`}>
              {Math.round(score)}
            </span>
          )}
        </div>

        <div className="flex gap-1 flex-wrap mb-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${fonteBadgeColor(lead.fonte)}`}>
            {lead.fonte}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
          <span>{lead.clienteTelefone}</span>
          <span>{lastActivity}</span>
        </div>
      </div>
    </Link>
  );
}

function ColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-70 bg-gray-50 rounded-2xl p-4 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 mb-3">
          <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/5 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<LeadResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stagesResult, leadsResult] = await Promise.allSettled([
          comercialApi.listarStages(),
          comercialApi.listarLeads({ limit: 200 }),
        ]);

        const resolvedStages =
          stagesResult.status === "fulfilled" && stagesResult.value.length > 0
            ? stagesResult.value.sort((a, b) => a.ordem - b.ordem)
            : DEFAULT_STAGES;

        setStages(resolvedStages);
        setLeads(
          leadsResult.status === "fulfilled" ? leadsResult.value.leads : []
        );
      } catch {
        setErro("Erro ao carregar pipeline.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function leadsForStage(stage: PipelineStage): LeadResumo[] {
    return leads.filter((l) => {
      if (l.stage) return l.stage.stageId === stage.stageId;
      return l.stageId === stage.stageId;
    });
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline Comercial</h1>
          <p className="text-gray-600 mt-1">Acompanhe o progresso dos leads por estágio</p>
        </div>
        <Link
          href="/dashboard/comercial/leads/novo"
          className="px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors text-sm"
        >
          + Novo Lead
        </Link>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex-shrink-0">
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      <div className="overflow-x-auto pb-4 flex-1">
        <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <ColumnSkeleton key={i} />)
          ) : (
            stages.map((stage) => {
              const stageLeads = leadsForStage(stage);
              const stageColor = stage.cor ?? "#6B7280";

              return (
                <div
                  key={stage.stageId}
                  className="flex-shrink-0 bg-gray-50 rounded-2xl flex flex-col"
                  style={{ width: "280px" }}
                >
                  <div className="p-4 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stageColor }}
                      />
                      <h2 className="font-semibold text-sm text-gray-900">{stage.nome}</h2>
                      <span className="ml-auto bg-white border border-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {stageLeads.length}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex-1 overflow-y-auto">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-400">Nenhum lead neste estágio</p>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <LeadCard key={lead.leadId} lead={lead} />
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
