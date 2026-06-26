"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { managerApi, type KycPendente } from "@/lib/api";
import { AdminSubpageHeader } from "@/app/(dashboard)/_components/admin/AdminSubpageHeader";
import { GestorSubpageHeader } from "@/app/(dashboard)/_components/gestor/GestorSubpageHeader";
import { ManagerListBanner } from "@/app/(dashboard)/_components/gestor/ManagerListBanner";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import { resolveKycDocumentUrl } from "@/lib/kyc-document-url";
import { kycDetailHref, type KycFilaContext } from "./kyc-fila-types";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";
import type { DashboardPanelDef } from "@/components/dashboard/DashboardPanelShell";

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
    RG_FRENTE: "RG — Frente",
    RG_VERSO: "RG — Verso",
    RG: "RG / CNH",
    SELFIE: "Selfie",
    COMPROVANTE: "Comprovante de Endereço",
  };
  return map[tipo] ?? tipo;
}

type TipoFilter = "TODOS" | "RG_FRENTE" | "RG_VERSO" | "SELFIE" | "COMPROVANTE";

function KycListSkeleton() {
  return <PageSkeleton variant="list" count={3} showHeader={false} />;
}

function RejectModal({
  doc,
  onConfirm,
  onCancel,
}: {
  doc: KycPendente;
  onConfirm: (docId: string, motivo: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!motivo.trim()) return;
    setSubmitting(true);
    await onConfirm(doc.kycDocumentoId, motivo.trim());
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Motivo da rejeição</h2>
        <p className="text-sm text-gray-600 mb-4">
          Documento de <span className="font-medium">{doc.usuario.nome}</span>
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: documento ilegível, expirado..."
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={submitting}
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!motivo.trim() || submitting}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? "Rejeitando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({
  doc,
  onClose,
  context,
}: {
  doc: KycPendente;
  onClose: () => void;
  context: KycFilaContext;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{getTipoLabel(doc.tipo)}</h2>
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
            src={resolveKycDocumentUrl(doc)}
            alt={`Documento ${getTipoLabel(doc.tipo)} de ${doc.usuario.nome}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/600x400?text=Documento+indisponivel";
            }}
          />
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Link
            href={kycDetailHref(context, doc.kycDocumentoId)}
            className="px-4 py-2 bg-[#1B4FD8] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            Abrir detalhe
          </Link>
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

function DocCard({
  doc,
  onPreview,
  canApprove,
  onApprove,
  onRejectClick,
  context,
}: {
  doc: KycPendente;
  onPreview: (doc: KycPendente) => void;
  canApprove: boolean;
  onApprove: (id: string) => void;
  onRejectClick: (doc: KycPendente) => void;
  context: KycFilaContext;
}) {
  const diffH = Math.floor(
    (Date.now() - new Date(doc.criadoEm).getTime()) / 3600000
  );
  const urgente = diffH >= 48;
  const alerta = diffH >= 24 && diffH < 48;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          className={`w-1 self-stretch rounded-full shrink-0 ${
            urgente ? "bg-red-500" : alerta ? "bg-yellow-400" : "bg-green-400"
          }`}
        />

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

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{doc.usuario.nome}</p>
              <p className="text-xs text-gray-500">{doc.usuario.email}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-800">
              Pendente
            </span>
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
                urgente ? "text-red-600" : alerta ? "text-yellow-600" : "text-gray-500"
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

        <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => onPreview(doc)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver documento
          </button>
          <Link
            href={kycDetailHref(context, doc.kycDocumentoId)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#1B4FD8] text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Detalhe
          </Link>
          {canApprove && (
            <>
              <button
                type="button"
                onClick={() => onApprove(doc.kycDocumentoId)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => onRejectClick(doc)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejeitar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 5;

export function KycFilaClient({ context }: { context: KycFilaContext }) {
  const { success, error: toastError } = useToast();
  const canApprove = context === "admin";

  const [docs, setDocs] = useState<KycPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("TODOS");
  const [page, setPage] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<KycPendente | null>(null);
  const [rejectDoc, setRejectDoc] = useState<KycPendente | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await managerApi.listarKycPendentes(100, 0);
      setDocs(result.documentos);
    } catch {
      setDocs([]);
      setLoadError("Não foi possível carregar documentos KYC da API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, tipoFilter]);

  const filtered = docs.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      doc.usuario.nome.toLowerCase().includes(q) ||
      doc.usuario.email.toLowerCase().includes(q) ||
      doc.usuario.cpf.includes(q);
    const matchTipo = tipoFilter === "TODOS" || doc.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageDocs = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const pendingCount = docs.length;

  const badgeColor =
    pendingCount > 10
      ? "bg-red-100 text-red-800"
      : pendingCount > 3
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800";

  const handleApprove = async (docId: string) => {
    try {
      await managerApi.aprovarKyc(docId);
      setDocs((prev) => prev.filter((d) => d.kycDocumentoId !== docId));
      success("Documento KYC aprovado.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao aprovar");
    }
  };

  const handleRejectConfirm = async (docId: string, motivo: string) => {
    setRejectDoc(null);
    try {
      await managerApi.rejeitarKyc(docId, motivo);
      setDocs((prev) => prev.filter((d) => d.kycDocumentoId !== docId));
      success("Documento KYC rejeitado.");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao rejeitar");
    }
  };

  const kycPanels: DashboardPanelDef[] = [
    ...(!canApprove ? [{ id: "kyc-orientacao", priority: "secondary" as const }] : []),
    { id: "kyc-filtros", priority: "secondary" },
    { id: "kyc-lista", priority: "primary" },
  ];

  return (
    <DashboardPanelShell
      panels={kycPanels}
      maxWidth="lg"
      beforeTabs={
        loadError ? (
          <ManagerListBanner
            variant="error"
            message={loadError}
            onRetry={loadDocs}
            retrying={loading}
          />
        ) : undefined
      }
      content={
        <>
      {context === "admin" ? (
        <AdminSubpageHeader
          title="Fila KYC — Aprovação"
          subtitle="Analise e aprove documentos pendentes no Centro de Comando"
          onRefresh={loadDocs}
          refreshing={loading}
          badge={
            !loading ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
                {pendingCount} na fila
              </span>
            ) : undefined
          }
        />
      ) : (
        <GestorSubpageHeader
          title="KYC — acompanhamento (somente leitura)"
          subtitle="KPIs operacionais do fundo — sem aprovação nem participação no processo"
          backHref="/dashboard/gestor"
          backLabel="Painel do Fundo"
          onRefresh={loadDocs}
          refreshing={loading}
          badge={
            !loading ? (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>
                {pendingCount} na fila
              </span>
            ) : undefined
          }
        />
      )}

      {!canApprove && (
        <PanelSection
          id="kyc-orientacao"
          title="Orientações"
          icon={<AlertTriangle className="w-4 h-4 text-blue-600" />}
          priority="secondary"
          summary="Visualização somente leitura — aprovação é do Admin"
        >
          <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            Como gestor do fundo, você visualiza indicadores e filas para acompanhar a operação.
            Aprovações de KYC são exclusivas do Administrador IMOBI.
          </p>
        </PanelSection>
      )}

      <PanelSection
        id="kyc-filtros"
        title="Busca e filtros"
        icon={<Search className="w-4 h-4 text-gray-500" />}
        priority="secondary"
        summary={searchQuery || tipoFilter !== "TODOS" ? "Filtros ativos" : "Todos os documentos"}
      >
      <div className="flex flex-wrap gap-3">
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

        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="TODOS">Todos os tipos</option>
          <option value="RG_FRENTE">RG — Frente</option>
          <option value="RG_VERSO">RG — Verso</option>
          <option value="SELFIE">Selfie</option>
          <option value="COMPROVANTE">Comprovante</option>
        </select>
      </div>
      </PanelSection>

      <PanelSection
        id="kyc-lista"
        title="Documentos na fila"
        icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
        priority="primary"
        badge={pendingCount > 0 ? pendingCount : undefined}
        summary={`${filtered.length} documento(s) · página ${safePage + 1}/${totalPages}`}
        urgency={pendingCount > 10 ? "warning" : "none"}
      >
      {loading ? (
        <KycListSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-100 p-14 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">
            {searchQuery || tipoFilter !== "TODOS"
              ? "Nenhum documento encontrado"
              : "Nenhum documento KYC na fila"}
          </p>
          <p className="text-gray-500 text-sm">
            {searchQuery || tipoFilter !== "TODOS"
              ? "Tente ajustar os filtros para encontrar o que procura."
              : "A fila está zerada no momento."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pageDocs.map((doc) => (
            <DocCard
              key={doc.kycDocumentoId}
              doc={doc}
              onPreview={setPreviewDoc}
              canApprove={canApprove}
              onApprove={handleApprove}
              onRejectClick={setRejectDoc}
              context={context}
            />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
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
      </PanelSection>

      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} context={context} />
      )}

      {rejectDoc && (
        <RejectModal
          doc={rejectDoc}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectDoc(null)}
        />
      )}
        </>
      }
    />
  );
}
