"use client";

import { useEffect, useState } from "react";

interface KycDoc {
  kycDocumentoId: string;
  tipo: string;
  status: "PENDENTE" | "EM_VERIFICACAO" | "APROVADO" | "REJEITADO";
  documentoUrl: string;
  criadoEm: string;
  motivoRejeicao: string | null;
  usuario: {
    usuarioId: string;
    nome: string;
    email: string;
    cpf: string;
    kycStatus: string;
  };
}

export default function KycPage() {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/v1/manager/kyc-pendentes", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setDocs(data.documentos ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (error) {
        console.error("Failed to fetch KYC docs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/v1/manager/kyc/${id}/aprovar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) setDocs(docs.filter((d) => d.kycDocumentoId !== id));
    } catch (error) {
      console.error("Failed to approve KYC:", error);
    }
  }

  async function handleReject(id: string) {
    const motivo = prompt("Motivo da rejeição:");
    if (!motivo) return;
    try {
      const res = await fetch(`/api/v1/manager/kyc/${id}/rejeitar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
        credentials: "include",
      });
      if (res.ok) setDocs(docs.filter((d) => d.kycDocumentoId !== id));
    } catch (error) {
      console.error("Failed to reject KYC:", error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">KYC Review</h2>
        <span className="text-sm text-gray-500">{total} pendentes</span>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : docs.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 font-medium">✓ Nenhum documento pendente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <div
              key={doc.kycDocumentoId}
              className="bg-white rounded-lg shadow p-6 flex items-start justify-between gap-6"
            >
              <div className="flex-1 space-y-1">
                <p className="text-gray-900 font-semibold">{doc.usuario.nome}</p>
                <p className="text-sm text-gray-600">
                  {doc.usuario.email} · CPF:{" "}
                  <span className="font-mono">{doc.usuario.cpf}</span>
                </p>
                <p className="text-sm text-gray-500">Tipo: {doc.tipo}</p>
                <p className="text-xs text-gray-400">
                  {new Date(doc.criadoEm).toLocaleString("pt-BR")}
                </p>
                {doc.motivoRejeicao && (
                  <p className="text-sm text-red-600">Motivo: {doc.motivoRejeicao}</p>
                )}
              </div>

              {doc.documentoUrl && (
                <a
                  href={doc.documentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={doc.documentoUrl}
                    alt="Documento"
                    className="w-32 h-20 object-cover rounded-lg border hover:opacity-80 transition"
                  />
                </a>
              )}

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleApprove(doc.kycDocumentoId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  ✓ Aprovar
                </button>
                <button
                  onClick={() => handleReject(doc.kycDocumentoId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  ✗ Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
