"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, CheckCircle2, Loader2 } from "lucide-react";
import "../landing.css";
import "./simulador.css";

const WA = "5511993455589";

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

function buildWhatsAppMessage(p: {
  nome: string;
  email: string;
  telefone: string;
  valorObra: number;
  faseLabel: string;
  pct: number;
  valorFinanciavel: number;
  cidade: string;
  estado: string;
  cnpj: string;
}) {
  return [
    "Olá! Fiz uma simulação no site IMOBI e gostaria de falar com um especialista.",
    "",
    `*Nome:* ${p.nome}`,
    `*E-mail:* ${p.email}`,
    `*Telefone:* ${p.telefone}`,
    `*Valor da obra:* ${brl(p.valorObra)}`,
    `*Fase:* ${p.faseLabel} (${p.pct}%)`,
    `*Financiável até:* ${brl(p.valorFinanciavel)}`,
    `*Local:* ${p.cidade}${p.estado ? `, ${p.estado}` : ""}`,
    p.cnpj ? `*CNPJ:* ${p.cnpj}` : null,
  ]
    .filter(Boolean)
    .join("\n");
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
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [leadOk, setLeadOk] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const faseCfg = FASES.find((f) => f.id === fase)!;
  const valorFinanciavel = Math.round(valorObra * (faseCfg.pct / 100));
  const numParcelas = 6;
  const valorParcela = numParcelas > 0 ? Math.round(valorFinanciavel / numParcelas) : 0;

  async function capturarLead(): Promise<boolean> {
    setLeadLoading(true);
    setLeadError(null);
    const observacoes = [
      `Valor obra: ${brl(valorObra)}`,
      `Fase: ${faseCfg.label} (${faseCfg.pct}%)`,
      `Financiável: ${brl(valorFinanciavel)}`,
      `Local: ${cidade}, ${estado}`,
      cnpj ? `CNPJ: ${cnpj}` : null,
      `Parcelas estimadas: ${numParcelas} × ~${brl(valorParcela)}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/proxy/leads/captura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: nome.trim(),
          clienteEmail: email.trim(),
          clienteTelefone: telefone.replace(/\D/g, ""),
          modalidade: faseCfg.label,
          volume: String(valorObra),
          observacoes,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Erro ao registrar interesse");
      }
      setLeadOk(true);
      return true;
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : "Erro ao registrar");
      return false;
    } finally {
      setLeadLoading(false);
    }
  }

  async function next() {
    if (step === 4) {
      const ok = await capturarLead();
      if (ok) setStep(5);
      return;
    }
    if (step < 5) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  const whatsappUrl = `https://wa.me/${WA}?text=${encodeURIComponent(
    buildWhatsAppMessage({
      nome,
      email,
      telefone,
      valorObra,
      faseLabel: faseCfg.label,
      pct: faseCfg.pct,
      valorFinanciavel,
      cidade,
      estado,
      cnpj,
    }),
  )}`;

  const canStep4 =
    nome.trim().length >= 2 &&
    email.includes("@") &&
    telefone.replace(/\D/g, "").length >= 10;

  return (
    <>
      <nav className="scrolled sim-nav">
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
          <p className="sim-sub">Estimativa preliminar — um especialista confirma a proposta após análise.</p>

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
                <label className="sim-field">
                  <span>CNPJ (opcional)</span>
                  <input type="text" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </label>
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
                <h2>Seus dados para contato</h2>
                <p className="sim-hint">Registramos seu interesse e você pode falar direto no WhatsApp com nossa equipe.</p>
                <label className="sim-field">
                  <span>Nome completo</span>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                </label>
                <label className="sim-field">
                  <span>E-mail</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com.br" />
                </label>
                <label className="sim-field">
                  <span>WhatsApp / telefone</span>
                  <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </label>
                {leadError && <p className="sim-hint" style={{ color: "#dc2626" }}>{leadError}</p>}
                <div className="sim-actions">
                  <button type="button" className="sim-btn-ghost" onClick={back}>← Voltar</button>
                  <button type="button" className="sim-btn-primary" disabled={!canStep4 || leadLoading} onClick={next}>
                    {leadLoading ? "Registrando..." : "Ver resultado →"}
                  </button>
                </div>
              </>
            )}

            {step === 5 && (
              <div className="sim-result">
                {leadOk && (
                  <p className="sim-hint flex items-center gap-2 justify-center mb-3" style={{ color: "#16a34a" }}>
                    <CheckCircle2 size={16} /> Interesse registrado com sucesso
                  </p>
                )}
                <p className="sim-result-label">Você pode financiar até</p>
                <p className="sim-result-value">{brl(valorFinanciavel)}</p>
                <p className="sim-result-pct">{faseCfg.pct}% de {brl(valorObra)} · {faseCfg.label}</p>

                <div className="sim-metrics">
                  <div><span>Local</span><strong>{cidade}, {estado}</strong></div>
                  <div><span>Liberações</span><strong>{numParcelas} etapas</strong></div>
                  <div><span>~ por etapa</span><strong>{brl(valorParcela)}</strong></div>
                </div>

                <p className="sim-disclaimer">Valores indicativos. Proposta final após KYC, comitê e due diligence.</p>

                <div className="sim-actions sim-actions-col">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sim-btn-primary sim-btn-lg inline-flex items-center justify-center gap-2"
                    style={{ textDecoration: "none" }}
                  >
                    <MessageCircle size={18} />
                    Falar no WhatsApp com especialista
                  </a>
                  <Link href="/cadastro" className="sim-link">
                    Criar conta e iniciar processo completo
                  </Link>
                  <Link href="/login?next=/dashboard/kyc" className="sim-link">
                    Já tenho conta — fazer login
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
