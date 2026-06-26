"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, type AdminObraResumo, type LiberacaoAguardandoPagamento } from "@/lib/api";
import { useAdminFilasOnChange } from "@/hooks/use-admin-filas-poll";
import { formatarBRL } from "@imbobi/core";
import { useToast } from "@/hooks/toast-context";
import { Building2, Banknote, CheckCircle2, XCircle } from "lucide-react";

function brl(v: number) {
  return formatarBRL(v);
}

export function AdminSipocPanel() {
  const { success, error: toastError } = useToast();
  const [obras, setObras] = useState<AdminObraResumo[]>([]);
  const [liberacoes, setLiberacoes] = useState<LiberacaoAguardandoPagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});

  const recarregar = useCallback(
    () =>
      Promise.all([
        adminApi.listarObras(100),
        adminApi.listarLiberacoesAguardandoPagamento(),
      ])
        .then(([obrasData, libData]) => {
          setObras(obrasData);
          setLiberacoes(libData);
        })
        .catch((err) => toastError(err instanceof Error ? err.message : "Erro ao carregar SIPOC"))
        .finally(() => setLoading(false)),
    [toastError],
  );

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  useAdminFilasOnChange(() => void recarregar());

  const obrasHomologacao = obras.filter((o) =>
    o.status === "AGUARDANDO_HOMOLOGACAO" || o.status === "PLANEJAMENTO"
  );

  const homologar = async (obraId: string) => {
    setBusyId(obraId);
    try {
      await adminApi.homologarObra(obraId);
      success("Obra homologada — entrou no pipe ativo.");
      await recarregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao homologar");
    } finally {
      setBusyId(null);
    }
  };

  const reprovar = async (obraId: string) => {
    const motivo = window.prompt("Motivo da reprovação da homologação:");
    if (!motivo?.trim()) return;
    setBusyId(obraId);
    try {
      await adminApi.reprovarHomologacao(obraId, motivo.trim());
      success("Homologação reprovada.");
      await recarregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao reprovar");
    } finally {
      setBusyId(null);
    }
  };

  const confirmarPagamento = async (liberacaoId: string) => {
    setBusyId(liberacaoId);
    try {
      await adminApi.confirmarPagamento(liberacaoId, refs[liberacaoId]?.trim() || undefined);
      success("Pagamento confirmado — construtor notificado.");
      await recarregar();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Erro ao confirmar pagamento");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
        Carregando fluxo SIPOC…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-sm text-blue-900 font-semibold">Fluxo SIPOC — liberação manual</p>
        <p className="text-xs text-blue-800 mt-1">
          Construtor cadastra obra → Admin homologa → Engenheiro aprova vistoria → pagamento manual na conta
          cadastrada → confirmação pelo financeiro IMOBI (WhatsApp +5511993455589).
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <Building2 className="w-4 h-4 text-[#1B4FD8]" />
          <h3 className="font-bold text-gray-900 text-sm">Obras aguardando homologação</h3>
          <span className="ml-auto text-xs font-semibold text-gray-500">{obrasHomologacao.length}</span>
        </div>
        {obrasHomologacao.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">Nenhuma obra pendente de homologação.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {obrasHomologacao.map((obra) => (
              <div key={obra.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{obra.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {obra.tomador ?? "Tomador"} · {obra.status.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === obra.id}
                    onClick={() => homologar(obra.id)}
                    className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Homologar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === obra.id}
                    onClick={() => reprovar(obra.id)}
                    className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <Banknote className="w-4 h-4 text-[#16a34a]" />
          <h3 className="font-bold text-gray-900 text-sm">Pagamentos manuais pendentes</h3>
          <span className="ml-auto text-xs font-semibold text-gray-500">{liberacoes.length}</span>
        </div>
        {liberacoes.length === 0 ? (
          <p className="p-6 text-sm text-gray-400 text-center">Nenhuma liberação aguardando pagamento.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {liberacoes.map((lib) => (
              <div key={lib.liberacaoId} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {lib.obra?.nome ?? "Obra"} — {brl(Number(lib.valor))}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lib.tomador} · {new Date(lib.criadoEm).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-xs font-mono text-gray-400">#{lib.liberacaoId.slice(0, 8).toUpperCase()}</p>
                </div>
                {(lib.conta.banco || lib.conta.pix) && (
                  <div className="text-xs bg-gray-50 rounded-lg p-3 space-y-1 text-gray-700">
                    <p><span className="font-semibold">Titular:</span> {lib.conta.titular ?? "—"}</p>
                    <p><span className="font-semibold">Banco:</span> {lib.conta.banco} · Ag. {lib.conta.agencia} · Cc {lib.conta.numero}</p>
                    {lib.conta.pix && <p><span className="font-semibold">PIX:</span> {lib.conta.pix}</p>}
                  </div>
                )}
                {!lib.conta.banco && !lib.conta.pix && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                    Tomador ainda não cadastrou conta bancária no perfil.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ref. comprovante (opcional)"
                    value={refs[lib.liberacaoId] ?? ""}
                    onChange={(e) => setRefs((p) => ({ ...p, [lib.liberacaoId]: e.target.value }))}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2"
                  />
                  <button
                    type="button"
                    disabled={busyId === lib.liberacaoId}
                    onClick={() => confirmarPagamento(lib.liberacaoId)}
                    className="bg-[#1B4FD8] hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap"
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
