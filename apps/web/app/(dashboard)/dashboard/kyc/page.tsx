"use client";

import { useEffect, useState } from "react";
import { kycApi, type KycStatus, type KycDocumento } from "@/lib/api";

export default function KycPage() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await kycApi.obterStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar status KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (tipo: string) => {
    setUploading(true);
    setError(null);
    try {
      // In real app, would upload file to S3 first and get URL
      const mockUrl = `https://s3.example.com/kyc/${tipo}-${Date.now()}.jpg`;
      await kycApi.uploadDocumento(tipo, mockUrl);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-4">Carregando...</div>;

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDENTE: "bg-yellow-100 text-yellow-800",
      APROVADO: "bg-green-100 text-green-800",
      REJEITADO: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Verificação de Identidade (KYC)</h1>
      <p className="text-gray-600 mb-6">
        Envie seus documentos para completar a verificação de identidade.
      </p>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-6">{error}</div>}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded">
          <div className="text-sm text-gray-600">Status Geral</div>
          <div className="text-lg font-bold">{status?.status === "NENHUM" ? "Pendente" : "Enviado"}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <div className="text-sm text-gray-600">Pendentes</div>
          <div className="text-lg font-bold">{status?.resumo.pendentes || 0}</div>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <div className="text-sm text-gray-600">Aprovados</div>
          <div className="text-lg font-bold">{status?.resumo.aprovados || 0}</div>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <div className="text-sm text-gray-600">Rejeitados</div>
          <div className="text-lg font-bold">{status?.resumo.rejeitados || 0}</div>
        </div>
      </div>

      {/* Documents List */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Documentos Enviados</h2>
        {status?.documentos && status.documentos.length > 0 ? (
          <div className="space-y-3">
            {status.documentos.map((doc: KycDocumento) => (
              <div key={doc.kycDocumentoId} className="border rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{doc.tipo}</div>
                    <div className="text-sm text-gray-600">
                      Enviado em {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                    </div>
                    {doc.motivo_rejeicao && (
                      <div className="text-sm text-red-600 mt-1">
                        Motivo: {doc.motivo_rejeicao}
                      </div>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum documento enviado</p>
        )}
      </div>

      {/* Upload Section */}
      <div className="bg-gray-50 p-6 rounded">
        <h2 className="text-xl font-semibold mb-4">Enviar Documentos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Documentos requeridos: RG (frente e verso) e Selfie com documento
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleUpload("RG")}
            disabled={uploading}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Enviando..." : "Enviar RG"}
          </button>
          <button
            onClick={() => handleUpload("Selfie")}
            disabled={uploading}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Enviando..." : "Enviar Selfie"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 p-4 rounded text-sm">
        <strong>Próximos passos:</strong>
        <ul className="list-disc list-inside mt-2 text-gray-700">
          <li>Seus documentos serão analisados em até 24 horas</li>
          <li>Você receberá uma notificação quando forem aprovados ou rejeitados</li>
          <li>Se rejeitado, você pode enviar novamente</li>
        </ul>
      </div>
    </div>
  );
}
