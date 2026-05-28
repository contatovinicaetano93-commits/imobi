import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obrasApi, type EtapaResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const metadata: Metadata = { title: "Detalhe da Obra — imbobi" };

const STATUS_STYLE: Record<string, string> = {
  APROVADA:            "bg-green-50 text-green-700 border-green-200",
  EM_PROGRESSO:        "bg-blue-50 text-blue-700 border-blue-200",
  AGUARDANDO_VISTORIA: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PENDENTE:            "bg-gray-50 text-gray-500 border-gray-200",
  REJEITADA:           "bg-red-50 text-red-700 border-red-200",
};

export default async function ObraDetailPage({ params }: { params: { id: string } }) {
  const obra = await obrasApi.buscar(params.id).catch(() => null);
  if (!obra) notFound();

  const progresso = await obrasApi.progresso(params.id).catch(() => 0);
  const etapas = obra.etapas ?? [];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{obra.nome}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {obra.status.replace(/_/g, " ")}
        </p>
      </div>

      {obra.credito && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Crédito aprovado", value: formatarBRL(Number(obra.credito.valorAprovado)) },
            { label: "Total liberado",   value: formatarBRL(Number(obra.credito.valorLiberado)), green: true },
            { label: "Progresso",        value: `${progresso}%`, green: true },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.green ? "text-brand-600" : "text-gray-900"}`}>
                {k.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Progresso geral</span>
          <span className="font-semibold text-brand-600">{progresso}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cronograma de Etapas</h2>
        <div className="space-y-3">
          {etapas.map((etapa: EtapaResumo) => (
            <div key={etapa.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                {etapa.ordem}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{etapa.nome}</p>
                <p className="text-sm text-gray-500">
                  {etapa.percentualObra}% · {formatarBRL(Number(etapa.valorLiberacao))}
                </p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-gray-900">{etapa.evidencias?.length ?? 0}</p>
                <p className="text-xs text-gray-400">fotos</p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[etapa.status] ?? STATUS_STYLE["PENDENTE"]}`}>
                {etapa.status.replace(/_/g, " ")}
              </span>
              {etapa.status === "AGUARDANDO_VISTORIA" && (
                <a
                  href={`/dashboard/obras/${obra.id}/vistoria/${etapa.id}`}
                  className="shrink-0 bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors"
                >
                  Vistorar
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
