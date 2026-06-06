"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ObraResumo, EtapaResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
  Building2,
  Loader2,
  Camera,
  TrendingUp,
  Banknote,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  APROVADA:            "Aprovada",
  EM_PROGRESSO:        "Em Progresso",
  AGUARDANDO_VISTORIA: "Aguardando Vistoria",
  PENDENTE:            "Planejada",
  REJEITADA:           "Reprovada",
};

const STATUS_STYLE: Record<string, string> = {
  APROVADA:            "bg-green-50 text-green-700 border-green-200",
  EM_PROGRESSO:        "bg-blue-50 text-blue-700 border-blue-200",
  AGUARDANDO_VISTORIA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PENDENTE:            "bg-gray-50 text-gray-500 border-gray-200",
  REJEITADA:           "bg-red-50 text-red-700 border-red-200",
};

const OBRA_STATUS_STYLE: Record<string, string> = {
  ATIVA:      "bg-green-50 text-green-700 border-green-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDA:  "bg-gray-50 text-gray-600 border-gray-200",
  PAUSADA:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  CANCELADA:  "bg-red-50 text-red-700 border-red-200",
};

function EtapaIcon({ status }: { status: string }) {
  const cls = "w-5 h-5 shrink-0";
  if (status === "APROVADA")            return <CheckCircle2 className={`${cls} text-green-500`} />;
  if (status === "AGUARDANDO_VISTORIA") return <Clock className={`${cls} text-yellow-500`} />;
  if (status === "EM_PROGRESSO")        return <Clock className={`${cls} text-blue-500`} />;
  if (status === "REJEITADA")           return <XCircle className={`${cls} text-red-500`} />;
  return <Circle className={`${cls} text-gray-300`} />;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B4FD8]" />
        <p className="text-sm">Carregando obra...</p>
      </div>
    </div>
  );
}

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [obra, setObra] = useState<ObraResumo | null>(null);
  const [progresso, setProgresso] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/proxy/obras/${params.id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/proxy/obras/${params.id}/progresso`).then((r) => (r.ok ? r.json() : 0)).catch(() => 0),
    ])
      .then(([obraData, progressoData]) => {
        if (!obraData) { router.replace('/dashboard/obras'); return; }
        setObra(obraData);
        setProgresso(progressoData ?? 0);
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <LoadingState />;
  if (!obra) return null;

  const etapas = obra.etapas ?? [];
  const statusStyle = OBRA_STATUS_STYLE[obra.status] ?? "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{obra.nome}</h1>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusStyle}`}
            >
              {obra.status.replace(/_/g, " ")}
            </span>
          </div>
          {obra.endereco && (
            <p className="text-sm text-gray-500 mt-1 truncate">{obra.endereco}</p>
          )}
        </div>
      </div>

      {/* Progresso geral */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-[#1B4FD8]" />
          <h2 className="font-semibold text-gray-900">Progresso Geral</h2>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-500">{etapas.filter(e => e.status === "APROVADA").length} de {etapas.length} etapas concluídas</span>
          <span className="font-bold text-[#1B4FD8]">{progresso}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1B4FD8] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progresso, 100)}%` }}
          />
        </div>
      </div>

      {/* Cards de crédito */}
      {obra.credito && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">Crédito aprovado</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatarBRL(Number(obra.credito.valorAprovado))}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm text-gray-500">Total liberado</p>
            </div>
            <p className="text-2xl font-bold text-[#16a34a]">{formatarBRL(Number(obra.credito.valorLiberado))}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#1B4FD8]" />
              <p className="text-sm text-gray-500">Progresso</p>
            </div>
            <p className="text-2xl font-bold text-[#1B4FD8]">{progresso}%</p>
          </div>
        </div>
      )}

      {/* Timeline de etapas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-[#1B4FD8]" />
          <h2 className="text-lg font-semibold text-gray-900">Cronograma de Etapas</h2>
        </div>

        {etapas.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhuma etapa cadastrada</p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

            <div className="space-y-2">
              {etapas.map((etapa: EtapaResumo, index: number) => (
                <div key={etapa.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {/* Ícone de status */}
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-gray-100 shrink-0">
                    <EtapaIcon status={etapa.status} />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 bg-gray-50 rounded-xl p-4 hover:bg-gray-100/60 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm">{etapa.nome}</p>
                          <span className="text-xs text-gray-400">#{etapa.ordem}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {etapa.percentualObra}% da obra · {formatarBRL(Number(etapa.valorLiberacao))}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {(etapa.evidencias?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Camera className="w-3.5 h-3.5" />
                            <span>{etapa.evidencias?.length ?? 0}</span>
                          </div>
                        )}
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[etapa.status] ?? STATUS_STYLE["PENDENTE"]}`}
                        >
                          {STATUS_LABEL[etapa.status] ?? etapa.status.replace(/_/g, " ")}
                        </span>
                        {etapa.status === "AGUARDANDO_VISTORIA" && (
                          <a
                            href={`/dashboard/obras/${obra.id}/vistoria/${etapa.id}`}
                            className="bg-[#1B4FD8] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#1e40af] transition-colors"
                          >
                            Vistorar
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
