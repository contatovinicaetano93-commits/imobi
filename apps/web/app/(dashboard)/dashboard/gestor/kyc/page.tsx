"use client";



import { useEffect, useState } from "react";
import { managerApi, type KycPendente } from "@/lib/api";
import { KycBatchActions } from "@/components/dashboard/KycBatchActions";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  // Clear selection when search changes
  useEffect(() => {
    setSelectedDocs([]);
    setOffset(0);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between">
          <p className="text-green-800 text-sm font-medium">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.total} documento{data.total !== 1 ? "s" : ""} aguardando análise
            {selectedDocs.length > 0 && ` — ${selectedDocs.length} selecionado(s)`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-gray-500">
            {searchQuery
              ? "Nenhum documento encontrado com essa busca"
              : "Nenhum documento KYC pendente no momento"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selection Toolbar */}
          {filteredDocs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedDocs.length === filteredDocs.length && filteredDocs.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-brand-600 cursor-pointer"
                  title="Selecionar/desselecionar todos"
                />
                <span className="text-sm text-gray-700">
                  {selectedDocs.length === 0
                    ? "Selecionar documentos"
                    : `${selectedDocs.length} de ${filteredDocs.length} selecionados`}
                </span>
              </div>
            </div>
          )}

          {filteredDocs.map((doc) => {
            const horas = hoursAgo(doc.criadoEm);
            const urgente = horas >= 48;
            const isSelected = selectedDocs.includes(doc.kycDocumentoId);

            return (
              <div
                key={doc.kycDocumentoId}
                className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${
                  isSelected ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectDoc(doc.kycDocumentoId)}
                    className="w-5 h-5 rounded border-gray-300 text-brand-600 cursor-pointer mt-0.5 shrink-0"
                  />

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

      <KycBatchActions
        selectedDocs={selectedDocs}
        onSuccess={handleBulkSuccess}
        onError={handleError}
        isDisabled={loading}
      />

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
