"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { managerApi, type KycPendente, type KycAuditEntry } from "@/lib/api";
import { ApprovalAuditTrail } from "@/components/dashboard/ApprovalAuditTrail";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import Image from "next/image";
import { ShieldCheck, User, FileText, ClipboardList, History } from "lucide-react";
import { resolveKycDocumentUrl } from "@/lib/kyc-document-url";
import { kycListHref, type KycFilaContext } from "./kyc-fila-types";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

function getTipoLabel(tipo: string): string {
  const tipos: Record<string, string> = {
    RG: "RG/CNH",
    SELFIE: "Selfie",
    COMPROVANTE: "Comprovante de endereço",
  };
  return tipos[tipo] || tipo;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function KycDetailClient({ context }: { context: KycFilaContext }) {
  const params = useParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const canApprove = context === "admin";
  const listHref = kycListHref(context);

  const [doc, setDoc] = useState<KycPendente | null>(null);
  const [auditLogs, setAuditLogs] = useState<KycAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const docId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    managerApi
      .obterKycDetalhe(docId)
      .then((data) => {
        if (!data) {
          setError("Documento não encontrado");
        } else {
          setDoc(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [docId]);

  useEffect(() => {
    setAuditLoading(true);
    managerApi
      .obterKycAuditLog(docId)
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
  }, [docId]);

  const handleApprove = async () => {
    if (!doc) return;
    setSubmitting(true);
    try {
      await managerApi.aprovarKyc(docId);
      success("Documento KYC aprovado.");
      router.push(listHref);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toastError("Forneça um motivo para a rejeição");
      return;
    }
    setSubmitting(true);
    try {
      await managerApi.rejeitarKyc(docId, rejectionReason);
      success("Documento KYC rejeitado.");
      router.push(listHref);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSubmitting(false);
    }
  };

  const panels = useMemo(
    () => [
      { id: "kyc-usuario", priority: "primary" as const },
      { id: "kyc-documento", priority: "primary" as const },
      { id: "kyc-decisao", priority: "primary" as const },
      { id: "kyc-checklist", priority: "secondary" as const },
      { id: "kyc-auditoria", priority: "secondary" as const },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="max-w-4xl p-4 sm:p-6">
        <PageSkeleton variant="detail" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-4xl space-y-4 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900">Documento não encontrado</h1>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error || "Erro ao carregar dados"}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardPanelShell
      panels={panels}
      maxWidth="md"
      content={
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{doc.usuario.nome}</h1>
              <p className="text-gray-500 text-sm mt-1">{getTipoLabel(doc.tipo)}</p>
              {!canApprove && (
                <p className="text-xs text-blue-700 mt-2 font-medium">
                  Visualização somente leitura — aprovação de KYC é feita pelo Admin.
                </p>
              )}
            </div>
            <Link
              href={listHref}
              className="text-[#1B4FD8] hover:text-blue-700 text-sm font-semibold shrink-0"
            >
              ← Voltar
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <PanelSection
                id="kyc-usuario"
                title="Informações do usuário"
                icon={<User className="w-4 h-4 text-[#1B4FD8]" />}
                priority="primary"
                summary={`${doc.usuario.cpf} · ${doc.usuario.kycStatus}`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 text-sm">Nome</span>
                    <span className="font-medium text-gray-900 text-sm text-right">{doc.usuario.nome}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 text-sm">CPF</span>
                    <span className="font-mono text-gray-900 text-sm">{doc.usuario.cpf}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 text-sm">Email</span>
                    <span className="text-gray-900 text-sm text-right break-all">{doc.usuario.email}</span>
                  </div>
                  <div className="flex justify-between gap-4 pt-3 border-t border-gray-100">
                    <span className="text-gray-600 text-sm">Status KYC</span>
                    <span
                      className={`font-semibold text-sm ${
                        doc.usuario.kycStatus === "COMPLETO"
                          ? "text-green-600"
                          : doc.usuario.kycStatus === "PARCIAL"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {doc.usuario.kycStatus}
                    </span>
                  </div>
                </div>
              </PanelSection>

              <PanelSection
                id="kyc-documento"
                title={getTipoLabel(doc.tipo)}
                icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
                priority="primary"
                summary={`Enviado em ${formatDate(doc.criadoEm)}`}
              >
                <div className="space-y-4">
                  <div className="relative w-full bg-gray-100 rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <Image
                      src={resolveKycDocumentUrl(doc)}
                      alt={`Documento ${getTipoLabel(doc.tipo)}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Enviado em {formatDate(doc.criadoEm)}
                  </p>
                </div>
              </PanelSection>
            </div>

            <div className="space-y-4">
              <PanelSection
                id="kyc-decisao"
                title={canApprove ? "Decisão" : "Acompanhamento"}
                icon={<ShieldCheck className="w-4 h-4 text-violet-600" />}
                priority="primary"
                summary={getTipoLabel(doc.tipo)}
                urgency={canApprove ? "warning" : "none"}
              >
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="bg-purple-50 rounded-lg p-3 text-purple-900">
                    <span className="font-semibold">Tipo:</span> {getTipoLabel(doc.tipo)}
                  </div>
                  {canApprove ? (
                    <div className="pt-2 border-t border-gray-100 space-y-3">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={submitting}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                      >
                        Aprovar documento
                      </button>
                      {!showRejectionForm ? (
                        <button
                          type="button"
                          onClick={() => setShowRejectionForm(true)}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-lg transition-colors"
                        >
                          Rejeitar
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Motivo da rejeição"
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleReject}
                              disabled={submitting}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg text-sm"
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowRejectionForm(false);
                                setRejectionReason("");
                              }}
                              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p>
                        Como gestor do fundo, você monitora a fila sem poder aprovar ou rejeitar.
                      </p>
                      <p className="text-xs text-gray-500">
                        Escale inconsistências ao time Admin pelo canal interno.
                      </p>
                    </>
                  )}
                </div>
              </PanelSection>

              <PanelSection
                id="kyc-checklist"
                title="Checklist de referência"
                icon={<ClipboardList className="w-4 h-4 text-blue-600" />}
                priority="secondary"
                summary="Legibilidade, validade e compatibilidade"
              >
                <div className="space-y-1 text-sm text-blue-800 bg-blue-50 rounded-xl border border-blue-100 px-4 py-3">
                  <p>☐ Documento legível</p>
                  <p>☐ Dentro da validade</p>
                  <p>☐ Dados compatíveis com cadastro</p>
                  <p>☐ Selfie com rosto visível</p>
                </div>
              </PanelSection>
            </div>
          </div>

          <PanelSection
            id="kyc-auditoria"
            title="Histórico de auditoria"
            icon={<History className="w-4 h-4 text-gray-500" />}
            priority="secondary"
            badge={auditLogs.length || undefined}
            summary={auditLoading ? "Carregando…" : `${auditLogs.length} registro(s)`}
          >
            <ApprovalAuditTrail
              auditLogs={auditLogs}
              loading={auditLoading}
              error={auditError}
            />
          </PanelSection>
        </>
      }
    />
  );
}
