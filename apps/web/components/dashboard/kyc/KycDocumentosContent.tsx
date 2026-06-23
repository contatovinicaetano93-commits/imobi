"use client";

import { useCallback, useEffect, useState } from "react";
import { kycApi, type KycStatus, type KycDocumento } from "@/lib/api";
import { KYC_DOC_CATALOG } from "@imbobi/schemas";
import { KycDocumentUpload } from "@/components/dashboard/kyc/KycDocumentUpload";
import { FileText, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

type KycDocumentosContentProps = {
  bemVindo?: boolean;
};

export function KycDocumentosContent({ bemVindo = false }: KycDocumentosContentProps) {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await kycApi.obterStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar status KYC");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleUploaded = useCallback(async () => {
    setError(null);
    await loadStatus();
  }, [loadStatus]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    );
  }

  const docs = status?.documentos ?? [];
  const docMap: Record<string, KycDocumento> = {};
  for (const d of docs) {
    if (!docMap[d.tipo]) docMap[d.tipo] = d;
  }
  const aprovados = status?.resumo.aprovados ?? 0;
  const pendentes = status?.resumo.pendentes ?? 0;
  const rejeitados = status?.resumo.rejeitados ?? 0;
  const total = KYC_DOC_CATALOG.length;
  const pct = Math.round((aprovados / total) * 100);

  return (
    <div className="space-y-6">
      {bemVindo && (
        <div className="flex items-start gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <span className="text-2xl">👋</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">Conta criada com sucesso!</p>
            <p className="mt-0.5 text-sm text-blue-700">
              Envie seus documentos para continuar — leva menos de 3 minutos.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Progresso</h2>
          <span className="text-sm font-bold text-[#1B4FD8]">{aprovados}/{total} aprovados</span>
        </div>
        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[#16a34a] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CheckCircle2, label: "Aprovados", value: aprovados, cls: "text-green-600", bg: "bg-green-50" },
            { icon: Clock, label: "Pendentes", value: pendentes, cls: "text-yellow-600", bg: "bg-yellow-50" },
            { icon: XCircle, label: "Rejeitados", value: rejeitados, cls: "text-red-500", bg: "bg-red-50" },
          ].map(({ icon: Icon, label, value, cls, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
              <Icon className={`mx-auto mb-1 h-4 w-4 ${cls}`} />
              <p className={`text-lg font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-50 px-6 py-4">
          <FileText className="h-4 w-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Documentos</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {KYC_DOC_CATALOG.map(({ tipo, label, desc }) => (
            <KycDocumentUpload
              key={tipo}
              tipo={tipo}
              label={label}
              description={desc}
              document={docMap[tipo]}
              onUploaded={handleUploaded}
              onError={setError}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
