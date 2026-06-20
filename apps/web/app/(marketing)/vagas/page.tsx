"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import "./vagas.css";

// ── Dados estáticos das vagas ──────────────────────────────────────
type TipoVaga = "AC" | "BCT" | "BC" | "NMA";

interface VagaInfo {
  id: TipoVaga;
  label: string;
  descricao: string;
  slots: number;
}

const VAGAS: VagaInfo[] = [
  {
    id: "AC",
    label: "Auxiliar de Construção",
    descricao: "Apoio às equipes de obra, movimentação de materiais e suporte operacional em campo.",
    slots: 50,
  },
  {
    id: "BCT",
    label: "Técnico de Construção",
    descricao: "Acompanhamento técnico das etapas construtivas com supervisão de engenheiro responsável.",
    slots: 20,
  },
  {
    id: "BC",
    label: "Bombeiro Civil",
    descricao: "Prevenção e combate a incêndios em obras e edificações com certificação ativa.",
    slots: 20,
  },
  {
    id: "NMA",
    label: "Nível Médio Administrativo",
    descricao: "Suporte administrativo às operações de obra, gestão documental e controle de contratos.",
    slots: 20,
  },
];

const GRAUS = [
  { value: "FUNDAMENTAL", label: "Ensino Fundamental" },
  { value: "MEDIO", label: "Ensino Médio" },
  { value: "TECNICO", label: "Curso Técnico" },
  { value: "SUPERIOR", label: "Ensino Superior" },
  { value: "POS_GRADUACAO", label: "Pós-Graduação / MBA" },
];

const AREAS = [
  "Construção Civil",
  "Administração",
  "Segurança do Trabalho",
  "Elétrica",
  "Hidráulica",
  "Acabamento / Revestimento",
  "Outro",
];

// ── Tipos do formulário ────────────────────────────────────────────
interface Step1 {
  nome: string;
  dataNascimento: string;
  cpf: string;
  email: string;
  telefone: string;
}

interface Step2 {
  tipoVaga: TipoVaga | "";
}

interface Step3 {
  areaAtuacao: string;
  experienciaAnos: string;
  pretensaoSalarial: string;
  grauEscolaridade: string;
}

type FieldErrors = Partial<Record<string, string>>;

// ── Helpers ────────────────────────────────────────────────────────
function maskCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 11);
}
function maskTel(v: string) {
  return v.replace(/\D/g, "").slice(0, 11);
}

function validateStep1(f: Step1): FieldErrors {
  const e: FieldErrors = {};
  if (!f.nome.trim() || f.nome.trim().length < 3) e.nome = "Nome deve ter pelo menos 3 caracteres";
  if (!f.dataNascimento) e.dataNascimento = "Data de nascimento obrigatória";
  if (!/^\d{11}$/.test(f.cpf)) e.cpf = "CPF deve conter 11 dígitos";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "E-mail inválido";
  if (!/^\d{10,11}$/.test(f.telefone)) e.telefone = "Telefone inválido (DDD + número)";
  return e;
}

function validateStep2(f: Step2): FieldErrors {
  const e: FieldErrors = {};
  if (!f.tipoVaga) e.tipoVaga = "Selecione uma área de interesse";
  return e;
}

function validateStep3(f: Step3): FieldErrors {
  const e: FieldErrors = {};
  if (!f.areaAtuacao) e.areaAtuacao = "Selecione uma área de atuação";
  const anos = Number(f.experienciaAnos);
  if (f.experienciaAnos === "" || isNaN(anos) || anos < 0 || anos > 50)
    e.experienciaAnos = "Informe os anos de experiência (0–50)";
  if (!f.grauEscolaridade) e.grauEscolaridade = "Selecione o grau de escolaridade";
  return e;
}

// ── Componente principal ───────────────────────────────────────────
export default function VagasPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [step1, setStep1] = useState<Step1>({
    nome: "", dataNascimento: "", cpf: "", email: "", telefone: "",
  });
  const [step2, setStep2] = useState<Step2>({ tipoVaga: "" });
  const [step3, setStep3] = useState<Step3>({
    areaAtuacao: "", experienciaAnos: "", pretensaoSalarial: "", grauEscolaridade: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [protocolo, setProtocolo] = useState<string>("");

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goNext() {
    let e: FieldErrors = {};
    if (etapa === 1) e = validateStep1(step1);
    if (etapa === 2) e = validateStep2(step2);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setEtapa((p) => (p < 3 ? ((p + 1) as 1 | 2 | 3) : p));
    setTimeout(scrollToForm, 80);
  }

  function goBack() {
    setErrors({});
    setEtapa((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3) : p));
    setTimeout(scrollToForm, 80);
  }

  async function handleSubmit() {
    const e = validateStep3(step3);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setSubmitError(null);

    const payload = {
      ...step1,
      tipoVaga: step2.tipoVaga,
      areaAtuacao: step3.areaAtuacao,
      experienciaAnos: Number(step3.experienciaAnos),
      pretensaoSalarial: step3.pretensaoSalarial ? Number(step3.pretensaoSalarial) : undefined,
      grauEscolaridade: step3.grauEscolaridade,
    };

    try {
      const res = await fetch("/api/proxy/vagas/candidatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.message ?? "Erro ao enviar candidatura. Tente novamente.");
        return;
      }
      setProtocolo(data.candidaturaId ?? String(Date.now()));
      setSucesso(true);
    } catch {
      setSubmitError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ["Dados Pessoais", "Área de Interesse", "Experiência"];
  const totalSlots = VAGAS.reduce((s, v) => s + v.slots, 0);

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
          Estamos crescendo e buscamos profissionais comprometidos para integrar
          nossas equipes de obra, técnica e administrativa em todo o Brasil.
        </p>
        <a href="#candidatura" className="vg-hero-cta" onClick={(e) => { e.preventDefault(); scrollToForm(); }}>
          Candidatar-se agora →
        </a>
        <div className="vg-hero-stats">
          <div className="vg-stat">
            <span className="vg-stat-num">{totalSlots}</span>
            <span className="vg-stat-label">Vagas disponíveis</span>
          </div>
          <div className="vg-stat">
            <span className="vg-stat-num">{VAGAS.length}</span>
            <span className="vg-stat-label">Áreas de atuação</span>
          </div>
          <div className="vg-stat">
            <span className="vg-stat-num">100%</span>
            <span className="vg-stat-label">CLT + benefícios</span>
          </div>
        </div>
      </section>

      {/* LISTAGEM DE VAGAS */}
      <section className="vg-section">
        <p className="vg-section-label">Oportunidades</p>
        <h2 className="vg-section-title">Vagas disponíveis</h2>
        <p className="vg-section-sub">
          Escolha a área que melhor se encaixa no seu perfil e candidate-se abaixo.
        </p>
        <div className="vg-cards">
          {VAGAS.map((v) => (
            <div
              key={v.id}
              className={`vg-card${step2.tipoVaga === v.id ? " selected" : ""}`}
              onClick={() => { setStep2({ tipoVaga: v.id }); scrollToForm(); }}
            >
              <span className="vg-card-tag">{v.id}</span>
              <h3>{v.label}</h3>
              <p>{v.descricao}</p>
              <div className="vg-card-slots">
                <span className="vg-card-slots-dot" />
                {v.slots} vagas disponíveis
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section className="vg-section" id="candidatura" ref={formRef}>
        <p className="vg-section-label">Formulário</p>
        <h2 className="vg-section-title">Sua candidatura</h2>
        <p className="vg-section-sub">
          Preencha os dados abaixo. Leva menos de 3 minutos.
        </p>

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
              <button
                className="vg-btn-next"
                onClick={() => { setSucesso(false); setEtapa(1); setStep1({ nome:"", dataNascimento:"", cpf:"", email:"", telefone:"" }); setStep2({ tipoVaga:"" }); setStep3({ areaAtuacao:"", experienciaAnos:"", pretensaoSalarial:"", grauEscolaridade:"" }); }}
              >
                Nova candidatura
              </button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="vg-progress">
                {stepLabels.map((label, i) => {
                  const n = i + 1;
                  const cls = n < etapa ? "done" : n === etapa ? "active" : "";
                  return (
                    <div key={n} className={`vg-step ${cls}`}>
                      <span className="vg-step-num">
                        {n < etapa ? "✓" : n}
                      </span>
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

                  <div className="vg-fields vg-fields-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="vg-field">
                      <label className="vg-label">Data de nascimento <span>*</span></label>
                      <input
                        type="date"
                        className={`vg-input${errors.dataNascimento ? " error" : ""}`}
                        value={step1.dataNascimento}
                        onChange={(e) => setStep1((p) => ({ ...p, dataNascimento: e.target.value }))}
                      />
                      {errors.dataNascimento && <span className="vg-error">{errors.dataNascimento}</span>}
                    </div>
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
                  </div>

                  <div className="vg-fields vg-fields-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
                </div>
              )}

              {/* Etapa 2 — Tipo de Vaga */}
              {etapa === 2 && (
                <div className="vg-fields">
                  <div className="vg-field">
                    <label className="vg-label">
                      Selecione a área de interesse <span>*</span>
                      <span style={{ fontWeight: 400, color: "var(--gray)", fontSize: "0.72rem", marginLeft: "0.35rem" }}>
                        (1 escolha obrigatória)
                      </span>
                    </label>
                    <div className="vg-radio-grid">
                      {VAGAS.map((v) => (
                        <label
                          key={v.id}
                          className={`vg-radio-card${step2.tipoVaga === v.id ? " selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="tipoVaga"
                            value={v.id}
                            checked={step2.tipoVaga === v.id}
                            onChange={() => setStep2({ tipoVaga: v.id })}
                          />
                          <div className="vg-radio-card-body">
                            <div className="vg-radio-card-title">{v.label}</div>
                            <div className="vg-radio-card-desc">{v.descricao}</div>
                            <div className="vg-radio-card-slots">● {v.slots} vagas</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.tipoVaga && <span className="vg-error">{errors.tipoVaga}</span>}
                  </div>
                </div>
              )}

              {/* Etapa 3 — Experiência e Formação */}
              {etapa === 3 && (
                <div className="vg-fields">
                  <div className="vg-field">
                    <label className="vg-label">Área de atuação atual <span>*</span></label>
                    <select
                      className={`vg-input${errors.areaAtuacao ? " error" : ""}`}
                      value={step3.areaAtuacao}
                      onChange={(e) => setStep3((p) => ({ ...p, areaAtuacao: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {errors.areaAtuacao && <span className="vg-error">{errors.areaAtuacao}</span>}
                  </div>

                  <div className="vg-fields vg-fields-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="vg-field">
                      <label className="vg-label">Anos de experiência <span>*</span></label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        className={`vg-input${errors.experienciaAnos ? " error" : ""}`}
                        placeholder="Ex: 3"
                        value={step3.experienciaAnos}
                        onChange={(e) => setStep3((p) => ({ ...p, experienciaAnos: e.target.value }))}
                      />
                      {errors.experienciaAnos && <span className="vg-error">{errors.experienciaAnos}</span>}
                    </div>
                    <div className="vg-field">
                      <label className="vg-label">Pretensão salarial (R$)</label>
                      <input
                        type="number"
                        min={0}
                        className="vg-input"
                        placeholder="Ex: 2000"
                        value={step3.pretensaoSalarial}
                        onChange={(e) => setStep3((p) => ({ ...p, pretensaoSalarial: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="vg-field">
                    <label className="vg-label">Grau de escolaridade <span>*</span></label>
                    <select
                      className={`vg-input${errors.grauEscolaridade ? " error" : ""}`}
                      value={step3.grauEscolaridade}
                      onChange={(e) => setStep3((p) => ({ ...p, grauEscolaridade: e.target.value }))}
                    >
                      <option value="">Selecione...</option>
                      {GRAUS.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    {errors.grauEscolaridade && <span className="vg-error">{errors.grauEscolaridade}</span>}
                  </div>
                </div>
              )}

              {submitError && (
                <div className="vg-form-error">{submitError}</div>
              )}

              {/* Actions */}
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

      {/* FOOTER */}
      <footer className="vg-footer">
        © {new Date().getFullYear()} imbobi. Todos os direitos reservados. &nbsp;·&nbsp;
        <Link href="/privacy-policy" style={{ color: "inherit" }}>Privacidade</Link>
      </footer>
    </>
  );
}
