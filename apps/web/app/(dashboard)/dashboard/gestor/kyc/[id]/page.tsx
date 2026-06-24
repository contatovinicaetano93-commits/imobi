"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { managerApi, type KycPendente, type KycAuditEntry } from "@/lib/api";
import { ApprovalAuditTrail } from "@/components/dashboard/ApprovalAuditTrail";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import Image from "next/image";
import { Eye } from "lucide-react";

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
  const [doc, setDoc] = useState<KycPendente | null>(null);
  const [auditLogs, setAuditLogs] = useState<KycAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

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

  if (loading) {
    return <PageSkeleton variant="detail" />;
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{doc.usuario.nome}</h1>
          <p className="text-gray-500 text-sm mt-1">{getTipoLabel(doc.tipo)}</p>
          <p className="text-xs text-blue-700 mt-2 font-medium">
            Visualização somente leitura — aprovação de KYC é feita pelo Admin.
          </p>
        </div>
        <Link
          href="/dashboard/gestor/kyc"
          className="text-[#1B4FD8] hover:text-blue-700 text-sm font-semibold shrink-0"
        >
          ← Voltar
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-600" />
              Acompanhamento
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="bg-purple-50 rounded-lg p-3 text-purple-900">
                <span className="font-semibold">Tipo:</span> {getTipoLabel(doc.tipo)}
              </div>
              <p>
                Como gestor do fundo, você monitora a fila de documentos sem poder aprovar ou rejeitar.
              </p>
              <p className="text-xs text-gray-500">
                Escale inconsistências ao time Admin pelo canal interno.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Checklist de referência</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>☐ Documento legível</p>
              <p>☐ Dentro da validade</p>
              <p>☐ Dados compatíveis com cadastro</p>
              <p>☐ Selfie com rosto visível</p>
            </div>
          </div>
        </div>
      </div>

      <ApprovalAuditTrail
        auditLogs={auditLogs}
        loading={auditLoading}
        error={auditError}
      />
    </div>
  );
}
