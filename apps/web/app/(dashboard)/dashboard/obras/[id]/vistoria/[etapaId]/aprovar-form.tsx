"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarBRL } from "@imbobi/core";
import { useToast } from "@/hooks/toast-context";

interface Props {
  etapaId: string;
  obraId: string;
  valorLiberacao: number;
}

export function AprovarEtapaForm({ etapaId, obraId, valorLiberacao }: Props) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [obs, setObs] = useState("");
  const [isPending, setIsPending] = useState(false);

  const acao = async (aprovado: boolean) => {
    setIsPending(true);
    try {
      const res = await fetch(`/api/etapas/${etapaId}/validar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacao: obs, aprovado }),
      });

      if (!res.ok) {
        const body = await res.json() as { message?: string };
        toastError(body.message ?? "Erro ao processar.");
        return;
      }

      success(aprovado ? "Etapa aprovada com sucesso." : "Etapa rejeitada.");
      router.push(`/dashboard/obras/${obraId}`);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Parecer do gestor</h3>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observações (opcional)..."
        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
      />

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => acao(true)}
          disabled={isPending}
          className="flex-1 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors"
          style={{ background: "#16a34a" }}
        >
          ✓ Aprovar etapa
        </button>
        <button
          onClick={() => acao(false)}
          disabled={isPending}
          className="flex-1 border border-red-300 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          ✗ Rejeitar
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">
        Ao aprovar, {formatarBRL(valorLiberacao)} serão liberados automaticamente.
      </p>
    </div>
  );
}
