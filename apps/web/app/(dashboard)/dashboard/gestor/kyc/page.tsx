"use client";

import { useEffect, useState } from "react";
import { managerApi, type KycPendente } from "@/lib/api";
import Link from "next/link";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function hoursAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
}

function getTipoLabel(tipo: string): string {
  const tipos: Record<string, string> = {
    RG: "RG/CNH",
    SELFIE: "Selfie",
    COMPROVANTE: "Comprovante de endereço",
  };
  return tipos[tipo] || tipo;
}

export default function KycPage() {
  const [data, setData] = useState<{ documentos: KycPendente[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 20;

  useEffect(() => {
    managerApi
      .listarKycPendentes(limit, offset)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [offset]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Pendentes</h1>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
          <p className="text-red-700">{error || "Erro ao carregar dados"}</p>
        </div>
      </div>
    );
  }

  const pages = Math.ceil(data.total / limit);
  const currentPage = offset / limit + 1;

  const handleSelectDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    setSelectedDocs((prev) =>
      prev.length === data.documentos.length ? [] : data.documentos.map((d) => d.kycDocumentoId)
    );
  };

  const handleBulkSuccess = () => {
    setSuccessMessage(`${selectedDocs.length} documento(s) aprovado(s) com sucesso!`);
    setSelectedDocs([]);
    setOffset(0);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const filteredDocs = data.documentos.filter(
    (doc) =>
      doc.usuario.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.usuario.cpf.includes(searchQuery) ||
      doc.usuario.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.total} documento{data.total !== 1 ? "s" : ""} aguardando análise
          </p>
        </div>
      </div>

      {data.documentos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-500">Nenhum documento KYC pendente no momento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.documentos.map((doc) => {
            const horas = hoursAgo(doc.criadoEm);
            const urgente = horas >= 48;

            return (
              <div
                key={doc.kycDocumentoId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Urgência */}
                  <div
                    className={`w-1.5 h-full self-stretch rounded-full ${
                      urgente ? "bg-red-400" : horas >= 24 ? "bg-yellow-400" : "bg-green-400"
                    }`}
                  />

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{doc.usuario.nome}</p>
                        <p className="text-sm text-gray-500">{getTipoLabel(doc.tipo)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">
                          Pendente
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>📧 {doc.usuario.email}</span>
                      <span>🪪 {doc.usuario.cpf}</span>
                      <span>⏱ {horas}h aguardando</span>
                      <span className="text-gray-400">{formatDate(doc.criadoEm)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          doc.usuario.kycStatus === "COMPLETO"
                            ? "bg-green-50 text-green-700"
                            : doc.usuario.kycStatus === "PARCIAL"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        KYC Status: {doc.usuario.kycStatus}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
      // @ts-ignore - Next.js Link type compatibility
                  <div className="shrink-0 flex gap-2">
                    <Link
                      href={`/dashboard/gestor/kyc/${doc.kycDocumentoId}`}
                      className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      Revisar
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            Página {currentPage} de {pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= data.total}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
