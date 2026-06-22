"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2,
  TrendingUp, Building2, Wallet, BarChart3, Info,
} from "lucide-react";

// ─── Formatters ──────────────────────────────────────────────────────────────

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function pct(v: number) {
  return v.toFixed(2).replace(".", ",") + "%";
}
function fmtInput(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

// ─── Month helpers ───────────────────────────────────────────────────────────

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

function fmtMonth(d: Date): string {
  return `${MONTHS_PT[d.getMonth()]}/${d.getFullYear()}`;
}

// ─── Form state ──────────────────────────────────────────────────────────────

type Form = {
  nome: string;
  vgv: number;
  unidades: number;
  prazo: number;
  dataInicio: string;
  custoObra: number;
  despesasComerciais: number;
  outrasDespesas: number;
  custoTerreno: number;
  pctFinTerreno: number;
  pctFinObra: number;      // % of custo de obra (max 80)
  taxaMensal: number;      // 1.4 – 1.9 %/mês
};

const DEFAULTS: Form = {
  nome: "",
  vgv: 0,
  unidades: 20,
  prazo: 24,
  dataInicio: new Date().toISOString().slice(0, 7),
  custoObra: 0,
  despesasComerciais: 5,
  outrasDespesas: 2,
  custoTerreno: 0,
  pctFinTerreno: 0,
  pctFinObra: 50,         // default 50% (within 80% cap)
  taxaMensal: 1.65,       // mid-range default
};

// ─── Viability calculation ────────────────────────────────────────────────────

type CashFlowRow = {
  label: string;
  fase: "PRE" | "OBRA" | "POS";
  evolFisica: number;     // cumulative %
  aporteIncorporador: number;
  entradaFinanciamento: number;
  vendas: number;
  custosMes: number;
  saldoMensal: number;
  saldoAcumulado: number;
};

type Viability = {
  margemBruta: number;
  margemBrutaPct: number;
  margemLiquida: number;
  margemLiquidaPct: number;
  finTotalObra: number;
  finTotalTerreno: number;
  aporteTotal: number;
  custoTotal: number;
  // IMOBI cost breakdown
  jurosTotal: number;
  custoEstruturacao: number;     // 3% one-time on financed amount
  custoLiberacao: number;        // 7% spread over all tranches
  custoMonitoramento: number;    // 1% VGV one-time
  totalCustoImobi: number;
  cetMensal: number;             // approx effective monthly rate
  cetAnual: number;
  rows: CashFlowRow[];
  alertas: { tipo: "danger" | "warning" | "ok"; msg: string }[];
};

function calcViability(f: Form): Viability {
  const despCom = (f.despesasComerciais / 100) * f.vgv;
  const outrasDes = (f.outrasDespesas / 100) * f.vgv;
  const finTerreno = (f.pctFinTerreno / 100) * f.custoTerreno;
  // IMOBI cap: max 80% of custo de obra
  const pctFinObra = Math.min(f.pctFinObra, 80);
  const finObra = (pctFinObra / 100) * f.custoObra;
  const custoTotal = f.custoObra + f.custoTerreno + despCom + outrasDes;
  const margemBruta = f.vgv - custoTotal;
  const margemBrutaPct = f.vgv > 0 ? (margemBruta / f.vgv) * 100 : 0;

  // ── IMOBI cost breakdown ──
  const txMes = f.taxaMensal / 100;
  // Interest on declining balance (average = finObra/2 over prazo months)
  const jurosTotal = (finObra / 2) * txMes * f.prazo;
  // 3% one-time estruturação fee on financed amount
  const custoEstruturacao = finObra * 0.03;
  // 7% spread across all tranches = 7% of financed amount
  const custoLiberacao = finObra * 0.07;
  // 1% VGV one-time monitoring fee
  const custoMonitoramento = f.vgv * 0.01;
  const totalCustoImobi = jurosTotal + custoEstruturacao + custoLiberacao + custoMonitoramento;

  // CET: approximate monthly rate that makes NPV of payments = finObra
  // Simplified: (total repaid / finObra)^(1/prazo) - 1
  const totalRepaid = finObra + totalCustoImobi;
  const cetMensal = finObra > 0 && f.prazo > 0
    ? (Math.pow(totalRepaid / finObra, 1 / f.prazo) - 1) * 100
    : 0;
  const cetAnual = (Math.pow(1 + cetMensal / 100, 12) - 1) * 100;

  const margemLiquida = margemBruta - totalCustoImobi;
  const margemLiquidaPct = f.vgv > 0 ? (margemLiquida / f.vgv) * 100 : 0;

  // Equity needed
  const aporteTerreno = f.custoTerreno - finTerreno;
  const aporteObra = f.custoObra - finObra;
  const aporteTotal = aporteTerreno + aporteObra;

  // ── Build cash flow rows ──
  // Phases: PRE_OBRA (-3...-1), OBRA (1...prazo), POS_OBRA (1...6)
  const rows: CashFlowRow[] = [];
  const base = new Date(f.dataInicio + "-01");
  let saldoAcumulado = 0;

  // PRE-OBRA: 3 months — land cost + equity
  const preMonths = 3;
  for (let i = 0; i < preMonths; i++) {
    const d = addMonths(base, i - preMonths);
    const isLastPre = i === preMonths - 1;
    // Terreno cost spread: 50% in month -3, 50% in month -2 for equity; financing arrives in month -1
    const aporteTerrMes = i < 2 ? aporteTerreno / 2 : 0;
    const entFinMes = isLastPre ? finTerreno : 0;
    const custoMes = i < 2 ? f.custoTerreno / 2 : 0;
    const saldoMensal = entFinMes - aporteTerrMes - custoMes;
    saldoAcumulado += saldoMensal;
    rows.push({
      label: fmtMonth(d), fase: "PRE",
      evolFisica: 0,
      aporteIncorporador: aporteTerrMes,
      entradaFinanciamento: entFinMes,
      vendas: 0,
      custosMes: custoMes,
      saldoMensal,
      saldoAcumulado,
    });
  }

  // OBRA: prazo months
  const evolPorMes = f.prazo > 0 ? 100 / f.prazo : 0;
  const finObraMensal = f.prazo > 0 ? finObra / f.prazo : 0;
  const aporteObraMensal = f.prazo > 0 ? aporteObra / f.prazo : 0;
  const custoObraMensal = f.prazo > 0 ? f.custoObra / f.prazo : 0;
  // 30% of sales during obra
  const vendasObra = f.vgv * 0.3;
  const vendasObraMensal = f.prazo > 0 ? vendasObra / f.prazo : 0;
  const despCadaMes = f.prazo > 0 ? (despCom + outrasDes) / f.prazo : 0;

  let evolAcum = 0;
  for (let i = 1; i <= f.prazo; i++) {
    const d = addMonths(base, i - 1);
    evolAcum += evolPorMes;
    const saldoMensal = vendasObraMensal + finObraMensal - aporteObraMensal - custoObraMensal - despCadaMes;
    saldoAcumulado += saldoMensal;
    rows.push({
      label: fmtMonth(d), fase: "OBRA",
      evolFisica: Math.min(evolAcum, 100),
      aporteIncorporador: aporteObraMensal,
      entradaFinanciamento: finObraMensal,
      vendas: vendasObraMensal,
      custosMes: custoObraMensal + despCadaMes,
      saldoMensal,
      saldoAcumulado,
    });
  }

  // POS-OBRA: 6 months — 70% of sales, financing repayment
  const vendasPos = f.vgv * 0.7;
  const posMonths = 6;
  const vendasPosMensal = vendasPos / posMonths;
  const repagFinMensal = (finObra + finTerreno) / posMonths;
  for (let i = 1; i <= posMonths; i++) {
    const d = addMonths(base, f.prazo + i - 1);
    const saldoMensal = vendasPosMensal - repagFinMensal;
    saldoAcumulado += saldoMensal;
    rows.push({
      label: fmtMonth(d), fase: "POS",
      evolFisica: 100,
      aporteIncorporador: 0,
      entradaFinanciamento: -repagFinMensal,
      vendas: vendasPosMensal,
      custosMes: 0,
      saldoMensal,
      saldoAcumulado,
    });
  }

  // ── Alertas ──
  const alertas: Viability["alertas"] = [];

  if (f.vgv === 0 || f.custoObra === 0) {
    alertas.push({ tipo: "warning", msg: "Preencha o VGV e o custo de obra para gerar alertas." });
  } else {
    if (margemBrutaPct < 15) {
      alertas.push({ tipo: "danger", msg: `Margem bruta muito baixa (${pct(margemBrutaPct)}). Mínimo recomendado pelo IMOBI: 15%.` });
    } else if (margemBrutaPct < 20) {
      alertas.push({ tipo: "warning", msg: `Margem bruta (${pct(margemBrutaPct)}) abaixo do ideal. Avalie reduzir custos.` });
    } else {
      alertas.push({ tipo: "ok", msg: `Margem bruta saudável: ${pct(margemBrutaPct)}.` });
    }

    if (f.custoObra > f.vgv * 0.65) {
      alertas.push({ tipo: "danger", msg: "Custo de construção acima de 65% do VGV. IMOBI pode reprovar a operação." });
    }

    if (margemLiquidaPct < 10) {
      alertas.push({ tipo: "danger", msg: `Margem líquida após custos IMOBI: ${pct(margemLiquidaPct)}. Projeto pode não ser aprovado.` });
    } else if (margemLiquidaPct < 15) {
      alertas.push({ tipo: "warning", msg: `Margem líquida (${pct(margemLiquidaPct)}) aceitável. Ideal ≥ 15% para aprovação facilitada.` });
    } else {
      alertas.push({ tipo: "ok", msg: `Margem líquida após todos os custos IMOBI: ${pct(margemLiquidaPct)}. Projeto elegível.` });
    }

    if (pctFinObra === 80) {
      alertas.push({ tipo: "warning", msg: "Financiando no limite máximo (80%). Exigirá garantias adicionais e KYC completo." });
    }

    const minNegRow = rows.reduce((min, r) => r.saldoAcumulado < min ? r.saldoAcumulado : min, 0);
    if (minNegRow < -aporteTotal * 0.2) {
      alertas.push({ tipo: "warning", msg: `Saldo acumulado negativo de ${brl(Math.abs(minNegRow))} previsto. Revise o cronograma de vendas.` });
    }
  }

  return {
    margemBruta, margemBrutaPct,
    margemLiquida, margemLiquidaPct,
    finTotalObra: finObra,
    finTotalTerreno: finTerreno,
    aporteTotal,
    custoTotal,
    jurosTotal,
    custoEstruturacao,
    custoLiberacao,
    custoMonitoramento,
    totalCustoImobi,
    cetMensal,
    cetAnual,
    rows,
    alertas,
  };
}

// ─── UI Components ────────────────────────────────────────────────────────────

function CurrencyInput({
  label, value, onChange, hint,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">R$</span>
        <input
          type="text"
          inputMode="numeric"
          value={fmtInput(value)}
          onChange={(e) => {
            const raw = e.target.value.replace(/\./g, "").replace(",", ".");
            const n = Number(raw.replace(/[^0-9.]/g, ""));
            onChange(isNaN(n) ? 0 : n);
          }}
          placeholder="0"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none transition-all"
        />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function PctInput({
  label, value, onChange, hint, min = 0, max = 100,
}: { label: string; value: number; onChange: (v: number) => void; hint?: string; min?: number; max?: number }) {
  const [raw, setRaw] = useState(String(value).replace(".", ","));
  const [focused, setFocused] = useState(false);

  // Keep display in sync when parent changes value externally (but not while user is typing)
  useEffect(() => {
    if (!focused) setRaw(String(value).replace(".", ","));
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9,.]/g, "");
    setRaw(input);
    // Normalise comma to dot for parsing
    const parsed = parseFloat(input.replace(",", "."));
    if (!isNaN(parsed)) onChange(Math.min(Math.max(parsed, min), max));
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(raw.replace(",", "."));
    if (isNaN(parsed)) {
      setRaw(String(value).replace(".", ","));
    } else {
      const clamped = Math.min(Math.max(parsed, min), max);
      onChange(clamped);
      setRaw(String(clamped).replace(".", ","));
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          className="w-full pr-9 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">%</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STEPS = ["Empreendimento", "Custos", "Financiamento", "Resultado"];

export default function SimuladorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Carregando simulador…</div>}>
      <SimuladorContent />
    </Suspense>
  );
}

function SimuladorContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [form, setForm] = useState<Form>(DEFAULTS);
  const [gerado, setGerado] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled) return;
    const valor = Number(searchParams.get("valor"));
    const prazo = Number(searchParams.get("prazo"));
    if (!valor && !prazo) return;
    setForm((f) => ({
      ...f,
      ...(valor > 0 ? { custoObra: valor, vgv: Math.round(valor * 1.35) } : {}),
      ...(prazo >= 6 ? { prazo } : {}),
    }));
    setPrefilled(true);
  }, [searchParams, prefilled]);

  const set = (k: keyof Form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const viab = useMemo(() => calcViability(form), [form]);

  const totals = useMemo(() => {
    const r = viab.rows;
    return {
      aporte: r.reduce((s, x) => s + x.aporteIncorporador, 0),
      financiamento: r.reduce((s, x) => s + x.entradaFinanciamento, 0),
      vendas: r.reduce((s, x) => s + x.vendas, 0),
      saldoFinal: r.length > 0 ? r[r.length - 1].saldoAcumulado : 0,
    };
  }, [viab]);

  const canNext = [
    form.nome.trim().length > 0 && form.vgv > 0 && form.prazo >= 6,
    form.custoObra > 0,
    true,
    true,
  ][step];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Estudo de Viabilidade</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Analise a viabilidade do seu empreendimento antes de solicitar o crédito.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step || (i === 3 && gerado);
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => (done || i < step) && setStep(i as 0 | 1 | 2 | 3)}
                disabled={i > step && !gerado}
                className="flex items-center gap-2 shrink-0"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? "bg-[#16a34a] text-white" : active ? "bg-[#1B4FD8] text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {done && !active ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${active ? "text-[#1B4FD8]" : done ? "text-[#16a34a]" : "text-gray-400"}`}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < step ? "bg-[#16a34a]" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Steps */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {step === 0 && (
          <>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1B4FD8]" />
              Dados do Empreendimento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do empreendimento</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Ex: Residencial Gralha Azul"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none"
                />
              </div>
              <CurrencyInput
                label="VGV — Valor Geral de Vendas"
                value={form.vgv}
                onChange={(v) => set("vgv", v)}
                hint="Soma total do valor de todas as unidades"
              />
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número de unidades</label>
                <input
                  type="number"
                  min={1}
                  value={form.unidades}
                  onChange={(e) => set("unidades", Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none"
                />
                {form.vgv > 0 && form.unidades > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ticket médio: {brl(form.vgv / form.unidades)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prazo de obra</label>
                <div className="relative">
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={form.prazo}
                    onChange={(e) => set("prazo", Number(e.target.value))}
                    className="w-full pr-16 pl-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">meses</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Início previsto</label>
                <input
                  type="month"
                  value={form.dataInicio}
                  onChange={(e) => set("dataInicio", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent outline-none"
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1B4FD8]" />
              Custos do Projeto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <CurrencyInput
                  label="Custo total de construção"
                  value={form.custoObra}
                  onChange={(v) => set("custoObra", v)}
                  hint={form.vgv > 0 ? `${pct((form.custoObra / form.vgv) * 100)} do VGV` : undefined}
                />
              </div>
              <CurrencyInput
                label="Custo do terreno"
                value={form.custoTerreno}
                onChange={(v) => set("custoTerreno", v)}
                hint={form.vgv > 0 && form.custoTerreno > 0 ? `${pct((form.custoTerreno / form.vgv) * 100)} do VGV` : undefined}
              />
              <div>
                {/* spacer or additional field */}
              </div>
              <PctInput
                label="Despesas comerciais"
                value={form.despesasComerciais}
                onChange={(v) => set("despesasComerciais", v)}
                hint={form.vgv > 0 ? brl((form.despesasComerciais / 100) * form.vgv) : "Corretagem, marketing etc."}
              />
              <PctInput
                label="Outras despesas"
                value={form.outrasDespesas}
                onChange={(v) => set("outrasDespesas", v)}
                hint={form.vgv > 0 ? brl((form.outrasDespesas / 100) * form.vgv) : "Registro, impostos etc."}
              />
            </div>

            {/* Live margin preview */}
            {form.vgv > 0 && form.custoObra > 0 && (
              <div className={`rounded-xl p-4 flex items-center gap-3 ${viab.margemBrutaPct >= 20 ? "bg-green-50 border border-green-100" : viab.margemBrutaPct >= 15 ? "bg-yellow-50 border border-yellow-100" : "bg-red-50 border border-red-100"}`}>
                <TrendingUp className={`w-5 h-5 shrink-0 ${viab.margemBrutaPct >= 20 ? "text-green-600" : viab.margemBrutaPct >= 15 ? "text-yellow-600" : "text-red-600"}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Margem bruta estimada: {brl(viab.margemBruta)} ({pct(viab.margemBrutaPct)})
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Calculada sobre o VGV menos todos os custos informados</p>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#1B4FD8]" />
              Estrutura de Financiamento IMOBI
            </h2>

            {/* Taxa mensal */}
            <div className="bg-[#0C1A3D] rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <p className="text-sm font-semibold text-white">Taxa mensal</p>
                <p className="text-2xl font-bold text-[#4ADE80]">{form.taxaMensal.toFixed(2).replace(".", ",")}% a.m.</p>
              </div>
              <input
                type="range"
                min={1.4}
                max={1.9}
                step={0.05}
                value={form.taxaMensal}
                onChange={(e) => set("taxaMensal", Number(e.target.value))}
                className="w-full accent-[#4ADE80]"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1,40% a.m. (menor risco)</span>
                <span>1,90% a.m. (maior risco)</span>
              </div>
              <p className="text-xs text-gray-400">
                Taxa final definida após análise de risco e KYC. CET estimado: {pct(viab.cetAnual)} a.a.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PctInput
                label="Financiamento do terreno"
                value={form.pctFinTerreno}
                onChange={(v) => set("pctFinTerreno", v)}
                hint={form.custoTerreno > 0 ? `${brl((form.pctFinTerreno / 100) * form.custoTerreno)} financiado` : "% do custo do terreno"}
              />
              <div>
                <PctInput
                  label="Financiamento ciclo de obra (máx. 80%)"
                  value={form.pctFinObra}
                  onChange={(v) => set("pctFinObra", Math.min(v, 80))}
                  hint={form.custoObra > 0 ? `${brl(Math.min(form.pctFinObra, 80) / 100 * form.custoObra)} financiado pelo IMOBI` : "% do custo de obra"}
                  max={80}
                />
                {form.pctFinObra > 80 && (
                  <p className="text-xs text-red-500 mt-1">Limite máximo do IMOBI: 80%</p>
                )}
              </div>
            </div>

            {/* Summary boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Fin. terreno",      value: brl((form.pctFinTerreno / 100) * form.custoTerreno),                    color: "text-blue-700",   bg: "bg-blue-50" },
                { label: "Fin. ciclo obra",    value: brl(Math.min(form.pctFinObra, 80) / 100 * form.custoObra),             color: "text-[#1B4FD8]",  bg: "bg-blue-50" },
                { label: "Custo total IMOBI",  value: form.custoObra > 0 ? brl(viab.totalCustoImobi) : "—",                  color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Aporte próprio",     value: brl(viab.aporteTotal),                                                  color: "text-gray-800",   bg: "bg-gray-50" },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-3`}>
                  <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Fee breakdown */}
            {viab.finTotalObra > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Composição do custo da operação</p>
                </div>
                {[
                  { label: "Juros",                             value: brl(viab.jurosTotal),           hint: `${form.taxaMensal.toFixed(2).replace(".", ",")}%/mês sobre saldo médio` },
                  { label: "Taxa de estruturação (3%)",         value: brl(viab.custoEstruturacao),    hint: "Cobrado uma única vez na abertura" },
                  { label: "Taxa de liberação (7%)",            value: brl(viab.custoLiberacao),       hint: "7% sobre o total liberado por etapas" },
                  { label: "Taxa de monitoramento (1% VGV)",   value: brl(viab.custoMonitoramento),   hint: "Cobrado uma única vez sobre o VGV do empreendimento" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{row.label}</p>
                      <p className="text-xs text-gray-400">{row.hint}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{row.value}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-[#0C1A3D] text-white">
                  <p className="text-sm font-bold">Total operação</p>
                  <p className="text-base font-bold text-[#4ADE80]">{brl(viab.totalCustoImobi)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Liberações vinculadas a <strong>vistorias por engenheiro credenciado</strong> a cada etapa concluída.
                Exige KYC completo, documentação da obra e aprovação de crédito.
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1B4FD8]" />
              Resultado do Estudo — {form.nome || "Empreendimento"}
            </h2>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "VGV",             value: brl(form.vgv),               sub: "100%",                          top: "bg-gray-300" },
                { label: "Custo total",     value: brl(viab.custoTotal),         sub: pct(form.vgv > 0 ? (viab.custoTotal / form.vgv) * 100 : 0), top: "bg-orange-400" },
                { label: "Margem bruta",    value: brl(viab.margemBruta),        sub: pct(viab.margemBrutaPct),        top: viab.margemBrutaPct >= 20 ? "bg-[#16a34a]" : viab.margemBrutaPct >= 15 ? "bg-yellow-400" : "bg-red-500" },
                { label: "Margem líquida",  value: brl(viab.margemLiquida),      sub: pct(viab.margemLiquidaPct),      top: viab.margemLiquidaPct >= 10 ? "bg-[#16a34a]" : "bg-red-500" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className={`h-1 w-full ${kpi.top}`} />
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                    <p className="text-lg font-bold text-gray-900 leading-none">{kpi.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* IMOBI cost card */}
            {viab.finTotalObra > 0 && (
              <div className="bg-[#0C1A3D] rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#4ADE80] mb-4">Custo da Operação IMOBI</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Financiamento liberado",   value: brl(viab.finTotalObra) },
                    { label: `Juros (${form.taxaMensal.toFixed(2).replace(".", ",")}%/mês)`, value: brl(viab.jurosTotal) },
                    { label: "Estruturação (3%)",        value: brl(viab.custoEstruturacao) },
                    { label: "Taxa liberação (7%)",      value: brl(viab.custoLiberacao) },
                    { label: "Monitoramento (1% VGV)",  value: brl(viab.custoMonitoramento) },
                    { label: "Total custo IMOBI",        value: brl(viab.totalCustoImobi), highlight: true },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className={`text-sm font-bold ${item.highlight ? "text-[#4ADE80] text-base" : "text-white"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">CET estimado</p>
                    <p className="text-white font-bold">{pct(viab.cetMensal)}/mês · {pct(viab.cetAnual)}/ano</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Custo s/ VGV</p>
                    <p className="text-white font-bold">{pct(form.vgv > 0 ? (viab.totalCustoImobi / form.vgv) * 100 : 0)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Eligibility checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                Requisitos para aprovação IMOBI
              </p>
              {[
                { label: "Margem bruta ≥ 15%",            ok: viab.margemBrutaPct >= 15 },
                { label: "Margem líquida ≥ 10%",          ok: viab.margemLiquidaPct >= 10 },
                { label: "Custo de obra ≤ 65% do VGV",    ok: form.custoObra <= form.vgv * 0.65 },
                { label: "Financiamento ≤ 80% da obra",   ok: form.pctFinObra <= 80 },
                { label: "KYC completo + documentação",    ok: null },
                { label: "Projeto aprovado pela prefeitura", ok: null },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 py-1.5 border-b last:border-0 border-gray-50">
                  {item.ok === null
                    ? <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                    : item.ok
                      ? <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  }
                  <span className={`text-sm ${item.ok === false ? "text-red-600 font-semibold" : item.ok === null ? "text-gray-400" : "text-gray-700"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Alertas */}
            {viab.alertas.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Alertas
                </h3>
                {viab.alertas.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
                    a.tipo === "danger" ? "bg-red-50 text-red-700 border border-red-100" :
                    a.tipo === "warning" ? "bg-yellow-50 text-yellow-800 border border-yellow-100" :
                    "bg-green-50 text-green-700 border border-green-100"
                  }`}>
                    {a.tipo === "ok"
                      ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                    {a.msg}
                  </div>
                ))}
              </div>
            )}

            {/* Cronograma */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cronograma de Fluxo de Caixa</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left font-semibold text-gray-600 px-3 py-2.5">Mês</th>
                      <th className="text-right font-semibold text-gray-600 px-3 py-2.5">Evol. Física</th>
                      <th className="text-right font-semibold text-gray-600 px-3 py-2.5">Aporte Incorporador</th>
                      <th className="text-right font-semibold text-gray-600 px-3 py-2.5">Financiamento</th>
                      <th className="text-right font-semibold text-gray-600 px-3 py-2.5">Vendas</th>
                      <th className="text-right font-semibold text-gray-600 px-3 py-2.5">Saldo Mensal</th>
                      <th className="text-right font-semibold text-gray-600 px-3 py-2.5">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Totals row */}
                    <tr className="bg-[#0C1A3D] text-white font-bold">
                      <td className="px-3 py-2 font-bold">TOTAL</td>
                      <td className="px-3 py-2 text-right">100%</td>
                      <td className="px-3 py-2 text-right">{brl(totals.aporte)}</td>
                      <td className="px-3 py-2 text-right">{brl(totals.financiamento)}</td>
                      <td className="px-3 py-2 text-right">{brl(totals.vendas)}</td>
                      <td className="px-3 py-2 text-right">—</td>
                      <td className="px-3 py-2 text-right text-[#4ADE80]">{brl(totals.saldoFinal)}</td>
                    </tr>

                    {/* Phase headers + rows */}
                    {(["PRE", "OBRA", "POS"] as const).map((fase) => {
                      const faseRows = viab.rows.filter((r) => r.fase === fase);
                      if (faseRows.length === 0) return null;
                      const faseLabel = fase === "PRE" ? "PRÉ-OBRA" : fase === "OBRA" ? "OBRA" : "PÓS-OBRA";
                      const faseBg = fase === "PRE" ? "bg-gray-50" : fase === "OBRA" ? "bg-blue-50" : "bg-green-50";
                      const faseText = fase === "PRE" ? "text-gray-600" : fase === "OBRA" ? "text-blue-700" : "text-green-700";
                      return (
                        <>
                          <tr key={`header-${fase}`} className={`${faseBg} border-t border-gray-100`}>
                            <td colSpan={7} className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${faseText}`}>
                              {faseLabel}
                            </td>
                          </tr>
                          {faseRows.map((row, ri) => (
                            <tr key={`${fase}-${ri}`} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2 font-medium text-gray-700">{row.label}</td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {fase === "PRE" ? "0,00%" : `${row.evolFisica.toFixed(2).replace(".", ",")}%`}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-700">
                                {row.aporteIncorporador > 0 ? brl(row.aporteIncorporador) : "—"}
                              </td>
                              <td className={`px-3 py-2 text-right ${row.entradaFinanciamento >= 0 ? "text-blue-600" : "text-red-500"}`}>
                                {row.entradaFinanciamento !== 0 ? brl(Math.abs(row.entradaFinanciamento)) + (row.entradaFinanciamento < 0 ? "*" : "") : "—"}
                              </td>
                              <td className="px-3 py-2 text-right text-green-600">
                                {row.vendas > 0 ? brl(row.vendas) : "—"}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium ${row.saldoMensal >= 0 ? "text-gray-700" : "text-red-500"}`}>
                                {brl(row.saldoMensal)}
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${row.saldoAcumulado >= 0 ? "text-gray-900" : "text-red-600"}`}>
                                {brl(row.saldoAcumulado)}
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">* Reembolso do financiamento no pós-obra</p>
              </div>
            </div>

            {/* CTA */}
            {viab.margemLiquidaPct >= 10 && (
              <Link
                href={`/dashboard/credito/solicitar?valor=${Math.round(viab.finTotalObra)}&prazo=${form.prazo}`}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-sm shadow-sm hover:shadow-md transition-all"
                style={{ background: "#1B4FD8" }}
              >
                Solicitar crédito de {brl(viab.finTotalObra)} para este projeto
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2 | 3)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {step < 3 ? (
            <button
              onClick={() => {
                setStep((s) => (s + 1) as 0 | 1 | 2 | 3);
                if (step === 2) setGerado(true);
              }}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:shadow-md"
              style={{ background: canNext ? "#1B4FD8" : undefined, backgroundColor: canNext ? undefined : "#9ca3af" }}
            >
              {step === 2 ? "Gerar estudo" : "Próximo"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => { setStep(0); setGerado(false); setForm(DEFAULTS); }}
              className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Novo estudo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
