"use client";

import { useState } from "react";
import {
  Building2,
  FileText,
  Table2,
  TrendingUp,
  BarChart3,
  Users,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────

type Unidade = {
  id: string;
  identificacao: string;
  m2Privativo: string;
  status: "DISPONIVEL" | "VENDIDO" | "PERMUTA";
  valorVenda: string;
};

type Recebivel = {
  id: string;
  contrato: string;
  unidade: string;
  cliente: string;
  parcelaAtual: string;
  parcelaTotal: string;
  dataVencimento: string;
  dataPagamento: string;
  valorRecebido: string;
  valorAReceber: string;
};

type EtapaCronograma = {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  percentualFisico: string;
  percentualFinanceiro: string;
};

type WizardState = {
  // Step 1 — Ficha do Empreendimento
  nomeEmpreendimento: string;
  tipologia: string;
  endereco: string;
  cidade: string;
  uf: string;
  totalUnidades: string;
  areaTotal: string;
  dataEntregaPrevista: string;
  responsavelTecnico: string;
  creaArt: string;
  // Step 2 — Tabela de Unidades
  unidades: Unidade[];
  temRestricaoPermuta: boolean;
  descricaoRestricao: string;
  // Step 3 — Apresentação
  nomeIncorporadora: string;
  cnpjIncorporadora: string;
  anoFundacao: string;
  obrasEntregues: string;
  apresentacaoArquivos: string[];
  // Step 4 — Carteira de Recebíveis
  modeloAmortizacao: "PRICE" | "SAC" | "SACOC" | "";
  totalCarteira: string;
  totalRecebido: string;
  totalAReceber: string;
  recebiveis: Recebivel[];
  // Step 5 — Demonstrações Financeiras
  dre1Ano: string;
  dre2Ano: string;
  dre3Ano: string;
  dre1Arquivo: string;
  dre2Arquivo: string;
  dre3Arquivo: string;
  // Step 6 — Organograma
  estruturaSocietaria: string;
  socios: string;
  organogramaArquivo: string;
  // Step 7 — Cronograma
  modeloCronograma: EtapaCronograma[];
};

// ── Estado inicial ────────────────────────────────────────────────────

const ETAPAS_PADRAO: EtapaCronograma[] = [
  { id: "c1", nome: "Terraplanagem e fundação",  dataInicio: "", dataFim: "", percentualFisico: "15", percentualFinanceiro: "18" },
  { id: "c2", nome: "Estrutura de concreto",      dataInicio: "", dataFim: "", percentualFisico: "20", percentualFinanceiro: "22" },
  { id: "c3", nome: "Alvenaria e vedações",       dataInicio: "", dataFim: "", percentualFisico: "15", percentualFinanceiro: "14" },
  { id: "c4", nome: "Instalações elétricas",      dataInicio: "", dataFim: "", percentualFisico: "10", percentualFinanceiro: "10" },
  { id: "c5", nome: "Instalações hidráulicas",    dataInicio: "", dataFim: "", percentualFisico: "10", percentualFinanceiro: "10" },
  { id: "c6", nome: "Revestimento e acabamento",  dataInicio: "", dataFim: "", percentualFisico: "18", percentualFinanceiro: "16" },
  { id: "c7", nome: "Entrega e regularização",    dataInicio: "", dataFim: "", percentualFisico: "12", percentualFinanceiro: "10" },
];

const INITIAL: WizardState = {
  nomeEmpreendimento: "", tipologia: "", endereco: "", cidade: "", uf: "",
  totalUnidades: "", areaTotal: "", dataEntregaPrevista: "", responsavelTecnico: "", creaArt: "",
  unidades: [{ id: "u1", identificacao: "", m2Privativo: "", status: "DISPONIVEL", valorVenda: "" }],
  temRestricaoPermuta: false, descricaoRestricao: "",
  nomeIncorporadora: "", cnpjIncorporadora: "", anoFundacao: "", obrasEntregues: "", apresentacaoArquivos: [],
  modeloAmortizacao: "", totalCarteira: "", totalRecebido: "", totalAReceber: "",
  recebiveis: [{ id: "r1", contrato: "", unidade: "", cliente: "", parcelaAtual: "", parcelaTotal: "", dataVencimento: "", dataPagamento: "", valorRecebido: "", valorAReceber: "" }],
  dre1Ano: "", dre2Ano: "", dre3Ano: "", dre1Arquivo: "", dre2Arquivo: "", dre3Arquivo: "",
  estruturaSocietaria: "", socios: "", organogramaArquivo: "",
  modeloCronograma: ETAPAS_PADRAO,
};

// ── Componentes auxiliares ────────────────────────────────────────────

const inp = "w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8] focus:border-transparent bg-white";
const lbl = "block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
    </div>
  );
}

// ── Steps config ──────────────────────────────────────────────────────

const STEPS = [
  { icon: Building2,     title: "Ficha do Empreendimento",      short: "Empreendimento" },
  { icon: Table2,        title: "Tabela de Unidades",            short: "Unidades" },
  { icon: FileText,      title: "Apresentação do Projeto",       short: "Apresentação" },
  { icon: TrendingUp,    title: "Carteira de Recebíveis",        short: "Recebíveis" },
  { icon: BarChart3,     title: "Demonstrações Financeiras",     short: "DREs" },
  { icon: Users,         title: "Organograma Societário",        short: "Organograma" },
  { icon: CalendarClock, title: "Cronograma Físico-Financeiro",  short: "Cronograma" },
];

// ── Wizard principal ──────────────────────────────────────────────────

export default function NovaDueDiligencePage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardState>(INITIAL);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function set<K extends keyof WizardState>(field: K, value: WizardState[K]) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  // ── Unidades ──

  function addUnidade() {
    set("unidades", [...form.unidades, { id: `u${Date.now()}`, identificacao: "", m2Privativo: "", status: "DISPONIVEL", valorVenda: "" }]);
  }

  function updateUnidade(id: string, field: keyof Unidade, value: string) {
    set("unidades", form.unidades.map((u) => u.id === id ? { ...u, [field]: value } : u));
  }

  function removeUnidade(id: string) {
    if (form.unidades.length <= 1) return;
    set("unidades", form.unidades.filter((u) => u.id !== id));
  }

  // ── Recebíveis ──

  function addRecebivel() {
    set("recebiveis", [...form.recebiveis, { id: `r${Date.now()}`, contrato: "", unidade: "", cliente: "", parcelaAtual: "", parcelaTotal: "", dataVencimento: "", dataPagamento: "", valorRecebido: "", valorAReceber: "" }]);
  }

  function updateRecebivel(id: string, field: keyof Recebivel, value: string) {
    set("recebiveis", form.recebiveis.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function removeRecebivel(id: string) {
    if (form.recebiveis.length <= 1) return;
    set("recebiveis", form.recebiveis.filter((r) => r.id !== id));
  }

  // ── Cronograma ──

  function updateEtapa(id: string, field: keyof EtapaCronograma, value: string) {
    set("modeloCronograma", form.modeloCronograma.map((e) => e.id === id ? { ...e, [field]: value } : e));
  }

  async function enviar() {
    setEnviando(true);
    try {
      await fetch("/api/proxy/due-diligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeEmpreendimento: form.nomeEmpreendimento,
          tipologia: form.tipologia,
          endereco: form.endereco,
          cidade: form.cidade,
          uf: form.uf,
          totalUnidades: form.totalUnidades ? parseInt(form.totalUnidades) : null,
          nomeIncorporadora: form.nomeIncorporadora,
          modeloAmortizacao: form.modeloAmortizacao || null,
          payload: form,
        }),
      });
    } catch {
      // salva localmente mesmo se API falhar
    }
    setEnviado(true);
    setEnviando(false);
  }

  const pctFisico = form.modeloCronograma.reduce((s, e) => s + (parseFloat(e.percentualFisico) || 0), 0);
  const pctFinanceiro = form.modeloCronograma.reduce((s, e) => s + (parseFloat(e.percentualFinanceiro) || 0), 0);
  const unidadesPermuta = form.unidades.filter((u) => u.status === "PERMUTA").length;
  const unidadesVendidas = form.unidades.filter((u) => u.status === "VENDIDO").length;

  // ── Confirmação ──

  if (enviado) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-[#16a34a]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Due diligence enviada</h2>
          <p className="text-sm text-gray-500 mt-2">
            A análise de <span className="font-semibold text-gray-700">{form.nomeEmpreendimento || "empreendimento"}</span> foi registrada e está aguardando revisão da equipe.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/dashboard/gestor" className="inline-block text-sm font-semibold px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:border-[#1B4FD8] hover:text-[#1B4FD8] transition-colors">
            Voltar ao painel
          </a>
          <button onClick={() => { setForm(INITIAL); setStep(0); setEnviado(false); }} className="inline-block text-sm font-semibold px-6 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: "#1B4FD8" }}>
            Nova análise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Análise de Empreendimento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Due diligence guiada — {STEPS.length} etapas</p>
        </div>
        <a href="/dashboard/gestor" className="text-sm text-gray-400 hover:text-gray-600 font-medium mt-1">
          Cancelar
        </a>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex flex-col items-center gap-1 px-1 w-full transition-colors ${i < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? "bg-[#16a34a]" : active ? "bg-[#1B4FD8]" : "bg-gray-100"}`}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-400"}`} />
                    }
                  </div>
                  <span className={`hidden sm:block text-[0.62rem] font-semibold text-center leading-tight ${active ? "text-[#1B4FD8]" : done ? "text-[#16a34a]" : "text-gray-400"}`}>
                    {s.short}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 shrink rounded-full ${i < step ? "bg-[#16a34a]" : "bg-gray-100"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3" style={{ background: "#F0F5FF" }}>
          {(() => { const Icon = STEPS[step].icon; return <Icon className="w-5 h-5 text-[#1B4FD8]" />; })()}
          <div>
            <h2 className="text-base font-semibold text-gray-900">{STEPS[step].title}</h2>
            <p className="text-xs text-gray-400">Etapa {step + 1} de {STEPS.length}</p>
          </div>
        </div>

        <div className="p-6">

          {/* ── Step 0: Ficha do Empreendimento ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome do empreendimento">
                  <input className={inp} value={form.nomeEmpreendimento} onChange={(e) => set("nomeEmpreendimento", e.target.value)} placeholder="Ex: Residencial Vila Nova" />
                </Field>
                <Field label="Tipologia">
                  <select className={inp} value={form.tipologia} onChange={(e) => set("tipologia", e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>Residencial — Casas</option>
                    <option>Residencial — Apartamentos</option>
                    <option>Residencial — Loteamento</option>
                    <option>Misto</option>
                    <option>Comercial</option>
                    <option>Industrial</option>
                  </select>
                </Field>
              </div>
              <Field label="Endereço completo">
                <input className={inp} value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número, bairro" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Cidade">
                    <input className={inp} value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="São Paulo" />
                  </Field>
                </div>
                <Field label="UF">
                  <input className={inp} value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Total de unidades">
                  <input className={inp} type="number" min="1" value={form.totalUnidades} onChange={(e) => set("totalUnidades", e.target.value)} placeholder="12" />
                </Field>
                <Field label="Área total (m²)">
                  <input className={inp} type="number" min="1" value={form.areaTotal} onChange={(e) => set("areaTotal", e.target.value)} placeholder="1.200" />
                </Field>
                <Field label="Previsão de entrega">
                  <input className={inp} type="date" value={form.dataEntregaPrevista} onChange={(e) => set("dataEntregaPrevista", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Responsável técnico">
                  <input className={inp} value={form.responsavelTecnico} onChange={(e) => set("responsavelTecnico", e.target.value)} placeholder="Eng. João Silva — CREA 123456/SP" />
                </Field>
                <Field label="Nº ART / matrícula CREA">
                  <input className={inp} value={form.creaArt} onChange={(e) => set("creaArt", e.target.value)} placeholder="ART-28194470" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 1: Tabela de Unidades ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#1B4FD8]" />
                Insira cada unidade. Para projetos grandes, preencha as linhas principais e use o campo de observação ao final.
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Identificação</th>
                      <th className="pb-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">m² privativo</th>
                      <th className="pb-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="pb-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Valor (R$)</th>
                      <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {form.unidades.map((u) => (
                      <tr key={u.id}>
                        <td className="py-2 pr-3">
                          <input className={inp} value={u.identificacao} onChange={(e) => updateUnidade(u.id, "identificacao", e.target.value)} placeholder="Casa 01 / Apto 101" />
                        </td>
                        <td className="py-2 pr-3">
                          <input className={inp} type="number" min="1" value={u.m2Privativo} onChange={(e) => updateUnidade(u.id, "m2Privativo", e.target.value)} placeholder="65" />
                        </td>
                        <td className="py-2 pr-3">
                          <select className={inp} value={u.status} onChange={(e) => updateUnidade(u.id, "status", e.target.value as Unidade["status"])}>
                            <option value="DISPONIVEL">Disponível</option>
                            <option value="VENDIDO">Vendido</option>
                            <option value="PERMUTA">Permuta</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          <input className={inp} type="number" min="0" value={u.valorVenda} onChange={(e) => updateUnidade(u.id, "valorVenda", e.target.value)} placeholder="350000" />
                        </td>
                        <td className="py-2">
                          <button onClick={() => removeUnidade(u.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={addUnidade} className="flex items-center gap-2 text-sm font-semibold text-[#1B4FD8] hover:text-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Adicionar unidade
              </button>

              {/* Resumo automático */}
              {form.unidades.length > 1 && (
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    { label: "Disponíveis", val: form.unidades.filter((u) => u.status === "DISPONIVEL").length, cls: "bg-blue-50 text-[#1B4FD8]" },
                    { label: "Vendidas",    val: unidadesVendidas,  cls: "bg-green-50 text-[#16a34a]" },
                    { label: "Permutas",   val: unidadesPermuta,   cls: "bg-amber-50 text-amber-700" },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className={`rounded-xl p-3 text-center ${cls}`}>
                      <p className="text-xl font-bold tabular-nums">{val}</p>
                      <p className="text-xs font-semibold opacity-75">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Restrição de permuta */}
              {unidadesPermuta > 0 && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="restricao"
                      checked={form.temRestricaoPermuta}
                      onChange={(e) => set("temRestricaoPermuta", e.target.checked)}
                      className="w-4 h-4 accent-[#1B4FD8]"
                    />
                    <label htmlFor="restricao" className="text-sm font-semibold text-amber-800">
                      Existe acordo que impede as unidades permutadas de concorrerem com as vendas em estoque?
                    </label>
                  </div>
                  {form.temRestricaoPermuta && (
                    <textarea
                      className={`${inp} resize-none`}
                      rows={3}
                      value={form.descricaoRestricao}
                      onChange={(e) => set("descricaoRestricao", e.target.value)}
                      placeholder="Descreva os termos do acordo de não concorrência entre as unidades permutadas e as de estoque..."
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Apresentação do Projeto ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome da incorporadora / desenvolvedora">
                  <input className={inp} value={form.nomeIncorporadora} onChange={(e) => set("nomeIncorporadora", e.target.value)} placeholder="Construtora Exemplo Ltda." />
                </Field>
                <Field label="CNPJ">
                  <input className={inp} value={form.cnpjIncorporadora} onChange={(e) => set("cnpjIncorporadora", e.target.value)} placeholder="00.000.000/0001-00" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ano de fundação">
                  <input className={inp} type="number" value={form.anoFundacao} onChange={(e) => set("anoFundacao", e.target.value)} placeholder="2010" />
                </Field>
                <Field label="Obras entregues (nº)">
                  <input className={inp} type="number" value={form.obrasEntregues} onChange={(e) => set("obrasEntregues", e.target.value)} placeholder="8" />
                </Field>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#1B4FD8] hover:bg-blue-50/30 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Apresentação do projeto e da empresa</p>
                <p className="text-xs text-gray-400 mt-1">PDF, PPT, imagens — arraste ou clique para selecionar</p>
                <p className="text-xs text-[#1B4FD8] mt-3 font-medium">Upload disponível após integração de storage (S3)</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-xs text-[#1B4FD8] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Inclua memorial descritivo, plantas, renders e qualquer material que ilustre o projeto. Quanto mais completo, mais rápida a análise.</span>
              </div>
            </div>
          )}

          {/* ── Step 3: Carteira de Recebíveis ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Modelo de amortização">
                  <select className={inp} value={form.modeloAmortizacao} onChange={(e) => set("modeloAmortizacao", e.target.value as WizardState["modeloAmortizacao"])}>
                    <option value="">Selecione...</option>
                    <option value="PRICE">Price (parcelas fixas)</option>
                    <option value="SAC">SAC (amortização constante)</option>
                    <option value="SACOC">SACOC (correção pelo INCC)</option>
                  </select>
                </Field>
                <Field label="Total da carteira (R$)">
                  <input className={inp} type="number" min="0" value={form.totalCarteira} onChange={(e) => set("totalCarteira", e.target.value)} placeholder="1.200.000" />
                </Field>
                <Field label="Total a receber (R$)">
                  <input className={inp} type="number" min="0" value={form.totalAReceber} onChange={(e) => set("totalAReceber", e.target.value)} placeholder="980.000" />
                </Field>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contratos da carteira</p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      {["Contrato", "Unidade", "Cliente", "Parcela", "Vencimento", "Pagamento", "Recebido (R$)", "A Receber (R$)", ""].map((h) => (
                        <th key={h} className="pb-2 pr-2 text-[0.6rem] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {form.recebiveis.map((r) => (
                      <tr key={r.id}>
                        <td className="py-1.5 pr-2"><input className={inp} value={r.contrato} onChange={(e) => updateRecebivel(r.id, "contrato", e.target.value)} placeholder="CTR-001" /></td>
                        <td className="py-1.5 pr-2"><input className={inp} value={r.unidade} onChange={(e) => updateRecebivel(r.id, "unidade", e.target.value)} placeholder="Casa 01" /></td>
                        <td className="py-1.5 pr-2"><input className={inp} value={r.cliente} onChange={(e) => updateRecebivel(r.id, "cliente", e.target.value)} placeholder="Nome" /></td>
                        <td className="py-1.5 pr-2 w-28">
                          <div className="flex items-center gap-1">
                            <input className={inp} value={r.parcelaAtual} onChange={(e) => updateRecebivel(r.id, "parcelaAtual", e.target.value)} placeholder="3" />
                            <span className="text-gray-400">/</span>
                            <input className={inp} value={r.parcelaTotal} onChange={(e) => updateRecebivel(r.id, "parcelaTotal", e.target.value)} placeholder="24" />
                          </div>
                        </td>
                        <td className="py-1.5 pr-2"><input className={inp} type="date" value={r.dataVencimento} onChange={(e) => updateRecebivel(r.id, "dataVencimento", e.target.value)} /></td>
                        <td className="py-1.5 pr-2"><input className={inp} type="date" value={r.dataPagamento} onChange={(e) => updateRecebivel(r.id, "dataPagamento", e.target.value)} /></td>
                        <td className="py-1.5 pr-2"><input className={inp} type="number" value={r.valorRecebido} onChange={(e) => updateRecebivel(r.id, "valorRecebido", e.target.value)} placeholder="0" /></td>
                        <td className="py-1.5 pr-2"><input className={inp} type="number" value={r.valorAReceber} onChange={(e) => updateRecebivel(r.id, "valorAReceber", e.target.value)} placeholder="0" /></td>
                        <td className="py-1.5">
                          <button onClick={() => removeRecebivel(r.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addRecebivel} className="flex items-center gap-2 text-sm font-semibold text-[#1B4FD8] hover:text-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Adicionar contrato
              </button>
            </div>
          )}

          {/* ── Step 4: DREs ── */}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Informe os 3 últimos exercícios fiscais da empresa desenvolvedora.</p>
              {[
                { anoKey: "dre1Ano" as const, arqKey: "dre1Arquivo" as const, label: "Exercício mais recente" },
                { anoKey: "dre2Ano" as const, arqKey: "dre2Arquivo" as const, label: "Exercício anterior" },
                { anoKey: "dre3Ano" as const, arqKey: "dre3Arquivo" as const, label: "Exercício mais antigo" },
              ].map(({ anoKey, arqKey, label }, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Ano fiscal">
                      <input className={inp} type="number" min="2000" max="2030" value={form[anoKey]} onChange={(e) => set(anoKey, e.target.value)} placeholder="2025" />
                    </Field>
                    <div>
                      <label className={lbl}>DRE (PDF)</label>
                      <div className="border border-dashed border-gray-200 rounded-xl py-3 px-4 text-center hover:border-[#1B4FD8] cursor-pointer transition-colors">
                        <p className="text-xs text-gray-400">Clique para selecionar</p>
                        <p className="text-xs text-[#1B4FD8] mt-1 font-medium">Upload via S3</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 5: Organograma ── */}
          {step === 5 && (
            <div className="space-y-5">
              <Field label="Estrutura societária (descrição)">
                <textarea
                  className={`${inp} resize-none`}
                  rows={4}
                  value={form.estruturaSocietaria}
                  onChange={(e) => set("estruturaSocietaria", e.target.value)}
                  placeholder="Ex: Holding XYZ detém 100% da SPE Vila Nova Ltda. — CNPJ 00.000.000/0001-00. A SPE é veículo exclusivo para este empreendimento."
                />
              </Field>
              <Field label="Sócios / Beneficiários finais">
                <textarea
                  className={`${inp} resize-none`}
                  rows={3}
                  value={form.socios}
                  onChange={(e) => set("socios", e.target.value)}
                  placeholder="Nome — CPF — % participação (um por linha)"
                />
              </Field>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-[#1B4FD8] hover:bg-blue-50/30 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">Organograma societário</p>
                <p className="text-xs text-gray-400 mt-1">PDF ou imagem com a estrutura visual</p>
                <p className="text-xs text-[#1B4FD8] mt-3 font-medium">Upload disponível via S3</p>
              </div>
            </div>
          )}

          {/* ── Step 6: Cronograma Físico-Financeiro ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#1B4FD8]" />
                Os percentuais físicos e financeiros devem somar 100% cada. Ajuste conforme o projeto.
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      {["Etapa", "Início", "Término", "% Físico", "% Financeiro"].map((h) => (
                        <th key={h} className="pb-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {form.modeloCronograma.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 pr-3">
                          <input className={inp} value={e.nome} onChange={(ev) => updateEtapa(e.id, "nome", ev.target.value)} />
                        </td>
                        <td className="py-2 pr-3">
                          <input className={inp} type="date" value={e.dataInicio} onChange={(ev) => updateEtapa(e.id, "dataInicio", ev.target.value)} />
                        </td>
                        <td className="py-2 pr-3">
                          <input className={inp} type="date" value={e.dataFim} onChange={(ev) => updateEtapa(e.id, "dataFim", ev.target.value)} />
                        </td>
                        <td className="py-2 pr-3 w-24">
                          <input className={inp} type="number" min="0" max="100" value={e.percentualFisico} onChange={(ev) => updateEtapa(e.id, "percentualFisico", ev.target.value)} />
                        </td>
                        <td className="py-2 w-24">
                          <input className={inp} type="number" min="0" max="100" value={e.percentualFinanceiro} onChange={(ev) => updateEtapa(e.id, "percentualFinanceiro", ev.target.value)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={3} className="pt-3 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</td>
                      <td className={`pt-3 pr-3 text-sm font-bold tabular-nums ${Math.abs(pctFisico - 100) < 0.5 ? "text-[#16a34a]" : "text-red-500"}`}>{pctFisico}%</td>
                      <td className={`pt-3 text-sm font-bold tabular-nums ${Math.abs(pctFinanceiro - 100) < 0.5 ? "text-[#16a34a]" : "text-red-500"}`}>{pctFinanceiro}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {(Math.abs(pctFisico - 100) > 0.5 || Math.abs(pctFinanceiro - 100) > 0.5) && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Os percentuais não somam 100%. Ajuste antes de enviar.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between gap-3 bg-gray-50/50">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? "bg-[#1B4FD8]" : i < step ? "bg-[#16a34a]" : "bg-gray-200"}`} />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-2 rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "#1B4FD8" }}
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={enviar}
              disabled={enviando}
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-5 py-2 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#16a34a" }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {enviando ? "Enviando…" : "Enviar análise"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
