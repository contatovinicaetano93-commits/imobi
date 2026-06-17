"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ObraResumo, EvidenciaDetalhe } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { AprovarEtapaForm } from "./aprovar-form";

export default function VistoriaPage({ params }: { params: { id: string; etapaId: string } }) {
  const router = useRouter();
  const [obra, setObra] = useState<ObraResumo | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaDetalhe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/proxy/obras/${params.id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/proxy/evidencias/${params.etapaId}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([obraData, evidenciasData]) => {
        if (!obraData) { router.replace('/dashboard/obras'); return; }
        setObra(obraData);
        setEvidencias(evidenciasData ?? []);
      })
      .finally(() => setLoading(false));
  }, [params.id, params.etapaId, router]);

  if (loading) return <div className="text-gray-400 p-8">Carregando...</div>;
  if (!obra) return null;

  const etapa = obra.etapas?.find((e) => e.id === params.etapaId);
  if (!etapa) return <div className="p-8 text-red-600">Etapa não encontrada.</div>;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="text-sm text-gray-500 flex gap-2">
        <a href="/dashboard/obras" className="hover:text-[#1B4FD8]">Obras</a>
        <span>/</span>
        <a href={`/dashboard/obras/${params.id}`} className="hover:text-[#1B4FD8]">{obra.nome}</a>
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
          <p className="text-2xl font-bold text-[#1B4FD8]">{formatarBRL(Number(etapa.valorLiberacao))}</p>
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
