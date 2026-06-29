"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { adminApi, type AdminObraResumo } from "@/lib/api";
import { useToast } from "@/hooks/toast-context";
import { IMOBI_FINANCEIRO_WHATS_DISPLAY } from "@/lib/financeiro";
import { Building2, CheckCircle2, XCircle, AlertTriangle, Banknote, ChevronRight } from "lucide-react";

export function AdminSipocPanel() {
  const { success, error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const [obras, setObras] = useState<AdminObraResumo[]>([]);
  const [pagamentosPendentes, setPagamentosPendentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [obrasData, libData] = await Promise.all([
        adminApi.listarObras(100),
        adminApi.listarLiberacoesAguardandoPagamento(),
      ]);
      setObras(obrasData);
      setPagamentosPendentes(libData.length);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar SIPOC");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const obrasHomologacao = obras.filter((o) => o.status === "AGUARDANDO_HOMOLOGACAO");

  const homologar = async (obraId: string) => {
    setBusyId(obraId);
    try {
      await adminApi.homologarObra(obraId);
      success("Obra homologada — entrou no pipe ativo.");
      await recarregar();
    } catch (err) {
      toastErrorRef.current(err instanceof Error ? err.message : "Erro ao homologar");
    } finally {
      setBusyId(null);
    }
  };

  const reprovar = async (obraId: string) => {
    const motivo = window.prompt("Motivo da reprovação da homologação:");
    if (!motivo?.trim()) return;
    setBusyId(obraId);
    try {
      await adminApi.reprovarHomologacao(obraId, motivo.trim());
      success("Homologação reprovada.");
      await recarregar();
    } catch (err) {
      toastErrorRef.current(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
        Carregando fluxo SIPOC…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void recarregar();
            }}
            className="shrink-0 text-sm font-semibold text-red-700 underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-sm font-semibold text-blue-900">Fluxo SIPOC — liberação manual</p>
        <p className="mt-1 text-xs text-blue-800">
          Viabilidade (dossiê aprovado) → Tomador cadastra obra → Admin homologa → Engenheiro aprova
          vistoria → pagamento manual → confirmação financeiro IMOBI ({IMOBI_FINANCEIRO_WHATS_DISPLAY}).
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <Building2 className="h-4 w-4 text-[#1B4FD8]" />
          <h3 className="text-sm font-bold text-gray-900">Obras aguardando homologação</h3>
          <span className="ml-auto text-xs font-semibold text-gray-500">{obrasHomologacao.length}</span>
        </div>
        {obrasHomologacao.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Nenhuma obra pendente de homologação.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {obrasHomologacao.map((obra) => (
              <div key={obra.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{obra.nome}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {obra.tomador ?? "Tomador"} · aguardando homologação
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === obra.id}
                    onClick={() => homologar(obra.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Homologar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === obra.id}
                    onClick={() => reprovar(obra.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/dashboard/admin/pagamentos"
        className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-[#16a34a]/30 hover:shadow-md"
      >
        <div className="rounded-xl bg-green-50 p-2.5 text-[#16a34a]">
          <Banknote className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">Pagamentos SIPOC</p>
          <p className="text-xs text-gray-500">
            {pagamentosPendentes === 0
              ? "Nenhuma liberação aguardando confirmação"
              : `${pagamentosPendentes} liberação(ões) aguardando pagamento manual`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-[#16a34a]" />
      </Link>
    </div>
  );
}
