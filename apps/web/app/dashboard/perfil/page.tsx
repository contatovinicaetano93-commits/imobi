"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface KYCStatus {
  usuarioId: string;
  status: "NENHUM" | "ENVIADO" | "APROVADO" | "REJEITADO";
  documentos: Array<{
    id: string;
    tipo: string;
    url: string;
    status: string;
    dataEnvio: string;
    motivo?: string;
  }>;
  resumo: {
    pendentes: number;
    aprovados: number;
    rejeitados: number;
  };
}

const statusBadge = (status: string) => {
  const styles = {
    NENHUM: "bg-gray-100 text-gray-800",
    ENVIADO: "bg-blue-100 text-blue-800",
    APROVADO: "bg-green-100 text-green-800",
    REJEITADO: "bg-red-100 text-red-800",
  };
  return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
};

const statusLabel = (status: string) => {
  const labels = {
    NENHUM: "Nenhum documento",
    ENVIADO: "Aguardando análise",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
  };
  return labels[status as keyof typeof labels] || status;
};

export default function KYCPage() {
  const router = useRouter();
  const [kycStatus, setKYCStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchKYCStatus = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await fetch("http://localhost:4000/api/v1/kyc/status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem("accessToken");
          router.push("/login");
          return;
        }

        if (!res.ok) {
          throw new Error("Falha ao carregar status KYC");
        }

        const data = await res.json();
        setKYCStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchKYCStatus();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const formData = new FormData();
      formData.append("documento", file);
      formData.append("tipo", "RG"); // Default type, could be made selectable

      const res = await fetch("http://localhost:4000/api/v1/kyc/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          typeof err.message === "string"
            ? err.message
            : Array.isArray(err.message)
            ? err.message[0]
            : "Falha no upload"
        );
      }

      // Refresh KYC status
      const statusRes = await fetch("http://localhost:4000/api/v1/kyc/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statusRes.ok) {
        const data = await statusRes.json();
        setKYCStatus(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil & Verificação</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

        {kycStatus && (
          <>
            {/* KYC Status Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Status de Verificação
                </h2>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusBadge(kycStatus.status)}`}>
                  {statusLabel(kycStatus.status)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {kycStatus.resumo.aprovados}
                  </div>
                  <div className="text-sm text-gray-600">Aprovados</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {kycStatus.resumo.pendentes}
                  </div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {kycStatus.resumo.rejeitados}
                  </div>
                  <div className="text-sm text-gray-600">Rejeitados</div>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Enviar Documento
              </h2>
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-500 transition cursor-pointer">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-gray-600 font-medium mb-1">
                    {uploading ? "Enviando..." : "Clique para selecionar arquivo"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Formatos: JPG, PNG (máx. 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Documents List */}
            {kycStatus.documentos.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Documentos Enviados
                </h2>
                <div className="space-y-3">
                  {kycStatus.documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{doc.tipo}</p>
                        <p className="text-sm text-gray-600">
                          Enviado em{" "}
                          {new Date(doc.dataEnvio).toLocaleDateString("pt-BR")}
                        </p>
                        {doc.motivo && (
                          <p className="text-sm text-red-600 mt-1">
                            Motivo: {doc.motivo}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(doc.status)}`}
                      >
                        {statusLabel(doc.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {kycStatus.documentos.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                <p className="text-blue-900">
                  Nenhum documento enviado ainda. Envie um documento para iniciar o
                  processo de verificação.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
