"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./vagas.css";

// ── Constantes ─────────────────────────────────────────────────────
type TipoVaga = "AC" | "BCT" | "BC" | "NMA";
type CursoAmet = "IMAGINOLOGIA" | "ESTETICA" | "ANALISES_CLINICAS" | "HEMATOLOGIA";

interface VagaInfo {
  id: TipoVaga;
  label: string;
  descricao: string;
  limite: number;
}

interface Disponibilidade {
  total: number;
  preenchidas: number;
  restantes: number;
}

const VAGAS: VagaInfo[] = [
  {
    id: "AC",
    label: "Auxiliar de Construção",
    descricao: "Apoio às equipes de obra, movimentação de materiais e suporte operacional em campo.",
    limite: 50,
  },
  {
    id: "BCT",
    label: "Técnico de Construção",
    descricao: "Acompanhamento técnico das etapas construtivas com supervisão de engenheiro responsável.",
    limite: 20,
  },
  {
    id: "BC",
    label: "Bombeiro Civil",
    descricao: "Prevenção e combate a incêndios em obras e edificações com certificação ativa.",
    limite: 20,
  },
  {
    id: "NMA",
    label: "Nível Médio Administrativo",
    descricao: "Suporte administrativo às operações de obra, gestão documental e controle de contratos.",
    limite: 20,
  },
];

const CURSOS_AMET: { value: CursoAmet; label: string }[] = [
  { value: "IMAGINOLOGIA",      label: "Imaginologia" },
  { value: "ESTETICA",          label: "Estética" },
  { value: "ANALISES_CLINICAS", label: "Análises Clínicas" },
  { value: "HEMATOLOGIA",       label: "Hematologia" },
];

// ── Tipos do formulário ────────────────────────────────────────────
interface Step1 { nome: string; rgm: string; cpf: string; email: string; telefone: string; }
interface Step2 { tipoVaga: TipoVaga | ""; }
interface Step3 { cursoAmet: CursoAmet | ""; }
type FieldErrors = Partial<Record<string, string>>;

// ── Helpers ────────────────────────────────────────────────────────
function maskCpf(v: string)  { return v.replace(/\D/g, "").slice(0, 11); }
function maskTel(v: string)  { return v.replace(/\D/g, "").slice(0, 11); }

function validateStep1(f: Step1): FieldErrors {
  const e: FieldErrors = {};
  if (!f.nome.trim() || f.nome.trim().length < 3)
    e.nome = "Nome deve ter pelo menos 3 caracteres";
  if (!f.rgm.trim())
    e.rgm = "RGM obrigatório";
  if (!/^\d{11}$/.test(f.cpf))
    e.cpf = "CPF deve conter 11 dígitos";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = "E-mail inválido";
  if (!/^\d{10,11}$/.test(f.telefone))
    e.telefone = "Telefone inválido (DDD + número)";
  return e;
}
function validateStep2(f: Step2): FieldErrors {
  return f.tipoVaga ? {} : { tipoVaga: "Selecione uma área de interesse" };
}
function validateStep3(f: Step3): FieldErrors {
  return f.cursoAmet ? {} : { cursoAmet: "Selecione o curso atual na AMET" };
}

// ── Componente ─────────────────────────────────────────────────────
export default function VagasPage() {
  const formRef = useRef<HTMLDivElement>(null);

  const [etapa, setEtapa]             = useState<1 | 2 | 3>(1);
  const [step1, setStep1]             = useState<Step1>({ nome: "", rgm: "", cpf: "", email: "", telefone: "" });
  const [step2, setStep2]             = useState<Step2>({ tipoVaga: "" });
  const [step3, setStep3]             = useState<Step3>({ cursoAmet: "" });
  const [errors, setErrors]           = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [sucesso, setSucesso]         = useState(false);
  const [protocolo, setProtocolo]     = useState("");

  // Disponibilidade de vagas
  const [disp, setDisp]               = useState<Record<TipoVaga, Disponibilidade> | null>(null);
  const [dispLoading, setDispLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchDisp() {
      try {
        const res = await fetch("/api/proxy/vagas/disponibilidade", { cache: "no-store" });
        if (res.ok && !cancelled) setDisp(await res.json());
      } finally {
        if (!cancelled) setDispLoading(false);
      }
    }
    void fetchDisp();
    // Revalida a cada 30 s enquanto a página está aberta
    const id = setInterval(fetchDisp, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goNext() {
    let e: FieldErrors = {};
    if (etapa === 1) e = validateStep1(step1);
    if (etapa === 2) {
      e = validateStep2(step2);
      // Bloqueia se a vaga selecionada estiver esgotada
      if (!e.tipoVaga && step2.tipoVaga && disp) {
        const info = disp[step2.tipoVaga as TipoVaga];
        if (info && info.restantes <= 0)
          e.tipoVaga = "Esta vaga está esgotada. Selecione outra categoria.";
      }
    }
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setEtapa((p) => Math.min(p + 1, 3) as 1 | 2 | 3);
    setTimeout(scrollToForm, 80);
  }

  function goBack() {
    setErrors({});
    setEtapa((p) => Math.max(p - 1, 1) as 1 | 2 | 3);
    setTimeout(scrollToForm, 80);
  }

  async function handleSubmit() {
    const e = validateStep3(step3);
    if (Object.keys(e).length) { setErrors(e); return; }

    // Verificação final de disponibilidade antes de enviar
    if (disp && step2.tipoVaga) {
      const info = disp[step2.tipoVaga as TipoVaga];
      if (info && info.restantes <= 0) {
        setErrors({ tipoVaga: "Vaga esgotada" });
        setEtapa(2);
        return;
      }
    }

    setErrors({});
    setLoading(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/proxy/vagas/candidatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1,
          tipoVaga: step2.tipoVaga,
          cursoAmet: step3.cursoAmet,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // Backend sinalizou que a vaga esgotou entre o check e o submit
        setSubmitError("Vagas esgotadas para esta categoria. Por favor, escolha outra.");
        // Atualiza disponibilidade imediatamente
        const fresh = await fetch("/api/proxy/vagas/disponibilidade", { cache: "no-store" });
        if (fresh.ok) setDisp(await fresh.json());
        setEtapa(2);
        return;
      }

      if (!res.ok) {
        setSubmitError(data.message ?? "Erro ao enviar candidatura. Tente novamente.");
        return;
      }

      setProtocolo(data.candidaturaId ?? String(Date.now()));
      setSucesso(true);

      // Atualiza contagem após envio bem-sucedido
      const fresh = await fetch("/api/proxy/vagas/disponibilidade", { cache: "no-store" });
      if (fresh.ok) setDisp(await fresh.json());
    } catch {
      setSubmitError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSucesso(false);
    setEtapa(1);
    setStep1({ nome: "", rgm: "", cpf: "", email: "", telefone: "" });
    setStep2({ tipoVaga: "" });
    setStep3({ cursoAmet: "" });
    setErrors({});
    setSubmitError(null);
  }

  const totalSlots = VAGAS.reduce((s, v) => s + v.limite, 0);
  const totalRestantes = disp
    ? Object.values(disp).reduce((s, d) => s + d.restantes, 0)
    : totalSlots;

  const stepLabels = ["Dados Pessoais", "Área de Interesse", "Curso AMET"];

  return (
    <>
      {/* NAV */}
      <nav className="vg-nav">
        <Link href="/" className="vg-logo">
          <div className="vg-logo-icon">
            {[1,2,3,4,5,6,7,8,9].map((i) => <b key={i} />)}
          </div>
          <span className="vg-logo-name">imbobi</span>
        </Link>
        <Link href="/" className="vg-nav-back">← Voltar ao site</Link>
      </nav>

      {/* HERO */}
      <section className="vg-hero">
        <div className="vg-hero-badge">
          <span />
          Vagas Abertas — 2025
        </div>
        <h1>
          Construa sua carreira<br />com a <em>imbobi</em>
        </h1>
        <p>
          Estamos crescendo e buscamos estudantes da AMET comprometidos para integrar
          nossas equipes de obra, técnica e administrativa em todo o Brasil.
        </p>
        <a
          href="#candidatura"
          className="vg-hero-cta"
          onClick={(e) => { e.preventDefault(); scrollToForm(); }}
        >
          Candidatar-se agora →
        </a>
        <div className="vg-hero-stats">
          <div className="vg-stat">
            <span className="vg-stat-num">
              {dispLoading ? "..." : totalRestantes}
            </span>
            <span className="vg-stat-label">Vagas disponíveis</span>
          </div>
          <div className="vg-stat">
            <span className="vg-stat-num">{VAGAS.length}</span>
            <span className="vg-stat-label">Categorias</span>
          </div>
          <div className="vg-stat">
            <span className="vg-stat-num">100%</span>
            <span className="vg-stat-label">CLT + benefícios</span>
          </div>
        </div>
      </section>

      {/* LISTAGEM */}
      <section className="vg-section">
        <p className="vg-section-label">Oportunidades</p>
        <h2 className="vg-section-title">Vagas disponíveis</h2>
        <p className="vg-section-sub">
          Escolha a categoria que melhor se encaixa no seu perfil e candidate-se abaixo.
        </p>
        <div className="vg-cards">
          {VAGAS.map((v) => {
            const info      = disp?.[v.id];
            const esgotada  = info ? info.restantes <= 0 : false;
            const restantes = info ? info.restantes : v.limite;
            const selected  = step2.tipoVaga === v.id;
            return (
              <div
                key={v.id}
                className={`vg-card${selected && !esgotada ? " selected" : ""}${esgotada ? " esgotada" : ""}`}
                onClick={() => {
                  if (esgotada) return;
                  setStep2({ tipoVaga: v.id });
                  scrollToForm();
                }}
                title={esgotada ? "Vagas esgotadas para esta categoria" : undefined}
              >
                {esgotada && <div className="vg-card-esgotada-badge">Esgotada</div>}
                <span className="vg-card-tag">{v.id}</span>
                <h3>{v.label}</h3>
                <p>{v.descricao}</p>
                <div className={`vg-card-slots${esgotada ? " zero" : ""}`}>
                  <span className="vg-card-slots-dot" />
                  {dispLoading
                    ? "Verificando..."
                    : esgotada
                      ? "Vagas esgotadas"
                      : `${restantes} vaga${restantes !== 1 ? "s" : ""} disponíve${restantes !== 1 ? "is" : "l"}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section className="vg-section" id="candidatura" ref={formRef}>
        <p className="vg-section-label">Formulário</p>
        <h2 className="vg-section-title">Sua candidatura</h2>
        <p className="vg-section-sub">Preencha os dados abaixo. Leva menos de 3 minutos.</p>

        <div className="vg-form-wrap">
          {sucesso ? (
            <div className="vg-success">
              <div className="vg-success-icon">✓</div>
              <h3>Candidatura enviada!</h3>
              <p>
                Recebemos seus dados. Nossa equipe de RH entrará em contato
                em até 5 dias úteis pelo e-mail ou telefone informado.
              </p>
              {protocolo && (
                <p className="vg-success-proto">Protocolo: {protocolo}</p>
              )}
              <button className="vg-btn-next" onClick={resetForm}>
                Nova candidatura
              </button>
            </div>
          ) : (
            <>
              {/* Progresso */}
              <div className="vg-progress">
                {stepLabels.map((label, i) => {
                  const n   = i + 1;
                  const cls = n < etapa ? "done" : n === etapa ? "active" : "";
                  return (
                    <div key={n} className={`vg-step ${cls}`}>
                      <span className="vg-step-num">{n < etapa ? "✓" : n}</span>
                      <span className="vg-step-label">{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Etapa 1 — Dados Pessoais */}
              {etapa === 1 && (
                <div className="vg-fields">
                  <div className="vg-field">
                    <label className="vg-label">Nome completo <span>*</span></label>
                    <input
                      className={`vg-input${errors.nome ? " error" : ""}`}
                      placeholder="João da Silva"
                      value={step1.nome}
                      onChange={(e) => setStep1((p) => ({ ...p, nome: e.target.value }))}
                    />
                    {errors.nome && <span className="vg-error">{errors.nome}</span>}
                  </div>

                  <div className="vg-field">
                    <label className="vg-label">RGM — Registro Geral de Matrícula <span>*</span></label>
                    <input
                      className={`vg-input${errors.rgm ? " error" : ""}`}
                      placeholder="Número do RGM"
                      value={step1.rgm}
                      onChange={(e) => setStep1((p) => ({ ...p, rgm: e.target.value }))}
                    />
                    {errors.rgm && <span className="vg-error">{errors.rgm}</span>}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="vg-field">
                      <label className="vg-label">CPF <span>*</span></label>
                      <input
                        className={`vg-input${errors.cpf ? " error" : ""}`}
                        placeholder="Somente números"
                        maxLength={11}
                        value={step1.cpf}
                        onChange={(e) => setStep1((p) => ({ ...p, cpf: maskCpf(e.target.value) }))}
                      />
                      {errors.cpf && <span className="vg-error">{errors.cpf}</span>}
                    </div>
                    <div className="vg-field">
                      <label className="vg-label">Telefone / WhatsApp <span>*</span></label>
                      <input
                        className={`vg-input${errors.telefone ? " error" : ""}`}
                        placeholder="DDD + número"
                        maxLength={11}
                        value={step1.telefone}
                        onChange={(e) => setStep1((p) => ({ ...p, telefone: maskTel(e.target.value) }))}
                      />
                      {errors.telefone && <span className="vg-error">{errors.telefone}</span>}
                    </div>
                  </div>

                  <div className="vg-field">
                    <label className="vg-label">E-mail <span>*</span></label>
                    <input
                      type="email"
                      className={`vg-input${errors.email ? " error" : ""}`}
                      placeholder="seu@email.com"
                      value={step1.email}
                      onChange={(e) => setStep1((p) => ({ ...p, email: e.target.value }))}
                    />
                    {errors.email && <span className="vg-error">{errors.email}</span>}
                  </div>
                </div>
              )}

              {/* Etapa 2 — Tipo de Vaga */}
              {etapa === 2 && (
                <div className="vg-fields">
                  <div className="vg-field">
                    <label className="vg-label">
                      Selecione a área de interesse <span>*</span>
                      <span style={{ fontWeight: 400, color: "var(--gray)", fontSize: "0.72rem", marginLeft: "0.4rem" }}>
                        (1 escolha obrigatória)
                      </span>
                    </label>
                    <div className="vg-radio-grid">
                      {VAGAS.map((v) => {
                        const info     = disp?.[v.id];
                        const esgotada = info ? info.restantes <= 0 : false;
                        const restantes = info ? info.restantes : v.limite;
                        return (
                          <label
                            key={v.id}
                            className={`vg-radio-card${step2.tipoVaga === v.id ? " selected" : ""}${esgotada ? " esgotada" : ""}`}
                          >
                            <input
                              type="radio"
                              name="tipoVaga"
                              value={v.id}
                              disabled={esgotada}
                              checked={step2.tipoVaga === v.id}
                              onChange={() => !esgotada && setStep2({ tipoVaga: v.id })}
                            />
                            <div className="vg-radio-card-body">
                              <div className="vg-radio-card-title">
                                {v.label}
                                {esgotada && (
                                  <span className="vg-radio-esgotada-tag"> · Esgotada</span>
                                )}
                              </div>
                              <div className="vg-radio-card-desc">{v.descricao}</div>
                              <div className={`vg-radio-card-slots${esgotada ? " zero" : ""}`}>
                                {esgotada
                                  ? "● Vagas esgotadas"
                                  : `● ${restantes} vaga${restantes !== 1 ? "s" : ""} disponíve${restantes !== 1 ? "is" : "l"}`}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {errors.tipoVaga && <span className="vg-error">{errors.tipoVaga}</span>}
                  </div>
                </div>
              )}

              {/* Etapa 3 — Curso AMET */}
              {etapa === 3 && (
                <div className="vg-fields">
                  <div className="vg-field">
                    <label className="vg-label">Curso atual na AMET <span>*</span></label>
                    <div className="vg-curso-grid">
                      {CURSOS_AMET.map((c) => (
                        <label
                          key={c.value}
                          className={`vg-curso-card${step3.cursoAmet === c.value ? " selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="cursoAmet"
                            value={c.value}
                            checked={step3.cursoAmet === c.value}
                            onChange={() => setStep3({ cursoAmet: c.value })}
                          />
                          <span>{c.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.cursoAmet && <span className="vg-error">{errors.cursoAmet}</span>}
                  </div>
                </div>
              )}

              {submitError && <div className="vg-form-error">{submitError}</div>}

              {/* Ações */}
              <div className="vg-form-actions">
                {etapa > 1 && (
                  <button className="vg-btn-back" onClick={goBack} disabled={loading}>
                    ← Voltar
                  </button>
                )}
                {etapa < 3 ? (
                  <button className="vg-btn-next" onClick={goNext}>
                    Próximo →
                  </button>
                ) : (
                  <button className="vg-btn-next" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Enviando..." : "Enviar candidatura"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="vg-footer">
        © {new Date().getFullYear()} imbobi. Todos os direitos reservados. &nbsp;·&nbsp;
        <Link href="/privacy-policy" style={{ color: "inherit" }}>Privacidade</Link>
      </footer>
    </>
  );
}
