"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminObraResumo } from "@/lib/api";
import { AdminSubpageHeader } from "@/app/(dashboard)/_components/admin/AdminSubpageHeader";
import { AdminOperacionalPanel } from "../_components/AdminOperacionalPanel";
import { formatarBRL } from "@imbobi/core";

const ETAPA_LABEL: Record<string, string> = {
  KYC_PENDENTE: "KYC pendente",
  DOSSIE_EM_ANALISE: "Dossiê em análise",
  APROVADO: "Aprovado",
  OBRA_CADASTRADA: "Aguardando homologação",
  HOMOLOGADA: "Homologada",
  EM_ANDAMENTO: "Em andamento",
  QUITADO: "Quitada",
};

export default function AdminObrasPage() {
  const [obras, setObras] = useState<AdminObraResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(() => {
    setLoading(true);
    return adminApi.listarObras().then(setObras).catch(() => setObras([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <AdminSubpageHeader
        title="Gestão de obras"
        subtitle="Homologação com engenheiro e acompanhamento do funil EtapaFunil."
        onRefresh={carregar}
        refreshing={loading}
        badge={obras.length ? `${obras.length} obra(s)` : undefined}
      />

      <AdminOperacionalPanel />

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-gray-900">Portfólio</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : obras.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma obra cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {obras.map((obra) => (
              <div key={obra.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">{obra.nome}</p>
                  <p className="text-xs text-gray-500">{obra.cliente?.nome ?? "Cliente"} · {obra.endereco}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#1B4FD8]">{ETAPA_LABEL[obra.etapa] ?? obra.etapa}</p>
                  {obra.valorCredito != null && (
                    <p className="text-xs text-gray-500">{formatarBRL(Number(obra.valorCredito))}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
