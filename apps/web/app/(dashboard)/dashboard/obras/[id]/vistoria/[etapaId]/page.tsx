import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obrasServerApi, evidenciasServerApi, type EvidenciaDetalhe } from "@/lib/api.server";
import { formatarBRL } from "@imbobi/core";
import { AprovarEtapaForm } from "./aprovar-form";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: "Vistoria — imbobi" };

export default async function VistoriaPage({
  params,
}: {
  params: { id: string; etapaId: string };
}) {
  const [obra, evidencias] = await Promise.all([
    obrasServerApi.buscar(params.id).catch(() => null),
    evidenciasServerApi.listarPorEtapa(params.etapaId).catch(() => []),
  ]);
  if (!obra) notFound();

  // The NestJS API returns etapas with field "etapaId"; fall back to "id" for
  // forward-compatibility if the shape ever normalises.
  const etapa = obra.etapas?.find(
    (e) => ((e as unknown as Record<string, string>).etapaId ?? e.id) === params.etapaId
  );
  if (!etapa) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="text-sm text-gray-500 flex gap-2">
        <a href="/dashboard/obras" className="hover:text-brand-600">Obras</a>
        <span>/</span>
        <a href={`/dashboard/obras/${params.id}`} className="hover:text-brand-600">{obra.nome}</a>
        <span>/</span>
        <span className="text-gray-900 font-medium">Vistoria: {etapa.nome}</span>
      </div>

      <div className="bg-white rounded-2xl border border-yellow-200 p-5 shadow-sm flex justify-between items-center">
        <div>
          <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mb-1">
            Aguardando vistoria
          </p>
          <h1 className="text-xl font-bold text-gray-900">{etapa.nome}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Liberação ao aprovar</p>
          <p className="text-2xl font-bold text-brand-600">{formatarBRL(Number(etapa.valorLiberacao))}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Evidências ({evidencias.length})
        </h2>
        {evidencias.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma evidência enviada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {evidencias.map((ev: EvidenciaDetalhe) => (
              <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <img src={ev.fotoUrl} alt="Evidência" className="w-full aspect-video object-cover" />
                <div className="p-4 space-y-1">
                  <p className="text-xs text-gray-500">
                    {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                  </p>
                  {ev.distanciaObra !== undefined && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ A {Math.round(ev.distanciaObra)}m da obra
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {Number(ev.latCaptura).toFixed(6)}, {Number(ev.lngCaptura).toFixed(6)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AprovarEtapaForm
        etapaId={params.etapaId}
        obraId={params.id}
        valorLiberacao={Number(etapa.valorLiberacao)}
      />
    </div>
  );
}
