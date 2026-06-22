"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreditoSimulacao } from "@/lib/api";
import {
  clampValorParaApi,
  mapFaseToTipoObra,
  simularCreditoPublic,
} from "@/lib/simular-credito-public";
import "../landing.css";
import "./simulador.css";

export const dynamic = "force-dynamic";

const WA = "5511993455589";
const VALOR_MAX_EMPRESTIMO = 500_000_000;
const VALOR_MAX_API = 5_000_000;
const PRAZO_MIN_MESES = 12;
const PRAZO_MAX_MESES = 48;
const TOTAL_STEPS = 5;

type Fase = "terreno" | "construcao" | "acabamento" | "comprador";

const FASES: { id: Fase; label: string; pct: number; hint: string }[] = [
  { id: "terreno", label: "Terreno / aquisição", pct: 70, hint: "Até 70% do VGV" },
  { id: "construcao", label: "Construção", pct: 80, hint: "Maior volume — até 80%" },
  { id: "acabamento", label: "Acabamento", pct: 85, hint: "Reta final — até 85%" },
  { id: "comprador", label: "Financiar comprador", pct: 80, hint: "PF — até 80%" },
];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function parseBRL(s: string): number {
  const n = Number(s.replace(/\D/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmtInput(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/** Quanto maior o valor financiável, mais meses o cliente pode escolher (até 48). */
function maxPrazoMeses(valorFinanciavel: number): number {
  const v = Math.min(Math.max(valorFinanciavel, 0), VALOR_MAX_EMPRESTIMO);
  if (v < 1_000_000) return 12;
  if (v < 5_000_000) return 24;
  if (v < 20_000_000) return 36;
  return PRAZO_MAX_MESES;
}

function parcelaMensalEstimada(valor: number, prazoMeses: number, taxaAnual: number): number {
  if (prazoMeses <= 0 || valor <= 0) return 0;
  const i = taxaAnual / 100 / 12;
  if (i === 0) return Math.round(valor / prazoMeses);
  const fator = (i * Math.pow(1 + i, prazoMeses)) / (Math.pow(1 + i, prazoMeses) - 1);
  return Math.round(valor * fator);
}

export default function SimuladorPublicoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [valorObra, setValorObra] = useState(0);
  const [valorInput, setValorInput] = useState("");
  const [fase, setFase] = useState<Fase>("construcao");
  const [prazoMeses, setPrazoMeses] = useState(PRAZO_MIN_MESES);
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simStatus, setSimStatus] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulacao, setSimulacao] = useState<CreditoSimulacao | null>(null);

  const faseCfg = FASES.find((f) => f.id === fase)!;
  const valorFinanciavelBruto = Math.round(valorObra * (faseCfg.pct / 100));
  const valorFinanciavel = Math.min(valorFinanciavelBruto, VALOR_MAX_EMPRESTIMO);
  const valorParaApi = clampValorParaApi(valorFinanciavel);
  const prazoMaximo = maxPrazoMeses(valorFinanciavel);
  const taxaAnualPreview = 8.5;
  const parcelaPreview = parcelaMensalEstimada(valorFinanciavel, prazoMeses, taxaAnualPreview);
  const parcelaExibida = simulacao?.parcelaMensal ?? parcelaPreview;
  const taxaMensalExibida = simulacao
    ? `${(simulacao.taxaMensal * 100).toFixed(2)}% a.m.`
    : `${taxaAnualPreview}% a.a. (estimativa)`;
  const cetExibido = simulacao ? `${(simulacao.cet * 100).toFixed(1)}% a.a.` : null;

  const prazoOpcoes = useMemo(() => {
    const opts: number[] = [];
    for (let m = PRAZO_MIN_MESES; m <= prazoMaximo; m += m < 24 ? 6 : 12) {
      opts.push(m);
    }
    if (!opts.includes(prazoMaximo)) opts.push(prazoMaximo);
    return opts.sort((a, b) => a - b);
  }, [prazoMaximo]);

  useEffect(() => {
    if (prazoMeses > prazoMaximo) setPrazoMeses(prazoMaximo);
    else if (prazoMeses < PRAZO_MIN_MESES) setPrazoMeses(PRAZO_MIN_MESES);
  }, [prazoMaximo, prazoMeses]);

  const fetchSimulacao = useCallback(async () => {
    setSimLoading(true);
    setSimError(null);
    setSimulacao(null);
    try {
      const result = await simularCreditoPublic(
        {
          valorSolicitado: valorFinanciavel,
          prazoMeses,
          tipoObra: mapFaseToTipoObra(fase),
        },
        setSimStatus,
      );
      setSimulacao(result);
    } catch (e) {
      setSimError(e instanceof Error ? e.message : "Não foi possível realizar a simulação.");
    } finally {
      setSimLoading(false);
      setSimStatus(null);
    }
  }, [valorFinanciavel, prazoMeses, fase]);

  useEffect(() => {
    if (step === 6) fetchSimulacao();
  }, [step, fetchSimulacao]);

  function next() {
    if (step < TOTAL_STEPS + 1) setStep(step + 1);
  }
  function back() {
    if (step > 1) setStep(step - 1);
  }

  function openWhatsApp() {
    const msg = [
      "Olá! Fiz uma simulação de crédito no site da IMOBI e gostaria de continuar o atendimento comercial.",
      "",
      `*Valor total da obra:* ${brl(valorObra)}`,
      `*Fase:* ${faseCfg.label} (${faseCfg.pct}% financiável)`,
      `*Valor financiável estimado:* ${brl(valorFinanciavel)}`,
      valorFinanciavelBruto > VALOR_MAX_EMPRESTIMO
        ? `*(limitado ao teto de ${brl(VALOR_MAX_EMPRESTIMO)})*`
        : null,
      `*Prazo desejado:* ${prazoMeses} meses`,
      simulacao
        ? `*Parcela mensal:* ${brl(simulacao.parcelaMensal)} (${(simulacao.taxaMensal * 100).toFixed(2)}% a.m.)`
        : `*Parcela mensal estimada:* ${brl(parcelaExibida)}`,
      cetExibido ? `*CET:* ${cetExibido}` : null,
      `*Local da obra:* ${cidade} — ${estado}`,
      cnpj.trim() ? `*CNPJ:* ${cnpj.trim()}` : null,
      "",
      "Aguardo retorno da equipe comercial.",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const progressStep = Math.min(step, TOTAL_STEPS);

  return (
    <>
      <nav className="landing-nav scrolled sim-nav">
        <Link className="logo" href="/">
          <LogoIcon />
          <span className="logo-name sim-logo-dark">IMOBI</span>
        </Link>
        <div className="nav-actions">
          <button type="button" className="btn-login sim-btn-dark" onClick={() => router.push("/login?next=/dashboard/simulador")}>
            Entrar
          </button>
        </div>
      </nav>

      <main className="sim-page">
        <div className="sim-inner">
          <p className="sim-eyebrow">Simulador IMOBI</p>
          <h1 className="sim-title">Descubra em 2 minutos quanto sua obra pode financiar</h1>
          <p className="sim-sub">Estimativa preliminar — proposta final após análise de crédito e documentação.</p>

          <div className="sim-progress">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
              <span
                key={n}
                className={`sim-dot${n <= progressStep ? " active" : ""}${n < progressStep ? " done" : ""}`}
              />
            ))}
            <span className="sim-step-label">
              {step > TOTAL_STEPS ? "Resultado" : `Etapa ${step} de ${TOTAL_STEPS}`}
            </span>
          </div>

          <div className="sim-card">
            {step === 1 && (
              <>
                <h2>Qual é o valor total da obra?</h2>
                <p className="sim-hint">
                  Inclua terreno, construção e acabamento. Financiamento máximo de {brl(VALOR_MAX_EMPRESTIMO)}.
                </p>
                <label className="sim-field">
                  <span>Valor (R$)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 3.000.000"
                    value={valorInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const n = parseBRL(raw);
                      setValorObra(n);
                      setValorInput(n > 0 ? fmtInput(n) : raw.replace(/\D/g, ""));
                    }}
                  />
                </label>
                {valorFinanciavelBruto > VALOR_MAX_EMPRESTIMO && (
                  <p className="sim-hint sim-hint-warn">
                    O valor financiável estimado excede o teto — será considerado {brl(VALOR_MAX_EMPRESTIMO)} na simulação.
                  </p>
                )}
                <div className="sim-actions">
                  <button type="button" className="sim-btn-primary" disabled={valorObra < 100_000} onClick={next}>
                    Próximo →
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2>Qual fase da obra?</h2>
                <div className="sim-fases">
                  {FASES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`sim-fase${fase === f.id ? " selected" : ""}`}
                      onClick={() => setFase(f.id)}
                    >
                      <strong>{f.label}</strong>
                      <span>{f.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="sim-hint">
                  Financiável estimado: <strong>{brl(valorFinanciavel)}</strong>
                </p>
                <div className="sim-actions">
                  <button type="button" className="sim-btn-ghost" onClick={back}>← Voltar</button>
                  <button type="button" className="sim-btn-primary" onClick={next}>Próximo →</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2>Em quantas parcelas (meses)?</h2>
                <p className="sim-hint">
                  Para {brl(valorFinanciavel)}, você pode parcelar em até <strong>{prazoMaximo} meses</strong>.
                  Quanto maior o valor, maior o prazo disponível (máx. {PRAZO_MAX_MESES} meses).
                </p>
                <div className="sim-prazo-display">
                  <span className="sim-prazo-val">{prazoMeses}</span>
                  <span className="sim-prazo-unit">meses</span>
                </div>
                <input
                  type="range"
                  className="sim-range"
                  min={PRAZO_MIN_MESES}
                  max={prazoMaximo}
                  step={1}
                  value={prazoMeses}
                  onChange={(e) => setPrazoMeses(Number(e.target.value))}
                />
                <div className="sim-range-labels">
                  <span>{PRAZO_MIN_MESES}m</span>
                  <span>{prazoMaximo}m</span>
                </div>
                <div className="sim-prazo-chips">
                  {prazoOpcoes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`sim-prazo-chip${prazoMeses === m ? " selected" : ""}`}
                      onClick={() => setPrazoMeses(m)}
                    >
                      {m} meses
                    </button>
                  ))}
                </div>
                <p className="sim-hint">
                  Parcela estimada: <strong>{brl(parcelaPreview)}/mês</strong> (prévia local)
                </p>
                <div className="sim-actions">
                  <button type="button" className="sim-btn-ghost" onClick={back}>← Voltar</button>
                  <button type="button" className="sim-btn-primary" onClick={next}>Próximo →</button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2>Onde fica a obra?</h2>
                <div className="sim-row">
                  <label className="sim-field">
                    <span>Estado</span>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)}>
                      <option value="">Selecione</option>
                      {["SP", "RJ", "MG", "PR", "SC", "RS", "GO", "DF", "BA", "PE"].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </label>
                  <label className="sim-field">
                    <span>Cidade</span>
                    <input type="text" placeholder="Sua cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                  </label>
                </div>
                <div className="sim-actions">
                  <button type="button" className="sim-btn-ghost" onClick={back}>← Voltar</button>
                  <button type="button" className="sim-btn-primary" disabled={!estado || !cidade.trim()} onClick={next}>
                    Próximo →
                  </button>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2>CNPJ da empresa (opcional)</h2>
                <p className="sim-hint">Ajuda o comercial a agilizar a análise de crédito.</p>
                <label className="sim-field">
                  <span>CNPJ</span>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                  />
                </label>
                <div className="sim-actions">
                  <button type="button" className="sim-btn-ghost" onClick={back}>← Voltar</button>
                  <button type="button" className="sim-btn-primary" onClick={next}>Ver simulação →</button>
                </div>
              </>
            )}

            {step === 6 && (
              <div className="sim-result">
                {simLoading && (
                  <div className="sim-loading">
                    <div className="sim-spinner" aria-hidden="true" />
                    <p>{simStatus ?? "Consultando condições na API…"}</p>
                  </div>
                )}

                {simError && !simLoading && (
                  <div className="sim-error">
                    <p>{simError}</p>
                    <button type="button" className="sim-btn-primary" onClick={fetchSimulacao}>
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!simLoading && !simError && (
                  <>
                <p className="sim-result-label">Você pode financiar até</p>
                <p className="sim-result-value">{brl(simulacao?.valorSolicitado ?? valorParaApi)}</p>
                <p className="sim-result-pct">
                  {faseCfg.pct}% de {brl(valorObra)} · {faseCfg.label}
                  {valorFinanciavelBruto > VALOR_MAX_EMPRESTIMO ? " · teto UI aplicado" : ""}
                  {valorFinanciavel > VALOR_MAX_API ? ` · simulação limitada a ${brl(VALOR_MAX_API)}` : ""}
                </p>

                {valorFinanciavel > VALOR_MAX_API && (
                  <p className="sim-api-note">
                    Valores acima de {brl(VALOR_MAX_API)} são analisados comercialmente após cadastro.
                  </p>
                )}

                <div className="sim-metrics">
                  <div><span>Taxa</span><strong>{taxaMensalExibida}</strong></div>
                  {cetExibido && <div><span>CET</span><strong>{cetExibido}</strong></div>}
                  <div><span>Prazo</span><strong>{simulacao?.prazoMeses ?? prazoMeses} meses</strong></div>
                  <div><span>Parcela/mês</span><strong>{brl(parcelaExibida)}</strong></div>
                  <div><span>Local</span><strong>{cidade} — {estado}</strong></div>
                  {simulacao && (
                    <div><span>Total</span><strong>{brl(simulacao.totalPago)}</strong></div>
                  )}
                </div>

                <p className="sim-disclaimer">Taxa indicativa. Valor final definido em comitê após KYC e due diligence.</p>

                <div className="sim-actions sim-actions-col">
                  <button type="button" className="sim-btn-wa sim-btn-lg" onClick={openWhatsApp} disabled={simLoading}>
                    <WaIcon size={18} /> Falar com comercial no WhatsApp
                  </button>
                  <button
                    type="button"
                    className="sim-btn-primary sim-btn-lg"
                    disabled={simLoading}
                    onClick={() => {
                      const q = new URLSearchParams({
                        valor: String(valorObra),
                        fase,
                        prazo: String(prazoMeses),
                        estado,
                        cidade,
                      });
                      router.push(`/cadastro?${q.toString()}`);
                    }}
                  >
                    Criar conta e continuar →
                  </button>
                  <Link href="/login?next=/dashboard/simulador" className="sim-link">
                    Já tenho conta — ver simulador completo
                  </Link>
                </div>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="sim-foot">
            <Link href="/">← Voltar para a landing</Link>
          </p>
        </div>
      </main>
    </>
  );
}

function LogoIcon({ size = 30 }: { size?: number }) {
  return (
    <div className="logo-icon sim-logo-icon-dark" style={{ width: size, height: size }}>
      <b /><b /><b /><b /><b /><b /><b /><b /><b />
    </div>
  );
}

function WaIcon({ size = 26, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.824L.057 23.776c-.07.266.166.502.432.432l5.968-1.453A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.002-1.367l-.359-.213-3.721.905.934-3.62-.233-.372A9.82 9.82 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
    </svg>
  );
}
