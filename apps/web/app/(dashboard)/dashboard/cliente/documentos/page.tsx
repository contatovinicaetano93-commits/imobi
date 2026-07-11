"use client";

import { useEffect, useRef, useState } from "react";
import { FileCheck2, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";
import { documentosCanonicoApi, obrasCanonicoApi, storageCanonicoApi, type DocumentoCanonica, type ObraCanonica } from "@/lib/api";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";

const DOC_TIPOS = [
  { tipo: "RG_FRENTE", label: "RG — Frente" },
  { tipo: "RG_VERSO", label: "RG — Verso" },
  { tipo: "SELFIE", label: "Selfie com documento" },
  { tipo: "COMPROVANTE", label: "Comprovante de residência" },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  PENDENTE: { label: "Pendente", cls: "bg-yellow-100 text-yellow-800", icon: Clock },
  APROVADO: { label: "Aprovado", cls: "bg-green-100 text-green-800", icon: CheckCircle2 },
  REJEITADO: { label: "Rejeitado", cls: "bg-red-100 text-red-800", icon: XCircle },
};

export default function ClienteDocumentosPage() {
  const { success, error: toastError } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [obra, setObra] = useState<ObraCanonica | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoCanonica[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pendingTipo, setPendingTipo] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const obras = await obrasCanonicoApi.minhas();
      const current = obras[0] ?? null;
      setObra(current);
      if (current) {
        const docs = await documentosCanonicoApi.listarPorObra(current.id);
        setDocumentos(docs);
      } else {
        setDocumentos([]);
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function ensureObra(): Promise<ObraCanonica> {
    if (obra) return obra;
    const created = await obrasCanonicoApi.criar({
      nome: "Minha obra",
      endereco: "Endereço pendente",
      valorCredito: 1,
    });
    setObra(created);
    return created;
  }

  async function handleUpload(file: File, tipo: string) {
    setUploading(tipo);
    try {
      const currentObra = await ensureObra();
      const { url, key } = await storageCanonicoApi.urlDeUpload(`documentos/${currentObra.id}`, file.type);
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const publicUrl = url.split("?")[0] ?? url;
      await documentosCanonicoApi.enviar({ obraId: currentObra.id, tipo, url: publicUrl || key });
      success("Documento enviado com sucesso");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(null);
      setPendingTipo(null);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0C1A3D]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Documentos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie seus documentos de identidade para iniciar a análise de crédito.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingTipo) void handleUpload(file, pendingTipo);
          e.target.value = "";
        }}
      />

      <div className="space-y-3">
        {DOC_TIPOS.map(({ tipo, label }) => {
          const doc = documentos.find((d) => d.tipo === tipo);
          const meta = doc ? STATUS_META[doc.status] ?? STATUS_META.PENDENTE : null;
          const Icon = meta?.icon ?? FileCheck2;
          return (
            <div key={tipo} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-[#1B4FD8]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  {meta && (
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={uploading === tipo}
                onClick={() => {
                  setPendingTipo(tipo);
                  fileRef.current?.click();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                <Upload size={14} />
                {uploading === tipo ? "Enviando…" : doc ? "Reenviar" : "Enviar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
