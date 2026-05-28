"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { managerApi, type KycPendente, type KycAuditEntry } from "@/lib/api";
import { ApprovalAuditTrail } from "@/components/dashboard/ApprovalAuditTrail";
import Image from "next/image";

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

export default function KycDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      router.push("/dashboard/gestor/kyc");
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
      await managerApi.rejeitarKyc(docId, rejectionReason);
      router.push("/dashboard/gestor/kyc");
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

  if (error || !doc) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Documento não encontrado</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">{doc.usuario.nome}</h1>
          <p className="text-gray-500 text-sm mt-1">{getTipoLabel(doc.tipo)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informações do usuário e imagem */}
        <div className="md:col-span-2 space-y-6">
          {/* Usuário */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Informações do Usuário</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nome</span>
                <span className="font-medium text-gray-900">{doc.usuario.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPF</span>
                <span className="font-mono text-gray-900">{doc.usuario.cpf}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="text-gray-900">{doc.usuario.email}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-100">
                <span className="text-gray-600">Status KYC</span>
                <span
                  className={`font-semibold ${
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
          </div>

          {/* Documento */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">{getTipoLabel(doc.tipo)}</h2>
            <div className="space-y-4">
              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <Image
                  src={doc.url}
                  alt={`Documento ${getTipoLabel(doc.tipo)}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-sm text-gray-600">
                Enviado em {formatDate(doc.criadoEm)}
              </div>
            </div>
          </div>
        </div>

        {/* Painel de ações */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Decisão</h2>
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-900">
                <span className="font-semibold">Tipo:</span> {getTipoLabel(doc.tipo)}
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  ✓ Aprovar Documento
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
                      placeholder="Motivo da rejeição (p.ex: documento ilegível, expirado, etc)"
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
            <h3 className="font-semibold text-blue-900 mb-2">Critérios</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>☐ Documento legível</p>
              <p>☐ Dentro da validade</p>
              <p>☐ Dados compatíveis com cadastro</p>
              <p>☐ Selfie com rosto visível</p>
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
    </div>
  );
}
