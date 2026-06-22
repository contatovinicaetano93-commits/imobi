"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, ChevronRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { dueDiligenceApi, type DueDiligenceResumo } from "@/lib/api";

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  ENVIADO:    { label: "Enviado",    cls: "bg-blue-100 text-blue-800",    icon: Clock },
  EM_ANALISE: { label: "Em análise", cls: "bg-yellow-100 text-yellow-800", icon: Clock },
  APROVADO:   { label: "Aprovado",   cls: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  REJEITADO:  { label: "Rejeitado",  cls: "bg-red-100 text-red-800",      icon: AlertCircle },
};

export default function DueDiligenceListPage() {
  const [items, setItems] = useState<DueDiligenceResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dueDiligenceApi
      .listar()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Due Diligence</h1>
          <p className="text-sm text-gray-500 mt-1">Análises de empreendimentos para o fundo</p>
        </div>
        <Link
          href="/dashboard/gestor/due-diligence/nova"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1B4FD8] hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Nova análise
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nenhuma due diligence registrada</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Inicie uma nova análise de empreendimento.</p>
          <Link
            href="/dashboard/gestor/due-diligence/nova"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4FD8]"
          >
            Criar primeira análise <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {items.map((dd) => {
            const badge = STATUS_BADGE[dd.status] ?? STATUS_BADGE.ENVIADO;
            const Icon = badge.icon;
            return (
              <div key={dd.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <div className="w-10 h-10 rounded-xl bg-[#EEF3FF] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#1B4FD8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{dd.nomeEmpreendimento}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[dd.cidade, dd.uf].filter(Boolean).join(", ") || "Local não informado"}
                    {dd.tipologia ? ` · ${dd.tipologia}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Criado em {new Date(dd.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                  <Icon className="w-3 h-3" />
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
