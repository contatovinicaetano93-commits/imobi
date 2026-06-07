"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ObraResumo, EtapaResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { Camera, MapPin, AlertCircle, CheckCircle2, X, Upload } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  APROVADA:            "bg-green-50 text-green-700 border-green-200",
  EM_PROGRESSO:        "bg-blue-50 text-blue-700 border-blue-200",
  AGUARDANDO_VISTORIA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PENDENTE:            "bg-gray-50 text-gray-500 border-gray-200",
  REJEITADA:           "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  APROVADA:            "Aprovada",
  EM_PROGRESSO:        "Em Progresso",
  AGUARDANDO_VISTORIA: "Aguardando Vistoria",
  PENDENTE:            "Pendente",
  REJEITADA:           "Rejeitada",
};

function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type GpsState = { lat: number; lng: number; accuracy: number } | null;
type UploadState = {
  etapaId: string;
  file: File | null;
  gps: GpsState;
  gpsLoading: boolean;
  submitting: boolean;
  success: boolean;
  error: string | null;
  distancia: number | null;
};

export default function ObraDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [obra, setObra] = useState<ObraResumo | null>(null);
  const [progresso, setProgresso] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function openUpload(etapaId: string) {
    setUpload({ etapaId, file: null, gps: null, gpsLoading: false, submitting: false, success: false, error: null, distancia: null });
    setTimeout(() => fileRef.current?.click(), 50);
  }

  function captureGPS() {
    if (!navigator.geolocation) {
      setUpload((u) => u && ({ ...u, error: "Geolocalização não suportada." }));
      return;
    }
    setUpload((u) => u && ({ ...u, gpsLoading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        const dist = obra ? haversineMetros(gps.lat, gps.lng, obra.geoLatitude, obra.geoLongitude) : null;
        setUpload((u) => u && ({ ...u, gps, gpsLoading: false, distancia: dist }));
      },
      () => setUpload((u) => u && ({ ...u, gpsLoading: false, error: "Não foi possível obter localização. Verifique as permissões." })),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    if (!upload || !upload.file || !upload.gps) return;
    setUpload((u) => u && ({ ...u, submitting: true, error: null }));

    const formData = new FormData();
    formData.append("foto", upload.file);
    formData.append("etapaId", upload.etapaId);
    formData.append("latitude", String(upload.gps.lat));
    formData.append("longitude", String(upload.gps.lng));
    formData.append("accuracyMetros", String(upload.gps.accuracy));
    formData.append("timestampCaptura", new Date().toISOString());

    try {
      const res = await fetch("/api/proxy/evidencias", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "Erro ao enviar evidência.");
      }
      setUpload((u) => u && ({ ...u, submitting: false, success: true }));
      // Reload obra data after 1.5s to reflect new evidencia count
      setTimeout(() => {
        setUpload(null);
        fetch(`/api/proxy/obras/${params.id}`).then((r) => r.ok ? r.json() : null).then((d) => { if (d) setObra(d); });
      }, 1500);
    } catch (err: unknown) {
      setUpload((u) => u && ({ ...u, submitting: false, error: err instanceof Error ? err.message : "Erro inesperado." }));
    }
  }

  if (loading) return <div className="text-gray-400 p-8">Carregando...</div>;
  if (!obra) return null;

  const etapas = obra.etapas ?? [];
  const raio = obra.raioValidacaoMetros ?? 100;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="text-xs text-gray-400 mb-1">
          <a href="/dashboard/obras" className="hover:text-[#1B4FD8]">Obras</a>
          <span className="mx-1">/</span>
          <span className="text-gray-700 font-medium">{obra.nome}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{obra.nome}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{obra.status.replace(/_/g, " ")}</p>
      </div>

      {obra.credito && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Crédito aprovado", value: formatarBRL(Number(obra.credito.valorAprovado)), color: "text-[#1B4FD8]" },
            { label: "Total liberado",   value: formatarBRL(Number(obra.credito.valorLiberado)), color: "text-[#16a34a]" },
            { label: "Progresso",        value: `${progresso}%`, color: "text-[#16a34a]" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Progresso geral</span>
          <span className="font-semibold text-[#16a34a]">{progresso}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#16a34a] rounded-full transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      {/* Etapas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cronograma de Etapas</h2>
        <div className="space-y-3">
          {etapas.map((etapa: EtapaResumo) => {
            const isUploading = upload?.etapaId === etapa.id;
            return (
              <div key={etapa.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {etapa.ordem}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{etapa.nome}</p>
                    <p className="text-sm text-gray-500">
                      {etapa.percentualObra}% da obra · {formatarBRL(Number(etapa.valorLiberacao))}
                    </p>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-lg font-bold text-gray-900">{etapa.evidencias?.length ?? 0}</p>
                    <p className="text-xs text-gray-400">fotos</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0 ${STATUS_STYLE[etapa.status] ?? STATUS_STYLE["PENDENTE"]}`}>
                    {STATUS_LABEL[etapa.status] ?? etapa.status.replace(/_/g, " ")}
                  </span>

                  {etapa.status === "AGUARDANDO_VISTORIA" && (
                    <a
                      href={`/dashboard/obras/${obra.id}/vistoria/${etapa.id}`}
                      className="shrink-0 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                      style={{ background: "#1B4FD8" }}
                    >
                      Vistorar
                    </a>
                  )}

                  {(etapa.status === "PENDENTE" || etapa.status === "EM_PROGRESSO" || etapa.status === "REJEITADA") && (
                    <button
                      onClick={() => isUploading ? setUpload(null) : openUpload(etapa.id)}
                      className="shrink-0 flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border transition-colors"
                      style={isUploading ? { borderColor: "#e5e7eb", color: "#6b7280" } : { borderColor: "#1B4FD8", color: "#1B4FD8" }}
                    >
                      {isUploading ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      {isUploading ? "Fechar" : "Enviar Foto"}
                    </button>
                  )}
                </div>

                {/* Inline upload form */}
                {isUploading && upload && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-blue-50/40 space-y-4">
                    {upload.success ? (
                      <div className="flex items-center gap-3 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="font-semibold text-sm">Foto enviada com sucesso!</p>
                      </div>
                    ) : (
                      <>
                        {/* File input */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">1. Selecione a foto</p>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              setUpload((u) => u && ({ ...u, file: f }));
                            }}
                          />
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-2 text-sm border border-gray-200 bg-white rounded-xl px-4 py-2.5 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            {upload.file ? upload.file.name : "Escolher arquivo"}
                          </button>
                        </div>

                        {/* GPS */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">2. Capture sua localização</p>
                          <button
                            onClick={captureGPS}
                            disabled={upload.gpsLoading}
                            className="flex items-center gap-2 text-sm border rounded-xl px-4 py-2.5 transition-colors"
                            style={upload.gps ? { borderColor: "#16a34a", color: "#16a34a", background: "#f0fdf4" } : { borderColor: "#d1d5db", background: "white" }}
                          >
                            <MapPin className="w-4 h-4" />
                            {upload.gpsLoading
                              ? "Obtendo localização..."
                              : upload.gps
                              ? `GPS capturado (±${Math.round(upload.gps.accuracy)}m)`
                              : "Capturar GPS"}
                          </button>

                          {upload.gps && upload.distancia !== null && (
                            <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${upload.distancia <= raio ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {upload.distancia <= raio
                                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                : <AlertCircle className="w-4 h-4 shrink-0" />}
                              {upload.distancia <= raio
                                ? `Você está a ${Math.round(upload.distancia)}m da obra ✓`
                                : `Você está a ${Math.round(upload.distancia)}m da obra — máximo permitido: ${raio}m. Aproxime-se do local.`}
                            </div>
                          )}
                        </div>

                        {upload.error && (
                          <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs rounded-xl px-3 py-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            {upload.error}
                          </div>
                        )}

                        <button
                          onClick={handleSubmit}
                          disabled={!upload.file || !upload.gps || upload.submitting || (upload.distancia !== null && upload.distancia > raio)}
                          className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-40"
                          style={{ background: "#1B4FD8" }}
                        >
                          {upload.submitting ? "Enviando..." : "Enviar Evidência"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
