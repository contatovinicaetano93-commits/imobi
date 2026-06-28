"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { comiteApi, type ComiteDigital, type SolicitacaoCredito, type VotoDecisao } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import {
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Vote,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/toast-context";

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

const STATUS_META: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: "#6b7280" },
  EM_VOTACAO: { label: "Em Votação", color: "#d97706" },
  ENCERRADO: { label: "Encerrado", color: "#16a34a" },
};

const DECISAO_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  APROVADO: { label: "Aprovado", color: "#16a34a", icon: CheckCircle2 },
  AJUSTADO: { label: "Ajustado", color: "#2563eb", icon: AlertCircle },
  REPROVADO: { label: "Reprovado", color: "#dc2626", icon: XCircle },
};

const RATING_COLOR: Record<string, string> = {
  A: "#16a34a",
  B: "#2563eb",
  C: "#d97706",
  D: "#dc2626",
};

function VotarModal({
  comiteId,
  onClose,
  onSuccess,
}: {
  comiteId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
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
      await comiteApi.votar(comiteId, {
        voto,
        justificativa: justificativa || undefined,
        condicoes: condicoes || undefined,
      });
      addToast("Voto registrado com sucesso!");
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao registrar voto";
      setError(msg);
      addToast(msg, "error");
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
        <h3 className="text-sm font-bold text-gray-900">Registrar voto — Gestor Fundo</h3>
        <div className="space-y-2">
          {opts.map(({ v, label, color, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setVoto(v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-medium transition ${voto === v ? "border-current" : "border-gray-100"}`}
              style={{
                color: voto === v ? color : "#374151",
                borderColor: voto === v ? color : undefined,
                background: voto === v ? color + "0f" : undefined,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color }} />
              {label}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Justificativa (opcional)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
        />
        {voto === "AJUSTAR" && (
          <textarea
            rows={2}
            value={condicoes}
            onChange={(e) => setCondicoes(e.target.value)}
            placeholder="Condições para ajuste"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
          />
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border py-2.5 rounded-xl text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!voto || loading}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Confirmar voto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComiteCard({ c, onVotoSuccess }: { c: ComiteItem; onVotoSuccess: () => void }) {
  const [showVotar, setShowVotar] = useState(false);
  const s = c.solicitacao;
  const statusMeta = STATUS_META[c.status] ?? STATUS_META.ABERTO;
  const decisaoMeta = c.decisao ? DECISAO_META[c.decisao] : null;
  const DecisaoIcon = decisaoMeta?.icon;

  return (
    <>
      {showVotar && (
        <VotarModal
          comiteId={c.comiteId}
          onClose={() => setShowVotar(false)}
          onSuccess={() => {
            setShowVotar(false);
            onVotoSuccess();
          }}
        />
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: statusMeta.color + "18", color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
            <p className="text-base font-bold text-gray-900 mt-1">{formatarBRL(s.valorSolicitado)}</p>
            <p className="text-xs text-gray-500">
              {s.finalidade} · {s.usuario?.nome ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {c.status === "EM_VOTACAO" && (
              <button
                type="button"
                onClick={() => setShowVotar(true)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl"
              >
                <Vote className="w-3.5 h-3.5" />
                Votar
              </button>
            )}
            {decisaoMeta && DecisaoIcon && (
              <div className="flex items-center gap-1.5" style={{ color: decisaoMeta.color }}>
                <DecisaoIcon className="w-4 h-4" />
                <span className="text-sm font-bold">{decisaoMeta.label}</span>
              </div>
            )}
          </div>
        </div>

        {c.parecerTecnico && (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs">
            <p className="text-blue-700 font-semibold mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Parecer técnico
            </p>
            <p className="text-blue-800">{c.parecerTecnico}</p>
          </div>
        )}

        {c.votos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Votos ({c.votos.length})
            </p>
            {c.votos.map((v) => (
              <div key={v.votoId} className="flex justify-between text-xs py-1">
                <span>{v.votante.nome}</span>
                <span className="font-bold">{v.voto}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function GestorComiteClient({ comites: initial }: { comites: ComiteItem[] }) {
  const router = useRouter();
  const [comites, setComites] = useState(initial);

  async function refresh() {
    const updated = await comiteApi.listar();
    setComites(updated as ComiteItem[]);
    router.refresh();
  }

  const emVotacao = comites.filter((c) => c.status === "EM_VOTACAO").length;

  return (
    <div className="max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard/gestor")}
        className="flex items-center gap-1.5 text-sm text-gray-500"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Eye className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Comitê Digital — Gestor Fundo</h1>
          <p className="text-xs text-gray-400">
            Acompanhe propostas e vote quando o parecer técnico estiver disponível
          </p>
        </div>
      </div>

      {emVotacao > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
          {emVotacao} comitê(s) aguardando seu voto.
        </div>
      )}

      {comites.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-sm text-gray-500">
          Nenhum comitê aberto ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {comites.map((c) => (
            <ComiteCard key={c.comiteId} c={c} onVotoSuccess={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
