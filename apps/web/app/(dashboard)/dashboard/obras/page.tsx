import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Building2, ArrowRight, HardHat } from "lucide-react";
import { obrasApi, type ObraResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { EmptyState } from "@/app/(dashboard)/_components/EmptyState";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Minhas Obras — imbobi" };

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "Aguardando homologação IMOBI",
  EM_EXECUCAO:  "Em andamento",
  EM_ANDAMENTO: "Em andamento",
  PLANEJAMENTO: "Planejamento",
  CONCLUIDA:    "Concluída",
  PAUSADA:      "Pausada",
  CANCELADA:    "Cancelada",
};

const STATUS_BADGE: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  EM_EXECUCAO:  "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PLANEJAMENTO: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  CONCLUIDA:    "bg-green-50 text-green-700 ring-1 ring-green-200",
  PAUSADA:      "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
  CANCELADA:    "bg-red-50 text-red-600 ring-1 ring-red-200",
};

const STATUS_PROGRESS_COLOR: Record<string, string> = {
  AGUARDANDO_HOMOLOGACAO: "bg-amber-400",
  EM_EXECUCAO:  "bg-[#1B4FD8]",
  EM_ANDAMENTO: "bg-[#1B4FD8]",
  PLANEJAMENTO: "bg-gray-400",
  CONCLUIDA:    "bg-[#16a34a]",
  PAUSADA:      "bg-yellow-400",
  CANCELADA:    "bg-red-400",
};

export default async function ObrasPage() {
  const obras = await obrasApi.listar().catch(() => [] as ObraResumo[]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Minhas Obras</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {obras.length === 0
              ? "Nenhuma obra cadastrada"
              : `${obras.length} obra${obras.length !== 1 ? "s" : ""} cadastrada${obras.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/dashboard/obras/nova"
          className="inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Nova Obra
        </Link>
      </div>

      {obras.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Nenhuma obra cadastrada"
          description="Comece cadastrando sua primeira obra para acompanhar o progresso e gerenciar créditos."
          action={{ label: "Cadastrar primeira obra", href: "/dashboard/obras/nova", icon: Plus }}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {obras.map((obra: ObraResumo) => {
            const progress = obra.progresso ?? 0;
            const barColor = STATUS_PROGRESS_COLOR[obra.status] ?? "bg-gray-400";
            const badge = STATUS_BADGE[obra.status] ?? "bg-gray-100 text-gray-500";
            const label = STATUS_LABEL[obra.status] ?? obra.status.replace(/_/g, " ");

            return (
              <Link
                key={obra.id}
                href={`/dashboard/obras/${obra.id}`}
                className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4"
              >
                {/* Card Header */}
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

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                    <span className="font-medium">Progresso geral</span>
                    <span className="font-bold text-gray-700">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Credit Info */}
                {obra.credito ? (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Crédito aprovado</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {formatarBRL(Number(obra.credito.valorAprovado))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 mb-0.5">Liberado</p>
                      <p className="text-sm font-semibold text-[#16a34a]">
                        {formatarBRL(Number(obra.credito.valorLiberado))}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1B4FD8] transition-colors" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <p className="text-xs text-gray-400">Sem crédito vinculado</p>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1B4FD8] transition-colors" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
