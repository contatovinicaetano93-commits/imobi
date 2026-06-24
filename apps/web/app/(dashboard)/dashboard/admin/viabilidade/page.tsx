"use client";

import { useCallback, useEffect, useState } from "react";
import { dossiesApi, type DossieResumo, type DossieStatus } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, Loader2, FileText } from "lucide-react";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";
import { useToast } from "@/hooks/toast-context";

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

  if (loading) {
    return (
      <div className="max-w-4xl">
        <PageSkeleton variant="list" count={5} />
      </div>
    );
  }

  const pendentes = lista.filter((d) => d.status === "ENVIADO" || d.status === "EM_ANALISE");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fila de viabilidade</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aprovar ou reprovar dossiês de crédito enviados pelos tomadores.
        </p>
      </div>

      {pendentes.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="mr-2 inline h-4 w-4" />
          {pendentes.length} dossiê(s) aguardando análise
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="divide-y divide-gray-50">
          {lista.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-500">Nenhum dossiê cadastrado.</p>
          ) : (
            lista.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#1B4FD8]" />
                  <div>
                    <p className="font-semibold text-gray-900">{d.nomeEmpreendimento}</p>
                    <p className="text-xs text-gray-500">
                      {d.estagioObra?.replace(/_/g, " ")} · {d.status} ·{" "}
                      {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
