import type { Metadata } from "next";
import { comiteApi, type SolicitacaoCredito } from "@/lib/api";
import Link from "next/link";
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, Plus, ChevronRight } from "lucide-react";
import { formatarBRL } from "@imbobi/core";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meu Comitê — IMOBI" };

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE:   { label: "Pendente",      color: "#6b7280", icon: Clock },
  EM_COMITE:  { label: "Em Comitê",     color: "#d97706", icon: AlertCircle },
  APROVADA:   { label: "Aprovada",      color: "#16a34a", icon: CheckCircle2 },
  AJUSTADA:   { label: "Ajustada",      color: "#2563eb", icon: AlertCircle },
  REPROVADA:  { label: "Reprovada",     color: "#dc2626", icon: XCircle },
  CANCELADA:  { label: "Cancelada",     color: "#9ca3af", icon: XCircle },
};

const RATING_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626",
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDENTE;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: meta.color + "18", color: meta.color }}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

function ComiteProgress({ comite }: { comite: SolicitacaoCredito["comite"] }) {
  if (!comite) return null;
  const total = comite.votos.length;
  const aprovar = comite.votos.filter(v => v.voto === "APROVAR").length;
  const ajustar = comite.votos.filter(v => v.voto === "AJUSTAR").length;
  const reprovar = comite.votos.filter(v => v.voto === "REPROVAR").length;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-gray-400">Votação do comitê · {total} voto(s)</p>
      {total > 0 && (
        <div className="flex gap-3 text-xs">
          {aprovar > 0 && <span className="text-green-600 font-semibold">✓ {aprovar} Aprovar</span>}
          {ajustar > 0 && <span className="text-blue-600 font-semibold">◎ {ajustar} Ajustar</span>}
          {reprovar > 0 && <span className="text-red-600 font-semibold">✕ {reprovar} Reprovar</span>}
        </div>
      )}
      {comite.parecerTecnico && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 line-clamp-2">
          <span className="font-medium text-gray-700">Parecer: </span>{comite.parecerTecnico}
        </p>
      )}
    </div>
  );
}

export default async function ComitePage() {
  const solicitacoes = await comiteApi.minhas().catch(() => [] as SolicitacaoCredito[]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Minhas Solicitações</h1>
            <p className="text-xs text-gray-400">Acompanhe as aprovações do comitê</p>
          </div>
        </div>
        <Link
          href="/dashboard/comite/solicitar"
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova solicitação
        </Link>
      </div>

      {solicitacoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhuma solicitação ainda</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">
            Submeta uma proposta ao comitê para análise e aprovação de crédito.
          </p>
          <Link
            href="/dashboard/comite/solicitar"
            className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Solicitar crédito
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((s) => (
            <div key={s.solicitacaoId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">{s.finalidade}</p>
                    {s.ratingCalculado && (
                      <span className="text-xs font-black px-1.5 py-0.5 rounded"
                        style={{ background: (RATING_COLOR[s.ratingCalculado] ?? "#6b7280") + "18", color: RATING_COLOR[s.ratingCalculado] ?? "#6b7280" }}>
                        Rating {s.ratingCalculado}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">
                    {formatarBRL(s.valorSolicitado)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.prazoMeses} meses · {s.taxaMensal}% a.m. ·{" "}
                    {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {s.comite && <ComiteProgress comite={s.comite} />}

              {s.comite?.decisao && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-500">
                    Decisão em {s.comite.decisaoEm ? new Date(s.comite.decisaoEm).toLocaleDateString("pt-BR") : "—"}
                    {s.status === "APROVADA" && " · Crédito criado automaticamente"}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
