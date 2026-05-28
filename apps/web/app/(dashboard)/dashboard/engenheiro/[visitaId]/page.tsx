"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { engenheirosApi, type Visita, obrasApi, type ObraResumo } from "@/lib/api";
import Link from "next/link";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getStatusColor(status: string) {
  switch (status) {
    case "AGENDADA":
      return "bg-blue-100 text-blue-800";
    case "INICIADA":
      return "bg-yellow-100 text-yellow-800";
    case "CONCLUIDA":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "AGENDADA":
      return "Agendada";
    case "INICIADA":
      return "Iniciada";
    case "CONCLUIDA":
      return "Concluída";
    default:
      return status;
  }
}

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [visita, setVisita] = useState<Visita | null>(null);
  const [obra, setObra] = useState<ObraResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visitaId = Array.isArray(params.visitaId) ? params.visitaId[0] : params.visitaId;

  useEffect(() => {
    Promise.all([
      engenheirosApi.atualizarValidacao(visitaId, {}).catch(() => null),
      // Try to get visit details from initial fetch and then obra details
    ])
      .then(() => {
        // We need to implement a detail endpoint or get it from list
        // For now, we'll just load the visits and find the one we need
        return engenheirosApi.listarVisitas().then((visitas) => {
          const found = visitas.find((v: Visita) => v.visitaId === visitaId);
          if (!found) {
            throw new Error("Visita não encontrada");
          }
          setVisita(found);
          if (found.obraId) {
            return obrasApi.buscar(found.obraId).catch(() => null);
          }
          return null;
        });
      })
      .then((obraData) => {
        if (obraData) {
          setObra(obraData);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [visitaId]);

  const handleInitiate = async () => {
    if (!visita) return;
    setSubmitting(true);
    try {
      await engenheirosApi.atualizarValidacao(visitaId, { status: "INICIADA" });
      setVisita({ ...visita, status: "INICIADA" });
      router.refresh();
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : "Desconhecido"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!visita) return;
    setSubmitting(true);
    try {
      await engenheirosApi.atualizarValidacao(visitaId, { status: "CONCLUIDA" });
      setVisita({ ...visita, status: "CONCLUIDA" });
      router.refresh();
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : "Desconhecido"}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Carregando...</h1>
      </div>
    );
  }

  if (error || !visita) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Visita não encontrada</h1>
          <Link
            href="/dashboard/engenheiro"
            className="text-brand-600 hover:text-brand-700 text-sm font-semibold"
          >
            ← Voltar
          </Link>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error || "Erro ao carregar dados"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{visita.obra.nome}</h1>
          <p className="text-gray-500 text-sm mt-1">{visita.obra.endereco}</p>
        </div>
        <Link
          href="/dashboard/engenheiro"
          className="text-brand-600 hover:text-brand-700 text-sm font-semibold"
        >
          ← Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Visita Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Informações da Visita</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Etapa</span>
                <span className="font-medium text-gray-900">{visita.etapaNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(visita.status)}`}>
                  {getStatusLabel(visita.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Agendada</span>
                <span className="font-medium text-gray-900">
                  {new Date(visita.dataAgendada).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {visita.dataInicio && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Data de Início</span>
                  <span className="font-medium text-gray-900">{formatDate(visita.dataInicio)}</span>
                </div>
              )}
              {visita.dataConclusao && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Data de Conclusão</span>
                  <span className="font-medium text-gray-900">{formatDate(visita.dataConclusao)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Obra Info */}
          {obra && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Detalhes da Obra</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nome</span>
                  <span className="font-medium text-gray-900">{obra.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Endereço</span>
                  <span className="font-medium text-gray-900">{obra.endereco}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    obra.status === "EM_EXECUCAO"
                      ? "bg-blue-100 text-blue-700"
                      : obra.status === "CONCLUIDA"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {obra.status === "EM_EXECUCAO"
                      ? "Em Execução"
                      : obra.status === "CONCLUIDA"
                        ? "Concluída"
                        : "Planejamento"}
                  </span>
                </div>
                {obra.progresso !== undefined && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-bold text-gray-900">{obra.progresso}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-brand-600 h-2 rounded-full transition-all"
                        style={{ width: `${obra.progresso}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {visita.observacoes && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Observações</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{visita.observacoes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Ações</h2>
            <div className="space-y-3">
              {visita.status === "AGENDADA" && (
                <button
                  onClick={handleInitiate}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {submitting ? "Iniciando..." : "Iniciar Visita"}
                </button>
              )}

              {visita.status === "INICIADA" && (
                <button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {submitting ? "Concluindo..." : "Concluir Visita"}
                </button>
              )}

              {visita.status === "CONCLUIDA" && (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-semibold">✓ Visita Concluída</p>
                  <p className="text-green-700 text-sm mt-1">
                    Concluída em {formatDate(visita.dataConclusao || visita.criadoEm)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <h3 className="font-semibold text-blue-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Agendada</p>
                  <p className="text-xs text-blue-700">{formatDate(visita.dataAgendada)}</p>
                </div>
              </div>

              {visita.dataInicio && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Iniciada</p>
                    <p className="text-xs text-blue-700">{formatDate(visita.dataInicio)}</p>
                  </div>
                </div>
              )}

              {visita.dataConclusao && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Concluída</p>
                    <p className="text-xs text-green-700">{formatDate(visita.dataConclusao)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
