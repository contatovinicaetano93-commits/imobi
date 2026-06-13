"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { comiteApi, obrasApi, type ObraResumo } from "@/lib/api";
import { FileText, ChevronRight, AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import Link from "next/link";

const FINALIDADES = [
  "Construção residencial",
  "Construção comercial",
  "Retrofit / Reforma",
  "Loteamento",
  "Incorporação",
  "Outro",
];

type FieldErrors = { valorSolicitado?: string; prazoMeses?: string; taxaMensal?: string };
type Touched     = { valorSolicitado?: boolean; prazoMeses?: boolean; taxaMensal?: boolean };

export default function SolicitarComitePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Touched>({});

  const [form, setForm] = useState({
    valorSolicitado: "",
    prazoMeses: "12",
    taxaMensal: "1.2",
    finalidade: FINALIDADES[0],
    garantias: "",
    observacoes: "",
    vgv: "",
    custoObra: "",
    obraId: "",
  });

  useEffect(() => {
    obrasApi.listar().then(setObras).catch(() => {});
  }, []);

  const ltv =
    form.vgv && form.valorSolicitado && parseFloat(form.vgv) > 0
      ? ((parseFloat(form.valorSolicitado) / parseFloat(form.vgv)) * 100).toFixed(1)
      : null;

  const rating =
    ltv === null ? "—"
      : parseFloat(ltv) <= 50 ? "A"
      : parseFloat(ltv) <= 65 ? "B"
      : parseFloat(ltv) <= 75 ? "C"
      : "D";

  const ratingColor: Record<string, string> = {
    A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626",
  };

  const ratingMsg: Record<string, string> = {
    A: "Excelente — LTV baixo favorece aprovação rápida.",
    B: "Bom — dentro do limite recomendado de 65%.",
    C: "Atenção — LTV alto pode exigir garantias adicionais.",
    D: "Alto risco — LTV acima de 75% dificulta a aprovação.",
  };

  const ratingBg: Record<string, string> = {
    A: "bg-green-50 text-green-700",
    B: "bg-blue-50 text-blue-700",
    C: "bg-amber-50 text-amber-700",
    D: "bg-red-50 text-red-700",
  };

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate(f: typeof form): FieldErrors {
    const errs: FieldErrors = {};
    const val = parseFloat(f.valorSolicitado);
    if (!f.valorSolicitado || isNaN(val)) errs.valorSolicitado = "Informe o valor solicitado";
    else if (val < 100000) errs.valorSolicitado = "Mínimo: R$ 100.000";
    const prazo = parseInt(f.prazoMeses);
    if (!f.prazoMeses || isNaN(prazo)) errs.prazoMeses = "Informe o prazo";
    else if (prazo < 12 || prazo > 180) errs.prazoMeses = "Entre 12 e 180 meses";
    const taxa = parseFloat(f.taxaMensal);
    if (!f.taxaMensal || isNaN(taxa)) errs.taxaMensal = "Informe a taxa mensal";
    else if (taxa <= 0 || taxa > 10) errs.taxaMensal = "Entre 0,01% e 10% a.m.";
    return errs;
  }

  function blurField(k: keyof Touched, currentVal: string) {
    const merged = { ...form, [k]: currentVal };
    setTouched(t => ({ ...t, [k]: true }));
    setFieldErrors(validate(merged));
  }

  function changeField(k: "valorSolicitado" | "prazoMeses" | "taxaMensal", v: string) {
    set(k, v);
    if (touched[k]) setFieldErrors(validate({ ...form, [k]: v }));
  }

  const errCls = (k: keyof FieldErrors) =>
    touched[k] && fieldErrors[k]
      ? "border-red-300 bg-red-50/40"
      : "border-gray-200";

  async function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setTouched({ valorSolicitado: true, prazoMeses: true, taxaMensal: true });
      setFieldErrors(errs);
      setStep(1);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await comiteApi.solicitar({
        valorSolicitado: parseFloat(form.valorSolicitado),
        prazoMeses: parseInt(form.prazoMeses),
        taxaMensal: parseFloat(form.taxaMensal),
        finalidade: form.finalidade,
        garantias: form.garantias || undefined,
        observacoes: form.observacoes || undefined,
        obraId: form.obraId || undefined,
        vgv: form.vgv ? parseFloat(form.vgv) : undefined,
        custoObra: form.custoObra ? parseFloat(form.custoObra) : undefined,
        ltv: ltv ? parseFloat(ltv) : undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao enviar solicitação");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitação enviada!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sua proposta foi encaminhada ao Comitê Digital. Você pode acompanhar o andamento em "Minhas Solicitações".
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/dashboard/comite")}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            Ver minhas solicitações
          </button>
          <button
            onClick={() => { setSuccess(false); setStep(1); setForm({ valorSolicitado: "", prazoMeses: "12", taxaMensal: "1.2", finalidade: FINALIDADES[0], garantias: "", observacoes: "", vgv: "", custoObra: "", obraId: "" }); setFieldErrors({}); setTouched({}); }}
            className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Nova solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/comite" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Solicitar ao Comitê Digital</h1>
            <p className="text-xs text-gray-400">Proposta formal para análise e votação</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 text-xs">
        {(["Valores & Obra", "Garantias", "Revisão"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i + 1 < step && setStep((i + 1) as 1 | 2 | 3)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition ${
                step === i + 1
                  ? "bg-blue-600 text-white"
                  : step > i + 1
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]" style={{ borderColor: "currentColor" }}>
                {step > i + 1 ? "✓" : i + 1}
              </span>
              {s}
            </button>
            {i < 2 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold text-gray-900">Dados financeiros</h2>
            <div className="grid grid-cols-2 gap-4">

              <label className="space-y-1.5 col-span-2">
                <span className="text-xs font-medium text-gray-600">Valor solicitado (R$) *</span>
                <input
                  type="number" min={0}
                  value={form.valorSolicitado}
                  onChange={(e) => changeField("valorSolicitado", e.target.value)}
                  onBlur={(e) => blurField("valorSolicitado", e.target.value)}
                  placeholder="Ex: 1000000"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${errCls("valorSolicitado")}`}
                />
                {touched.valorSolicitado && fieldErrors.valorSolicitado && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.valorSolicitado}
                  </p>
                )}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600">Prazo (meses) *</span>
                <input
                  type="number" min={12} max={180}
                  value={form.prazoMeses}
                  onChange={(e) => changeField("prazoMeses", e.target.value)}
                  onBlur={(e) => blurField("prazoMeses", e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${errCls("prazoMeses")}`}
                />
                {touched.prazoMeses && fieldErrors.prazoMeses && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.prazoMeses}
                  </p>
                )}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600">Taxa mensal (% a.m.) *</span>
                <input
                  type="number" min={0} step={0.01}
                  value={form.taxaMensal}
                  onChange={(e) => changeField("taxaMensal", e.target.value)}
                  onBlur={(e) => blurField("taxaMensal", e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${errCls("taxaMensal")}`}
                />
                {touched.taxaMensal && fieldErrors.taxaMensal && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />{fieldErrors.taxaMensal}
                  </p>
                )}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600">VGV estimado (R$)</span>
                <input type="number" min={0} value={form.vgv}
                  onChange={(e) => set("vgv", e.target.value)}
                  placeholder="Valor geral de vendas"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-gray-600">Custo de obra (R$)</span>
                <input type="number" min={0} value={form.custoObra}
                  onChange={(e) => set("custoObra", e.target.value)}
                  placeholder="Custo total estimado"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </label>

              <label className="space-y-1.5 col-span-2">
                <span className="text-xs font-medium text-gray-600">Finalidade *</span>
                <select value={form.finalidade} onChange={(e) => set("finalidade", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                  {FINALIDADES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </label>

              {obras.length > 0 && (
                <label className="space-y-1.5 col-span-2">
                  <span className="text-xs font-medium text-gray-600">Obra associada (opcional)</span>
                  <select value={form.obraId} onChange={(e) => set("obraId", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                    <option value="">Selecionar obra (opcional)</option>
                    {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </select>
                </label>
              )}
            </div>

            {ltv && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">LTV calculado</p>
                    <p className="text-lg font-bold text-gray-900">{ltv}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Rating estimado</p>
                    <p className="text-2xl font-black" style={{ color: ratingColor[rating] ?? "#6b7280" }}>{rating}</p>
                  </div>
                </div>
                {ratingMsg[rating] && (
                  <p className={`text-xs rounded-lg px-3 py-2 font-medium ${ratingBg[rating]}`}>
                    {ratingMsg[rating]}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                const allTouched: Touched = { valorSolicitado: true, prazoMeses: true, taxaMensal: true };
                setTouched(allTouched);
                const errs = validate(form);
                setFieldErrors(errs);
                if (Object.keys(errs).length > 0) return;
                setError(null);
                setStep(2);
              }}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Continuar
            </button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold text-gray-900">Garantias e observações</h2>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-600">Garantias oferecidas</span>
              <textarea rows={3} value={form.garantias} onChange={(e) => set("garantias", e.target.value)}
                placeholder="Ex: Alienação fiduciária do terreno, avalista com imóvel..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-600">Observações adicionais para o comitê</span>
              <textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)}
                placeholder="Informações complementares, histórico de vendas, diferenciais..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            </label>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                Voltar
              </button>
              <button onClick={() => { setError(null); setStep(3); }}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Revisar
              </button>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <h2 className="text-sm font-semibold text-gray-900">Revisão da proposta</h2>
            <div className="space-y-3 divide-y divide-gray-50">
              {[
                { label: "Valor solicitado", value: formatarBRL(parseFloat(form.valorSolicitado || "0")) },
                { label: "Prazo", value: `${form.prazoMeses} meses` },
                { label: "Taxa mensal", value: `${form.taxaMensal}% a.m.` },
                { label: "Finalidade", value: form.finalidade },
                { label: "VGV", value: form.vgv ? formatarBRL(parseFloat(form.vgv)) : "—" },
                { label: "Custo da obra", value: form.custoObra ? formatarBRL(parseFloat(form.custoObra)) : "—" },
                { label: "LTV estimado", value: ltv ? `${ltv}%` : "—" },
                { label: "Rating estimado", value: rating },
                { label: "Garantias", value: form.garantias || "—" },
                { label: "Observações", value: form.observacoes || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm pt-3 first:pt-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[55%]">{value}</span>
                </div>
              ))}
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
              Ao confirmar, a solicitação é encaminhada ao Comitê Digital. O engenheiro adicionará o parecer técnico, e os administradores votarão. Você receberá a decisão por notificação.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                Voltar
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                {loading ? "Enviando..." : "Confirmar e enviar"}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
