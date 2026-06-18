"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import {
  creditoApi,
  comiteApi,
  obrasApi,
  type ObraResumo,
  type CreditoSimulacao,
} from "@/lib/api";
import {
  formatarBRL,
  OBSERVACAO_CONDICOES_SIMULACAO,
  TAXA_MENSAL_SIMULACAO_CREDITO,
} from "@imbobi/core";

const FINALIDADES = [
  { value: "CONSTRUCAO", label: "Construção" },
  { value: "REFORMA", label: "Reforma" },
  { value: "AMPLIACAO", label: "Ampliação" },
  { value: "ACABAMENTO", label: "Acabamento" },
];

const PRAZOS = [12, 24, 36, 48];

function SolicitarForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramValor = Number(searchParams.get("valor") ?? 0);
  const paramPrazo = Number(searchParams.get("prazo") ?? 12);

  const [valor, setValor] = useState(paramValor > 0 ? paramValor : 50000);
  const [prazo, setPrazo] = useState(PRAZOS.includes(paramPrazo) ? paramPrazo : 12);
  const [finalidade, setFinalidade] = useState("CONSTRUCAO");
  const [obraId, setObraId] = useState("");
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [simulacao, setSimulacao] = useState<CreditoSimulacao | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creditoId, setCreditoId] = useState<string | null>(null);

  useEffect(() => {
    obrasApi.listar().then(setObras).catch(() => setObras([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSimulacao(), 500);
    return () => clearTimeout(t);
  }, [valor, prazo]);

  async function runSimulacao() {
    setSimLoading(true);
    try {
      const result = await creditoApi.simular({ valorSolicitado: valor, prazoMeses: prazo });
      setSimulacao(result);
    } catch {
      // Use local calc as fallback
      const taxa = TAXA_MENSAL_SIMULACAO_CREDITO;
      const taxaAnual = (Math.pow(1 + taxa, 12) - 1) * 100;
      const parcela = (valor * taxa * Math.pow(1 + taxa, prazo)) / (Math.pow(1 + taxa, prazo) - 1);
      setSimulacao({
        valorSolicitado: valor,
        prazoMeses: prazo,
        taxaMensal: taxa,
        taxaAnual,
        parcelaMensal: parcela,
        totalPago: parcela * prazo,
        totalJuros: parcela * prazo - valor,
        cet: taxaAnual,
        observacao: OBSERVACAO_CONDICOES_SIMULACAO,
      });
    } finally {
      setSimLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (valor < 5000) { setError("Valor mínimo é R$ 5.000."); return; }
    setSubmitLoading(true);
    setError(null);
    try {
      const result = await comiteApi.solicitar({
        valorSolicitado: valor,
        prazoMeses: prazo,
        taxaMensal: simulacao?.taxaMensal ?? TAXA_MENSAL_SIMULACAO_CREDITO,
        finalidade,
        obraId: obraId || undefined,
      });
      setCreditoId(result.solicitacaoId);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar solicitação.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitação enviada!</h2>
          <p className="text-gray-500 text-sm">
            Sua solicitação de crédito foi recebida e está em análise. Você receberá uma notificação com o resultado em breve.
          </p>
          {creditoId && (
            <p className="text-xs text-gray-400 mt-2 font-mono">ID: {creditoId}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => router.push("/dashboard/credito")}
            className="inline-flex items-center justify-center gap-2 bg-[#1B4FD8] text-white text-sm font-semibold px-6 py-3 rounded-xl"
          >
            <CreditCard className="w-4 h-4" />
            Ver meus créditos
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold px-6 py-3 rounded-xl hover:bg-gray-50"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Left: Form */}
      <div className="lg:col-span-3 space-y-6">
        {/* Valor */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Valor do Crédito</h2>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Valor solicitado</span>
              <span className="ml-auto text-xl font-bold text-[#1B4FD8]">{formatarBRL(valor)}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={2000000}
              step={5000}
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#1B4FD8" }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>R$ 5.000</span>
              <span>R$ 2.000.000</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Ou digite o valor
            </label>
            <input
              type="number"
              min={5000}
              max={2000000}
              step={1000}
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8]"
            />
          </div>
        </div>

        {/* Prazo e Finalidade */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Condições</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Prazo de pagamento
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRAZOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrazo(p)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    prazo === p
                      ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#1B4FD8] hover:text-[#1B4FD8]"
                  }`}
                >
                  {p}x
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Finalidade
            </label>
            <select
              value={finalidade}
              onChange={(e) => setFinalidade(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] bg-white"
            >
              {FINALIDADES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Obra */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Obra Associada</h2>
            <span className="ml-auto text-xs text-gray-400">(opcional)</span>
          </div>
          {obras.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma obra cadastrada ainda.</p>
          ) : (
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20 focus:border-[#1B4FD8] bg-white"
            >
              <option value="">Selecione uma obra (opcional)</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full bg-[#1B4FD8] hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-4 rounded-2xl transition-all shadow-md shadow-blue-200 text-sm"
        >
          {submitLoading ? "Enviando solicitação..." : "Solicitar Crédito"}
        </button>
      </div>

      {/* Right: Simulation Summary */}
      <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-6">
        <div className="bg-[#1B4FD8] rounded-2xl p-6 text-white space-y-5">
          <h3 className="font-semibold text-sm text-blue-200 uppercase tracking-wide">Resumo da Simulação</h3>

          {simLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-white/10 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : simulacao ? (
            <div className="space-y-4">
              <div>
                <p className="text-blue-300 text-xs mb-1">Parcela mensal</p>
                <p className="text-4xl font-black tracking-tight">{formatarBRL(simulacao.parcelaMensal)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-300 text-xs mb-1">Total pago</p>
                  <p className="font-bold text-lg">{formatarBRL(simulacao.totalPago)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-300 text-xs mb-1">Total em juros</p>
                  <p className="font-bold text-lg">{formatarBRL(simulacao.totalJuros)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-300 text-xs mb-1">Taxa mensal</p>
                  <p className="font-bold text-lg">{(simulacao.taxaMensal * 100).toFixed(2)}%</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-blue-300 text-xs mb-1">Taxa anual</p>
                  <p className="font-bold text-lg">{simulacao.taxaAnual.toFixed(1)}%</p>
                </div>
              </div>
              <p className="rounded-xl bg-white/10 p-3 text-xs leading-5 text-blue-100">
                {simulacao.observacao}
              </p>
            </div>
          ) : null}
        </div>

        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <p className="text-xs font-semibold text-[#1B4FD8] mb-2">O que acontece depois?</p>
          <ul className="space-y-1.5 text-xs text-gray-600">
            <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Análise de crédito em até 24h</li>
            <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Você será notificado por e-mail</li>
            <li className="flex items-start gap-2"><span className="text-[#1B4FD8] font-bold mt-0.5">·</span>Se aprovado, parcelas liberadas por etapa</li>
          </ul>
        </div>
      </div>
    </form>
  );
}

export default function SolicitarCreditoPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <a
          href="/dashboard/credito"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </a>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <CreditCard className="w-6 h-6 text-[#1B4FD8]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Solicitar Crédito</h1>
            <p className="text-sm text-gray-500">Preencha os dados para análise</p>
          </div>
        </div>
      </div>

      <Suspense fallback={
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      }>
        <SolicitarForm />
      </Suspense>
    </div>
  );
}
