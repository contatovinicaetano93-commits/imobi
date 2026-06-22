"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  KYC_ACCEPT_INPUT,
  validateKycFile,
  type KycDocumentoTipo,
} from "@imbobi/schemas";
import { uploadKycArquivo, type KycDocumento } from "@/lib/api";

const BADGE: Record<string, { label: string; cls: string }> = {
  PENDENTE: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800" },
  EM_VERIFICACAO: { label: "Em Verificação", cls: "bg-blue-100 text-blue-800" },
  APROVADO: { label: "Aprovado", cls: "bg-green-100 text-green-800" },
  REJEITADO: { label: "Rejeitado", cls: "bg-red-100 text-red-800" },
};

export type KycDocumentUploadProps = {
  tipo: KycDocumentoTipo;
  label: string;
  description: string;
  document?: KycDocumento;
  disabled?: boolean;
  onUploaded: (doc: KycDocumento) => void;
  onError?: (message: string) => void;
};

type UploadPhase = "idle" | "dragging" | "uploading";

function isImageUrl(url: string, mimeHint?: string) {
  if (mimeHint?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)(\?|$)/i.test(url);
}

export function KycDocumentUpload({
  tipo,
  label,
  description,
  document,
  disabled,
  onUploaded,
  onError,
}: KycDocumentUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);

  const canUpload = !document || document.status === "REJEITADO";
  const badge = document ? (BADGE[document.status] ?? BADGE.PENDENTE) : null;
  const busy = phase === "uploading" || disabled;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearPreview = useCallback(() => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName(null);
    setPreviewIsPdf(false);
  }, [previewUrl]);

  const runUpload = useCallback(
    async (file: File) => {
      const validation = validateKycFile(file);
      if (!validation.ok) {
        setLocalError(validation.message);
        onError?.(validation.message);
        return;
      }

      setLocalError(null);
      setPhase("uploading");
      setProgress(0);

      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        setPreviewIsPdf(true);
        setPreviewName(file.name);
        setPreviewUrl(null);
      } else {
        setPreviewIsPdf(false);
        setPreviewName(file.name);
        if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
      }

      try {
        const doc = await uploadKycArquivo(file, tipo, setProgress);
        onUploaded(doc);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao enviar documento";
        setLocalError(message);
        onError?.(message);
        clearPreview();
      } finally {
        setProgress(0);
        setPhase("idle");
      }
    },
    [tipo, onUploaded, onError, clearPreview, previewUrl],
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void runUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPhase("idle");
    if (busy || !canUpload) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void runUpload(file);
  };

  const existingPreview =
    document?.url && !previewUrl && isImageUrl(document.url) ? document.url : null;

  return (
    <div className="border-b border-gray-50 px-4 py-4 last:border-b-0 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF]">
            <FileText className="h-5 w-5 text-[#1B4FD8]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              {badge && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">{description}</p>
            {document?.motivo_rejeicao && (
              <p className="mt-1 text-xs text-red-500">Motivo: {document.motivo_rejeicao}</p>
            )}
            {document?.criadoEm && (
              <p className="mt-0.5 text-xs text-gray-400">
                Enviado em {new Date(document.criadoEm).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        {(existingPreview || previewUrl) && !previewIsPdf && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl ?? existingPreview ?? ""}
              alt={`Preview ${label}`}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {previewIsPdf && previewName && (
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-1">
            <FileText className="h-6 w-6 text-[#1B4FD8]" />
            <span className="mt-1 max-w-full truncate text-[0.6rem] text-gray-500">{previewName}</span>
          </div>
        )}
      </div>

      {canUpload && (
        <div className="mt-3">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={KYC_ACCEPT_INPUT}
            className="sr-only"
            disabled={busy}
            onChange={onFileInput}
          />

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!busy) inputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!busy) setPhase("dragging");
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setPhase("idle");
            }}
            onDrop={onDrop}
            onClick={() => !busy && inputRef.current?.click()}
            className={[
              "relative cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
              phase === "dragging"
                ? "border-[#1B4FD8] bg-[#EEF3FF]"
                : "border-gray-200 bg-gray-50/80 hover:border-[#1B4FD8]/40 hover:bg-[#EEF3FF]/50",
              busy ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            {phase === "uploading" ? (
              <div className="space-y-2">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1B4FD8]" />
                <p className="text-sm font-medium text-gray-700">Enviando… {progress}%</p>
                <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#1B4FD8] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <Upload className="mx-auto mb-2 h-5 w-5 text-[#1B4FD8]" />
                <p className="text-sm font-medium text-gray-800">
                  Arraste o arquivo ou <span className="text-[#1B4FD8]">clique para selecionar</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP ou PDF · máx. 10 MB</p>
              </>
            )}
          </div>

          {previewUrl && phase === "idle" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearPreview();
              }}
              className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3" /> Limpar preview
            </button>
          )}
        </div>
      )}

      {localError && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{localError}</p>
        </div>
      )}

      {document?.status === "APROVADO" && document.url && isImageUrl(document.url) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Documento aprovado
          <ImageIcon className="h-3.5 w-3.5 opacity-50" />
        </div>
      )}
    </div>
  );
}
