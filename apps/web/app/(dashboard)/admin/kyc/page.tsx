"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@imbobi/core";

interface KycDocument {
  kycDocumentoId: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  tipo: string;
  url: string;
  status: string;
  criadoEm: string;
  motivo_rejeicao?: string;
}

interface ApiResponse {
  data: KycDocument[];
  total: number;
  page: number;
  limit: number;
}

export default function KycPage() {
  const [documentos, setDocumentos] = useState<KycDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchDocumentos();
  }, [page]);

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse>(
        `/admin/kyc/pending?page=${page}&limit=${limit}`
      );
      setDocumentos(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar KYC pendentes"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocs.size === documentos.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documentos.map((d) => d.kycDocumentoId)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.size === 0) {
      setError("Selecione pelo menos um documento");
      return;
    }

    try {
      setActionInProgress(true);
      await apiClient.post("/admin/kyc/bulk-approve", {
        documentIds: Array.from(selectedDocs),
      });
      setSelectedDocs(new Set());
      await fetchDocumentos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aprovar KYC");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedDocs.size === 0) {
      setError("Selecione pelo menos um documento");
      return;
    }

    if (!rejectReason.trim()) {
      setError("Informe o motivo da rejeição");
      return;
    }

    try {
      setActionInProgress(true);
      await apiClient.post("/admin/kyc/bulk-reject", {
        documentIds: Array.from(selectedDocs),
        motivo: rejectReason,
      });
      setSelectedDocs(new Set());
      setRejectReason("");
      setShowRejectForm(false);
      await fetchDocumentos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao rejeitar KYC");
    } finally {
      setActionInProgress(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {selectedDocs.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedDocs.size} documento(s) selecionado(s)
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkApprove}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {actionInProgress ? "Processando..." : "Aprovar Selecionados"}
                </button>
                <button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                >
                  Rejeitar Selecionados
                </button>
              </div>
            </div>

            {showRejectForm && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Motivo da rejeição..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  rows={3}
                />
                <button
                  onClick={handleBulkReject}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {actionInProgress ? "Processando..." : "Confirmar Rejeição"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>KYC Pendentes ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              Nenhum documento pendente
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">
                      <input
                        type="checkbox"
                        checked={
                          documentos.length > 0 &&
                          selectedDocs.size === documentos.length
                        }
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Usuário
                    </th>
                    <th className="text-left py-3 px-4 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Documento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => (
                    <tr
                      key={doc.kycDocumentoId}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedDocs.has(doc.kycDocumentoId)}
                          onChange={() =>
                            handleSelectDoc(doc.kycDocumentoId)
                          }
                          className="rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{doc.usuarioNome}</p>
                          <p className="text-xs text-slate-600">
                            {doc.usuarioEmail}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {doc.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Ver
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
                >
                  Anterior
                </button>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded ${
                    p === page
                      ? "bg-blue-600 text-white"
                      : "border border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}

              {page < totalPages && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
                >
                  Próximo
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
