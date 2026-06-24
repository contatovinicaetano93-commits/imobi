"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { managerApi, type EtapaDetalhe, type EtapaAuditEntry, evidenciasApi } from "@/lib/api";
import { GpsValidationStatus } from "@/components/dashboard/GpsValidationStatus";
import { ApprovalAuditTrail } from "@/components/dashboard/ApprovalAuditTrail";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import Image from "next/image";
import Link from "next/link";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function EtapaDetailPage() {
  const params = useParams();
  const [etapa, setEtapa] = useState<EtapaDetalhe | null>(null);
  const [gpsData, setGpsData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<EtapaAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
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

  useEffect(() => {
    setAuditLoading(true);
    managerApi
      .obterEtapaAuditLog(etapaId)
      .then((logs) => {
        setAuditLogs(logs);
        setAuditError(null);
      })
      .catch((err) => {
        setAuditError(
          err instanceof Error ? err.message : "Erro ao carregar histórico"
        );
      })
      .finally(() => setAuditLoading(false));
  }, [etapaId]);

  const gpsOk = gpsData.length > 0;
  const evidenciasOk = (etapa?.evidencias.length ?? 0) > 0;
  const pontosFortes: string[] = [];
  const pontosFracos: string[] = [];
  if (evidenciasOk) pontosFortes.push("Evidências fotográficas enviadas");
  else pontosFracos.push("Sem evidências fotográficas");
  if (gpsOk) pontosFortes.push("Geolocalização registrada");
  else pontosFracos.push("GPS não validado");
  if (etapa?.obra.credito) pontosFortes.push("Crédito vinculado à operação");
  else pontosFracos.push("Operação sem crédito ativo");

  if (loading) {
    return <PageSkeleton variant="detail" />;
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
          <p className="text-xs text-blue-700 mt-2 font-medium">
            Painel de visualização — o gestor do fundo não libera etapas nem participa do comitê.
          </p>
        </div>
        <Link
          href="/dashboard/gestor/etapas"
          className="text-[#1B4FD8] hover:text-blue-700 text-sm font-semibold shrink-0"
        >
          ← Voltar
        </Link>
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
                <span className="text-gray-600">Cliente</span>
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

        {/* Saúde da operação (somente leitura) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Saúde da operação</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-2">Valor da fase</p>
                <p className="text-2xl font-bold text-[#1B4FD8]">{brl(etapa.valorLiberacao)}</p>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Pontos fortes</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  {pontosFortes.length ? pontosFortes.map((p) => <li key={p}>✓ {p}</li>) : <li className="text-gray-400">—</li>}
                </ul>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Pontos de atenção</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  {pontosFracos.length ? pontosFracos.map((p) => <li key={p}>⚠ {p}</li>) : <li className="text-gray-400">Nenhum alerta</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Fluxo de liberação</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>1. Engenheiro aprova vistoria técnica</p>
              <p>2. Financeiro IMOBI paga na conta cadastrada</p>
              <p>3. Admin confirma pagamento na plataforma</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <ApprovalAuditTrail
        auditLogs={auditLogs}
        loading={auditLoading}
        error={auditError}
      />

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
