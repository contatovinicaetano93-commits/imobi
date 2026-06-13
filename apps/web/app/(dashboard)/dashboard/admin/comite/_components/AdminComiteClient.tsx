"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { comiteApi, type ComiteDigital, type SolicitacaoCredito, type VotoDecisao } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { Vote, Users, FileText, CheckCircle2, XCircle, AlertCircle, Clock, ChevronDown, ChevronUp, ArrowLeft, X } from "lucide-react";
import { useToast } from "@/hooks/toast-context";

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

const STATUS_META: Record<string, { label: string; color: string }> = {
  ABERTO:      { label: "Aberto",      color: "#6b7280" },
  EM_VOTACAO:  { label: "Em Votação",  color: "#d97706" },
  ENCERRADO:   { label: "Encerrado",   color: "#16a34a" },
};

const DECISAO_META: Record<string, { label: string; color: string }> = {
  APROVADO: { label: "Aprovado", color: "#16a34a" },
  AJUSTADO: { label: "Ajustado", color: "#2563eb" },
  REPROVADO: { label: "Reprovado", color: "#dc2626" },
};

const RATING_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626",
};

function VotarModal({ comiteId, onClose, onSuccess }: { comiteId: string; onClose: () => void; onSuccess: () => void }) {
  const [voto, setVoto] = useState<VotoDecisao | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [condicoes, setCondicoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  async function submit() {
    if (!voto) return;
    setLoading(true);
    setError(null);
    try {
      await comiteApi.votar(comiteId, { voto, justificativa: justificativa || undefined, condicoes: condicoes || undefined });
      addToast("Voto registrado com sucesso!");
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao registrar voto");
      addToast(e?.message ?? "Erro ao registrar voto", "error");
    } finally {
      setLoading(false);
    }
  }

  const opts: { v: VotoDecisao; label: string; color: string; icon: React.ElementType }[] = [
    { v: "APROVAR", label: "Aprovar", color: "#16a34a", icon: CheckCircle2 },
    { v: "AJUSTAR", label: "Ajustar c/ condições", color: "#2563eb", icon: AlertCircle },
    { v: "REPROVAR", label: "Reprovar", color: "#dc2626", icon: XCircle },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Vote className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Registrar Voto</h3>
            <p className="text-xs text-gray-400">Comitê Digital — sua decisão é irreversível</p>
          </div>
        </div>

        <div className="space-y-2">
          {opts.map(({ v, label, color, icon: Icon }) => (
            <button key={v} onClick={() => setVoto(v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-medium transition ${voto === v ? "border-current" : "border-gray-100 hover:border-gray-200"}`}
              style={{ color: voto === v ? color : "#374151", borderColor: voto === v ? color : undefined, background: voto === v ? color + "0f" : undefined }}>
              <Icon className="w-4 h-4 shrink-0" style={{ color }} />
              {label}
            </button>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-600">Justificativa</span>
          <textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Fundamente sua decisão..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
        </label>

        {voto === "AJUSTAR" && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-gray-600">Condições para ajuste</span>
            <textarea rows={2} value={condicoes} onChange={(e) => setCondicoes(e.target.value)}
              placeholder="Descreva as condições necessárias..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </label>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={submit} disabled={!voto || loading}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
            {loading ? "Registrando..." : "Confirmar voto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComiteCard({ c, onVotoSuccess }: { c: ComiteItem; onVotoSuccess: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showVotar, setShowVotar] = useState(false);
  const s = c.solicitacao;
  const statusMeta = STATUS_META[c.status] ?? STATUS_META.ABERTO;
  const decisaoMeta = c.decisao ? DECISAO_META[c.decisao] : null;

  return (
    <>
      {showVotar && (
        <VotarModal
          comiteId={c.comiteId}
          onClose={() => setShowVotar(false)}
          onSuccess={() => { setShowVotar(false); onVotoSuccess(); }}
        />
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: statusMeta.color + "18", color: statusMeta.color }}>
                  {statusMeta.label}
                </span>
                {s.ratingCalculado && (
                  <span className="text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: (RATING_COLOR[s.ratingCalculado] ?? "#6b7280") + "18", color: RATING_COLOR[s.ratingCalculado] ?? "#6b7280" }}>
                    Rating {s.ratingCalculado}
                  </span>
                )}
                {decisaoMeta && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: decisaoMeta.color + "18", color: decisaoMeta.color }}>
                    {decisaoMeta.label}
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-gray-900">{formatarBRL(s.valorSolicitado)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.finalidade} · {s.prazoMeses}m · {s.usuario?.nome ?? "—"}
              </p>
              {s.ltv && (
                <p className="text-xs text-gray-400">LTV: {s.ltv.toFixed(1)}%{s.vgv ? ` · VGV: ${formatarBRL(s.vgv)}` : ""}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {c.status === "EM_VOTACAO" && (
                <button onClick={() => setShowVotar(true)}
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition">
                  <Vote className="w-3.5 h-3.5" />
                  Votar
                </button>
              )}
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? "Fechar" : "Detalhes"}
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-50 px-5 py-4 space-y-4 bg-gray-50/50">
            {/* Dossiê resumido */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {s.garantias && (
                <div className="col-span-2">
                  <p className="text-gray-400 font-medium mb-0.5">Garantias</p>
                  <p className="text-gray-700">{s.garantias}</p>
                </div>
              )}
              {s.observacoes && (
                <div className="col-span-2">
                  <p className="text-gray-400 font-medium mb-0.5">Observações</p>
                  <p className="text-gray-700">{s.observacoes}</p>
                </div>
              )}
              {s.custoObra && (
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Custo da obra</p>
                  <p className="text-gray-700">{formatarBRL(s.custoObra)}</p>
                </div>
              )}
            </div>

            {/* Parecer técnico */}
            {c.parecerTecnico ? (
              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Parecer técnico do engenheiro
                </p>
                <p className="text-xs text-gray-600">{c.parecerTecnico}</p>
                {c.parecerEm && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(c.parecerEm).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">Aguardando parecer técnico do engenheiro</p>
              </div>
            )}

            {/* Votos */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                Votos registrados ({c.votos.length})
              </p>
              {c.votos.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum voto ainda</p>
              ) : (
                <div className="space-y-2">
                  {c.votos.map((v) => {
                    const vColor = v.voto === "APROVAR" ? "#16a34a" : v.voto === "AJUSTAR" ? "#2563eb" : "#dc2626";
                    return (
                      <div key={v.votoId} className="flex items-start justify-between gap-2 text-xs">
                        <div className="flex-1">
                          <span className="font-medium text-gray-700">{v.votante.nome}</span>
                          {v.justificativa && <p className="text-gray-400 mt-0.5">{v.justificativa}</p>}
                          {v.condicoes && <p className="text-gray-400 italic mt-0.5">Condições: {v.condicoes}</p>}
                        </div>
                        <span className="font-bold shrink-0" style={{ color: vColor }}>{v.voto}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function AdminComiteClient({ comites: initial }: { comites: ComiteItem[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [comites, setComites] = useState(initial);
  const [filter, setFilter] = useState("todos");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      const updated = await comiteApi.listar();
      setComites(updated as ComiteItem[]);
      addToast("Lista atualizada com sucesso");
    } catch (e: any) {
      setRefreshError(e?.message ?? "Falha ao atualizar");
      addToast(e?.message ?? "Falha ao atualizar", "error");
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = filter === "todos" ? comites : comites.filter((c) => c.status === filter);

  const counts = {
    todos: comites.length,
    ABERTO: comites.filter((c) => c.status === "ABERTO").length,
    EM_VOTACAO: comites.filter((c) => c.status === "EM_VOTACAO").length,
    ENCERRADO: comites.filter((c) => c.status === "ENCERRADO").length,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <button onClick={() => router.push("/dashboard/admin")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-1" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Jost', sans-serif" }}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Vote className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Comitê Digital</h1>
            <p className="text-xs text-gray-400">Vote nas propostas de crédito</p>
          </div>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition disabled:opacity-60">
          {refreshing ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {refreshError && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{refreshError}</span>
          <button onClick={() => setRefreshError(null)} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex", padding: 2 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "todos", label: "Todos" },
          { key: "EM_VOTACAO", label: "Em Votação" },
          { key: "ABERTO", label: "Abertos" },
          { key: "ENCERRADO", label: "Encerrados" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${filter === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {label} ({counts[key as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Vote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhum comitê encontrado</p>
          <p className="text-xs text-gray-400 mt-1">Quando construtores enviarem solicitações, elas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ComiteCard key={c.comiteId} c={c} onVotoSuccess={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
