"use client";

import { useEffect, useState } from "react";
import { Banknote, TrendingUp, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { ParceiroResumo, OperacaoIndicada } from "@/lib/api";

const COMISSAO_STATUS: Record<OperacaoIndicada["comissaoStatus"], { label: string; cls: string; icon: typeof Clock }> = {
  PENDENTE: { label: "Pendente", cls: "bg-gray-100 text-gray-600",    icon: Clock },
  LIBERADA: { label: "Liberada", cls: "bg-amber-100 text-amber-700",  icon: ArrowUpRight },
  PAGA:     { label: "Paga",     cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
};

const OP_STATUS_LABEL: Record<OperacaoIndicada["status"], string> = {
  INDICADA:   "Indicada",
  EM_ANALISE: "Em análise",
  APROVADA:   "Aprovada",
  EM_OBRA:    "Em obra",
  CONCLUIDA:  "Concluída",
  RECUSADA:   "Recusada",
};

export default function ComissoesPage() {
  const [resumo, setResumo] = useState<ParceiroResumo | null>(null);
  const [operacoes, setOperacoes] = useState<OperacaoIndicada[] | null>(null);

  useEffect(() => {
    fetch("/api/proxy/parceiros/resumo")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d: ParceiroResumo | null) => setResumo(d));
    fetch("/api/proxy/parceiros/operacoes")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d: OperacaoIndicada[] | null) => setOperacoes(d ?? []));
  }, []);

  const rs = resumo;
  const ops = operacoes ?? [];

  const pendente  = ops.filter((o) => o.comissaoStatus === "PENDENTE").reduce((s, o) => s + o.valorComissao, 0);
  const liberada  = ops.filter((o) => o.comissaoStatus === "LIBERADA").reduce((s, o) => s + o.valorComissao, 0);
  const paga      = ops.filter((o) => o.comissaoStatus === "PAGA").reduce((s, o) => s + o.valorComissao, 0);

  return (
    <div className="space-y-8 max-w-4xl">
      <div style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#d9770622", border: "1px solid #d9770644", borderRadius: 8, padding: "0.4rem" }}>
            <Banknote size={18} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Parceiro Comercial</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Comissões</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          Acompanhe seus ganhos em tempo real por operação indicada
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "A receber",      value: rs ? formatarBRL(rs.comissoesAReceber)  : "—", color: "#1d4ed8", sub: "liberadas + pendentes" },
          { label: "Pagas no mês",   value: rs ? formatarBRL(rs.comissoesPagasMes)  : "—", color: "#16a34a", sub: "recebidas neste mês" },
          { label: "Total recebido", value: rs ? formatarBRL(rs.comissoesPagasTotal) : "—", color: "#16a34a", sub: "desde o início" },
          { label: "Taxa aprovação", value: rs ? `${rs.taxaAprovacao}%`             : "—", color: "#d97706", sub: `${rs?.operacoesAtivas ?? 0} ativas` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendente",  value: formatarBRL(pendente),  color: "#6b7280", count: ops.filter((o) => o.comissaoStatus === "PENDENTE").length },
          { label: "Liberada",  value: formatarBRL(liberada),  color: "#d97706", count: ops.filter((o) => o.comissaoStatus === "LIBERADA").length },
          { label: "Paga",      value: formatarBRL(paga),      color: "#16a34a", count: ops.filter((o) => o.comissaoStatus === "PAGA").length },
        ].map(({ label, value, color, count }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs font-medium mb-1" style={{ color }}>{label} ({count})</p>
            <p className="text-base font-bold tabular-nums" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-[#d97706]" />
          Detalhamento por operação
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {ops.length === 0 ? (
            <div className="p-10 text-center">
              <Banknote className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Nenhuma operação com comissão registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Operação</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Etapa</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Valor comissão</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ops.map((op) => {
                    const cs = COMISSAO_STATUS[op.comissaoStatus];
                    const StatusIcon = cs.icon;
                    return (
                      <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 font-mono text-xs">{op.codigo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{OP_STATUS_LABEL[op.status]} · {op.percentualComissao}% sobre {formatarBRL(op.valorBase)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-600">{OP_STATUS_LABEL[op.status]}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="font-bold text-gray-900 tabular-nums">{op.valorComissao > 0 ? formatarBRL(op.valorComissao) : "—"}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${cs.cls}`}>
                            <StatusIcon size={10} />
                            {cs.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
