"use client";

import { useRouter } from "next/navigation";
import { type ComiteDigital, type SolicitacaoCredito } from "@/lib/api";
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

function ComiteCard({ c }: { c: ComiteItem }) {
  const s = c.solicitacao;
  const statusMeta = STATUS_META[c.status] ?? STATUS_META.ABERTO;
  const decisaoMeta = c.decisao ? DECISAO_META[c.decisao] : null;
  const DecisaoIcon = decisaoMeta?.icon;

  const aprovar = c.votos.filter((v) => v.voto === "APROVAR").length;
  const ajustar = c.votos.filter((v) => v.voto === "AJUSTAR").length;
  const reprovar = c.votos.filter((v) => v.voto === "REPROVAR").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: statusMeta.color + "18", color: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
            {s.ratingCalculado && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded"
                style={{
                  background: (RATING_COLOR[s.ratingCalculado] ?? "#6b7280") + "18",
                  color: RATING_COLOR[s.ratingCalculado] ?? "#6b7280",
                }}
              >
                Rating {s.ratingCalculado}
              </span>
            )}
          </div>
          <p className="text-base font-bold text-gray-900">{formatarBRL(s.valorSolicitado)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {s.finalidade} · {s.prazoMeses}m · {s.usuario?.nome ?? "—"}
          </p>
        </div>
        {decisaoMeta && DecisaoIcon && (
          <div className="text-right">
            <div className="flex items-center gap-1.5" style={{ color: decisaoMeta.color }}>
              <DecisaoIcon className="w-4 h-4" />
              <span className="text-sm font-bold">{decisaoMeta.label}</span>
            </div>
          </div>
        )}
      </div>

      {c.parecerTecnico ? (
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs">
          <p className="text-blue-700 font-semibold mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Parecer técnico
          </p>
          <p className="text-blue-800">{c.parecerTecnico}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
          Aguardando parecer técnico do engenheiro
        </div>
      )}

      {c.votos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            Votos dos sócios Admin ({c.votos.length})
          </p>
          <div className="flex gap-4 text-xs mb-3">
            <span className="text-green-600 font-semibold">✓ {aprovar} Aprovar</span>
            <span className="text-blue-600 font-semibold">◎ {ajustar} Ajustar</span>
            <span className="text-red-600 font-semibold">✕ {reprovar} Reprovar</span>
          </div>
          <div className="space-y-1.5">
            {c.votos.map((v) => (
              <div key={v.votoId} className="flex items-start justify-between gap-2 text-xs">
                <span className="font-medium text-gray-700">{v.votante.nome}</span>
                <span className="font-bold">{v.voto}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GestorComiteClient({ comites }: { comites: ComiteItem[] }) {
  const router = useRouter();
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
          <h1 className="text-lg font-bold text-gray-900">Acompanhamento de Comitês</h1>
          <p className="text-xs text-gray-400">
            Somente leitura — votação é feita pelos sócios Admin
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800 leading-relaxed">
        O Gestor Fundo <strong>não vota</strong> neste fluxo. Você acompanha pareceres, votos e decisões finais.
        {emVotacao > 0 && (
          <span className="block mt-1">{emVotacao} comitê(s) em votação pelos sócios Admin.</span>
        )}
      </div>

      {comites.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center text-sm text-gray-500">
          <Vote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          Nenhum comitê aberto ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {comites.map((c) => (
            <ComiteCard key={c.comiteId} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
