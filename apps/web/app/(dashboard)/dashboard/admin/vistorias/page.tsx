"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { managerApi, type EtapaPendente, ApiError } from "@/lib/api";
import { AdminSubpageHeader } from "@/app/(dashboard)/_components/admin/AdminSubpageHeader";
import { ManagerListBanner } from "@/app/(dashboard)/_components/gestor/ManagerListBanner";
import { PageSkeleton } from "@/app/(dashboard)/_components/PageSkeleton";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function hoursAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
}

export default function AdminVistoriasPage() {
  const [data, setData] = useState<{ etapas: EtapaPendente[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEtapas = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    return managerApi
      .listarEtapasPendentes(100, 0, { status: "pendente" })
      .then((d) => {
        setData(d);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setData({ etapas: [], total: 0 });
        const msg =
          err instanceof ApiError
            ? `${err.message} Faça logout/login. Se persistir, redeploy a API no Render.`
            : "Não foi possível carregar etapas aguardando vistoria.";
        setLoadError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadEtapas();
  }, [loadEtapas]);

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-5xl">
        <AdminSubpageHeader title="Fila de vistorias" subtitle="Carregando etapas pendentes…" />
        <PageSkeleton variant="timeline" count={3} showHeader={false} />
      </div>
    );
  }

  const etapas = data?.etapas ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6 max-w-5xl pb-8">
      {loadError && (
        <ManagerListBanner
          variant="error"
          message={loadError}
          onRetry={loadEtapas}
          retrying={loading}
        />
      )}

      <AdminSubpageHeader
        title="Fila de vistorias"
        subtitle={`${total} etapa${total !== 1 ? "s" : ""} aguardando vistoria do engenheiro`}
        onRefresh={loadEtapas}
        refreshing={loading}
        badge={
          total > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 ring-1 ring-orange-200">
              {total} pendente{total !== 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        Como Admin, você monitora a fila operacional. A execução da vistoria é feita pelo perfil{" "}
        <strong>Engenheiro</strong> em{" "}
        <Link href="/dashboard/engenheiro/vistoria" className="underline font-semibold">
          Agenda de Vistorias
        </Link>
        .
      </p>

      {etapas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Nenhuma etapa aguardando vistoria</p>
          <p className="text-sm text-gray-500 mt-1">A fila está zerada no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {etapas.map((etapa) => {
            const horas = hoursAgo(etapa.criadoEm);
            const urgente = horas >= 24;

            return (
              <div
                key={etapa.etapaId}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div
                    className={`w-1.5 self-stretch rounded-full ${
                      urgente ? "bg-red-400" : horas >= 12 ? "bg-yellow-400" : "bg-green-400"
                    }`}
                  />

                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{etapa.obra.nome}</p>
                        <p className="text-sm text-gray-500">
                          {etapa.nome} (etapa {etapa.ordem})
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">Liberação</p>
                        <p className="text-lg font-bold text-[#1B4FD8]">{brl(etapa.valorLiberacao)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>{etapa.obra.usuario.nome}</span>
                      <span>{etapa.evidenciasCount} foto{etapa.evidenciasCount !== 1 ? "s" : ""}</span>
                      <span className={urgente ? "text-red-600 font-medium" : ""}>
                        {horas}h aguardando
                      </span>
                      <span className="text-gray-400">{formatDate(etapa.criadoEm)}</span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/obras/${etapa.obra.obraId}`}
                    className="shrink-0 bg-[#0C1A3D] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1a2f6b] transition-colors"
                  >
                    Ver obra
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
