"use client";

import Link from "next/link";
import { Plus, Building2, ArrowRight, HardHat, MapPin } from "lucide-react";
import type { ObraResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { EmptyState } from "@/app/(dashboard)/_components/EmptyState";
import { PanelSection } from "@/components/dashboard/PanelSection";
import { DashboardPanelShell } from "@/components/dashboard/DashboardPanelShell";
import { isEngenheiro } from "@/lib/role-permissions";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "Aguardando homologação IMOBI",
  EM_EXECUCAO: "Em andamento",
  EM_ANDAMENTO: "Em andamento",
  PLANEJAMENTO: "Planejamento",
  CONCLUIDA: "Concluída",
  PAUSADA: "Pausada",
  CANCELADA: "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  EM_EXECUCAO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PLANEJAMENTO: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  CONCLUIDA: "bg-green-50 text-green-700 ring-1 ring-green-200",
  PAUSADA: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  CANCELADA: "bg-red-50 text-red-600 ring-1 ring-red-200",
};

const STATUS_PROGRESS_COLOR: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "bg-amber-400",
  EM_EXECUCAO: "bg-[#1B4FD8]",
  EM_ANDAMENTO: "bg-[#1B4FD8]",
  PLANEJAMENTO: "bg-gray-400",
  CONCLUIDA: "bg-[#16a34a]",
  PAUSADA: "bg-yellow-400",
  CANCELADA: "bg-red-400",
};

const OBRAS_PANELS = [{ id: "obras-lista", priority: "primary" as const }];

type Props = {
  obras: ObraResumo[];
  role: string | null;
};

function vistoriaHref(obra: ObraResumo): string {
  const pendente = obra.etapas?.find((e) => e.status === "AGUARDANDO_VISTORIA");
  if (pendente?.id) {
    return `/dashboard/engenheiro/${pendente.id}`;
  }
  return `/dashboard/obras/${obra.id}`;
}

export function ObrasListClient({ obras, role }: Props) {
  const engenheiro = isEngenheiro(role);
  const canCreate = !engenheiro && role !== "GESTOR" && role !== "ADMIN";

  const title = engenheiro ? "Obras em vistoria" : "Minhas Obras";
  const subtitle = engenheiro
    ? obras.length === 0
      ? "Nenhuma obra aguardando vistoria técnica"
      : `${obras.length} obra${obras.length !== 1 ? "s" : ""} com etapas no pipe`
    : obras.length === 0
      ? "Nenhuma obra cadastrada"
      : `${obras.length} obra${obras.length !== 1 ? "s" : ""} cadastrada${obras.length !== 1 ? "s" : ""}`;

  return (
    <DashboardPanelShell
      panels={OBRAS_PANELS}
      maxWidth="lg"
      content={
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              {engenheiro ? (
                <p className="text-xs text-orange-700 mt-2 max-w-xl">
                  Somente leitura de evidências e vistoria técnica — o cadastro de obra é do cliente tomador
                  após homologação pelo Admin.
                </p>
              ) : null}
            </div>
            {canCreate ? (
              <Link
                href="/dashboard/obras/nova"
                className="inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Nova Obra
              </Link>
            ) : null}
          </div>

          <PanelSection
            id="obras-lista"
            title={engenheiro ? "Obras com vistoria" : "Portfólio de obras"}
            icon={<Building2 className="w-4 h-4 text-[#1B4FD8]" />}
            priority="primary"
            badge={obras.length || undefined}
            summary={
              obras.length === 0
                ? engenheiro
                  ? "Aguardando etapas do SIPOC"
                  : "Cadastre sua primeira obra"
                : `${obras.length} obra(s)`
            }
          >
            {obras.length === 0 ? (
              <EmptyState
                icon={engenheiro ? MapPin : HardHat}
                title={engenheiro ? "Nenhuma obra no pipe" : "Nenhuma obra cadastrada"}
                description={
                  engenheiro
                    ? "Quando o tomador enviar evidências e a etapa entrar em AGUARDANDO_VISTORIA, a obra aparece aqui e na fila de vistorias."
                    : "Comece cadastrando sua primeira obra para acompanhar o progresso e gerenciar créditos."
                }
                action={
                  canCreate
                    ? { label: "Cadastrar primeira obra", href: "/dashboard/obras/nova", icon: Plus }
                    : engenheiro
                      ? { label: "Ir para vistorias", href: "/dashboard/engenheiro/vistoria", icon: MapPin }
                      : undefined
                }
              />
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {obras.map((obra) => {
                  const progress = obra.progresso ?? 0;
                  const barColor = STATUS_PROGRESS_COLOR[obra.status] ?? "bg-gray-400";
                  const badge = STATUS_BADGE[obra.status] ?? "bg-gray-100 text-gray-500";
                  const label = STATUS_LABEL[obra.status] ?? obra.status.replace(/_/g, " ");
                  const href = engenheiro ? vistoriaHref(obra) : `/dashboard/obras/${obra.id}`;
                  const pendente = obra.etapas?.filter((e) => e.status === "AGUARDANDO_VISTORIA").length ?? 0;

                  return (
                    <Link
                      key={obra.id}
                      href={href as "/dashboard/obras"}
                      className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg-gray-50 rounded-xl shrink-0 group-hover:bg-blue-50 transition-colors">
                            <Building2 className="w-5 h-5 text-gray-400 group-hover:text-[#1B4FD8] transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{obra.nome}</h3>
                            {obra.endereco && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{obra.endereco}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge}`}>
                          {label}
                        </span>
                      </div>

                      {engenheiro && pendente > 0 ? (
                        <p className="text-xs font-medium text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                          {pendente} etapa(s) aguardando vistoria técnica
                        </p>
                      ) : null}

                      <div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                          <span className="font-medium">Progresso geral</span>
                          <span className="font-bold text-gray-700">{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      {obra.credito && !engenheiro ? (
                        <div className="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
                          <span>Crédito {obra.credito.status}</span>
                          <span className="font-semibold text-gray-700">
                            {formatarBRL(obra.credito.valorLiberado)} / {formatarBRL(obra.credito.valorAprovado)}
                          </span>
                        </div>
                      ) : null}

                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4FD8] group-hover:gap-2 transition-all">
                        {engenheiro ? "Abrir vistoria" : "Ver detalhes"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </PanelSection>
        </>
      }
    />
  );
}
