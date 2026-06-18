"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../landing.css";
import "./simulador.css";

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

export default function SimuladorPublicoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [valorObra, setValorObra] = useState(0);
  const [valorInput, setValorInput] = useState("");
  const [fase, setFase] = useState<Fase>("construcao");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cnpj, setCnpj] = useState("");

  const faseCfg = FASES.find((f) => f.id === fase)!;
  const valorFinanciavel = Math.round(valorObra * (faseCfg.pct / 100));
  const taxaAnual = 8.5;
  const prazoMeses = 36;
  const numParcelas = 6;
  const valorParcela = numParcelas > 0 ? Math.round(valorFinanciavel / numParcelas) : 0;

  function next() {
    if (step < 5) setStep(step + 1);
  }
  function back() {
    if (step > 1) setStep(step - 1);
  }

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
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={`sim-dot${n <= Math.min(step, 4) ? " active" : ""}${n < Math.min(step, 4) ? " done" : ""}`} />
            ))}
            <span className="sim-step-label">{step >= 5 ? "Resultado" : `Etapa ${step} de 4`}</span>
          </div>

          <div className="sim-card">
            {step === 1 && (
              <>
                <h2>Qual é o valor total da obra?</h2>
                <p className="sim-hint">Inclua terreno, construção e acabamento.</p>
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
                <div className="sim-actions">
                  <button type="button" className="sim-btn-ghost" onClick={back}>← Voltar</button>
                  <button type="button" className="sim-btn-primary" onClick={next}>Próximo →</button>
                </div>
              </>
            )}

            {step === 3 && (
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

            {step === 4 && (
              <>
                <h2>CNPJ da empresa (opcional)</h2>
                <p className="sim-hint">Validação completa na API em breve. Por ora, simulação estimada.</p>
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

            {step === 5 && (
              <div className="sim-result">
                <p className="sim-result-label">Você pode financiar até</p>
                <p className="sim-result-value">{brl(valorFinanciavel)}</p>
                <p className="sim-result-pct">{faseCfg.pct}% de {brl(valorObra)} · {faseCfg.label}</p>

                <div className="sim-metrics">
                  <div><span>Taxa</span><strong>{taxaAnual}% a.a.</strong></div>
                  <div><span>Prazo</span><strong>{prazoMeses} meses</strong></div>
                  <div><span>Liberações</span><strong>{numParcelas} etapas</strong></div>
                  <div><span>~ por etapa</span><strong>{brl(valorParcela)}</strong></div>
                </div>

                <p className="sim-disclaimer">Taxa indicativa. Valor final definido em comitê após KYC e due diligence.</p>

                <div className="sim-actions sim-actions-col">
                  <button
                    type="button"
                    className="sim-btn-primary sim-btn-lg"
                    onClick={() => {
                      const q = new URLSearchParams({
                        valor: String(valorObra),
                        fase,
                        estado,
                        cidade,
                      });
                      router.push(`/cadastro?${q.toString()}`);
                    }}
                  >
                    Começar processo →
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

function LogoIcon({ size = 30 }: { size?: number }) {
  return (
    <div className="logo-icon sim-logo-icon-dark" style={{ width: size, height: size }}>
      <b /><b /><b /><b /><b /><b /><b /><b /><b />
    </div>
  );
}
