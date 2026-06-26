"use client";

import { useEffect, useRef, useState } from "react";
import { kycApi, type KycStatus, type KycDocumento } from "@/lib/api";
import { FileText, CheckCircle2, XCircle, Clock, Upload, AlertCircle, ShieldCheck } from "lucide-react";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

const KYC_PANELS = [
  { id: "kyc-progresso", priority: "primary" as const },
  { id: "kyc-documentos", priority: "primary" as const },
  { id: "kyc-como-funciona", priority: "secondary" as const },
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTipo, setPendingTipo] = useState<string | null>(null);
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

  const handleUploadClick = (tipo: string) => {
    setPendingTipo(tipo);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const tipo = pendingTipo;
    if (!file || !tipo) return;

    setUploading(tipo);
    setError(null);
    try {
      await kycApi.uploadDocumentoArquivo(file, tipo);
      await loadStatus();
      success("Documento enviado com sucesso.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer upload";
      setError(msg);
      toastError(msg);
    } finally {
      e.target.value = "";
      setPendingTipo(null);
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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <PanelSection
        id="kyc-progresso"
        title="Progresso da verificação"
        icon={<ShieldCheck className="w-4 h-4 text-[#1B4FD8]" />}
        priority="primary"
        summary={`${aprovados}/${total} documentos aprovados`}
        badge={`${pct}%`}
      >
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="border-b border-gray-50 bg-[#EEF3FF] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
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
      </PanelSection>

      <PanelSection
        id="kyc-documentos"
        title="Documentos obrigatórios"
        icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
        priority="primary"
        summary={`${pendentes} pendente(s) · ${rejeitados} rejeitado(s)`}
        urgency={rejeitados > 0 ? "critical" : pendentes > 0 ? "warning" : "none"}
      >
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
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
                      onClick={() => handleUploadClick(tipo)}
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
      </PanelSection>

      <PanelSection
        id="kyc-como-funciona"
        title="Como funciona"
        icon={<ShieldCheck className="w-4 h-4 text-[#16a34a]" />}
        priority="secondary"
        summary="Prazo de análise, notificações e reenvio"
      >
      <div className="rounded-xl border border-blue-100 bg-[#EEF3FF] p-5">
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li>· Documentos analisados em até 24 horas</li>
          <li>· Você receberá uma notificação ao concluir</li>
          <li>· Se rejeitado, é possível reenviar o documento</li>
          <li>· Aprovação completa libera o cadastro da obra</li>
        </ul>
      </div>
      </PanelSection>
    </>
  );

  return (
    <DashboardPanelShell panels={KYC_PANELS} maxWidth="sm" content={
      <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Verificação de identidade</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie os 4 documentos abaixo. É o primeiro passo para liberar seu crédito.
        </p>
      </div>
      {content}
      </>
    } />
  );
}
