"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { managerApi, type EtapaDetalhe, type EtapaAuditEntry, evidenciasApi } from "@/lib/api";
import { GpsValidationStatus } from "@/components/dashboard/GpsValidationStatus";
import { ApprovalAuditTrail } from "@/components/dashboard/ApprovalAuditTrail";
import Image from "next/image";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function EtapaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [etapa, setEtapa] = useState<EtapaDetalhe | null>(null);
  const [gpsData, setGpsData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<EtapaAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const etapaId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    Promise.all([
      managerApi.obterEtapaDetalhe(etapaId),
      evidenciasApi.listarPorEtapa(etapaId).catch(() => []),
    ])
      .then(([etapaData, gpsDataResult]) => {
        if (!etapaData) {
          setError("Etapa não encontrada");
        } else {
          setEtapa(etapaData);
          setGpsData(gpsDataResult);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [etapaId]);

  const handleApprove = async () => {
    if (!etapa) return;
    setSubmitting(true);
    try {
      await managerApi.aprovarEtapa(etapaId);
      router.push("/dashboard/gestor/etapas");
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : "Desconhecido"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Forneça um motivo para a rejeição");
      return;
    }
    setSubmitting(true);
    try {
      await managerApi.rejeitarEtapa(etapaId, rejectionReason);
      router.push("/dashboard/gestor/etapas");
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

  if (error || !etapa) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Etapa não encontrada</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">{etapa.obra.nome}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {etapa.nome} (etapa {etapa.ordem}) · {etapa.percentualObra}% da obra
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informações principais */}
        <div className="md:col-span-2 space-y-6">
          {/* Obra */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Informações da Obra</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Endereço</span>
                <span className="font-medium text-gray-900">{etapa.obra.endereco}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tomador</span>
                <span className="font-medium text-gray-900">{etapa.obra.usuario.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPF</span>
                <span className="font-mono text-gray-900">{etapa.obra.usuario.cpf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="text-gray-900">{etapa.obra.usuario.email}</span>
              </div>
              {etapa.obra.credito && (
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <span className="text-gray-600">Crédito Aprovado</span>
                  <span className="font-bold text-green-600">
                    {brl(etapa.obra.credito.valorAprovado)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* GPS Validation */}
          {gpsData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Validação GPS</h2>
              <GpsValidationStatus
                pontos={gpsData.map((g) => ({
                  latitude: g.latCaptura,
                  longitude: g.lngCaptura,
                  accuracy: g.accuracyMetros,
                  distanciaObra: g.distanciaObra,
                }))}
                obraLatitude={etapa.obra.geoLatitude || 0}
                obraLongitude={etapa.obra.geoLongitude || 0}
                raioValidacaoMetros={etapa.obra.raioValidacaoMetros || 50}
              />
            </div>
          )}

          {/* Fotos/Evidências */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">
              Evidências ({etapa.evidencias.length} foto{etapa.evidencias.length !== 1 ? "s" : ""})
            </h2>
            {etapa.evidencias.length === 0 ? (
              <p className="text-gray-500">Nenhuma evidência enviada</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {etapa.evidencias.map((ev, idx) => (
                  <button
                    key={idx}
                    onClick={() => setExpandedImage(ev.fotoUrl)}
                    className="space-y-2 hover:opacity-80 transition-opacity text-left"
                    aria-label={`Expandir foto ${idx + 1}`}
                  >
                    <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={ev.fotoUrl}
                        alt={`Evidência ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(ev.criadoEm)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel de ações */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Decisão</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">Valor a liberar</p>
                <p className="text-2xl font-bold text-brand-600">{brl(etapa.valorLiberacao)}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  ✓ Aprovar Etapa
                </button>

                {!showRejectionForm ? (
                  <button
                    onClick={() => setShowRejectionForm(true)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-lg transition-colors"
                  >
                    ✕ Rejeitar
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Motivo da rejeição..."
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReject}
                        disabled={submitting}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectionForm(false);
                          setRejectionReason("");
                        }}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Checklist</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>☐ Geolocalização validada</p>
              <p>☐ Qualidade das fotos adequada</p>
              <p>☐ Avanço condiz com % esperado</p>
              <p>☐ Dados tomador confirmados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[80vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl"
              aria-label="Fechar"
            >
              ✕
            </button>
            <Image
              src={expandedImage}
              alt="Foto expandida"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
