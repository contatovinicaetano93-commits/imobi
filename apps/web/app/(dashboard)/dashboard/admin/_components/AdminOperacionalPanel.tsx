"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { adminApi, type AdminObraResumo, type AdminTranchePendente } from "@/lib/api";
import { useToast } from "@/hooks/toast-context";
import { formatarBRL } from "@imbobi/core";
import { Building2, Banknote, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";

export function AdminOperacionalPanel() {
  const { success, error: toastError } = useToast();
  const [obras, setObras] = useState<AdminObraResumo[]>([]);
  const [tranches, setTranches] = useState<AdminTranchePendente[]>([]);
  const [engenheiros, setEngenheiros] = useState<{ id: string; nome: string }[]>([]);
  const [engPorObra, setEngPorObra] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [obrasData, tranchesData, engData] = await Promise.all([
        adminApi.listarObras(),
        adminApi.tranchesPendentesLiberacao(),
        adminApi.listarEngenheiros(),
      ]);
      setObras(obrasData);
      setTranches(tranchesData);
      setEngenheiros(engData.map((e) => ({ id: e.id, nome: e.nome })));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar painel operacional");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const obrasHomologacao = obras.filter((o) => o.etapa === "OBRA_CADASTRADA");

  const homologar = async (obraId: string) => {
    const engenheiroId = engPorObra[obraId];
    if (!engenheiroId) {
      toastError("Selecione um engenheiro responsável.");
      return;
    }
    setBusyId(obraId);
    try {
      await adminApi.homologarObra(obraId, engenheiroId);
      success("Obra homologada e engenheiro vinculado.");
      await recarregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao homologar");
    } finally {
      setBusyId(null);
    }
  };

  const liberar = async (trancheId: string) => {
    setBusyId(trancheId);
    try {
      await adminApi.liberarTranche(trancheId);
      success("Tranche liberada.");
      await recarregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao liberar tranche");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
        Carregando filas operacionais…
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
          <button type="button" onClick={() => { setLoading(true); void recarregar(); }} className="text-sm font-semibold text-red-700 underline">
            Tentar novamente
          </button>
        </div>
      ) : null}

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
              <div key={obra.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{obra.nome}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {obra.cliente?.nome ?? "Cliente"} · {obra.endereco ?? "—"}
                  </p>
                </div>
                <select
                  value={engPorObra[obra.id] ?? ""}
                  onChange={(e) => setEngPorObra((prev) => ({ ...prev, [obra.id]: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
                >
                  <option value="">Engenheiro…</option>
                  {engenheiros.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busyId === obra.id}
                  onClick={() => homologar(obra.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Homologar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <Banknote className="h-4 w-4 text-[#16a34a]" />
          <h3 className="text-sm font-bold text-gray-900">Tranches aguardando liberação</h3>
          <span className="ml-auto text-xs font-semibold text-gray-500">{tranches.length}</span>
        </div>
        {tranches.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Nenhuma tranche validada aguardando liberação.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {tranches.map((t) => (
              <div key={t.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{t.obra.nome} · tranche {t.numero}</p>
                  <p className="text-xs text-gray-500">{t.obra.cliente.nome} · {formatarBRL(Number(t.valor))}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => liberar(t.id)}
                  className="rounded-lg bg-[#1B4FD8] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Liberar valor
                </button>
              </div>
            ))}
          </div>
        )}
        <Link
          href={"/dashboard/admin/tranches" as Route}
          className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs font-semibold text-[#1B4FD8] no-underline hover:bg-blue-50/50"
        >
          Ver fila completa de tranches
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
