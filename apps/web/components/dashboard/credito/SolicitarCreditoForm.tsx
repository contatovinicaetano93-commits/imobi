"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  creditoApi,
  comiteApi,
  obrasApi,
  fluxoApi,
  type ObraResumo,
  type CreditoSimulacao,
  type FluxoStatus,
} from "@/lib/api";
import { formatarBRL } from "@imbobi/core";
import { FlowGateBanner } from "@/components/FlowGateBanner";
import { proximoPassoFluxo } from "@/lib/flow-gates";
import { TOMADOR_HOME, TOMADOR_ROUTES } from "@/lib/tomador-flow";

const FINALIDADES = [
  { value: "CONSTRUCAO", label: "Construção" },
  { value: "REFORMA", label: "Reforma" },
  { value: "AMPLIACAO", label: "Ampliação" },
  { value: "ACABAMENTO", label: "Acabamento" },
];

const PRAZOS = [6, 12, 24, 36, 48, 60];

type SolicitarCreditoFormProps = {
  valorInicial?: number;
  prazoInicial?: number;
};

export function SolicitarCreditoForm({ valorInicial = 0, prazoInicial = 0 }: SolicitarCreditoFormProps) {
  const router = useRouter();

  const [valor, setValor] = useState(valorInicial > 0 ? valorInicial : 50000);
  const [prazo, setPrazo] = useState(
    PRAZOS.includes(prazoInicial) ? prazoInicial : 12,
  );
  const [finalidade, setFinalidade] = useState("CONSTRUCAO");
  const [obraId, setObraId] = useState("");
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [simulacao, setSimulacao] = useState<CreditoSimulacao | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [creditoId, setCreditoId] = useState<string | null>(null);
  const [fluxo, setFluxo] = useState<FluxoStatus | null>(null);

  useEffect(() => {
    fluxoApi.status().then(setFluxo).catch(() => null);
  }, []);

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
      const taxa = 0.0189;
      const parcela = (valor * taxa * Math.pow(1 + taxa, prazo)) / (Math.pow(1 + taxa, prazo) - 1);
      setSimulacao({
        valorSolicitado: valor,
        prazoMeses: prazo,
        taxaMensal: taxa,
        parcelaMensal: parcela,
        totalPago: parcela * prazo,
        totalJuros: parcela * prazo - valor,
        cet: taxa * 12,
      });
    } finally {
      setSimLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (proximoPassoFluxo(fluxo)) {
      setError("Complete o KYC antes de solicitar crédito.");
      return;
    }
    if (valor < 5000) {
      setError("Valor mínimo é R$ 5.000.");
      return;
    }
    setSubmitLoading(true);
    setError(null);
    try {
      const result = await comiteApi.solicitar({
        valorSolicitado: valor,
        prazoMeses: prazo,
        taxaMensal: simulacao?.taxaMensal ?? 0.0099,
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
      <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Solicitação enviada!</h2>
          <p className="text-sm text-gray-500">
            Sua solicitação está em análise. Você receberá uma notificação com o resultado.
          </p>
          {creditoId && (
            <p className="mt-2 font-mono text-xs text-gray-400">ID: {creditoId}</p>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push(TOMADOR_ROUTES.creditoExtrato)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-semibold text-white"
          >
            <CreditCard className="h-4 w-4" />
            Acompanhar crédito
          </button>
          <button
            type="button"
            onClick={() => router.push(TOMADOR_HOME)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const gate = proximoPassoFluxo(fluxo);

  return (
    <div className="space-y-6">
      {gate && <FlowGateBanner {...gate} />}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">Valor do Crédito</h2>
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Valor solicitado
                </span>
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
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>R$ 5.000</span>
                <span>R$ 2.000.000</span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ou digite o valor
              </label>
              <input
                type="number"
                min={5000}
                max={2000000}
                step={1000}
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 focus:border-[#1B4FD8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900">Condições</h2>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Prazo de pagamento
              </label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PRAZOS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrazo(p)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                      prazo === p
                        ? "border-[#1B4FD8] bg-[#1B4FD8] text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[#1B4FD8] hover:text-[#1B4FD8]"
                    }`}
                  >
                    {p}x
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Finalidade
              </label>
              <select
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#1B4FD8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20"
              >
                {FINALIDADES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Obra Associada</h2>
              <span className="ml-auto text-xs text-gray-400">(opcional)</span>
            </div>
            {obras.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma obra cadastrada ainda.</p>
            ) : (
              <select
                value={obraId}
                onChange={(e) => setObraId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#1B4FD8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]/20"
              >
                <option value="">Selecione uma obra (opcional)</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitLoading || !!gate}
            className="w-full rounded-2xl bg-[#1B4FD8] py-4 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-800 disabled:opacity-60"
          >
            {submitLoading ? "Enviando solicitação..." : "Solicitar Crédito"}
          </button>
        </div>

        <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-6">
          <div className="space-y-5 rounded-2xl bg-[#1B4FD8] p-6 text-white">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-200">
              Resumo da Simulação
            </h3>
            {simLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded-xl bg-white/10" />
                ))}
              </div>
            ) : simulacao ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs text-blue-300">Parcela mensal</p>
                  <p className="text-4xl font-black tracking-tight">
                    {formatarBRL(simulacao.parcelaMensal)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="mb-1 text-xs text-blue-300">Total pago</p>
                    <p className="text-lg font-bold">{formatarBRL(simulacao.totalPago)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <p className="mb-1 text-xs text-blue-300">Total em juros</p>
                    <p className="text-lg font-bold">{formatarBRL(simulacao.totalJuros)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
