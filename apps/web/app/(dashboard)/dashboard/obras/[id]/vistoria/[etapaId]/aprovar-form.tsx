"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarBRL } from "@imbobi/core";

interface Props {
  etapaId: string;
  obraId: string;
  valorLiberacao: number;
}

export function AprovarEtapaForm({ etapaId, obraId, valorLiberacao }: Props) {
  const router = useRouter();
  const [obs, setObs] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const acao = async (aprovado: boolean) => {
    setErro(null);
    setIsPending(true);
    try {
      const endpoint = aprovado
        ? `/api/proxy/vistoria/${etapaId}/aprovar`
        : `/api/proxy/vistoria/${etapaId}/rejeitar`;
      const body = aprovado
        ? { observacoes: obs || undefined }
        : { motivo: obs || "Reprovado na vistoria." };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const body = await res.json() as { message?: string };
        setErro(body.message ?? "Erro ao processar.");
        return;
      }

      router.push(`/dashboard/obras/${obraId}`);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Parecer técnico (engenheiro / admin)</h3>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observações (opcional)..."
        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
      />

      {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}

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
