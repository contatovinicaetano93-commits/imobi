"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ArrowRight, Workflow, Link2 } from "lucide-react";
import { adminApi, type AdminObraResumo } from "@/lib/api";
import { AdminSubpageHeader } from "@/app/(dashboard)/_components/admin/AdminSubpageHeader";
import { AdminFlowGuide } from "@/app/(dashboard)/_components/admin/AdminFlowGuide";
import { AdminSipocPanel } from "../_components/AdminSipocPanel";
import { EmptyState } from "@/app/(dashboard)/_components/EmptyState";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";

const ADMIN_OBRAS_PANELS = [
  { id: "obras-sipoc", priority: "primary" as const },
  { id: "obras-portfolio", priority: "primary" as const },
  { id: "obras-atalhos", priority: "secondary" as const },
];

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "Aguardando homologação",
  PLANEJAMENTO: "Planejamento",
  EM_EXECUCAO: "Em execução",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  PAUSADA: "Pausada",
  CANCELADA: "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  PLANEJAMENTO: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  EM_EXECUCAO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  CONCLUIDA: "bg-green-50 text-green-700 ring-1 ring-green-200",
  PAUSADA: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  CANCELADA: "bg-red-50 text-red-600 ring-1 ring-red-200",
};

export default function AdminObrasPage() {
  const [obras, setObras] = useState<AdminObraResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todas" | "homologacao">("todas");

  const carregar = useCallback(() => {
    setLoading(true);
    return adminApi
      .listarObras(200)
      .then(setObras)
      .catch(() => setObras([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .listarObras(200)
      .then((data) => {
        if (active) setObras(data);
      })
      .catch(() => {
        if (active) setObras([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pendentesHomologacao = obras.filter((o) => o.status === "AGUARDANDO_HOMOLOGACAO");

  const visiveis =
    filter === "homologacao"
      ? pendentesHomologacao
      : obras;

  return (
    <DashboardPanelShell
      panels={ADMIN_OBRAS_PANELS}
      maxWidth="lg"
      content={
        <>
      <AdminSubpageHeader
        title="Gestão de Obras"
        subtitle="Homologação, acompanhamento do portfólio e pagamentos manuais — tudo no contexto Admin."
        onRefresh={carregar}
        refreshing={loading}
        badge={
          pendentesHomologacao.length > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200">
              {pendentesHomologacao.length} aguardando homologação
            </span>
          ) : null
        }
      />

      <PanelSection
        id="obras-sipoc"
        title="Fluxo SIPOC e liberações"
        icon={<Workflow className="w-4 h-4 text-[#1B4FD8]" />}
        priority="primary"
        summary="Homologação, vistoria e pagamento manual"
      >
        <div className="space-y-4">
          <AdminFlowGuide activeStep={2} />
          <AdminSipocPanel />
        </div>
      </PanelSection>

      <PanelSection
        id="obras-portfolio"
        title="Portfólio completo"
        icon={<Building2 className="w-4 h-4 text-[#1B4FD8]" />}
        priority="primary"
        badge={obras.length || undefined}
        summary={
          loading
            ? "Carregando…"
            : `${obras.length} obra${obras.length !== 1 ? "s" : ""} na plataforma`
        }
      >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "todas" as const, label: "Todas" },
              { id: "homologacao" as const, label: `Homologação (${pendentesHomologacao.length})` },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                filter === id
                  ? "bg-[#0C1A3D] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={filter === "homologacao" ? "Nenhuma obra pendente" : "Nenhuma obra cadastrada"}
            description={
              filter === "homologacao"
                ? "Todas as obras foram homologadas ou ainda não há cadastros."
                : "Quando construtores cadastrarem obras, elas aparecerão aqui para homologação."
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {visiveis.map((obra) => {
              const badge = STATUS_BADGE[obra.status] ?? "bg-gray-100 text-gray-500";
              const label = STATUS_LABEL[obra.status] ?? obra.status.replace(/_/g, " ");
              const needsHomolog = obra.status === "AGUARDANDO_HOMOLOGACAO";

              return (
                <Link
                  key={obra.id}
                  href={`/dashboard/obras/${obra.id}?from=admin`}
                  className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-gray-50 rounded-xl shrink-0 group-hover:bg-blue-50 transition-colors">
                        <Building2 className="w-5 h-5 text-gray-400 group-hover:text-[#1B4FD8] transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{obra.nome}</h3>
                        {obra.tomador && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{obra.tomador}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge}`}>
                      {label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    {needsHomolog ? (
                      <span className="text-xs font-semibold text-amber-700">
                        Ação: homologar na seção acima
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Ver detalhes da obra</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1B4FD8] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      </PanelSection>

      <PanelSection
        id="obras-atalhos"
        title="Atalhos Admin"
        icon={<Link2 className="w-4 h-4 text-gray-500" />}
        priority="secondary"
        summary="Pipeline, comitê e KPIs do fundo"
      >
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <Link href="/dashboard/admin/pipeline" className="text-[#1B4FD8] font-semibold hover:underline">
          Pipeline comercial
        </Link>
        <Link href="/dashboard/admin/comite" className="text-[#1B4FD8] font-semibold hover:underline">
          Comitê
        </Link>
        <Link href="/dashboard/gestor" className="text-[#1B4FD8] font-semibold hover:underline">
          KPIs do fundo
        </Link>
      </div>
      </PanelSection>
        </>
      }
    />
  );
}
