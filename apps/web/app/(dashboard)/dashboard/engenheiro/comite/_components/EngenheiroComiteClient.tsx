"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { comiteApi, type ComiteDigital, type SolicitacaoCredito } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { HardHat, FileText, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

const RATING_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626",
};

function ParecerModal({ comiteId, onClose, onSuccess }: { comiteId: string; onClose: () => void; onSuccess: () => void }) {
  const [parecer, setParecer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!parecer.trim()) { setError("O parecer não pode estar vazio."); return; }
    setLoading(true);
    setError(null);
    try {
      await comiteApi.parecer(comiteId, parecer.trim());
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao registrar parecer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Parecer Técnico</h3>
            <p className="text-xs text-gray-400">Análise de viabilidade construtiva da proposta</p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-gray-600">Seu parecer técnico *</span>
          <textarea rows={6} value={parecer} onChange={(e) => setParecer(e.target.value)}
            placeholder="Descreva a viabilidade técnica: cronograma, risco construtivo, documentação, conformidade com normas técnicas, situação do terreno, histórico do empreendedor..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
        </label>

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
          <button onClick={submit} disabled={loading || !parecer.trim()}
            className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition disabled:opacity-60">
            {loading ? "Enviando..." : "Registrar parecer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComiteCard({ c, onParecerSuccess }: { c: ComiteItem; onParecerSuccess: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showParecer, setShowParecer] = useState(false);
  const s = c.solicitacao;
  const needsParecer = !c.parecerTecnico && c.status !== "ENCERRADO";

  return (
    <>
      {showParecer && (
        <ParecerModal
          comiteId={c.comiteId}
          onClose={() => setShowParecer(false)}
          onSuccess={() => { setShowParecer(false); onParecerSuccess(); }}
        />
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {needsParecer ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    Aguarda parecer
                  </span>
                ) : c.parecerTecnico ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    Parecer emitido
                  </span>
                ) : null}
                {s.ratingCalculado && (
                  <span className="text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: (RATING_COLOR[s.ratingCalculado] ?? "#6b7280") + "18", color: RATING_COLOR[s.ratingCalculado] ?? "#6b7280" }}>
                    Rating {s.ratingCalculado}
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-gray-900">{formatarBRL(s.valorSolicitado)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.finalidade} · {s.prazoMeses}m · {s.usuario?.nome ?? "—"}
              </p>
              {s.ltv && <p className="text-xs text-gray-400">LTV: {s.ltv.toFixed(1)}%</p>}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {needsParecer && (
                <button onClick={() => setShowParecer(true)}
                  className="flex items-center gap-1.5 bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-orange-700 transition">
                  <HardHat className="w-3.5 h-3.5" />
                  Emitir parecer
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
            <div className="grid grid-cols-2 gap-3 text-xs">
              {s.vgv && <div><p className="text-gray-400 font-medium mb-0.5">VGV</p><p className="text-gray-700">{formatarBRL(s.vgv)}</p></div>}
              {s.custoObra && <div><p className="text-gray-400 font-medium mb-0.5">Custo obra</p><p className="text-gray-700">{formatarBRL(s.custoObra)}</p></div>}
              {s.garantias && <div className="col-span-2"><p className="text-gray-400 font-medium mb-0.5">Garantias</p><p className="text-gray-700">{s.garantias}</p></div>}
              {s.observacoes && <div className="col-span-2"><p className="text-gray-400 font-medium mb-0.5">Observações do cliente</p><p className="text-gray-700">{s.observacoes}</p></div>}
            </div>

            {c.parecerTecnico && (
              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  Seu parecer técnico registrado
                </p>
                <p className="text-xs text-gray-600">{c.parecerTecnico}</p>
                {c.parecerEm && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Registrado em {new Date(c.parecerEm).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            )}

            {c.votos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Votação ({c.votos.length} voto(s))</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-600">{c.votos.filter(v => v.voto === "APROVAR").length} Aprovar</span>
                  <span className="text-blue-600">{c.votos.filter(v => v.voto === "AJUSTAR").length} Ajustar</span>
                  <span className="text-red-600">{c.votos.filter(v => v.voto === "REPROVAR").length} Reprovar</span>
                </div>
              </div>
            )}

            {c.decisao && (
              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-700">Decisão final: {c.decisao}</p>
                {c.decisaoEm && <p className="text-[10px] text-gray-400 mt-0.5">Em {new Date(c.decisaoEm).toLocaleDateString("pt-BR")}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function EngenheiroComiteClient({ comites: initial }: { comites: ComiteItem[] }) {
  const router = useRouter();
  const [comites, setComites] = useState(initial);
  const [filter, setFilter] = useState("pendentes");
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const updated = await comiteApi.listar();
      setComites(updated as ComiteItem[]);
    } catch { /* no-op */ }
    setRefreshing(false);
  }

  const pendentes = comites.filter((c) => !c.parecerTecnico && c.status !== "ENCERRADO");
  const concluidos = comites.filter((c) => c.parecerTecnico || c.status === "ENCERRADO");
  const filtered = filter === "pendentes" ? pendentes : concluidos;

  return (
    <div className="max-w-3xl space-y-5">
      <button onClick={() => router.push("/dashboard/engenheiro")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-1" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Jost', sans-serif" }}>
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Pareceres Técnicos</h1>
            <p className="text-xs text-gray-400">Avalie a viabilidade construtiva das propostas</p>
          </div>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition disabled:opacity-60">
          {refreshing ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            {pendentes.length} proposta(s) aguardando seu parecer técnico
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setFilter("pendentes")}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${filter === "pendentes" ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Pendentes ({pendentes.length})
        </button>
        <button onClick={() => setFilter("concluidos")}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${filter === "concluidos" ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          Concluídos ({concluidos.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {filter === "pendentes" ? "Nenhum parecer pendente" : "Nenhum parecer emitido"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <ComiteCard key={c.comiteId} c={c} onParecerSuccess={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
