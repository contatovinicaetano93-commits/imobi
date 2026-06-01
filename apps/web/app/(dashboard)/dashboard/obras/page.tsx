import type { Metadata } from "next";
import { obrasApi } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

export const metadata: Metadata = { title: "Minhas Obras — imbobi" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  EM_ANDAMENTO: "bg-blue-50 text-blue-700",
  PLANEJAMENTO: "bg-yellow-50 text-yellow-700",
  CONCLUIDA:    "bg-green-50 text-green-700",
  PAUSADA:      "bg-gray-50 text-gray-600",
  CANCELADA:    "bg-red-50 text-red-600",
};

export default async function ObrasPage() {
  const obras = await obrasApi.listar().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Obras</h1>
        <a
          href="/dashboard/obras/nova"
          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          + Nova Obra
        </a>
      </div>

      {obras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-4">🏗️</p>
          <p className="text-gray-500 mb-4">Você ainda não tem obras cadastradas.</p>
          <a href="/dashboard/obras/nova" className="bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-semibold">
            Cadastrar primeira obra
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {obras.map((obra) => (
            <a
              key={obra.id}
              href={`/dashboard/obras/${obra.id}`}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{obra.nome}</h3>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[obra.status] ?? "bg-gray-50 text-gray-500"}`}>
                  {obra.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progresso geral</span>
                  <span>{obra.progresso ?? 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: `${obra.progresso ?? 0}%` }} />
                </div>
              </div>
              {obra.credito && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Crédito: {formatarBRL(Number(obra.credito.valorAprovado))}</span>
                  <span>Liberado: {formatarBRL(Number(obra.credito.valorLiberado))}</span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
