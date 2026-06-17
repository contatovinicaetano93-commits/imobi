"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Star, Award, Users, CheckCircle2, Clock } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { ParceiroResumo } from "@/lib/api";

const BADGES = [
  { min: 90, label: "Elite",     color: "#7c3aed", bg: "#f5f3ff", icon: "★★★" },
  { min: 70, label: "Gold",      color: "#d97706", bg: "#fffbeb", icon: "★★" },
  { min: 50, label: "Silver",    color: "#6b7280", bg: "#f9fafb", icon: "★" },
  { min: 0,  label: "Bronze",    color: "#92400e", bg: "#fef3c7", icon: "◆" },
];

function getBadge(taxa: number) {
  return BADGES.find((b) => taxa >= b.min) ?? BADGES[BADGES.length - 1];
}

export default function RankingPage() {
  const [resumo, setResumo] = useState<ParceiroResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/parceiros/resumo")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d: ParceiroResumo | null) => {
        setResumo(d);
        setLoading(false);
      });
  }, []);

  const badge = getBadge(resumo?.taxaAprovacao ?? 0);

  return (
    <div className="space-y-8 max-w-3xl">
      <div style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#d9770622", border: "1px solid #d9770644", borderRadius: 8, padding: "0.4rem" }}>
            <TrendingUp size={18} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Parceiro Comercial</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Ranking de Parceiros</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          Sua posição e desempenho na rede de parceiros IMOBI
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#d97706] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Carregando seus dados…</p>
        </div>
      ) : (
        <>
          {/* Badge card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
            <div
              className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0"
              style={{ background: badge.bg, border: `2px solid ${badge.color}30` }}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-xs font-bold mt-1" style={{ color: badge.color }}>{badge.label}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium mb-0.5">Seu nível atual</p>
              <p className="text-xl font-bold" style={{ color: badge.color }}>{badge.label}</p>
              <p className="text-xs text-gray-500 mt-1">
                Taxa de aprovação: <span className="font-bold text-gray-700">{resumo?.taxaAprovacao ?? 0}%</span>
              </p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(resumo?.taxaAprovacao ?? 0, 100)}%`, background: badge.color }}
                />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users,       label: "Op. ativas",    value: String(resumo?.operacoesAtivas ?? 0),             color: "#1d4ed8" },
              { icon: CheckCircle2,label: "Taxa aprovação",value: `${resumo?.taxaAprovacao ?? 0}%`,                  color: "#16a34a" },
              { icon: TrendingUp,  label: "Total recebido",value: resumo ? formatarBRL(resumo.comissoesPagasTotal) : "—", color: "#d97706" },
              { icon: Clock,       label: "A receber",     value: resumo ? formatarBRL(resumo.comissoesAReceber) : "—",  color: "#7c3aed" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <Icon size={16} className="mx-auto mb-2" style={{ color }} />
                <p className="text-base font-bold tabular-nums" style={{ color }}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Badges progression */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Award size={14} className="text-[#d97706]" />
              Níveis e metas
            </h2>
            <div className="space-y-3">
              {BADGES.slice().reverse().map((b) => {
                const atual = (resumo?.taxaAprovacao ?? 0) >= b.min;
                return (
                  <div key={b.label} className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                      style={{ background: b.bg, border: `1.5px solid ${b.color}${atual ? "60" : "20"}`, opacity: atual ? 1 : 0.5 }}
                    >
                      <span className="text-sm">{b.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: atual ? b.color : "#9ca3af" }}>{b.label}</p>
                      <p className="text-xs text-gray-400">Taxa de aprovação ≥ {b.min}%</p>
                    </div>
                    {atual && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: b.bg, color: b.color }}>
                        {(resumo?.taxaAprovacao ?? 0) < BADGES[BADGES.indexOf(b) - 1]?.min ? "Atual" : "Conquistado"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <Star size={16} className="text-[#d97706] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Como subir de nível?</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Sua posição é calculada mensalmente com base na taxa de aprovação das suas indicações.
                Indique clientes com perfil adequado — projetos com documentação completa e capacidade de pagamento — para maximizar suas conversões.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
