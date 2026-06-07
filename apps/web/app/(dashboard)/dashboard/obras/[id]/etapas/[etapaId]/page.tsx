"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { obrasApi, evidenciasApi, type ObraResumo, type EtapaResumo, type EvidenciaDetalhe } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

const STATUS_STYLE: Record<string, string> = {
  APROVADA:            "bg-green-50 text-green-700 border-green-200",
  CONCLUIDA:           "bg-green-50 text-green-700 border-green-200",
  EM_EXECUCAO:         "bg-blue-50 text-blue-700 border-blue-200",
  AGUARDANDO_VISTORIA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PLANEJADA:           "bg-gray-50 text-gray-500 border-gray-200",
  PENDENTE:            "bg-gray-50 text-gray-500 border-gray-200",
  REPROVADA:           "bg-red-50 text-red-700 border-red-200",
  REJEITADA:           "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  APROVADA:            "Aprovada",
  CONCLUIDA:           "Concluída",
  EM_EXECUCAO:         "Em Execução",
  AGUARDANDO_VISTORIA: "Aguardando Vistoria",
  PLANEJADA:           "Planejada",
  PENDENTE:            "Pendente",
  REPROVADA:           "Reprovada",
  REJEITADA:           "Rejeitada",
};

function EtapaProgressIndicator({
  etapas,
  currentEtapaId,
}: {
  etapas: EtapaResumo[];
  currentEtapaId: string;
}) {
  const sorted = [...etapas].sort((a, b) => a.ordem - b.ordem);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {sorted.map((etapa, index) => {
        const isCurrent = etapa.id === currentEtapaId;
        const isCompleted = etapa.status === "CONCLUIDA" || etapa.status === "APROVADA";
        return (
          <div key={etapa.id} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCurrent
                    ? "bg-brand-600 text-white border-brand-600"
                    : isCompleted
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-400 border-gray-200"
                }`}
              >
                {etapa.ordem}
              </div>
              <span
                className={`text-xs max-w-[60px] text-center leading-tight ${
                  isCurrent ? "text-brand-600 font-semibold" : "text-gray-400"
                }`}
              >
                {etapa.nome.length > 8 ? `${etapa.nome.slice(0, 8)}…` : etapa.nome}
              </span>
            </div>
            {index < sorted.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-1 mb-5 ${
                  isCompleted ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EtapaDetailPage() {
  const params = useParams<{ id: string; etapaId: string }>();
  const router = useRouter();
  const [obra, setObra] = useState<ObraResumo | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaDetalhe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      obrasApi.buscar(params.id),
      evidenciasApi.listarPorEtapa(params.etapaId).catch(() => []),
    ])
      .then(([obraData, evidenciasData]) => {
        setObra(obraData);
        setEvidencias(evidenciasData);
      })
      .catch(() => router.replace(`/dashboard/obras/${params.id}`))
      .finally(() => setLoading(false));
  }, [params.id, params.etapaId, router]);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="h-6 w-64 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!obra) return null;

  const etapa = obra.etapas?.find((e) => e.id === params.etapaId);
  if (!etapa) {
    return (
      <div className="p-8 text-red-600 text-sm">Etapa não encontrada.</div>
    );
  }

  const etapas = obra.etapas ?? [];
  const statusStyle = STATUS_STYLE[etapa.status] ?? "bg-gray-50 text-gray-500 border-gray-200";
  const statusLabel = STATUS_LABEL[etapa.status] ?? etapa.status.replace(/_/g, " ");
  const isRejeitada = etapa.status === "REPROVADA" || etapa.status === "REJEITADA";
  const isAguardando = etapa.status === "AGUARDANDO_VISTORIA";

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a
          href={`/dashboard/obras/${params.id}`}
          className="hover:text-brand-600 transition-colors"
        >
          ← Voltar para a obra
        </a>
        <span>/</span>
        <span className="text-gray-900 font-medium">{etapa.nome}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 shrink-0">
                {etapa.ordem}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{etapa.nome}</h1>
            </div>
            <p className="text-sm text-gray-500 ml-12">
              {etapa.percentualObra}% da obra · {formatarBRL(Number(etapa.valorLiberacao))} a liberar
            </p>
          </div>
          <span
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {etapas.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Cronograma da Obra
          </h2>
          <EtapaProgressIndicator etapas={etapas} currentEtapaId={params.etapaId} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
            % da Obra
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {etapa.percentualObra}%
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
            Valor de Liberação
          </p>
          <p className="text-2xl font-bold text-brand-600">
            {formatarBRL(Number(etapa.valorLiberacao))}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
            Evidências
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {evidencias.length}
          </p>
        </div>
      </div>

      {isAguardando && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-yellow-400 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
            i
          </div>
          <div>
            <p className="font-semibold text-yellow-800 mb-1">Aguardando visita do engenheiro</p>
            <p className="text-sm text-yellow-700">
              Esta etapa está aguardando a vistoria técnica. Um engenheiro entrará em contato para agendar a visita à obra.
            </p>
          </div>
        </div>
      )}

      {isRejeitada && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-red-700 mb-1">Observação do gestor</p>
          <p className="text-sm text-red-600">
            Esta etapa foi reprovada. Entre em contato com o gestor para mais informações.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Evidências ({evidencias.length})
        </h2>
        {evidencias.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhuma evidência enviada para esta etapa ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {evidencias.map((ev) => (
              <div
                key={ev.id}
                className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden"
              >
                <div className="aspect-video bg-gray-200 overflow-hidden">
                  <img
                    src={ev.fotoUrl}
                    alt="Evidência da etapa"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        ev.validada
                          ? "bg-green-50 text-green-700"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {ev.validada ? "GPS validado" : "GPS pendente"}
                    </span>
                  </div>
                  {ev.distanciaObra !== undefined && (
                    <p className="text-xs text-gray-500">
                      {Math.round(ev.distanciaObra)}m da obra
                    </p>
                  )}
                  <p className="text-xs text-gray-400 font-mono">
                    {Number(ev.latCaptura).toFixed(5)}, {Number(ev.lngCaptura).toFixed(5)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
