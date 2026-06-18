"use client";

import { useState } from "react";
import { Calculator, TrendingUp, Banknote, Clock, Info } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { CreditoSimulacao } from "@/lib/api";

export default function SimuladorComercialPage() {
  const [valor, setValor] = useState("");
  const [prazo, setPrazo] = useState("24");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<CreditoSimulacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function parseMoeda(s: string): number {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function formatMoedaInput(s: string): string {
    const num = s.replace(/\D/g, "");
    if (!num) return "";
    const n = parseInt(num, 10) / 100;
    return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function simular(e: React.FormEvent) {
    e.preventDefault();
    const v = parseMoeda(valor);
    const p = parseInt(prazo, 10);
    if (!v || v < 100000) { setErro("Valor mínimo: R$ 100.000"); return; }
    if (!p || p < 12 || p > 48) { setErro("Prazo entre 12 e 48 meses"); return; }
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch("/api/proxy/credito/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorSolicitado: v, prazoMeses: p }),
      });
      if (!res.ok) throw new Error("Erro ao simular");
      const data = (await res.json()) as CreditoSimulacao;
      setResultado(data);
    } catch {
      setErro("Não foi possível realizar a simulação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)", borderRadius: 16, padding: "1.5rem", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ background: "#d9770622", border: "1px solid #d9770644", borderRadius: 8, padding: "0.4rem" }}>
            <Calculator size={18} color="#d97706" />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Parceiro Comercial</p>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Simulador de Crédito</h1>
          </div>
        </div>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>
          Simule condições de financiamento para apresentar ao seu cliente
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={simular} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Valor solicitado</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={valor}
                onChange={(e) => setValor(formatMoedaInput(e.target.value))}
                placeholder="0,00"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-400">Mínimo R$ 100.000 · Máximo R$ 50.000.000</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Prazo (meses)</label>
            <div className="flex gap-2 flex-wrap">
              {[12, 24, 36, 48].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrazo(String(m))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    prazo === String(m)
                      ? "bg-[#d97706] text-white border-[#d97706]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#d97706]"
                  }`}
                >
                  {m}m
                </button>
              ))}
              <input
                type="number"
                min={12}
                max={48}
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                placeholder="Outro"
              />
            </div>
          </div>

          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
              <Info size={13} className="shrink-0" />
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
            style={{ background: "#d97706" }}
          >
            {loading ? "Simulando…" : "Simular agora"}
          </button>
        </form>
      </div>

      {resultado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <TrendingUp size={15} className="text-[#d97706]" />
            <h2 className="text-sm font-semibold text-gray-900">Resultado da simulação</h2>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: Banknote, label: "Valor solicitado",  value: formatarBRL(resultado.valorSolicitado), color: "#374151" },
              { icon: Clock,    label: "Prazo",             value: `${resultado.prazoMeses} meses`,         color: "#374151" },
              { icon: TrendingUp, label: "Taxa anual",      value: `${resultado.taxaAnual.toFixed(1)}% a.a.`, color: "#d97706" },
              { icon: TrendingUp, label: "Taxa mensal",     value: `${(resultado.taxaMensal * 100).toFixed(2)}% a.m.`, color: "#d97706" },
              { icon: Banknote, label: "Parcela mensal",    value: formatarBRL(resultado.parcelaMensal),    color: "#1d4ed8" },
              { icon: Banknote, label: "Total a pagar",     value: formatarBRL(resultado.totalPago),        color: "#374151" },
              { icon: Banknote, label: "Total de juros",    value: formatarBRL(resultado.totalJuros),       color: "#dc2626" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Icon size={11} />
                  {label}
                </p>
                <p className="text-base font-bold tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-4">
            <p className="text-xs text-gray-400">
              CET: <span className="font-semibold text-gray-600">{resultado.cet.toFixed(2)}% a.a.</span>
              <span className="mx-2">·</span>
              {resultado.observacao}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <Info size={16} className="text-[#1d4ed8] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Sobre este simulador</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Os valores apresentados são estimativas com base nas condições atuais de crédito.
            A aprovação e taxas finais dependem da análise de crédito, rating do tomador e garantias oferecidas.
          </p>
        </div>
      </div>
    </div>
  );
}
