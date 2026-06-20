"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calcularParcelaPrice } from "@imbobi/core";
import "../landing.css";
import "./simulador.css";
import { LogoIcon, WaIcon } from "../_components/marketing-icons";

const WA = "5511993455589";
const VALOR_MAX_EMPRESTIMO = 500_000_000;
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

  const faseCfg = FASES.find((f) => f.id === fase)!;
  const valorFinanciavelBruto = Math.round(valorObra * (faseCfg.pct / 100));
  const valorFinanciavel = Math.min(valorFinanciavelBruto, VALOR_MAX_EMPRESTIMO);
  const prazoMaximo = maxPrazoMeses(valorFinanciavel);
  const taxaAnual = 8.5;
  const parcelaMensal = Math.round(calcularParcelaPrice(valorFinanciavel, taxaAnual / 100 / 12, prazoMeses));

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
      `*Parcela mensal estimada:* ${brl(parcelaMensal)} (taxa ${taxaAnual}% a.a.)`,
      `*Local da obra:* ${cidade} — ${estado}`,
      cnpj.trim() ? `*CNPJ:* ${cnpj.replace(/\D/g, "")}` : null,
      "",
      "Aguardo retorno da equipe comercial.",
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  const progressStep = Math.min(step, TOTAL_STEPS);

  return (
    <>
      <nav className="landing-nav scrolled sim-nav">
        <Link className="logo" href="/">
          <LogoIcon className="logo-icon sim-logo-icon-dark" />
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
                  Parcela estimada: <strong>{brl(parcelaMensal)}/mês</strong> (taxa {taxaAnual}% a.a.)
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
                <p className="sim-result-label">Você pode financiar até</p>
                <p className="sim-result-value">{brl(valorFinanciavel)}</p>
                <p className="sim-result-pct">
                  {faseCfg.pct}% de {brl(valorObra)} · {faseCfg.label}
                  {valorFinanciavelBruto > VALOR_MAX_EMPRESTIMO ? " · teto aplicado" : ""}
                </p>

                <div className="sim-metrics">
                  <div><span>Taxa</span><strong>{taxaAnual}% a.a.</strong></div>
                  <div><span>Prazo</span><strong>{prazoMeses} meses</strong></div>
                  <div><span>Parcela/mês</span><strong>{brl(parcelaMensal)}</strong></div>
                  <div><span>Local</span><strong>{cidade} — {estado}</strong></div>
                </div>

                <p className="sim-disclaimer">Taxa indicativa. Valor final definido em comitê após KYC e due diligence.</p>

                <div className="sim-actions sim-actions-col">
                  <button type="button" className="sim-btn-wa sim-btn-lg" onClick={openWhatsApp}>
                    <WaIcon size={18} /> Falar com comercial no WhatsApp
                  </button>
                  <button
                    type="button"
                    className="sim-btn-primary sim-btn-lg"
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

