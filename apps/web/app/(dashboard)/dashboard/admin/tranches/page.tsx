"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminTranchePendente } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { AdminSubpageHeader } from "@/app/(dashboard)/_components/admin/AdminSubpageHeader";
import { useToast } from "@/hooks/toast-context";

export default function AdminTranchesPage() {
  const { success, error: toastError } = useToast();
  const [tranches, setTranches] = useState<AdminTranchePendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTranches(await adminApi.tranchesPendentesLiberacao());
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao carregar tranches");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { void load(); }, [load]);

  async function liberar(id: string) {
    setBusyId(id);
    try {
      await adminApi.liberarTranche(id);
      success("Tranche liberada.");
      await load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Erro ao liberar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <AdminSubpageHeader
        title="Liberação de tranches"
        subtitle="Tranches validadas pelo engenheiro aguardando liberação manual do admin."
        onRefresh={load}
        refreshing={loading}
        badge={tranches.length > 0 ? `${tranches.length} pendente(s)` : undefined}
      />

      {loading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : tranches.length === 0 ? (
        <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
          Nenhuma tranche aguardando liberação.
        </p>
      ) : (
        <div className="space-y-3">
          {tranches.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{t.obra.nome}</p>
                <p className="text-sm text-gray-500">
                  Tranche {t.numero} · {t.obra.cliente.nome} · {formatarBRL(Number(t.valor))}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === t.id}
                onClick={() => liberar(t.id)}
                className="rounded-xl bg-[#1B4FD8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Liberar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
