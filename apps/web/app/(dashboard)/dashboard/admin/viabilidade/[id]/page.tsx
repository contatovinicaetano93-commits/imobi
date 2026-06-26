"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  dossiesApi,
  type DossieDetalhe,
  type DossieStatus,
} from "@/lib/api";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  NA: "N/A",
};

const VIABILIDADE_DETALHE_PANELS = [
  { id: "viab-detalhe", priority: "primary" as const },
  { id: "viab-checklist", priority: "primary" as const },
];

export default function AdminViabilidadeDetalhePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [dossie, setDossie] = useState<DossieDetalhe | null>(null);
  const [processando, setProcessando] = useState(false);
  const [motivoReprova, setMotivoReprova] = useState("");

  const carregar = useCallback(async () => {
    if (!id) return;
    try {
      setDossie(await dossiesApi.buscar(id));
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao carregar dossiê");
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const aprovar = async () => {
    if (!dossie) return;
    setProcessando(true);
    try {
      if (dossie.status === "ENVIADO") {
        await dossiesApi.atualizarStatus(dossie.id, "EM_ANALISE");
      }
      await dossiesApi.atualizarStatus(dossie.id, "APROVADO");
      success("Dossiê aprovado.");
      await carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao aprovar");
    } finally {
      setProcessando(false);
    }
  };

  const reprovar = async () => {
    if (!dossie) return;
    const motivo =
      motivoReprova.trim() ||
      "Documentação insuficiente — reenvie após correção.";
    setProcessando(true);
    try {
      await dossiesApi.atualizarStatus(dossie.id, "REPROVADO", motivo);
      success("Dossiê reprovado.");
      await carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl p-4 sm:p-6">
        <PageSkeleton variant="detail" />
      </div>
    );
  }

  if (!dossie) {
    return (
      <div className="max-w-3xl space-y-4 p-4 sm:p-6">
        <Link
          href="/dashboard/admin/viabilidade"
          className="inline-flex items-center gap-1 text-sm text-[#1B4FD8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à fila
        </Link>
        <p className="text-sm text-gray-500">Dossiê não encontrado.</p>
      </div>
    );
  }

  const podeDecidir =
    dossie.status === "ENVIADO" || dossie.status === "EM_ANALISE";
  const enviados = dossie.checklistItens.filter(
    (i) => i.status === "ENVIADO" || i.status === "APROVADO" || i.documentoId,
  );

  return (
    <DashboardPanelShell
      panels={VIABILIDADE_DETALHE_PANELS}
      maxWidth="md"
      content={
        <>
          <Link
            href="/dashboard/admin/viabilidade"
            className="inline-flex items-center gap-1 text-sm text-[#1B4FD8] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à fila
          </Link>

          <PanelSection
            id="viab-detalhe"
            title={dossie.nomeEmpreendimento}
            icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            summary={`${dossie.status} · ${dossie.estagioObra?.replace(/_/g, " ") ?? "—"}`}
            urgency={podeDecidir ? "warning" : "none"}
          >
            <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    {dossie.estagioObra?.replace(/_/g, " ") ?? "—"} · {dossie.status}
                    {dossie.percentualFisico != null ? ` · ${dossie.percentualFisico}% físico` : ""}
                  </p>
                  {dossie.dataBase && (
                    <p className="text-xs text-gray-400 mt-1">
                      Data-base: {new Date(dossie.dataBase).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                {podeDecidir && (
                  <button
                    type="button"
                    disabled={processando}
                    onClick={() => void aprovar()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {processando ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Aprovar dossiê
                  </button>
                )}
              </div>

              {dossie.observacaoAdmin && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {dossie.observacaoAdmin}
                </div>
              )}

              {podeDecidir && (
                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <label htmlFor="motivo-reprova" className="text-xs font-semibold text-gray-600">
                    Motivo da reprovação (opcional)
                  </label>
                  <textarea
                    id="motivo-reprova"
                    rows={2}
                    value={motivoReprova}
                    onChange={(e) => setMotivoReprova(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    placeholder="Descreva o que falta ou está incorreto…"
                  />
                  <button
                    type="button"
                    disabled={processando}
                    onClick={() => void reprovar()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reprovar
                  </button>
                </div>
              )}
            </div>
          </PanelSection>

          <PanelSection
            id="viab-checklist"
            title="Checklist de documentos"
            icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            badge={enviados.length}
            summary={`${enviados.length}/${dossie.checklistItens.length} com evidência`}
          >
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <ul className="divide-y divide-gray-50">
                {dossie.checklistItens.map((item) => (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.titulo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.obrigatorio ? "Obrigatório" : "Opcional"} ·{" "}
                          {STATUS_LABEL[item.status] ?? item.status}
                        </p>
                        {item.observacao && (
                          <p className="text-xs text-gray-600 mt-1">{item.observacao}</p>
                        )}
                      </div>
                      {item.documentoId ? (
                        <a
                          href={`/api/proxy/documentos/${item.documentoId}/arquivo`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#1B4FD8] hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Ver documento
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Sem anexo</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </PanelSection>
        </>
      }
    />
  );
}
