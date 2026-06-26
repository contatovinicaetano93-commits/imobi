"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dossiesApi, type DossieResumo, type DossieStatus } from "@/lib/api";
import { useAdminFilasOnChange } from "@/hooks/use-admin-filas-poll";
import { CheckCircle2, XCircle, Clock, Loader2, FileText, ChevronRight } from "lucide-react";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

const FILA: DossieStatus[] = ["ENVIADO", "EM_ANALISE", "APROVADO", "REPROVADO", "RASCUNHO"];

export default function AdminViabilidadePage() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<DossieResumo[]>([]);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const items = await dossiesApi.listar();
      setLista(
        items.sort((a, b) => {
          const ia = FILA.indexOf(a.status);
          const ib = FILA.indexOf(b.status);
          return ia - ib || new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
        }),
      );
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao listar dossiês");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useAdminFilasOnChange(carregar);

  const aprovar = async (id: string, statusAtual: DossieStatus) => {
    setProcessando(id);
    try {
      if (statusAtual === "ENVIADO") {
        await dossiesApi.atualizarStatus(id, "EM_ANALISE");
      }
      await dossiesApi.atualizarStatus(id, "APROVADO");
      success("Dossiê aprovado.");
      await carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao aprovar");
    } finally {
      setProcessando(null);
    }
  };

  const reprovar = async (id: string) => {
    setProcessando(id);
    try {
      await dossiesApi.atualizarStatus(id, "REPROVADO", "Documentação insuficiente — reenvie após correção.");
      success("Dossiê reprovado.");
      await carregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setProcessando(null);
    }
  };

  const pendentes = lista.filter((d) => d.status === "ENVIADO" || d.status === "EM_ANALISE");

  const panels = useMemo(
    () => [
      ...(pendentes.length > 0
        ? [{ id: "viab-alertas", priority: "critical" as const }]
        : []),
      { id: "viab-lista", priority: "primary" as const },
    ],
    [pendentes.length],
  );

  if (loading) {
    return (
      <div className="max-w-4xl p-4 sm:p-6">
        <PageSkeleton variant="list" count={5} />
      </div>
    );
  }

  return (
    <DashboardPanelShell
      panels={panels}
      maxWidth="md"
      content={
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fila de viabilidade</h1>
            <p className="mt-1 text-sm text-gray-500">
              Aprovar ou reprovar dossiês de crédito enviados pelos tomadores.
            </p>
          </div>

          {pendentes.length > 0 && (
            <PanelSection
              id="viab-alertas"
              title="Aguardando análise"
              icon={<Clock className="w-4 h-4 text-amber-600" />}
              priority="critical"
              badge={pendentes.length}
              summary={`${pendentes.length} dossiê(s) na fila`}
              urgency="warning"
            >
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Revise cada dossiê antes de aprovar — o tomador só cadastra obra após aprovação.
              </div>
            </PanelSection>
          )}

          <PanelSection
            id="viab-lista"
            title="Todos os dossiês"
            icon={<FileText className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            badge={lista.length || undefined}
            summary={`${lista.length} dossiê(s) no total`}
          >
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <div className="divide-y divide-gray-50">
                {lista.length === 0 ? (
                  <p className="px-6 py-12 text-center text-sm text-gray-500">Nenhum dossiê cadastrado.</p>
                ) : (
                  lista.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex min-w-0 items-start gap-3 flex-1">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4FD8]" />
                        <div>
                          <Link
                            href={`/dashboard/admin/viabilidade/${d.id}`}
                            className="font-semibold text-gray-900 hover:text-[#1B4FD8] hover:underline"
                          >
                            {d.nomeEmpreendimento}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {d.estagioObra?.replace(/_/g, " ")} · {d.status} ·{" "}
                            {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/admin/viabilidade/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Revisar
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        {(d.status === "ENVIADO" || d.status === "EM_ANALISE") && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={processando === d.id}
                              onClick={() => void aprovar(d.id, d.status)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {processando === d.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Aprovar
                            </button>
                            <button
                              type="button"
                              disabled={processando === d.id}
                              onClick={() => void reprovar(d.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reprovar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </PanelSection>
        </>
      }
    />
  );
}
