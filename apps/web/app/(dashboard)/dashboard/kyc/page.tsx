"use client";

import { useEffect, useState } from "react";
import { kycApi, type KycStatus, type KycDocumento } from "@/lib/api";
import { FileText, CheckCircle2, XCircle, Clock, Upload, AlertCircle, ShieldCheck } from "lucide-react";
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
  const total = status?.resumo.totalTipos ?? DOC_TIPOS.length;
  const pct = Math.round((aprovados / total) * 100);

  const content = (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-50 bg-[#EEF3FF] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1B4FD8]" />
              <h2 className="font-semibold text-[#0C1A3D]">Progresso</h2>
            </div>
            <span className="text-sm font-bold text-[#1B4FD8]">{aprovados}/{total} aprovados</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
            <div className="h-full rounded-full bg-[#4ADE80] transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-50">
          {[
            { icon: CheckCircle2, label: "Aprovados", value: aprovados, cls: "text-green-600" },
            { icon: Clock, label: "Pendentes", value: pendentes, cls: "text-amber-600" },
            { icon: XCircle, label: "Rejeitados", value: rejeitados, cls: "text-red-500" },
          ].map(({ icon: Icon, label, value, cls }) => (
            <div key={label} className="px-4 py-4 text-center">
              <Icon className={`mx-auto mb-1 h-4 w-4 ${cls}`} />
              <p className={`text-xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-50 px-6 py-4">
          <FileText className="h-4 w-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Documentos obrigatórios</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {DOC_TIPOS.map(({ tipo, label, desc }) => {
            const doc: KycDocumento | undefined = docMap[tipo];
            const badge = doc ? (BADGE[doc.status] ?? BADGE.PENDENTE) : null;
            const isUploading = uploading === tipo;

            return (
              <div key={tipo} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF]">
                  <FileText className="h-5 w-5 text-[#1B4FD8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
                  {doc?.motivo_rejeicao && (
                    <p className="mt-1 text-xs text-red-500">Motivo: {doc.motivo_rejeicao}</p>
                  )}
                  {doc?.criadoEm && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      Enviado em {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {badge && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  {(!doc || doc.status === "REJEITADO") && (
                    <button
                      onClick={() => handleUpload(tipo)}
                      disabled={!!uploading}
                      style={{ background: "#1B4FD8" }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? "Enviando..." : "Enviar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-[#EEF3FF] p-5">
        <p className="mb-2 text-sm font-semibold text-[#1B4FD8]">Como funciona</p>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li>· Documentos analisados em até 24 horas</li>
          <li>· Você receberá uma notificação ao concluir</li>
          <li>· Se rejeitado, é possível reenviar o documento</li>
          <li>· Aprovação completa libera o cadastro da obra</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Verificação de identidade</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie os 4 documentos abaixo. É o primeiro passo para liberar seu crédito.
        </p>
      </div>
      {content}
    </div>
  );
}
