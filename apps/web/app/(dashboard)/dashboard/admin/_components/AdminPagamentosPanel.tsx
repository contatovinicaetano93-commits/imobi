"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { adminApi, type LiberacaoAguardandoPagamento } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { useToast } from "@/hooks/toast-context";
import { IMOBI_FINANCEIRO_WHATS_DISPLAY } from "@/lib/financeiro";
import { AlertTriangle, Banknote, ChevronLeft } from "lucide-react";

export function AdminPagamentosPanel({ showBackLink = true }: { showBackLink?: boolean }) {
  const { success, error: toastError } = useToast();
  const toastErrorRef = useRef(toastError);
  toastErrorRef.current = toastError;

  const [liberacoes, setLiberacoes] = useState<LiberacaoAguardandoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});

  const recarregar = useCallback(async () => {
    try {
      const libData = await adminApi.listarLiberacoesAguardandoPagamento();
      setLiberacoes(libData);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const confirmarPagamento = async (liberacaoId: string) => {
    setBusyId(liberacaoId);
    try {
      await adminApi.confirmarPagamento(liberacaoId, refs[liberacaoId]?.trim() || undefined);
      success("Pagamento confirmado — tomador notificado.");
      await recarregar();
    } catch (err) {
      toastErrorRef.current(err instanceof Error ? err.message : "Erro ao confirmar pagamento");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
        Carregando pagamentos SIPOC…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBackLink ? (
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#1B4FD8] hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao centro de comando
        </Link>
      ) : null}

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-sm font-semibold text-blue-900">Pagamento SIPOC — confirmação manual</p>
        <p className="mt-1 text-xs text-blue-800">
          Após vistoria aprovada, transfira na conta cadastrada do tomador e confirme aqui. Financeiro
          IMOBI: {IMOBI_FINANCEIRO_WHATS_DISPLAY}.
        </p>
      </div>

      {loadError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void recarregar();
            }}
            className="shrink-0 text-sm font-semibold text-red-700 underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <Banknote className="h-4 w-4 text-[#16a34a]" />
          <h2 className="text-sm font-bold text-gray-900">Aguardando pagamento</h2>
          <span className="ml-auto text-xs font-semibold text-gray-500">{liberacoes.length}</span>
        </div>
        {liberacoes.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Nenhuma liberação pendente.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {liberacoes.map((lib) => (
              <div key={lib.liberacaoId} className="space-y-3 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {lib.obra?.nome ?? "Obra"} — {formatarBRL(Number(lib.valor))}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {lib.tomador} · {new Date(lib.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-gray-400">#{lib.liberacaoId.slice(0, 8).toUpperCase()}</p>
                </div>
                {lib.conta.banco || lib.conta.pix ? (
                  <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                    <p>
                      <span className="font-semibold">Titular:</span> {lib.conta.titular ?? "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Banco:</span> {lib.conta.banco} · Ag. {lib.conta.agencia} · Cc{" "}
                      {lib.conta.numero}
                    </p>
                    {lib.conta.pix ? (
                      <p>
                        <span className="font-semibold">PIX:</span> {lib.conta.pix}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                    Tomador ainda não cadastrou conta bancária no perfil.
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Ref. comprovante (opcional)"
                    value={refs[lib.liberacaoId] ?? ""}
                    onChange={(e) => setRefs((p) => ({ ...p, [lib.liberacaoId]: e.target.value }))}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busyId === lib.liberacaoId}
                    onClick={() => confirmarPagamento(lib.liberacaoId)}
                    className="whitespace-nowrap rounded-lg bg-[#1B4FD8] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    Confirmar pagamento
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
