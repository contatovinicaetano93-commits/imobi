"use client";

import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, Save, AlertTriangle, Percent, DollarSign, Clock, MapPin, Settings } from "lucide-react";
import { useToast } from "@/hooks/toast-context";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

const jost: CSSProperties = { fontFamily: "'Jost', sans-serif" };
const card: CSSProperties = { background: "white", border: "1px solid rgba(12,26,61,0.08)", borderRadius: 16, overflow: "hidden" };

type Config = {
  taxaMensalMin: number;
  taxaMensalMax: number;
  taxaPadrao: number;
  valorMinCredito: number;
  valorMaxCredito: number;
  prazoMaxMeses: number;
  raioValidacaoMetrosPadrao: number;
  toleranciaPrecisaoGps: number;
  diasAprovacao: number;
  limiteEvidenciasMB: number;
  modoManutencao: boolean;
};

const DEFAULTS: Config = {
  taxaMensalMin: 0.89,
  taxaMensalMax: 2.5,
  taxaPadrao: 1.89,
  valorMinCredito: 50000,
  valorMaxCredito: 5000000,
  prazoMaxMeses: 60,
  raioValidacaoMetrosPadrao: 100,
  toleranciaPrecisaoGps: 20,
  diasAprovacao: 15,
  limiteEvidenciasMB: 10,
  modoManutencao: false,
};

export default function ConfiguracoesPage() {
  const { addToast } = useToast();
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErro, setSaveErro] = useState("");
  useEffect(() => {
    fetch("/api/proxy/admin/configuracoes")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d: Partial<Config> | null) => { if (d) setConfig((c) => ({ ...c, ...d })); });
  }, []);

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setConfig((c) => ({ ...c, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveErro("");
    try {
      const res = await fetch("/api/proxy/admin/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        addToast("Configurações salvas com sucesso! As novas regras já valem para próximas solicitações.", "success");
        setTimeout(() => setSaved(false), 4000);
      } else {
        const d = await res.json().catch(() => ({})) as { message?: string };
        const msg = d.message ?? "Erro ao salvar configurações. Tente novamente.";
        setSaveErro(msg);
        addToast(msg, "error");
      }
    } catch {
      const msg = "Erro de conexão ao salvar.";
      setSaveErro(msg);
      addToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...jost, maxWidth: 768 }} className="space-y-8">

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <a href="/dashboard/admin" style={{ ...jost, display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "rgba(12,26,61,0.4)", textDecoration: "none" }}>
          <ChevronLeft size={14} /> Admin
        </a>
        <span style={{ color: "rgba(12,26,61,0.2)" }}>/</span>
        <span style={{ ...jost, fontSize: "0.78rem", fontWeight: 600, color: NAVY }}>Configurações</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p style={{ ...jost, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: MINT }}>Admin</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: "clamp(1.8rem,4vw,2.5rem)", color: NAVY, lineHeight: 1.05 }}>
            CONFIGURAÇÕES
          </h1>
          <p style={{ ...jost, fontSize: "0.8rem", color: "rgba(12,26,61,0.42)", marginTop: 3 }}>Parâmetros globais de crédito e validação</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...jost, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
            fontSize: "0.8rem", fontWeight: 700, color: "white",
            padding: "0.5rem 1.1rem", borderRadius: 10, border: "none", cursor: "pointer",
            background: saving ? "rgba(12,26,61,0.4)" : saved ? "#16a34a" : NAVY,
            opacity: saving ? 0.7 : 1, transition: "all 0.15s",
          }}
        >
          <Save size={13} />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>

      {/* Save error */}
      {saveErro && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.85rem 1.25rem", background: "rgba(254,242,242,0.9)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12 }}>
          <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
          <p style={{ ...jost, fontSize: "0.82rem", color: "#dc2626" }}>{saveErro}</p>
        </div>
      )}

      {/* Warning */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "1rem 1.25rem", background: "rgba(254,243,199,0.7)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 12 }}>
        <AlertTriangle size={15} color="#92400e" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ ...jost, fontSize: "0.82rem", color: "#92400e", lineHeight: 1.5 }}>
          Mudanças afetam <strong>novas</strong> solicitações. Créditos já aprovados mantêm as condições originais.
        </p>
      </div>

      {/* Taxa e condições de crédito */}
      <Section title="Taxa e condições de crédito" icon={<Percent size={14} color={NAVY} />} accentColor={NAVY}>
        <Row label="Taxa mensal padrão (% a.m.)" hint="Usada em simulações sem proposta formal">
          <NumberInput value={config.taxaPadrao}      onChange={(v) => set("taxaPadrao", v)}      step={0.01} min={0.1}   max={10}       suffix="% a.m." />
        </Row>
        <Row label="Taxa mínima (% a.m.)"            hint="Piso para qualquer operação">
          <NumberInput value={config.taxaMensalMin}   onChange={(v) => set("taxaMensalMin", v)}   step={0.01} min={0.1}   max={5}        suffix="% a.m." />
        </Row>
        <Row label="Taxa máxima (% a.m.)"            hint="Teto para qualquer operação">
          <NumberInput value={config.taxaMensalMax}   onChange={(v) => set("taxaMensalMax", v)}   step={0.01} min={0.1}   max={10}       suffix="% a.m." />
        </Row>
        <Row label="Prazo máximo"                    hint="Em meses">
          <NumberInput value={config.prazoMaxMeses}   onChange={(v) => set("prazoMaxMeses", v)}   step={6}    min={6}     max={360}      suffix="meses" />
        </Row>
        <Row label="Valor mínimo de crédito"         hint="Mínimo por solicitação">
          <NumberInput value={config.valorMinCredito} onChange={(v) => set("valorMinCredito", v)} step={10000} min={10000} max={500000}  suffix="R$" prefix />
        </Row>
        <Row label="Valor máximo de crédito"         hint="Máximo por solicitação">
          <NumberInput value={config.valorMaxCredito} onChange={(v) => set("valorMaxCredito", v)} step={100000} min={100000} max={50000000} suffix="R$" prefix />
        </Row>
      </Section>

      {/* GPS */}
      <Section title="GPS / Validação de obras" icon={<MapPin size={14} color="#16a34a" />} accentColor={MINT}>
        <Row label="Raio padrão de validação"   hint="Distância máxima da obra para envio de evidência (override por obra)">
          <NumberInput value={config.raioValidacaoMetrosPadrao} onChange={(v) => set("raioValidacaoMetrosPadrao", v)} step={10}  min={10}  max={5000} suffix="metros" />
        </Row>
        <Row label="Tolerância de precisão GPS" hint="Precisão mínima exigida do dispositivo para validar localização">
          <NumberInput value={config.toleranciaPrecisaoGps}     onChange={(v) => set("toleranciaPrecisaoGps", v)}     step={5}   min={5}   max={200}  suffix="metros" />
        </Row>
      </Section>

      {/* Aprovação & Prazos */}
      <Section title="Aprovação & Prazos" icon={<Clock size={14} color={ROYAL} />} accentColor={ROYAL}>
        <Row label="SLA de aprovação"  hint="Dias úteis para dar parecer">
          <NumberInput value={config.diasAprovacao}    onChange={(v) => set("diasAprovacao", v)}    step={1} min={1}  max={60} suffix="dias úteis" />
        </Row>
        <Row label="Limite de evidência" hint="Tamanho máximo por foto enviada">
          <NumberInput value={config.limiteEvidenciasMB} onChange={(v) => set("limiteEvidenciasMB", v)} step={1} min={1} max={50} suffix="MB" />
        </Row>
      </Section>

      {/* Sistema */}
      <Section title="Sistema" icon={<Settings size={14} color="rgba(12,26,61,0.5)" />} accentColor="rgba(12,26,61,0.3)">
        {/* Modo manutenção */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "1rem 1.25rem" }}>
          <div>
            <p style={{ ...jost, fontSize: "0.84rem", fontWeight: 600, color: NAVY }}>Modo manutenção</p>
            <p style={{ ...jost, fontSize: "0.72rem", color: "rgba(12,26,61,0.4)", marginTop: 2 }}>Exibe banner de indisponibilidade para usuários não-admin</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.modoManutencao}
            onClick={() => set("modoManutencao", !config.modoManutencao)}
            style={{
              position: "relative", display: "inline-flex", alignItems: "center",
              width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
              background: config.modoManutencao ? "#f59e0b" : "rgba(12,26,61,0.15)",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", width: 18, height: 18, borderRadius: "50%",
              background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              transition: "left 0.2s",
              left: config.modoManutencao ? 22 : 3,
            }} />
          </button>
        </div>

      </Section>
    </div>
  );
}

function Section({ title, icon, accentColor, children }: { title: string; icon: ReactNode; accentColor: string; children: ReactNode }) {
  return (
    <div style={{
      background: "white",
      border: "1px solid rgba(12,26,61,0.08)",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 16, overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.06)", background: "rgba(12,26,61,0.015)" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "white", border: "1px solid rgba(12,26,61,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <h2 style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.82rem", fontWeight: 700, color: "#0C1A3D" }}>{title}</h2>
      </div>
      <div style={{ borderTop: "none" }}>{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "0.9rem 1.25rem", borderBottom: "1px solid rgba(12,26,61,0.04)" }}>
      <div>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.84rem", fontWeight: 600, color: "#0C1A3D" }}>{label}</p>
        <p style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.72rem", color: "rgba(12,26,61,0.38)", marginTop: 2 }}>{hint}</p>
      </div>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, step, min, max, suffix, prefix }: {
  value: number; onChange: (v: number) => void; step: number; min: number; max: number; suffix?: string; prefix?: boolean;
}) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setRaw(String(value));
  }, [value, focused]);

  function formatDisplay(n: number): string {
    if (suffix === "R$" || prefix) {
      return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return n.toLocaleString("pt-BR", { minimumFractionDigits: step < 1 ? 2 : 0, maximumFractionDigits: step < 1 ? 2 : 0 });
  }

  function commit(s: string) {
    const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
    if (!isNaN(n)) {
      const clamped = Math.max(min, Math.min(max, n));
      onChange(clamped);
      setRaw(String(clamped));
    } else {
      setRaw(String(value));
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {prefix && <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.8rem", color: "rgba(12,26,61,0.5)" }}>{suffix}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={focused ? raw : formatDisplay(value)}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9.,]/g, "");
          setRaw(v);
        }}
        onFocus={() => { setFocused(true); setRaw(String(value)); }}
        onBlur={() => { setFocused(false); commit(raw); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(raw); }
          if (e.key === "ArrowUp")   { e.preventDefault(); commit(String(Math.min(max, value + step))); }
          if (e.key === "ArrowDown") { e.preventDefault(); commit(String(Math.max(min, value - step))); }
        }}
        style={{
          fontFamily: "'Jost', sans-serif", width: 112, textAlign: "right",
          padding: "0.4rem 0.75rem", border: "1px solid rgba(12,26,61,0.12)",
          borderRadius: 10, fontSize: "0.84rem", fontWeight: 700, color: "#0C1A3D",
          outline: "none",
        }}
      />
      {!prefix && <span style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.8rem", color: "rgba(12,26,61,0.5)", whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}
