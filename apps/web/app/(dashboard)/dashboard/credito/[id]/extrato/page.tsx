"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { creditoApi, type CreditoResumo, type LiberacaoResumo } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";

const STATUS_STYLE: Record<string, string> = {
  PENDENTE:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  PROCESSANDO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDA:   "bg-green-50 text-green-700 border-green-200",
  FALHA:       "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:    "Pendente",
  PROCESSANDO: "Processando",
  CONCLUIDA:   "Liberado",
  FALHA:       "Bloqueado",
};

const CREDITO_STATUS_STYLE: Record<string, string> = {
  APROVADO:   "bg-green-50 text-green-700",
  PENDENTE:   "bg-yellow-50 text-yellow-700",
  SOLICITADO: "bg-blue-50 text-blue-700",
  REPROVADO:  "bg-red-50 text-red-700",
  QUITADO:    "bg-gray-50 text-gray-600",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function ExtratoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [credito, setCredito] = useState<CreditoResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    creditoApi.extrato(params.id)
      .then((data) => setCredito(data))
      .catch(() => router.replace("/dashboard/credito"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const liberacoes: LiberacaoResumo[] = credito?.liberacoes ?? [];

  const totalLiberado = liberacoes
    .filter((l) => l.status === "CONCLUIDA")
    .reduce((sum, l) => sum + l.valor, 0);

  const totalPendente = liberacoes
    .filter((l) => l.status === "PENDENTE" || l.status === "PROCESSANDO")
    .reduce((sum, l) => sum + l.valor, 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <a
          href="/dashboard/credito"
          className="text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          ← Voltar
        </a>
        <h1 className="text-2xl font-bold text-gray-900">Extrato de Crédito</h1>
      </div>

      {loading ? (
        <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-3 bg-brand-200 rounded animate-pulse mb-2 w-20" />
                <div className="h-8 bg-brand-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : credito ? (
        <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-2xl border border-brand-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 font-mono">
              ID: {credito.creditoId}
            </p>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${CREDITO_STATUS_STYLE[credito.status] ?? "bg-gray-50 text-gray-600"}`}
            >
              {credito.status}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                Valor Aprovado
              </p>
              <p className="text-2xl font-bold text-brand-700">
                {formatarBRL(credito.valorAprovado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                Valor Liberado
              </p>
              <p className="text-2xl font-bold text-brand-700">
                {formatarBRL(credito.valorLiberado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                Taxa Mensal
              </p>
              <p className="text-2xl font-bold text-brand-700">
                {(credito.taxaMensal * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-1">
                Prazo
              </p>
              <p className="text-2xl font-bold text-brand-700">
                {credito.prazoMeses}x
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
            Total Liberado
          </p>
          <p className="text-3xl font-bold text-green-600">
            {loading ? (
              <span className="inline-block h-8 w-32 bg-gray-100 rounded animate-pulse" />
            ) : (
              formatarBRL(totalLiberado)
            )}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2">
            Total Pendente
          </p>
          <p className="text-3xl font-bold text-yellow-600">
            {loading ? (
              <span className="inline-block h-8 w-32 bg-gray-100 rounded animate-pulse" />
            ) : (
              formatarBRL(totalPendente)
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Histórico de Liberações
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">
                  Data
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">
                  ID da Liberação
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-600">
                  Valor Liberado
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : liberacoes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-gray-400 text-sm"
                  >
                    Nenhuma liberação registrada para este crédito.
                  </td>
                </tr>
              ) : (
                liberacoes.map((lib) => (
                  <tr
                    key={lib.liberacaoId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(lib.criadoEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                      {lib.liberacaoId.slice(0, 8)}…
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatarBRL(lib.valor)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[lib.status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}
                      >
                        {STATUS_LABEL[lib.status] ?? lib.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
