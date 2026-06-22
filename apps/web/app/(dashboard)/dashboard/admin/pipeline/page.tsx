"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  MapPin, Building2, Clock, Filter,
  ChevronLeft, Loader2, AlertCircle, Star,
} from "lucide-react";
import { comercialApi, type ComercialLead, type PipelineStage } from "@/lib/api";

const NAVY = "#0C1A3D";
const ROYAL = "#1B4FD8";

function brl(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function AdminPipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [leads, setLeads] = useState<ComercialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroStage, setFiltroStage] = useState<string>("");

  useEffect(() => {
    Promise.all([
      comercialApi.pipelineStages(),
      comercialApi.listarLeads(200, 0),
    ])
      .then(([s, l]) => {
        setStages(s);
        setLeads(l.leads);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar pipeline"))
      .finally(() => setLoading(false));
  }, []);

  const leadsPorStage = useMemo(() => {
    const map = new Map<string, ComercialLead[]>();
    for (const s of stages) map.set(s.stageId, []);
    for (const lead of leads) {
      const list = map.get(lead.stageId) ?? [];
      list.push(lead);
      map.set(lead.stageId, list);
    }
    return map;
  }, [stages, leads]);

  const stagesVisiveis = filtroStage
    ? stages.filter((s) => s.stageId === filtroStage)
    : stages;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando pipeline...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/admin" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2">
            <ChevronLeft className="w-3 h-3" /> Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Comercial</h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} leads · {stages.length} etapas</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filtroStage}
            onChange={(e) => setFiltroStage(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Todas as etapas</option>
            {stages.map((s) => (
              <option key={s.stageId} value={s.stageId}>{s.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stagesVisiveis.map((stage) => {
          const stageLeads = leadsPorStage.get(stage.stageId) ?? [];
          return (
            <div
              key={stage.stageId}
              className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div
                className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
                style={{ borderTopColor: stage.cor, borderTopWidth: 3 }}
              >
                <span className="text-sm font-bold text-gray-800">{stage.nome}</span>
                <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Nenhum lead</p>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.leadId}
                      className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm"
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.clienteNome}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {lead.tipoObra ?? lead.fonte ?? "—"}
                      </div>
                      {lead.scoreHistorico?.[0] && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <Star className="w-3 h-3" />
                          Score {lead.scoreHistorico[0].scoreFinal}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1 truncate">{lead.clienteEmail}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {leads.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Pipeline vazio</p>
          <p className="text-sm text-gray-400 mt-1">
            Leads capturados pelo comercial ou site aparecerão aqui.
          </p>
        </div>
      )}
    </div>
  );
}
