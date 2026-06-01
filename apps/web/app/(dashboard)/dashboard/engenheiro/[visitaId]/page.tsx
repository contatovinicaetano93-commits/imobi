import type { Metadata } from "next";
import { engenheirosApi, obrasApi } from "@/lib/api";
import { ValidationFormClient } from "./validation-form-client";

export const metadata: Metadata = { title: "Validação de Etapa — imbobi" };

type Props = {
  params: Promise<{ visitaId: string }>;
};

export default async function InspectionPage({ params }: Props) {
  const { visitaId } = await params;

  let visita = null;
  let validacao = null;
  let obra = null;
  let error = null;

  try {
    visita = await engenheirosApi.obterVisita(visitaId);
    validacao = await engenheirosApi.obterValidacao(visitaId).catch(() => null);
    if (visita) {
      obra = await obrasApi.buscar(visita.obra.id).catch(() => null);
    }
  } catch (err) {
    error = "Falha ao carregar os dados da visita.";
  }

  if (error || !visita) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-semibold">{error || "Visita não encontrada"}</p>
          <a href="/dashboard/engenheiro" className="mt-4 inline-block text-brand-600 font-medium">
            Voltar para fila
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <a href="/dashboard/engenheiro" className="text-brand-600 hover:text-brand-700">
          Fila de Visitas
        </a>
        <span>/</span>
        <span className="text-gray-900 font-semibold">{visita.obra.nome}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{visita.obra.nome}</h1>
            <p className="text-gray-600 mt-1">{visita.obra.endereco}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 uppercase">Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                visita.status === "AGENDADA" ? "bg-blue-100 text-blue-700" :
                visita.status === "INICIADA" ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              }`}>
                {visita.status === "AGENDADA" ? "Agendada" :
                 visita.status === "INICIADA" ? "Iniciada" :
                 "Concluída"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Agendada em {new Date(visita.dataAgendada).toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Form */}
      <ValidationFormClient
        visitaId={visitaId}
        visita={visita}
        obra={obra}
        initialValidacao={validacao}
      />
    </div>
  );
}
