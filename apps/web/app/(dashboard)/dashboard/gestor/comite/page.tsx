import type { Metadata } from "next";
import { comiteApi, type ComiteDigital, type SolicitacaoCredito } from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { Eye, FileText, CheckCircle2, XCircle, AlertCircle, Users, Vote } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Acompanhamento de Comitês — Fundo" };

type ComiteItem = ComiteDigital & { solicitacao: SolicitacaoCredito };

const STATUS_META: Record<string, { label: string; color: string }> = {
  ABERTO:      { label: "Aberto",     color: "#6b7280" },
  EM_VOTACAO:  { label: "Em Votação", color: "#d97706" },
  ENCERRADO:   { label: "Encerrado",  color: "#16a34a" },
};

const DECISAO_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  APROVADO: { label: "Aprovado", color: "#16a34a", icon: CheckCircle2 },
  AJUSTADO: { label: "Ajustado", color: "#2563eb", icon: AlertCircle },
  REPROVADO: { label: "Reprovado", color: "#dc2626", icon: XCircle },
};

const RATING_COLOR: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626",
};

function ComiteCard({ c }: { c: ComiteItem }) {
  const s = c.solicitacao;
  const statusMeta = STATUS_META[c.status] ?? STATUS_META.ABERTO;
  const decisaoMeta = c.decisao ? DECISAO_META[c.decisao] : null;
  const DecisaoIcon = decisaoMeta?.icon;

  const aprovar = c.votos.filter(v => v.voto === "APROVAR").length;
  const ajustar = c.votos.filter(v => v.voto === "AJUSTAR").length;
  const reprovar = c.votos.filter(v => v.voto === "REPROVAR").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
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
          </div>
          <p className="text-base font-bold text-gray-900">{formatarBRL(s.valorSolicitado)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {s.finalidade} · {s.prazoMeses}m · {s.taxaMensal}% a.m.
          </p>
          <p className="text-xs text-gray-400">
            Solicitante: {s.usuario?.nome ?? "—"} · {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
          </p>
        </div>
        {decisaoMeta && DecisaoIcon && (
          <div className="text-right">
            <div className="flex items-center gap-1.5" style={{ color: decisaoMeta.color }}>
              <DecisaoIcon className="w-4 h-4" />
              <span className="text-sm font-bold">{decisaoMeta.label}</span>
            </div>
            {c.decisaoEm && <p className="text-[10px] text-gray-400 mt-0.5">{new Date(c.decisaoEm).toLocaleDateString("pt-BR")}</p>}
          </div>
        )}
      </div>

      {/* Dados do dossiê */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {s.ltv && (
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-400 mb-0.5">LTV</p>
            <p className="font-bold text-gray-900">{s.ltv.toFixed(1)}%</p>
          </div>
        )}
        {s.vgv && (
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-400 mb-0.5">VGV</p>
            <p className="font-bold text-gray-900">{formatarBRL(s.vgv)}</p>
          </div>
        )}
        {s.custoObra && (
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-400 mb-0.5">Custo obra</p>
            <p className="font-bold text-gray-900">{formatarBRL(s.custoObra)}</p>
          </div>
        )}
      </div>

      {/* Garantias */}
      {s.garantias && (
        <div className="bg-gray-50 rounded-xl p-3 text-xs">
          <p className="text-gray-400 font-medium mb-0.5">Garantias</p>
          <p className="text-gray-700">{s.garantias}</p>
        </div>
      )}

      {/* Parecer técnico */}
      {c.parecerTecnico && (
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs">
          <p className="text-blue-700 font-semibold mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Parecer técnico
          </p>
          <p className="text-blue-800">{c.parecerTecnico}</p>
          {c.parecerEm && (
            <p className="text-blue-400 mt-1 text-[10px]">{new Date(c.parecerEm).toLocaleDateString("pt-BR")}</p>
          )}
        </div>
      )}

      {/* Votos */}
      {c.votos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            Votos do comitê ({c.votos.length})
          </p>
          <div className="flex gap-4 text-xs mb-3">
            <span className="text-green-600 font-semibold">✓ {aprovar} Aprovar</span>
            <span className="text-blue-600 font-semibold">◎ {ajustar} Ajustar</span>
            <span className="text-red-600 font-semibold">✕ {reprovar} Reprovar</span>
          </div>
          <div className="space-y-1.5">
            {c.votos.map((v) => {
              const vColor = v.voto === "APROVAR" ? "#16a34a" : v.voto === "AJUSTAR" ? "#2563eb" : "#dc2626";
              return (
                <div key={v.votoId} className="flex items-start justify-between gap-2 text-xs">
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{v.votante.nome}</span>
                    {v.justificativa && <p className="text-gray-400 mt-0.5">{v.justificativa}</p>}
                  </div>
                  <span className="font-bold shrink-0" style={{ color: vColor }}>{v.voto}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function GestorComitePage() {
  const comites = await comiteApi.listar().catch(() => [] as ComiteItem[]);

  const aprovados = comites.filter((c) => c.decisao === "APROVADO").length;
  const emVotacao = comites.filter((c) => c.status === "EM_VOTACAO").length;
  const reprovados = comites.filter((c) => c.decisao === "REPROVADO").length;
  const totalValor = comites
    .filter((c) => c.decisao === "APROVADO")
    .reduce((s, c) => s + c.solicitacao.valorSolicitado, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Eye className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Acompanhamento de Comitês</h1>
          <p className="text-xs text-gray-400">Visualização de todas as atas e decisões</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de comitês", value: String(comites.length), color: "#6b7280" },
          { label: "Em votação", value: String(emVotacao), color: "#d97706" },
          { label: "Aprovados", value: String(aprovados), color: "#16a34a" },
          { label: "Volume aprovado", value: formatarBRL(totalValor), color: "#2563eb" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {comites.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Vote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Nenhum comitê ainda</p>
          <p className="text-xs text-gray-400 mt-1">As propostas aparecerão aqui quando construtores enviarem solicitações.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Vote className="w-4 h-4 text-gray-400" />
            Todos os comitês ({comites.length})
          </h2>
          {comites.map((c) => (
            <ComiteCard key={c.comiteId} c={c as ComiteItem} />
          ))}
        </div>
      )}
    </div>
  );
}
