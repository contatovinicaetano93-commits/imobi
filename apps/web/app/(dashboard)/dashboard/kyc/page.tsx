"use client";

import { useEffect, useState } from "react";
import { kycApi, type KycStatus, type KycDocumento } from "@/lib/api";
import { FileText, CheckCircle2, XCircle, Clock, Upload, AlertCircle } from "lucide-react";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";

const BADGE: Record<string, { label: string; cls: string }> = {
  PENDENTE:       { label: "Pendente",       cls: "bg-yellow-100 text-yellow-800" },
  EM_VERIFICACAO: { label: "Em Verificação", cls: "bg-blue-100 text-blue-800" },
  APROVADO:       { label: "Aprovado",       cls: "bg-green-100 text-green-800" },
  REJEITADO:      { label: "Rejeitado",      cls: "bg-red-100 text-red-800" },
};

const DOC_TIPOS = [
  { tipo: "RG_FRENTE",  label: "RG — Frente",       desc: "Documento de Identidade (frente)" },
  { tipo: "RG_VERSO",   label: "RG — Verso",        desc: "Documento de Identidade (verso)" },
  { tipo: "SELFIE",     label: "Selfie c/ documento", desc: "Foto sua segurando o documento" },
  { tipo: "COMPROVANTE", label: "Comprovante de residência", desc: "Conta de luz, água ou banco" },
];

export default function KycPage() {
  const { success, error: toastError } = useToast();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      setStatus(await kycApi.obterStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar status KYC");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (tipo: string) => {
    setUploading(tipo);
    setError(null);
    try {
      const mockUrl = `https://s3.example.com/kyc/${tipo}-${Date.now()}.jpg`;
      await kycApi.uploadDocumento(tipo, mockUrl);
      await loadStatus();
      success("Documento enviado com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer upload";
      setError(msg);
      toastError(msg);
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <PageSkeleton variant="cards" count={4} />
      </div>
    );
  }

  const docs = status?.documentos ?? [];
  const docMap = Object.fromEntries(docs.map((d: KycDocumento) => [d.tipo, d]));
  const aprovados = status?.resumo.aprovados ?? 0;
  const pendentes = status?.resumo.pendentes ?? 0;
  const rejeitados = status?.resumo.rejeitados ?? 0;
  const total = DOC_TIPOS.length;
  const pct = Math.round((aprovados / total) * 100);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Verificação de Identidade</h1>
        <p className="text-sm text-gray-500 mt-1">Envie seus documentos para desbloquear o crédito.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Progresso geral */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Progresso</h2>
          <span className="text-sm font-bold text-[#1B4FD8]">{aprovados}/{total} aprovados</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-4">
          <div className="h-full bg-[#16a34a] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CheckCircle2, label: "Aprovados", value: aprovados, cls: "text-green-600", bg: "bg-green-50" },
            { icon: Clock,        label: "Pendentes", value: pendentes, cls: "text-yellow-600", bg: "bg-yellow-50" },
            { icon: XCircle,      label: "Rejeitados", value: rejeitados, cls: "text-red-500", bg: "bg-red-50" },
          ].map(({ icon: Icon, label, value, cls, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
              <Icon className={`w-4 h-4 ${cls} mx-auto mb-1`} />
              <p className={`text-lg font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
          <FileText className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Documentos</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {DOC_TIPOS.map(({ tipo, label, desc }) => {
            const doc: KycDocumento | undefined = docMap[tipo];
            const badge = doc ? (BADGE[doc.status] ?? BADGE.PENDENTE) : null;
            const isUploading = uploading === tipo;

            return (
              <div key={tipo} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#1B4FD8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  {doc?.motivo_rejeicao && (
                    <p className="text-xs text-red-500 mt-1">Motivo: {doc.motivo_rejeicao}</p>
                  )}
                  {doc?.criadoEm && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Enviado em {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {badge && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  {(!doc || doc.status === "REJEITADO") && (
                    <button
                      onClick={() => handleUpload(tipo)}
                      disabled={!!uploading}
                      style={{ background: "#1B4FD8" }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading ? "Enviando..." : "Enviar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Informações */}
      <div className="bg-[#EEF3FF] rounded-2xl border border-blue-100 p-5">
        <p className="text-sm font-semibold text-[#1B4FD8] mb-2">Como funciona</p>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Documentos analisados em até 24 horas</li>
          <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Você receberá uma notificação ao concluir</li>
          <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Se rejeitado, é possível reenviar o documento</li>
          <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Aprovação completa libera acesso total ao crédito</li>
        </ul>
      </div>
    </div>
  );
}
