"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { managerApi, type KycPendente } from "@/lib/api";
import { KycBatchActions } from "@/components/dashboard/KycBatchActions";
import { useUserRole } from "@/hooks/use-user-role";

// ── Helpers ────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function tempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days !== 1 ? "s" : ""}`;
}

function getTipoLabel(tipo: string): string {
  const map: Record<string, string> = {
    RG: "RG / CNH",
    SELFIE: "Selfie",
    COMPROVANTE: "Comprovante de Endereço",
  };
  return map[tipo] ?? tipo;
}

// ── Types ──────────────────────────────────────────────────────────────

type DocStatus = "PENDENTE" | "EM_VERIFICACAO" | "APROVADO" | "REJEITADO";

type DocWithStatus = KycPendente & {
  _localStatus: DocStatus;
};

type TipoFilter = "TODOS" | "RG" | "SELFIE" | "COMPROVANTE";
type StatusFilter = "TODOS" | "PENDENTE" | "EM_VERIFICACAO";

// ── Demo data ──────────────────────────────────────────────────────────

const DEMO_DOCS: DocWithStatus[] = [
  {
    kycDocumentoId: "demo-001",
    tipo: "RG",
    url: "https://placehold.co/600x400?text=RG+Frente",
    criadoEm: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    _localStatus: "PENDENTE",
    usuario: {
      usuarioId: "u-001",
      nome: "Carlos Eduardo Mendes",
      email: "carlos.mendes@email.com",
      cpf: "123.456.789-00",
      kycStatus: "PARCIAL",
    },
  },
  {
    kycDocumentoId: "demo-002",
    tipo: "SELFIE",
    url: "https://placehold.co/400x400?text=Selfie",
    criadoEm: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    _localStatus: "EM_VERIFICACAO",
    usuario: {
      usuarioId: "u-002",
      nome: "Fernanda Rodrigues Lima",
      email: "fernanda.lima@email.com",
      cpf: "987.654.321-11",
      kycStatus: "PENDENTE",
    },
  },
  {
    kycDocumentoId: "demo-003",
    tipo: "COMPROVANTE",
    url: "https://placehold.co/600x800?text=Comprovante",
    criadoEm: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    _localStatus: "PENDENTE",
    usuario: {
      usuarioId: "u-003",
      nome: "Roberto Alves Santos",
      email: "roberto.santos@construtora.com",
      cpf: "456.789.123-22",
      kycStatus: "PARCIAL",
    },
  },
  {
    kycDocumentoId: "demo-004",
    tipo: "RG",
    url: "https://placehold.co/600x400?text=CNH",
    criadoEm: new Date(Date.now() - 51 * 3600 * 1000).toISOString(),
    _localStatus: "EM_VERIFICACAO",
    usuario: {
      usuarioId: "u-004",
      nome: "Mariana Costa Ferreira",
      email: "mariana.ferreira@obra.net",
      cpf: "321.654.987-33",
      kycStatus: "PENDENTE",
    },
  },
  {
    kycDocumentoId: "demo-005",
    tipo: "SELFIE",
    url: "https://placehold.co/400x400?text=Selfie+2",
    criadoEm: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    _localStatus: "PENDENTE",
    usuario: {
      usuarioId: "u-005",
      nome: "João Paulo Nascimento",
      email: "joao.nascimento@email.com.br",
      cpf: "654.321.987-44",
      kycStatus: "PENDENTE",
    },
  },
];

// ── Skeleton ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-5 h-5 bg-gray-200 rounded shrink-0 mt-0.5" />
        <div className="w-1 h-14 bg-gray-200 rounded-full shrink-0" />
        <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/5" />
          <div className="h-3 bg-gray-200 rounded w-3/5" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="w-24 h-9 bg-gray-200 rounded-lg" />
          <div className="w-20 h-9 bg-gray-200 rounded-lg" />
          <div className="w-20 h-9 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg: Record<DocStatus, { label: string; className: string }> = {
    PENDENTE: {
      label: "Pendente",
      className: "bg-yellow-100 text-yellow-800",
    },
    EM_VERIFICACAO: {
      label: "Em verificação",
      className: "bg-blue-100 text-blue-800",
    },
    APROVADO: {
      label: "Aprovado",
      className: "bg-green-100 text-green-800",
    },
    REJEITADO: {
      label: "Rejeitado",
      className: "bg-red-100 text-red-800",
    },
  };
  const c = cfg[status];
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c.className}`}>
      {c.label}
    </span>
  );
}

// ── Reject Modal ───────────────────────────────────────────────────────

function RejectModal({
  docId,
  nomeUsuario,
  onConfirm,
  onCancel,
}: {
  docId: string;
  nomeUsuario: string;
  onConfirm: (docId: string, motivo: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!motivo.trim()) return;
    setSubmitting(true);
    await onConfirm(docId, motivo.trim());
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Motivo da rejeição</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Informe o motivo para rejeitar o documento de{" "}
          <span className="font-medium text-gray-900">{nomeUsuario}</span>.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: Documento ilegível, foto fora de foco, dados divergentes..."
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          disabled={submitting}
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!motivo.trim() || submitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Rejeitando..." : "Confirmar rejeição"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal ──────────────────────────────────────────────────────

function PreviewModal({
  doc,
  onClose,
}: {
  doc: DocWithStatus;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {getTipoLabel(doc.tipo)}
            </h2>
            <p className="text-sm text-gray-500">{doc.usuario.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
          <img
            src={doc.url}
            alt={`Documento ${getTipoLabel(doc.tipo)} de ${doc.usuario.nome}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/600x400?text=Documento+indisponivel";
            }}
          />
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document Card ──────────────────────────────────────────────────────

function DocCard({
  doc,
  isSelected,
  onSelect,
  onApprove,
  onRejectClick,
  onPreview,
  canAct,
}: {
  doc: DocWithStatus;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onRejectClick: (doc: DocWithStatus) => void;
  onPreview: (doc: DocWithStatus) => void;
  canAct: boolean;
}) {
  const diffH = Math.floor(
    (Date.now() - new Date(doc.criadoEm).getTime()) / 3600000
  );
  const urgente = diffH >= 48;
  const alerta = diffH >= 24 && diffH < 48;
  const isResolved =
    doc._localStatus === "APROVADO" || doc._localStatus === "REJEITADO";

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
        isSelected
          ? "border-blue-300 bg-blue-50/40"
          : isResolved
            ? "border-gray-100 opacity-60"
            : "border-gray-100 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-4">
        {canAct && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(doc.kycDocumentoId)}
          className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
          disabled={isResolved}
          aria-label={`Selecionar documento de ${doc.usuario.nome}`}
        />
        )}

        {/* Urgency strip */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            urgente
              ? "bg-red-500"
              : alerta
                ? "bg-yellow-400"
                : "bg-green-400"
          }`}
        />

        {/* Avatar */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            urgente
              ? "bg-red-100 text-red-700"
              : alerta
                ? "bg-yellow-100 text-yellow-700"
                : "bg-blue-100 text-blue-700"
          }`}
        >
          {getInitials(doc.usuario.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 leading-tight">
                {doc.usuario.nome}
              </p>
              <p className="text-xs text-gray-500">{doc.usuario.email}</p>
            </div>
            <StatusBadge status={doc._localStatus} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {getTipoLabel(doc.tipo)}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              CPF {doc.usuario.cpf}
            </span>
            <span
              className={`font-medium ${
                urgente
                  ? "text-red-600"
                  : alerta
                    ? "text-yellow-600"
                    : "text-gray-500"
              }`}
            >
              {tempoRelativo(doc.criadoEm)}
            </span>
          </div>

          {urgente && (
            <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Aguardando há mais de 48h
            </div>
          )}
        </div>

        {/* Actions */}
        {!isResolved ? (
          <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => onPreview(doc)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Ver documento
            </button>
            {canAct && (
            <>
            <button
              onClick={() => onApprove(doc.kycDocumentoId)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Aprovar
            </button>
            <button
              onClick={() => onRejectClick(doc)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Rejeitar
            </button>
            </>
            )}
          </div>
        ) : (
          <div className="shrink-0">
            <Link
              href={`/dashboard/gestor/kyc/${doc.kycDocumentoId}`}
              className="text-xs text-blue-600 hover:underline"
            >
              Ver detalhe
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export default function KycPage() {
  const { canAprovarKyc, isGestorFundoMonitor } = useUserRole();
  const [docs, setDocs] = useState<DocWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("TODOS");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("TODOS");
  const [page, setPage] = useState(0);

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocWithStatus | null>(null);
  const [rejectDoc, setRejectDoc] = useState<DocWithStatus | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  }, []);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await managerApi.listarKycPendentes(100, 0);
      setDocs(
        result.documentos.map((d) => ({
          ...d,
          _localStatus: "PENDENTE" as DocStatus,
        }))
      );
      setIsDemo(false);
    } catch {
      setDocs(DEMO_DOCS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    setSelectedDocs([]);
  }, [searchQuery, tipoFilter, statusFilter]);

  // ── Filtering ──────────────────────────────────────────────────────

  const filtered = docs.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      doc.usuario.nome.toLowerCase().includes(q) ||
      doc.usuario.email.toLowerCase().includes(q) ||
      doc.usuario.cpf.includes(q);

    const matchTipo = tipoFilter === "TODOS" || doc.tipo === tipoFilter;

    const matchStatus =
      statusFilter === "TODOS" || doc._localStatus === statusFilter;

    return matchSearch && matchTipo && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageDocs = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );

  const pendingCount = docs.filter(
    (d) => d._localStatus === "PENDENTE" || d._localStatus === "EM_VERIFICACAO"
  ).length;

  // ── Individual actions ─────────────────────────────────────────────

  const handleApprove = useCallback(async (docId: string) => {
    // Optimistic update
    setDocs((prev) =>
      prev.map((d) =>
        d.kycDocumentoId === docId ? { ...d, _localStatus: "APROVADO" as DocStatus } : d
      )
    );
    setSelectedDocs((prev) => prev.filter((id) => id !== docId));
    try {
      await fetch(`/api/proxy/manager/kyc/${docId}/aprovar`, { method: "PATCH" });
      showSuccess("Documento aprovado com sucesso.");
    } catch {
      // Rollback on real API failure (demo mode: always succeeds)
      setDocs((prev) =>
        prev.map((d) =>
          d.kycDocumentoId === docId
            ? { ...d, _localStatus: "PENDENTE" as DocStatus }
            : d
        )
      );
      showError("Erro ao aprovar documento. Tente novamente.");
    }
  }, [showSuccess, showError]);

  const handleRejectConfirm = useCallback(
    async (docId: string, motivo: string) => {
      setRejectDoc(null);
      // Optimistic update
      setDocs((prev) =>
        prev.map((d) =>
          d.kycDocumentoId === docId
            ? { ...d, _localStatus: "REJEITADO" as DocStatus }
            : d
        )
      );
      setSelectedDocs((prev) => prev.filter((id) => id !== docId));
      try {
        await fetch(`/api/proxy/manager/kyc/${docId}/rejeitar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo }),
        });
        showSuccess("Documento rejeitado.");
      } catch {
        // Rollback on real API failure
        setDocs((prev) =>
          prev.map((d) =>
            d.kycDocumentoId === docId
              ? { ...d, _localStatus: "PENDENTE" as DocStatus }
              : d
          )
        );
        showError("Erro ao rejeitar documento. Tente novamente.");
      }
    },
    [showSuccess, showError]
  );

  // ── Batch actions callbacks ────────────────────────────────────────

  const handleBulkSuccess = useCallback(() => {
    setDocs((prev) =>
      prev.map((d) =>
        selectedDocs.includes(d.kycDocumentoId)
          ? { ...d, _localStatus: "APROVADO" as DocStatus }
          : d
      )
    );
    showSuccess(`${selectedDocs.length} documento(s) aprovado(s) com sucesso!`);
    setSelectedDocs([]);
  }, [selectedDocs, showSuccess]);

  const handleBulkError = useCallback(
    (msg: string) => {
      showError(msg);
    },
    [showError]
  );

  // ── Selection helpers ──────────────────────────────────────────────

  const activePageDocIds = pageDocs
    .filter((d) => d._localStatus !== "APROVADO" && d._localStatus !== "REJEITADO")
    .map((d) => d.kycDocumentoId);

  const allPageSelected =
    activePageDocIds.length > 0 &&
    activePageDocIds.every((id) => selectedDocs.includes(id));

  const handleToggleAll = () => {
    if (allPageSelected) {
      setSelectedDocs((prev) => prev.filter((id) => !activePageDocIds.includes(id)));
    } else {
      setSelectedDocs((prev) => [
        ...prev,
        ...activePageDocIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const handleSelectDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Urgency badge ──────────────────────────────────────────────────

  const badgeColor =
    pendingCount > 10
      ? "bg-red-100 text-red-800"
      : pendingCount > 3
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800";

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-32">
      {/* Toast messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-green-800 text-sm font-medium">{successMsg}</p>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-green-500 hover:text-green-700"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-red-800 text-sm font-medium">{errorMsg}</p>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-700"
            aria-label="Fechar erro"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {isGestorFundoMonitor ? "Monitoramento de KYC" : "Análise de KYC"}
            </h1>
            {!loading && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}
              >
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {canAprovarKyc
              ? "Analise e aprove ou rejeite documentos enviados pelos usuários"
              : "Acompanhe a fila de KYC — liberação é feita pelo admin"}
            {isDemo && (
              <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Modo demo
              </span>
            )}
          </p>
        </div>

        <button
          onClick={loadDocs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tipo filter */}
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="RG">RG / CNH</option>
          <option value="SELFIE">Selfie</option>
          <option value="COMPROVANTE">Comprovante</option>
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="TODOS">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_VERIFICACAO">Em verificação</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">
            {searchQuery || tipoFilter !== "TODOS" || statusFilter !== "TODOS"
              ? "Nenhum documento encontrado"
              : "Nenhum documento KYC pendente"}
          </p>
          <p className="text-gray-500 text-sm">
            {searchQuery || tipoFilter !== "TODOS" || statusFilter !== "TODOS"
              ? "Tente ajustar os filtros para encontrar o que procura."
              : "Todos os documentos foram analisados."}
          </p>
          {(searchQuery || tipoFilter !== "TODOS" || statusFilter !== "TODOS") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setTipoFilter("TODOS");
                setStatusFilter("TODOS");
              }}
              className="mt-4 text-sm text-blue-600 hover:underline font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select-all toolbar */}
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={handleToggleAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                title="Selecionar todos desta página"
                aria-label="Selecionar todos os documentos desta página"
              />
              <span className="text-sm text-gray-600">
                {selectedDocs.length === 0
                  ? `${filtered.length} documento${filtered.length !== 1 ? "s" : ""}`
                  : `${selectedDocs.length} selecionado${selectedDocs.length !== 1 ? "s" : ""} de ${filtered.length}`}
              </span>
            </div>
            {selectedDocs.length > 0 && (
              <button
                onClick={() => setSelectedDocs([])}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Limpar seleção
              </button>
            )}
          </div>

          {/* Document cards */}
          {pageDocs.map((doc) => (
            <DocCard
              key={doc.kycDocumentoId}
              doc={doc}
              isSelected={selectedDocs.includes(doc.kycDocumentoId)}
              onSelect={handleSelectDoc}
              onApprove={handleApprove}
              onRejectClick={setRejectDoc}
              onPreview={setPreviewDoc}
              canAct={canAprovarKyc}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Página {safePage + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch actions (fixed bottom bar) */}
      {canAprovarKyc && (
      <KycBatchActions
        selectedDocs={selectedDocs}
        onSuccess={handleBulkSuccess}
        onError={handleBulkError}
        isDisabled={loading}
      />
      )}

      {/* Preview modal */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {/* Reject modal */}
      {rejectDoc && (
        <RejectModal
          docId={rejectDoc.kycDocumentoId}
          nomeUsuario={rejectDoc.usuario.nome}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectDoc(null)}
        />
      )}
    </div>
  );
}
