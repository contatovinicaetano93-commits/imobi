"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, documentosCanonicoApi, type AdminObraResumo, type DocumentoCanonica } from "@/lib/api";
import { AdminSubpageHeader } from "@/app/(dashboard)/_components/admin/AdminSubpageHeader";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/toast-context";

export default function AdminDocumentosPage() {
  const { success, error: toastError } = useToast();
  const [obras, setObras] = useState<AdminObraResumo[]>([]);
  const [docs, setDocs] = useState<Record<string, DocumentoCanonica[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const lista = await adminApi.listarObras();
      const pendentes = lista.filter((o) =>
        ["KYC_PENDENTE", "DOSSIE_EM_ANALISE"].includes(o.etapa),
      );
      setObras(pendentes);
      const map: Record<string, DocumentoCanonica[]> = {};
      await Promise.all(
        pendentes.map(async (obra) => {
          map[obra.id] = await documentosCanonicoApi.listarPorObra(obra.id);
        }),
      );
      setDocs(map);
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function revisar(documentoId: string, status: "APROVADO" | "REJEITADO") {
    setBusyId(documentoId);
    try {
      await adminApi.revisarDocumento(documentoId, status);
      success(status === "APROVADO" ? "Documento aprovado" : "Documento rejeitado");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao revisar");
    } finally {
      setBusyId(null);
    }
  }

  async function avancarDossie(obraId: string) {
    setBusyId(obraId);
    try {
      await adminApi.avancarObra(obraId);
      success("Dossiê avançado no funil.");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao avançar etapa");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <AdminSubpageHeader
        title="Documentos e KYC"
        subtitle="Revise arquivos enviados pelos clientes e avance o funil quando o dossiê estiver completo."
        onRefresh={load}
        refreshing={loading}
      />

      {loading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : obras.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
          Nenhuma obra aguardando revisão de documentos.
        </p>
      ) : (
        obras.map((obra) => (
          <div key={obra.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{obra.nome}</h2>
                <p className="text-xs text-gray-500">{obra.cliente?.nome} · etapa {obra.etapa.replace(/_/g, " ")}</p>
              </div>
              {obra.etapa === "DOSSIE_EM_ANALISE" && (
                <button
                  type="button"
                  disabled={busyId === obra.id}
                  onClick={() => avancarDossie(obra.id)}
                  className="rounded-lg bg-[#1B4FD8] px-3 py-2 text-xs font-semibold text-white"
                >
                  Aprovar dossiê
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(docs[obra.id] ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum documento enviado ainda.</p>
              ) : (
                (docs[obra.id] ?? []).map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.tipo}</p>
                      <p className="text-xs text-gray-500">{doc.status}</p>
                    </div>
                    {doc.status === "PENDENTE" && (
                      <div className="flex gap-2">
                        <button type="button" disabled={busyId === doc.id} onClick={() => revisar(doc.id, "APROVADO")} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white">
                          <CheckCircle2 size={12} /> Aprovar
                        </button>
                        <button type="button" disabled={busyId === doc.id} onClick={() => revisar(doc.id, "REJEITADO")} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
                          <XCircle size={12} /> Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <Link href={`/dashboard/admin/obras`} className="mt-3 inline-block text-xs font-semibold text-[#1B4FD8] no-underline">
              Ver todas as obras →
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
