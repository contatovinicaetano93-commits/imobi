"use client";

import { useState } from "react";
import { ChevronLeft, Save, AlertTriangle, Percent, DollarSign, Clock, MapPin } from "lucide-react";

type Config = {
  taxaMensalMin: number;
  taxaMensalMax: number;
  taxaPadrao: number;
  valorMinCredito: number;
  valorMaxCredito: number;
  prazoMaxMeses: number;
  raioValidacaoMetrosPadrao: number;
  diasAprovacao: number;
  limiteEvidenciasMB: number;
};

const DEFAULTS: Config = {
  taxaMensalMin: 0.89,
  taxaMensalMax: 2.5,
  taxaPadrao: 1.89,
  valorMinCredito: 50000,
  valorMaxCredito: 5000000,
  prazoMaxMeses: 60,
  raioValidacaoMetrosPadrao: 100,
  diasAprovacao: 15,
  limiteEvidenciasMB: 10,
};

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Config>(k: K, v: number) {
    setConfig((c) => ({ ...c, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/proxy/admin/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <a href="/dashboard/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B4FD8] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Admin
        </a>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">Configurações</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">Parâmetros globais de crédito e validação</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ background: saving ? "#6b7280" : saved ? "#16a34a" : "#1B4FD8" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">Mudanças afetam <strong>novas</strong> solicitações. Créditos já aprovados mantêm as condições originais.</p>
      </div>

      <Section title="Taxas de Juros" icon={<Percent className="w-4 h-4" style={{ color: "#7c3aed" }} />}>
        <Row label="Taxa mínima (% a.m.)" hint="Piso para qualquer operação">
          <NumberInput value={config.taxaMensalMin} onChange={(v) => set("taxaMensalMin", v)} step={0.01} min={0.1} max={5} suffix="% a.m." />
        </Row>
        <Row label="Taxa máxima (% a.m.)" hint="Teto para qualquer operação">
          <NumberInput value={config.taxaMensalMax} onChange={(v) => set("taxaMensalMax", v)} step={0.01} min={0.1} max={10} suffix="% a.m." />
        </Row>
        <Row label="Taxa padrão (% a.m.)" hint="Usada em simulações sem proposta formal">
          <NumberInput value={config.taxaPadrao} onChange={(v) => set("taxaPadrao", v)} step={0.01} min={0.1} max={10} suffix="% a.m." />
        </Row>
      </Section>

      <Section title="Limites de Crédito" icon={<DollarSign className="w-4 h-4" style={{ color: "#1B4FD8" }} />}>
        <Row label="Valor mínimo" hint="Mínimo por solicitação">
          <NumberInput value={config.valorMinCredito} onChange={(v) => set("valorMinCredito", v)} step={10000} min={10000} max={500000} suffix="R$" prefix />
        </Row>
        <Row label="Valor máximo" hint="Máximo por solicitação">
          <NumberInput value={config.valorMaxCredito} onChange={(v) => set("valorMaxCredito", v)} step={100000} min={100000} max={50000000} suffix="R$" prefix />
        </Row>
        <Row label="Prazo máximo" hint="Em meses">
          <NumberInput value={config.prazoMaxMeses} onChange={(v) => set("prazoMaxMeses", v)} step={6} min={6} max={360} suffix="meses" />
        </Row>
      </Section>

      <Section title="Aprovação & Prazos" icon={<Clock className="w-4 h-4" style={{ color: "#0369a1" }} />}>
        <Row label="SLA de aprovação" hint="Dias úteis para dar parecer">
          <NumberInput value={config.diasAprovacao} onChange={(v) => set("diasAprovacao", v)} step={1} min={1} max={60} suffix="dias úteis" />
        </Row>
        <Row label="Limite de evidência" hint="Tamanho máximo por foto enviada">
          <NumberInput value={config.limiteEvidenciasMB} onChange={(v) => set("limiteEvidenciasMB", v)} step={1} min={1} max={50} suffix="MB" />
        </Row>
      </Section>

      <Section title="Validação GPS" icon={<MapPin className="w-4 h-4" style={{ color: "#16a34a" }} />}>
        <Row label="Raio padrão de validação" hint="Distância máxima da obra para envio de evidência (override por obra)">
          <NumberInput value={config.raioValidacaoMetrosPadrao} onChange={(v) => set("raioValidacaoMetrosPadrao", v)} step={10} min={10} max={5000} suffix="metros" />
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center">{icon}</div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, step, min, max, suffix, prefix }: {
  value: number; onChange: (v: number) => void;
  step: number; min: number; max: number;
  suffix?: string; prefix?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {prefix && <span className="text-sm text-gray-500">{suffix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step} min={min} max={max}
        className="w-28 text-right px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {!prefix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
    </div>
  );
}
