"use client";

import { useState, useEffect } from "react";
import { DollarSign, Save, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

const NAVY  = "#0C1A3D";
const MINT  = "#4ADE80";

function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CapitalFundoAdmin() {
  const [capital, setCapital] = useState<number | null>(null);
  const [raw, setRaw] = useState("");
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proxy/admin/fundos/capital")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((d) => {
        const val = d?.capitalDisponivel ?? d?.capital ?? 0;
        setCapital(Number(val));
        setRaw(formatBRL(Number(val)));
        setLoading(false);
      });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/[^0-9.,]/g, "");
    setRaw(v);
  }

  function handleBlur() {
    setFocused(false);
    const n = parseBRL(raw);
    if (!isNaN(n)) {
      setCapital(n);
      setRaw(formatBRL(n));
    } else {
      setRaw(formatBRL(capital ?? 0));
    }
  }

  async function handleSave() {
    const valor = parseBRL(raw);
    if (isNaN(valor) || valor < 0) { setError("Valor inválido"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/proxy/admin/fundos/capital", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capitalDisponivel: valor }),
      });
      if (res.ok) {
        setCapital(valor);
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        const d = await res.json().catch(() => ({})) as { message?: string };
        setError(d.message ?? `Erro ${res.status}`);
      }
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: "white", border: "1px solid rgba(12,26,61,0.08)", borderLeft: `3px solid ${MINT}`, borderRadius: 16, padding: "1.5rem" }}>
        <div style={{ height: 20, width: 160, background: "rgba(12,26,61,0.06)", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "white", border: "1px solid rgba(12,26,61,0.08)", borderLeft: `3px solid ${MINT}`, borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)", background: "rgba(12,26,61,0.015)" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "white", border: "1px solid rgba(12,26,61,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <DollarSign size={14} color={NAVY} />
        </div>
        <div>
          <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.82rem", fontWeight: 700, color: NAVY, margin: 0 }}>Capital Disponível do Fundo</h2>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", color: "rgba(12,26,61,0.4)", margin: 0 }}>Montante total liberado pelo fundo para operações IMOBI</p>
        </div>
        <span style={{ marginLeft: "auto", fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${NAVY}12`, color: NAVY, fontFamily: "'Jost', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Somente Admin</span>
      </div>

      {/* Body */}
      <div style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9rem", fontWeight: 700, color: "rgba(12,26,61,0.45)" }}>R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={focused ? raw : formatBRL(capital ?? 0)}
              onChange={handleChange}
              onFocus={() => { setFocused(true); setRaw(formatBRL(capital ?? 0)); }}
              onBlur={handleBlur}
              placeholder="0,00"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: NAVY,
                border: "none",
                borderBottom: `2px solid ${focused ? MINT : "rgba(12,26,61,0.12)"}`,
                outline: "none",
                background: "transparent",
                padding: "0.25rem 0",
                flex: 1,
                minWidth: 160,
                transition: "border-color 0.15s",
              }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              fontFamily: "'Jost', sans-serif",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.8rem", fontWeight: 700, color: "white",
              padding: "0.55rem 1.2rem", borderRadius: 10, border: "none", cursor: "pointer",
              background: saving ? "rgba(12,26,61,0.4)" : saved ? "#16a34a" : NAVY,
              opacity: saving ? 0.7 : 1, transition: "all 0.15s", flexShrink: 0,
            }}
          >
            {saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
          </button>
        </div>

        {/* Barra de utilização */}
        {capital !== null && capital > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.72rem", color: "rgba(12,26,61,0.45)" }}>Capital total configurado</span>
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.72rem", fontWeight: 700, color: NAVY }}>
                R$ {formatBRL(capital)}
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(12,26,61,0.06)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: `linear-gradient(90deg, ${MINT}, #22c55e)`, borderRadius: 99 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
              <TrendingUp size={11} color={MINT} />
              <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.68rem", color: "rgba(12,26,61,0.4)" }}>
                Este valor é usado como base para limites de aprovação e liberação de parcelas
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 1rem", background: "rgba(254,242,242,0.9)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 10 }}>
            <AlertCircle size={13} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.78rem", color: "#dc2626" }}>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
