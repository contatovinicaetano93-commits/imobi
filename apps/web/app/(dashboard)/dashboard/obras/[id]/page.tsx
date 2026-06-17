"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Plus,
  Download,
  Eye,
  Camera,
  Banknote,
  TrendingUp,
  Activity,
  Calendar,
  User,
  X,
  AlertCircle,
  ChevronLeft,
  File,
  Image as ImageIcon,
  Shield,
} from "lucide-react";

// ─── Design tokens ──────────────────────────────────────────────────────────
const NAVY = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT = "#4ADE80";
const AMBER = "#F59E0B";
const RED = "#EF4444";

const j: CSSProperties = { fontFamily: "'Jost', sans-serif" };
const bc: CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 800,
};
const card: CSSProperties = {
  background: "white",
  border: "1px solid rgba(12,26,61,0.08)",
  borderRadius: 16,
  overflow: "hidden",
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Etapa = {
  etapaId: string;
  id?: string;
  nome: string;
  ordem: number;
  status: string;
  percentualObra: number;
  valorLiberacao: number;
  dataConclusaoPrevista?: string;
  dataConclusaoReal?: string;
  evidencias?: { id: string; fotoUrl: string; validada: boolean; criadoEm: string }[];
};

type Obra = {
  obraId?: string;
  id?: string;
  nome: string;
  endereco?: string;
  status: string;
  tipo?: string;
  areaM2?: number;
  geoLatitude?: number;
  geoLongitude?: number;
  raioValidacaoMetros?: number;
  usuario?: { nome: string; email: string };
  credito?: {
    valorAprovado: number;
    valorLiberado: number;
    status: string;
    taxaMensal?: number;
    prazoMeses?: number;
  } | null;
  etapas?: Etapa[];
  criadoEm?: string;
};

type Documento = {
  documentoId: string;
  tipo: string;
  nome: string;
  url: string;
  mimeType: string;
  descricao?: string;
  vencimento?: string;
  criadoEm: string;
};

type HistoricoEvento = {
  id: string;
  tipo: string;
  descricao: string;
  usuario?: string;
  criadoEm: string;
};

type GpsState = { lat: number; lng: number; accuracy: number } | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function haversineMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status configs ───────────────────────────────────────────────────────────
const OBRA_STATUS: Record<string, { label: string; color: string; bg: string }> =
  {
    PLANEJAMENTO: { label: "Planejamento", color: "#6B7280", bg: "#F3F4F6" },
    EM_ANDAMENTO: { label: "Em Andamento", color: ROYAL, bg: "#EFF6FF" },
    EM_EXECUCAO: { label: "Em Execução", color: ROYAL, bg: "#EFF6FF" },
    CONCLUIDA: { label: "Concluída", color: "#16a34a", bg: "#F0FDF4" },
    PAUSADA: { label: "Pausada", color: AMBER, bg: "#FFFBEB" },
    CANCELADA: { label: "Cancelada", color: RED, bg: "#FEF2F2" },
  };

const ETAPA_STATUS: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  PLANEJADA: {
    label: "Planejada",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <Clock size={14} />,
  },
  EM_EXECUCAO: {
    label: "Em Execução",
    color: ROYAL,
    bg: "#EFF6FF",
    icon: <Activity size={14} />,
  },
  AGUARDANDO_VISTORIA: {
    label: "Aguardando Vistoria",
    color: AMBER,
    bg: "#FFFBEB",
    icon: <AlertTriangle size={14} />,
  },
  CONCLUIDA: {
    label: "Concluída",
    color: "#16a34a",
    bg: "#F0FDF4",
    icon: <CheckCircle2 size={14} />,
  },
  REPROVADA: {
    label: "Reprovada",
    color: RED,
    bg: "#FEF2F2",
    icon: <XCircle size={14} />,
  },
  // Legacy mappings
  PENDENTE: {
    label: "Pendente",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: <Clock size={14} />,
  },
  EM_PROGRESSO: {
    label: "Em Progresso",
    color: ROYAL,
    bg: "#EFF6FF",
    icon: <Activity size={14} />,
  },
  APROVADA: {
    label: "Aprovada",
    color: "#16a34a",
    bg: "#F0FDF4",
    icon: <CheckCircle2 size={14} />,
  },
  REJEITADA: {
    label: "Rejeitada",
    color: RED,
    bg: "#FEF2F2",
    icon: <XCircle size={14} />,
  },
};

const DOC_TIPOS = [
  "CONTRATO",
  "GARANTIA",
  "MATRICULA",
  "ART",
  "ALVARA",
  "SEGURO",
  "PROCURACAO",
  "ESCRITURA",
  "HABITE_SE",
  "OUTROS",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; color: string; bg: string; icon?: React.ReactNode }> }) {
  const cfg = map[status] ?? { label: status.replace(/_/g, " "), color: "#6B7280", bg: "#F3F4F6" };
  return (
    <span
      style={{
        ...j,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function Skeleton({ h, w }: { h?: number; w?: string }) {
  return (
    <div
      style={{
        height: h ?? 20,
        width: w ?? "100%",
        borderRadius: 8,
        background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.2s infinite",
      }}
    />
  );
}

// ─── Tab: Visão Geral ────────────────────────────────────────────────────────
function TabGeralContent({
  obra,
  progresso,
  role,
}: {
  obra: Obra;
  progresso: number;
  role: string | null;
}) {
  const etapas = obra.etapas ?? [];
  const concluidas = etapas.filter(
    (e) => e.status === "CONCLUIDA" || e.status === "APROVADA"
  ).length;
  const obraId = obra.obraId ?? obra.id ?? "";

  const openMaps = () => {
    if (obra.geoLatitude && obra.geoLongitude) {
      window.open(
        `https://maps.google.com/?q=${obra.geoLatitude},${obra.geoLongitude}`,
        "_blank"
      );
    }
  };

  const obraStatus = OBRA_STATUS[obra.status] ?? {
    label: obra.status.replace(/_/g, " "),
    color: "#6B7280",
    bg: "#F3F4F6",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Status + address */}
      <div style={{ ...card, padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: obraStatus.bg,
                color: obraStatus.color,
                fontWeight: 700,
                fontSize: 13,
                padding: "4px 14px",
                borderRadius: 20,
                ...j,
                marginBottom: 12,
              }}
            >
              {obraStatus.label}
            </span>
            {obra.endereco && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  color: "#4B5563",
                  fontSize: 14,
                  ...j,
                }}
              >
                <MapPin size={16} style={{ color: ROYAL, marginTop: 2, flexShrink: 0 }} />
                <span>{obra.endereco}</span>
              </div>
            )}
            {obra.criadoEm && (
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6, ...j }}>
                Cadastrada em {formatDate(obra.criadoEm)}
              </div>
            )}
          </div>
          {obra.geoLatitude && obra.geoLongitude && (
            <button
              onClick={openMaps}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid rgba(12,26,61,0.18)`,
                background: "white",
                color: NAVY,
                fontWeight: 600,
                fontSize: 13,
                padding: "8px 16px",
                borderRadius: 10,
                cursor: "pointer",
                ...j,
              }}
            >
              <MapPin size={14} />
              Ver no mapa
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              color: "#6B7280",
              marginBottom: 8,
              ...j,
            }}
          >
            <span>Progresso geral</span>
            <span style={{ fontWeight: 700, color: "#16a34a" }}>{progresso}%</span>
          </div>
          <div
            style={{
              height: 10,
              background: "#F3F4F6",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(progresso, 100)}%`,
                background: MINT,
                borderRadius: 10,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Etapas totais", value: etapas.length, color: NAVY },
          { label: "Concluídas", value: concluidas, color: "#16a34a" },
          { label: "Progresso", value: `${progresso}%`, color: ROYAL },
          ...(obra.areaM2
            ? [{ label: "Área (m²)", value: `${obra.areaM2} m²`, color: "#7C3AED" }]
            : []),
        ].map((k) => (
          <div
            key={k.label}
            style={{
              ...card,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, color: "#9CA3AF", ...j }}>{k.label}</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: k.color, ...bc }}>
              {k.value}
            </span>
          </div>
        ))}
      </div>

      {/* Crédito vinculado */}
      {obra.credito && (
        <div style={{ ...card, padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: "#EFF6FF",
                borderRadius: 10,
                padding: 8,
                display: "flex",
              }}
            >
              <Banknote size={18} color={ROYAL} />
            </div>
            <h3 style={{ fontWeight: 700, color: NAVY, fontSize: 16, ...j }}>
              Crédito Vinculado
            </h3>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Valor aprovado</p>
              <p style={{ fontWeight: 700, color: NAVY, fontSize: 18, ...j }}>
                {formatBRL(Number(obra.credito.valorAprovado))}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Liberado</p>
              <p style={{ fontWeight: 700, color: "#16a34a", fontSize: 18, ...j }}>
                {formatBRL(Number(obra.credito.valorLiberado))}
              </p>
            </div>
            {obra.credito.taxaMensal !== undefined && (
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Taxa mensal</p>
                <p style={{ fontWeight: 700, color: NAVY, fontSize: 18, ...j }}>
                  {obra.credito.taxaMensal}%
                </p>
              </div>
            )}
            {obra.credito.prazoMeses !== undefined && (
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Prazo</p>
                <p style={{ fontWeight: 700, color: NAVY, fontSize: 18, ...j }}>
                  {obra.credito.prazoMeses} meses
                </p>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#6B7280",
                marginBottom: 6,
                ...j,
              }}
            >
              <span>Utilização do crédito</span>
              <span style={{ fontWeight: 600 }}>
                {Math.round(
                  (Number(obra.credito.valorLiberado) /
                    Number(obra.credito.valorAprovado)) *
                    100
                )}
                %
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#F3F4F6",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(
                    (Number(obra.credito.valorLiberado) /
                      Number(obra.credito.valorAprovado)) *
                      100,
                    100
                  )}%`,
                  background: ROYAL,
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tomador - só para roles com acesso */}
      {obra.usuario &&
        role &&
        ["ADMIN", "GESTOR", "ENGENHEIRO"].includes(role) && (
          <div style={{ ...card, padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: "#F5F3FF",
                  borderRadius: 10,
                  padding: 8,
                  display: "flex",
                }}
              >
                <User size={18} color="#7C3AED" />
              </div>
              <h3 style={{ fontWeight: 700, color: NAVY, fontSize: 16, ...j }}>
                Tomador
              </h3>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Nome</p>
                <p style={{ fontWeight: 600, color: NAVY, ...j }}>
                  {obra.usuario.nome}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Email</p>
                <p style={{ color: "#4B5563", ...j }}>{obra.usuario.email}</p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ─── Tab: Etapas ──────────────────────────────────────────────────────────────
function TabEtapasContent({
  obra,
  role,
  obraId,
  onRefresh,
}: {
  obra: Obra;
  role: string | null;
  obraId: string;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const etapas = obra.etapas ?? [];
  const [uploadState, setUploadState] = useState<{
    etapaId: string;
    file: File | null;
    gps: GpsState;
    gpsLoading: boolean;
    submitting: boolean;
    success: boolean;
    error: string | null;
    distancia: number | null;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openUpload(etapaId: string) {
    setUploadState({
      etapaId,
      file: null,
      gps: null,
      gpsLoading: false,
      submitting: false,
      success: false,
      error: null,
      distancia: null,
    });
    setTimeout(() => fileRef.current?.click(), 50);
  }

  function captureGPS() {
    if (!navigator.geolocation) {
      setUploadState((u) =>
        u ? { ...u, error: "Geolocalização não suportada." } : null
      );
      return;
    }
    setUploadState((u) => (u ? { ...u, gpsLoading: true, error: null } : null));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        const dist =
          obra.geoLatitude && obra.geoLongitude
            ? haversineMetros(gps.lat, gps.lng, obra.geoLatitude, obra.geoLongitude)
            : null;
        setUploadState((u) =>
          u ? { ...u, gps, gpsLoading: false, distancia: dist } : null
        );
      },
      () =>
        setUploadState((u) =>
          u
            ? {
                ...u,
                gpsLoading: false,
                error:
                  "Não foi possível obter localização. Verifique as permissões.",
              }
            : null
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmitEvidencia() {
    if (!uploadState || !uploadState.file || !uploadState.gps) return;
    setUploadState((u) =>
      u ? { ...u, submitting: true, error: null } : null
    );
    const formData = new FormData();
    formData.append("foto", uploadState.file);
    formData.append("etapaId", uploadState.etapaId);
    formData.append("latitude", String(uploadState.gps.lat));
    formData.append("longitude", String(uploadState.gps.lng));
    formData.append("accuracyMetros", String(uploadState.gps.accuracy));
    formData.append("timestampCaptura", new Date().toISOString());
    try {
      const res = await fetch("/api/proxy/evidencias", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Erro ao enviar evidência.");
      }
      setUploadState((u) =>
        u ? { ...u, submitting: false, success: true } : null
      );
      setTimeout(() => {
        setUploadState(null);
        onRefresh();
      }, 1500);
    } catch (err: unknown) {
      setUploadState((u) =>
        u
          ? {
              ...u,
              submitting: false,
              error:
                err instanceof Error ? err.message : "Erro inesperado.",
            }
          : null
      );
    }
  }

  const raio = obra.raioValidacaoMetros ?? 100;
  const canEnviarEvidencia = (status: string) =>
    role &&
    ["TOMADOR", "CONSTRUTOR"].includes(role) &&
    ["PENDENTE", "EM_EXECUCAO", "EM_PROGRESSO", "REJEITADA", "REPROVADA"].includes(status);

  const canAprovar = (status: string) =>
    role &&
    ["GESTOR", "ADMIN"].includes(role) &&
    ["AGUARDANDO_VISTORIA"].includes(status);

  const canMedicao = (status: string) =>
    role === "ENGENHEIRO" &&
    ["EM_EXECUCAO", "EM_PROGRESSO"].includes(status);

  if (etapas.length === 0) {
    return (
      <div
        style={{
          ...card,
          padding: 48,
          textAlign: "center",
          color: "#9CA3AF",
          ...j,
        }}
      >
        <Calendar size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
        <p>Nenhuma etapa cadastrada nesta obra.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setUploadState((u) => (u ? { ...u, file: f } : null));
        }}
      />
      {etapas.map((etapa) => {
        const etId = etapa.etapaId ?? etapa.id ?? "";
        const isUploading = uploadState?.etapaId === etId;
        const stCfg = ETAPA_STATUS[etapa.status] ?? {
          label: etapa.status.replace(/_/g, " "),
          color: "#6B7280",
          bg: "#F3F4F6",
          icon: null,
        };

        return (
          <div key={etId} style={card}>
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {/* Ordem */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: stCfg.bg,
                  color: stCfg.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                  flexShrink: 0,
                  ...bc,
                }}
              >
                {etapa.ordem}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: NAVY, fontSize: 15, ...j, marginBottom: 2 }}>
                  {etapa.nome}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 12,
                    color: "#6B7280",
                    flexWrap: "wrap",
                    ...j,
                  }}
                >
                  <span>{etapa.percentualObra}% da obra</span>
                  <span>{formatBRL(Number(etapa.valorLiberacao))}</span>
                  {etapa.dataConclusaoPrevista && (
                    <span>Prevista: {formatDate(etapa.dataConclusaoPrevista)}</span>
                  )}
                  {etapa.dataConclusaoReal && (
                    <span style={{ color: "#16a34a" }}>
                      Concluída: {formatDate(etapa.dataConclusaoReal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Fotos */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <p style={{ fontWeight: 800, color: NAVY, fontSize: 18, ...bc }}>
                  {etapa.evidencias?.length ?? 0}
                </p>
                <p style={{ fontSize: 11, color: "#9CA3AF", ...j }}>fotos</p>
              </div>

              {/* Status */}
              <StatusBadge status={etapa.status} map={ETAPA_STATUS} />

              {/* Action buttons */}
              {canEnviarEvidencia(etapa.status) && (
                <button
                  onClick={() =>
                    isUploading ? setUploadState(null) : openUpload(etId)
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: `1px solid ${isUploading ? "#D1D5DB" : ROYAL}`,
                    background: "white",
                    color: isUploading ? "#6B7280" : ROYAL,
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "8px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    flexShrink: 0,
                    ...j,
                  }}
                >
                  {isUploading ? <X size={14} /> : <Camera size={14} />}
                  {isUploading ? "Fechar" : "Enviar Evidência"}
                </button>
              )}

              {canAprovar(etapa.status) && (
                <a
                  href={`/dashboard/obras/${obraId}/vistoria/${etId}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: AMBER,
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "8px 14px",
                    borderRadius: 10,
                    textDecoration: "none",
                    flexShrink: 0,
                    ...j,
                  }}
                >
                  <Eye size={14} />
                  Vistorar
                </a>
              )}

              {canMedicao(etapa.status) && (
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#7C3AED",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "8px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border: "none",
                    flexShrink: 0,
                    ...j,
                  }}
                  onClick={() => alert("Formulário de medição em desenvolvimento.")}
                >
                  <TrendingUp size={14} />
                  Registrar Medição
                </button>
              )}
            </div>

            {/* Upload inline */}
            {isUploading && uploadState && (
              <div
                style={{
                  borderTop: "1px solid #F3F4F6",
                  padding: "16px 20px",
                  background: "#F8FAFF",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {uploadState.success ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#16a34a",
                      fontWeight: 600,
                      ...j,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    Evidência enviada com sucesso!
                  </div>
                ) : (
                  <>
                    {/* Step 1 - foto */}
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 8,
                          ...j,
                        }}
                      >
                        1. Selecione a foto
                      </p>
                      <button
                        onClick={() => fileRef.current?.click()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          border: `1px solid ${uploadState.file ? ROYAL : "#D1D5DB"}`,
                          background: uploadState.file ? "#EFF6FF" : "white",
                          color: uploadState.file ? ROYAL : "#6B7280",
                          fontSize: 13,
                          padding: "8px 14px",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 600,
                          ...j,
                        }}
                      >
                        <Upload size={14} />
                        {uploadState.file ? uploadState.file.name : "Escolher arquivo"}
                      </button>
                    </div>

                    {/* Step 2 - GPS */}
                    <div>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          marginBottom: 8,
                          ...j,
                        }}
                      >
                        2. Capture localização GPS
                      </p>
                      <button
                        onClick={captureGPS}
                        disabled={uploadState.gpsLoading}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          border: `1px solid ${uploadState.gps ? "#16a34a" : "#D1D5DB"}`,
                          background: uploadState.gps ? "#F0FDF4" : "white",
                          color: uploadState.gps ? "#16a34a" : "#6B7280",
                          fontSize: 13,
                          padding: "8px 14px",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 600,
                          ...j,
                        }}
                      >
                        <MapPin size={14} />
                        {uploadState.gpsLoading
                          ? "Obtendo localização..."
                          : uploadState.gps
                          ? `GPS capturado (±${Math.round(uploadState.gps.accuracy)}m)`
                          : "Capturar GPS"}
                      </button>

                      {uploadState.gps && uploadState.distancia !== null && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: 8,
                            marginTop: 8,
                            background:
                              uploadState.distancia <= raio
                                ? "#F0FDF4"
                                : "#FEF2F2",
                            color:
                              uploadState.distancia <= raio ? "#16a34a" : RED,
                            ...j,
                          }}
                        >
                          {uploadState.distancia <= raio ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <AlertCircle size={14} />
                          )}
                          {uploadState.distancia <= raio
                            ? `Você está a ${Math.round(uploadState.distancia)}m da obra ✓`
                            : `Você está a ${Math.round(uploadState.distancia)}m — máximo: ${raio}m`}
                        </div>
                      )}
                    </div>

                    {uploadState.error && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          background: "#FEF2F2",
                          color: RED,
                          fontSize: 12,
                          padding: "8px 12px",
                          borderRadius: 8,
                          ...j,
                        }}
                      >
                        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                        {uploadState.error}
                      </div>
                    )}

                    <button
                      onClick={handleSubmitEvidencia}
                      disabled={
                        !uploadState.file ||
                        !uploadState.gps ||
                        uploadState.submitting ||
                        (uploadState.distancia !== null &&
                          uploadState.distancia > raio)
                      }
                      style={{
                        background: ROYAL,
                        color: "white",
                        fontWeight: 700,
                        fontSize: 14,
                        padding: "12px",
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        opacity:
                          !uploadState.file ||
                          !uploadState.gps ||
                          uploadState.submitting
                            ? 0.4
                            : 1,
                        ...j,
                      }}
                    >
                      {uploadState.submitting
                        ? "Enviando..."
                        : "Enviar Evidência"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Documentos ─────────────────────────────────────────────────────────
function DocIcon({ mimeType }: { mimeType: string }) {
  if (mimeType?.includes("pdf"))
    return <FileText size={18} color={RED} />;
  if (mimeType?.includes("image"))
    return <ImageIcon size={18} color={ROYAL} />;
  return <File size={18} color="#6B7280" />;
}

function TabDocumentosContent({
  documentos,
  obraId,
  onRefresh,
}: {
  documentos: Documento[];
  obraId: string;
  onRefresh: () => void;
}) {
  const [docAtivo, setDocAtivo] = useState<Documento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: "CONTRATO",
    nome: "",
    descricao: "",
    vencimento: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !form.nome) {
      setForm((prev) => ({ ...prev, nome: f.name.replace(/\.[^/.]+$/, "") }));
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("obraId", obraId);
      fd.append("tipo", form.tipo);
      fd.append("nome", form.nome || file.name);
      if (form.descricao) fd.append("descricao", form.descricao);
      if (form.vencimento) fd.append("vencimento", form.vencimento);
      const res = await fetch("/api/proxy/documentos", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Erro ao enviar documento.");
      }
      setShowModal(false);
      setFile(null);
      setForm({ tipo: "CONTRATO", nome: "", descricao: "", vencimento: "" });
      onRefresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setUploading(false);
    }
  }

  function renderViewer(doc: Documento) {
    const isHttp = doc.url?.startsWith("http");
    if (!isHttp) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            height: 300,
            color: "#9CA3AF",
            ...j,
          }}
        >
          <File size={40} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>{doc.nome}</p>
          <p style={{ fontSize: 12 }}>
            URL pré-assinada será gerada pelo backend
          </p>
        </div>
      );
    }
    if (doc.mimeType?.includes("pdf")) {
      return (
        <iframe
          src={doc.url}
          width="100%"
          height={600}
          style={{ border: "none", borderRadius: 8 }}
          title={doc.nome}
        />
      );
    }
    if (doc.mimeType?.includes("image")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.url}
          alt={doc.nome}
          style={{
            maxWidth: "100%",
            maxHeight: 600,
            borderRadius: 8,
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
          }}
        />
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          height: 200,
          ...j,
        }}
      >
        <File size={36} style={{ color: "#9CA3AF" }} />
        <a
          href={doc.url}
          download
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: NAVY,
            color: "white",
            fontWeight: 600,
            fontSize: 13,
            padding: "10px 18px",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          <Download size={14} />
          Baixar arquivo
        </a>
      </div>
    );
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    border: "1px solid rgba(12,26,61,0.15)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 14,
    color: NAVY,
    outline: "none",
    ...j,
    boxSizing: "border-box",
  };

  return (
    <>
      {/* Modal upload */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 500,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ fontWeight: 800, color: NAVY, fontSize: 18, ...bc }}>
                Adicionar Documento
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  border: "none",
                  background: "#F3F4F6",
                  borderRadius: 8,
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={16} color="#6B7280" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", ...j, display: "block", marginBottom: 4 }}>
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tipo: e.target.value }))
                  }
                  style={inputStyle}
                >
                  {DOC_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", ...j, display: "block", marginBottom: 4 }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Nome do documento"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", ...j, display: "block", marginBottom: 4 }}>
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descricao: e.target.value }))
                  }
                  placeholder="Descrição breve"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", ...j, display: "block", marginBottom: 4 }}>
                  Vencimento (opcional)
                </label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vencimento: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", ...j, display: "block", marginBottom: 4 }}>
                  Arquivo
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%",
                    border: `1px dashed ${file ? ROYAL : "#D1D5DB"}`,
                    background: file ? "#EFF6FF" : "#FAFAFA",
                    color: file ? ROYAL : "#9CA3AF",
                    fontSize: 13,
                    padding: "12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 600,
                    ...j,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Upload size={16} />
                  {file ? file.name : "Selecionar arquivo (PDF ou imagem)"}
                </button>
              </div>
            </div>

            {uploadError && (
              <div
                style={{
                  background: "#FEF2F2",
                  color: RED,
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  ...j,
                }}
              >
                {uploadError}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                background: NAVY,
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                padding: "13px",
                borderRadius: 12,
                border: "none",
                cursor: !file || uploading ? "not-allowed" : "pointer",
                opacity: !file || uploading ? 0.5 : 1,
                ...j,
              }}
            >
              {uploading ? "Enviando..." : "Enviar Documento"}
            </button>
          </div>
        </div>
      )}

      {/* Header with button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 14, color: "#6B7280", ...j }}>
          {documentos.length} documento{documentos.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: NAVY,
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            ...j,
          }}
        >
          <Plus size={15} />
          Adicionar documento
        </button>
      </div>

      {documentos.length === 0 ? (
        <div
          style={{
            ...card,
            padding: 48,
            textAlign: "center",
            color: "#9CA3AF",
            ...j,
          }}
        >
          <FileText
            size={40}
            style={{ margin: "0 auto 12px", opacity: 0.3 }}
          />
          <p>Nenhum documento enviado ainda.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              marginTop: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: NAVY,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              ...j,
            }}
          >
            <Plus size={15} />
            Adicionar primeiro documento
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: docAtivo ? "280px 1fr" : "1fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* Lista */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {documentos.map((doc) => {
              const isActive = docAtivo?.documentoId === doc.documentoId;
              return (
                <button
                  key={doc.documentoId}
                  onClick={() => setDocAtivo(isActive ? null : doc)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `1px solid ${isActive ? ROYAL : "rgba(12,26,61,0.08)"}`,
                    background: isActive ? "#EFF6FF" : "white",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    <DocIcon mimeType={doc.mimeType} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        color: isActive ? ROYAL : NAVY,
                        fontSize: 13,
                        ...j,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.nome}
                    </p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", ...j, marginTop: 2 }}>
                      {doc.tipo.replace(/_/g, " ")} · {formatDate(doc.criadoEm)}
                    </p>
                    {doc.vencimento && (
                      <p style={{ fontSize: 11, color: AMBER, ...j }}>
                        Vence: {formatDate(doc.vencimento)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Viewer */}
          {docAtivo && (
            <div style={card}>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(12,26,61,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, color: NAVY, fontSize: 14, ...j }}>
                    {docAtivo.nome}
                  </p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>
                    {docAtivo.tipo.replace(/_/g, " ")}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {docAtivo.url?.startsWith("http") && (
                    <a
                      href={docAtivo.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: "1px solid rgba(12,26,61,0.15)",
                        background: "white",
                        color: NAVY,
                        fontWeight: 600,
                        fontSize: 12,
                        padding: "6px 12px",
                        borderRadius: 8,
                        textDecoration: "none",
                      }}
                    >
                      <Download size={13} />
                      Baixar
                    </a>
                  )}
                  <button
                    onClick={() => setDocAtivo(null)}
                    style={{
                      border: "none",
                      background: "#F3F4F6",
                      borderRadius: 8,
                      padding: "6px",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <X size={14} color="#6B7280" />
                  </button>
                </div>
              </div>
              <div style={{ padding: 16 }}>{renderViewer(docAtivo)}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Tab: Financeiro ──────────────────────────────────────────────────────────
function TabFinanceiroContent({
  obra,
  role,
}: {
  obra: Obra;
  role: string | null;
}) {
  const etapas = obra.etapas ?? [];
  const credito = obra.credito;
  const totalComprometido = etapas.reduce(
    (s, e) => s + Number(e.valorLiberacao),
    0
  );
  const totalLiberado = etapas
    .filter((e) => e.status === "CONCLUIDA" || e.status === "APROVADA")
    .reduce((s, e) => s + Number(e.valorLiberacao), 0);
  const ltv = credito
    ? (Number(credito.valorLiberado) / Number(credito.valorAprovado)) * 100
    : 0;

  const isPrivileged =
    role && ["ADMIN", "GESTOR"].includes(role);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Simplified view for TOMADOR/CONSTRUTOR */}
      {!isPrivileged && credito && (
        <div style={{ ...card, padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <div
              style={{ background: "#EFF6FF", borderRadius: 10, padding: 8, display: "flex" }}
            >
              <Banknote size={18} color={ROYAL} />
            </div>
            <h3 style={{ fontWeight: 700, color: NAVY, fontSize: 16, ...j }}>
              Resumo Financeiro
            </h3>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ ...card, padding: 16, overflow: "visible" }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Crédito Total</p>
              <p style={{ fontWeight: 800, color: NAVY, fontSize: 20, ...bc }}>
                {formatBRL(Number(credito.valorAprovado))}
              </p>
            </div>
            <div style={{ ...card, padding: 16, overflow: "visible" }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Liberado</p>
              <p style={{ fontWeight: 800, color: "#16a34a", fontSize: 20, ...bc }}>
                {formatBRL(Number(credito.valorLiberado))}
              </p>
            </div>
            <div style={{ ...card, padding: 16, overflow: "visible" }}>
              <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>Saldo</p>
              <p style={{ fontWeight: 800, color: ROYAL, fontSize: 20, ...bc }}>
                {formatBRL(
                  Number(credito.valorAprovado) - Number(credito.valorLiberado)
                )}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 12, ...j }}>
              Tranches por Etapa
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {etapas.map((e) => {
                const done = e.status === "CONCLUIDA" || e.status === "APROVADA";
                return (
                  <div
                    key={e.etapaId ?? e.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: done ? "#F0FDF4" : "#F9FAFB",
                      border: `1px solid ${done ? "#BBF7D0" : "#F3F4F6"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {done ? (
                        <CheckCircle2 size={15} color="#16a34a" />
                      ) : (
                        <Clock size={15} color="#9CA3AF" />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, ...j }}>
                        {e.nome}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: done ? "#16a34a" : "#6B7280",
                        ...j,
                      }}
                    >
                      {formatBRL(Number(e.valorLiberacao))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full view for ADMIN/GESTOR */}
      {isPrivileged && (
        <>
          {/* Alerta LTV */}
          {ltv > 80 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 12,
                padding: "12px 16px",
                ...j,
              }}
            >
              <AlertTriangle size={18} color={RED} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: RED, fontWeight: 600 }}>
                Atenção: LTV acima de 80% ({ltv.toFixed(1)}%) — risco elevado de
                inadimplência.
              </p>
            </div>
          )}

          {/* Crédito completo */}
          {credito && (
            <div style={{ ...card, padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    background: "#EFF6FF",
                    borderRadius: 10,
                    padding: 8,
                    display: "flex",
                  }}
                >
                  <Shield size={18} color={ROYAL} />
                </div>
                <h3 style={{ fontWeight: 700, color: NAVY, fontSize: 16, ...j }}>
                  Crédito Completo
                </h3>
                <span
                  style={{
                    marginLeft: "auto",
                    background: credito.status === "ATIVO" ? "#F0FDF4" : "#F3F4F6",
                    color: credito.status === "ATIVO" ? "#16a34a" : "#6B7280",
                    fontWeight: 600,
                    fontSize: 12,
                    padding: "3px 10px",
                    borderRadius: 20,
                    ...j,
                  }}
                >
                  {credito.status}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                {[
                  { label: "Valor Aprovado", value: formatBRL(Number(credito.valorAprovado)), color: NAVY },
                  { label: "Liberado", value: formatBRL(Number(credito.valorLiberado)), color: "#16a34a" },
                  ...(credito.taxaMensal !== undefined
                    ? [{ label: "Taxa Mensal", value: `${credito.taxaMensal}%`, color: ROYAL }]
                    : []),
                  ...(credito.prazoMeses !== undefined
                    ? [{ label: "Prazo", value: `${credito.prazoMeses} meses`, color: "#7C3AED" }]
                    : []),
                ].map((k) => (
                  <div key={k.label}>
                    <p style={{ fontSize: 12, color: "#9CA3AF", ...j }}>{k.label}</p>
                    <p
                      style={{
                        fontWeight: 800,
                        color: k.color,
                        fontSize: 20,
                        ...bc,
                      }}
                    >
                      {k.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* LTV bar */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#6B7280",
                    marginBottom: 6,
                    ...j,
                  }}
                >
                  <span>LTV (Loan-to-Value)</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: ltv > 80 ? RED : "#16a34a",
                    }}
                  >
                    {ltv.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#F3F4F6",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(ltv, 100)}%`,
                      background: ltv > 80 ? RED : ROYAL,
                      borderRadius: 8,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tabela etapas */}
          <div style={{ ...card, padding: 0 }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(12,26,61,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{ fontWeight: 700, color: NAVY, fontSize: 15, ...j }}
              >
                Cronograma Financeiro de Liberações
              </h3>
            </div>
            <div>
              {etapas.length === 0 ? (
                <p style={{ padding: 24, color: "#9CA3AF", fontSize: 13, ...j }}>
                  Nenhuma etapa cadastrada.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["#", "Etapa", "% Obra", "Valor Liberação", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 16px",
                              textAlign: "left",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#9CA3AF",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              ...j,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {etapas.map((e, i) => (
                      <tr
                        key={e.etapaId ?? e.id}
                        style={{
                          borderTop: i > 0 ? "1px solid #F3F4F6" : "none",
                          background:
                            e.status === "CONCLUIDA" || e.status === "APROVADA"
                              ? "#F0FDF4"
                              : "white",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "#9CA3AF",
                            fontWeight: 700,
                            ...j,
                          }}
                        >
                          {e.ordem}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            fontWeight: 600,
                            color: NAVY,
                            ...j,
                          }}
                        >
                          {e.nome}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "#6B7280",
                            ...j,
                          }}
                        >
                          {e.percentualObra}%
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            fontWeight: 700,
                            color:
                              e.status === "CONCLUIDA" || e.status === "APROVADA"
                                ? "#16a34a"
                                : NAVY,
                            ...j,
                          }}
                        >
                          {formatBRL(Number(e.valorLiberacao))}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <StatusBadge status={e.status} map={ETAPA_STATUS} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #E5E7EB", background: "#F9FAFB" }}>
                      <td colSpan={3} style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: NAVY, ...j }}>
                          Totais
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div>
                          <p style={{ fontSize: 11, color: "#9CA3AF", ...j }}>
                            Comprometido
                          </p>
                          <p style={{ fontWeight: 800, color: NAVY, ...j }}>
                            {formatBRL(totalComprometido)}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div>
                          <p style={{ fontSize: 11, color: "#9CA3AF", ...j }}>
                            Liberado
                          </p>
                          <p style={{ fontWeight: 800, color: "#16a34a", ...j }}>
                            {formatBRL(totalLiberado)}
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {!credito && (
        <div
          style={{
            ...card,
            padding: 48,
            textAlign: "center",
            color: "#9CA3AF",
            ...j,
          }}
        >
          <Banknote size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p>Nenhum crédito vinculado a esta obra.</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Histórico ───────────────────────────────────────────────────────────
function TabHistoricoContent({
  obraId,
  etapas,
}: {
  obraId: string;
  etapas: Etapa[];
}) {
  const [filtro, setFiltro] = useState<
    "tudo" | "aprovacoes" | "documentos" | "financeiro"
  >("tudo");

  // Build events from local etapa data (enrich from API if available)
  const eventos: HistoricoEvento[] = etapas
    .filter((e) => e.dataConclusaoReal)
    .map((e) => ({
      id: e.etapaId ?? e.id ?? Math.random().toString(),
      tipo: "aprovacoes",
      descricao: `Etapa "${e.nome}" concluída`,
      criadoEm: e.dataConclusaoReal!,
    }));

  // Add creation event
  const eventosOrdenados = [...eventos].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );

  const filtrados =
    filtro === "tudo"
      ? eventosOrdenados
      : eventosOrdenados.filter((e) => e.tipo === filtro);

  const tipoIcon = (tipo: string) => {
    if (tipo === "aprovacoes") return <CheckCircle2 size={16} color="#16a34a" />;
    if (tipo === "documentos") return <FileText size={16} color={ROYAL} />;
    if (tipo === "financeiro") return <Banknote size={16} color="#7C3AED" />;
    return <Activity size={16} color="#6B7280" />;
  };

  const tipoColor = (tipo: string) => {
    if (tipo === "aprovacoes") return { color: "#16a34a", bg: "#F0FDF4" };
    if (tipo === "documentos") return { color: ROYAL, bg: "#EFF6FF" };
    if (tipo === "financeiro") return { color: "#7C3AED", bg: "#F5F3FF" };
    return { color: "#6B7280", bg: "#F3F4F6" };
  };

  const filtroOptions = [
    { key: "tudo", label: "Tudo" },
    { key: "aprovacoes", label: "Aprovações" },
    { key: "documentos", label: "Documentos" },
    { key: "financeiro", label: "Financeiro" },
  ] as const;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {filtroOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFiltro(opt.key)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: `1px solid ${filtro === opt.key ? NAVY : "rgba(12,26,61,0.12)"}`,
              background: filtro === opt.key ? NAVY : "white",
              color: filtro === opt.key ? "white" : "#6B7280",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              ...j,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div
          style={{
            ...card,
            padding: 48,
            textAlign: "center",
            color: "#9CA3AF",
            ...j,
          }}
        >
          <Activity size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p>Nenhum evento encontrado para este filtro.</p>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Timeline line */}
          <div
            style={{
              position: "absolute",
              left: 19,
              top: 24,
              bottom: 0,
              width: 2,
              background: "#F3F4F6",
              zIndex: 0,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {filtrados.map((ev, i) => {
              const tc = tipoColor(ev.tipo);
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "flex",
                    gap: 16,
                    paddingBottom: i < filtrados.length - 1 ? 20 : 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: tc.bg,
                      border: `2px solid ${tc.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {tipoIcon(ev.tipo)}
                  </div>

                  {/* Content */}
                  <div
                    style={{
                      flex: 1,
                      ...card,
                      padding: "12px 16px",
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <p style={{ fontWeight: 600, color: NAVY, fontSize: 13, ...j }}>
                        {ev.descricao}
                      </p>
                      <span style={{ fontSize: 11, color: "#9CA3AF", ...j, whiteSpace: "nowrap" }}>
                        {formatDateTime(ev.criadoEm)}
                      </span>
                    </div>
                    {ev.usuario && (
                      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4, ...j }}>
                        por {ev.usuario}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ObraDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const obraId = params.id;

  const [tab, setTab] = useState<
    "geral" | "etapas" | "documentos" | "financeiro" | "historico"
  >("geral");
  const [obra, setObra] = useState<Obra | null>(null);
  const [progresso, setProgresso] = useState<number>(0);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchObra = useCallback(async () => {
    try {
      const [obraData, progressoData] = await Promise.all([
        fetch(`/api/proxy/obras/${obraId}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/proxy/obras/${obraId}/progresso`)
          .then((r) => (r.ok ? r.json() : 0))
          .catch(() => 0),
      ]);
      if (!obraData) {
        router.replace("/dashboard/obras");
        return;
      }
      setObra(obraData);
      setProgresso(progressoData ?? 0);
    } catch {
      router.replace("/dashboard/obras");
    }
  }, [obraId, router]);

  const fetchDocumentos = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/proxy/documentos/obra/${obraId}`
      );
      if (res.ok) {
        const data = await res.json();
        setDocumentos(Array.isArray(data) ? data : data?.items ?? []);
      }
    } catch {
      // silently fail
    }
  }, [obraId]);

  const fetchRole = useCallback(async () => {
    try {
      // Read from layout's sessionStorage cache first — avoids a duplicate /api/auth/me call
      const raw = sessionStorage.getItem("imobi_auth");
      if (raw) {
        const { d, ts } = JSON.parse(raw);
        if (Date.now() - ts < 5 * 60 * 1000 && d?.authenticated) { setRole(d.role); return; }
      }
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = (await res.json()) as { authenticated: boolean; role: string };
        if (data.authenticated) setRole(data.role);
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    // Fetch obra, role AND documentos in parallel on mount — no waiting for tab change
    Promise.all([fetchObra(), fetchRole(), fetchDocumentos()]).finally(() => setLoading(false));
  }, [fetchObra, fetchRole, fetchDocumentos]);

  const tabs = [
    { key: "geral" as const, label: "Visão Geral" },
    { key: "etapas" as const, label: "Etapas" },
    { key: "documentos" as const, label: "Documentos" },
    { key: "financeiro" as const, label: "Financeiro" },
    { key: "historico" as const, label: "Histórico" },
  ];

  if (loading) {
    return (
      <div style={{ maxWidth: 960, ...j }}>
        <div style={{ marginBottom: 24 }}>
          <Skeleton h={12} w="180px" />
          <div style={{ marginTop: 10 }}>
            <Skeleton h={28} w="300px" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} h={36} w="100px" />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton h={120} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} h={80} />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!obra) return null;

  const obraNome = obra.nome ?? "Obra";
  const etapas = obra.etapas ?? [];

  return (
    <div style={{ maxWidth: 960, ...j }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#9CA3AF",
          marginBottom: 6,
          ...j,
        }}
      >
        <a
          href="/dashboard/obras"
          style={{
            color: "#9CA3AF",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = ROYAL)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "#9CA3AF")
          }
        >
          <Building2 size={13} />
          Obras
        </a>
        <span>/</span>
        <span style={{ color: NAVY, fontWeight: 600 }}>{obraNome}</span>
      </div>

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              color: NAVY,
              margin: 0,
              lineHeight: 1.1,
              ...bc,
            }}
          >
            {obraNome}
          </h1>
          {obra.tipo && (
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, ...j }}>
              {obra.tipo}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push("/dashboard/obras")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid rgba(12,26,61,0.15)",
            background: "white",
            color: NAVY,
            fontWeight: 600,
            fontSize: 13,
            padding: "8px 16px",
            borderRadius: 10,
            cursor: "pointer",
            ...j,
          }}
        >
          <ChevronLeft size={15} />
          Voltar
        </button>
      </div>

      {/* Tabs nav */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid #F3F4F6",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                color: isActive ? NAVY : "#9CA3AF",
                borderBottom: `2px solid ${isActive ? MINT : "transparent"}`,
                marginBottom: -2,
                whiteSpace: "nowrap",
                transition: "color 0.15s",
                ...j,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "geral" && (
        <TabGeralContent obra={obra} progresso={progresso} role={role} />
      )}
      {tab === "etapas" && (
        <TabEtapasContent
          obra={obra}
          role={role}
          obraId={obraId}
          onRefresh={fetchObra}
        />
      )}
      {tab === "documentos" && (
        <TabDocumentosContent
          documentos={documentos}
          obraId={obraId}
          onRefresh={fetchDocumentos}
        />
      )}
      {tab === "financeiro" && (
        <TabFinanceiroContent obra={obra} role={role} />
      )}
      {tab === "historico" && (
        <TabHistoricoContent obraId={obraId} etapas={etapas} />
      )}
    </div>
  );
}
