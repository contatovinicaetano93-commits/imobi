"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  propostasApi,
  type TipoCreditoProposta,
} from "@/lib/api";
import {
  getPropostaChecklistTemplate,
  TIPOS_CREDITO_OPCOES,
} from "@/lib/proposta-checklist-local";
import "../landing.css";
import "./envie-seu-projeto.css";

const TOTAL_STEPS = 3;

type UploadMap = Record<string, File>;

export default function EnvieSeuProjetoPage() {
  const [step, setStep] = useState(0);
  const [tipo, setTipo] = useState<TipoCreditoProposta>("OBRA_NOVA");
  const template = useMemo(() => getPropostaChecklistTemplate(tipo), [tipo]);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [nomeEmpreendimento, setNomeEmpreendimento] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [narrativa, setNarrativa] = useState("");
  const [dataBase, setDataBase] = useState("");
  const [percentualFisico, setPercentualFisico] = useState("");
  const [ficha, setFicha] = useState<File | null>(null);
  const [uploads, setUploads] = useState<UploadMap>({});

  const itensPorBloco = useMemo(() => {
    if (!template) return [];
    const map = new Map<string, { titulo: string; itens: typeof template.itens }>();
    for (const item of template.itens) {
      const g = map.get(item.blocoId) ?? { titulo: item.blocoTitulo, itens: [] };
      g.itens.push(item);
      map.set(item.blocoId, g);
    }
    return [...map.values()];
  }, [template]);

  const obrigatorios = template?.itens.filter((i) => i.obrigatorio) ?? [];
  const anexosOk =
    !!ficha &&
    obrigatorios.every((i) => uploads[i.itemId] != null);

  function validarPasso1() {
    if (!nomeEmpreendimento.trim() || nomeEmpreendimento.trim().length < 3) {
      setErro("Informe o nome do empreendimento (mín. 3 caracteres).");
      return false;
    }
    if (!nomeContato.trim()) {
      setErro("Informe seu nome.");
      return false;
    }
    if (!email.includes("@")) {
      setErro("Informe um e-mail válido.");
      return false;
    }
    if (telefone.replace(/\D/g, "").length < 10) {
      setErro("Informe um telefone com DDD.");
      return false;
    }
    if (tipo !== "OBRA_NOVA") {
      const raw = percentualFisico.trim();
      if (raw === "") {
        setErro("Informe o percentual físico da obra (0–100).");
        return false;
      }
      const pct = Number(raw);
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        setErro("Informe o percentual físico da obra (0–100).");
        return false;
      }
    }
    setErro(null);
    return true;
  }

  async function handleSubmit() {
    if (!validarPasso1() || !anexosOk) {
      setErro("Anexe a Ficha Excel e todos os documentos obrigatórios.");
      return;
    }
    setSubmitting(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append("tipoCredito", tipo);
      fd.append("nomeEmpreendimento", nomeEmpreendimento.trim());
      fd.append("nomeContato", nomeContato.trim());
      fd.append("email", email.trim());
      fd.append("telefone", telefone.replace(/\D/g, ""));
      if (empresa.trim()) fd.append("empresa", empresa.trim());
      if (narrativa.trim()) fd.append("narrativa", narrativa.trim());
      if (dataBase) fd.append("dataBase", dataBase);
      if (tipo !== "OBRA_NOVA") {
        fd.append("percentualFisico", percentualFisico.trim());
      }
      if (ficha) fd.append("ficha", ficha);
      for (const [itemId, file] of Object.entries(uploads)) {
        fd.append(`item_${itemId}`, file);
      }

      const res = await propostasApi.enviar(fd);
      setSucesso(res.mensagem);
      setStep(TOTAL_STEPS);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar proposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sucesso) {
    return (
      <div className="esp-page">
        <header className="esp-header">
          <Link href="/" className="esp-logo">Imobi</Link>
        </header>
        <main className="esp-main esp-success">
          <div className="esp-card esp-card-center">
            <div className="esp-success-icon">✓</div>
            <h1>Proposta recebida</h1>
            <p>{sucesso}</p>
            <p className="esp-muted">
              Após a análise da documentação, simularemos e estruturaremos o crédito com você.
            </p>
            <div className="esp-actions">
              <Link href={"/login?next=/dashboard/proposta-credito" as Route} className="btn-hero-primary">
                Entrar na plataforma
              </Link>
              <Link href="/" className="esp-link">Voltar ao início</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="esp-page">
      <header className="esp-header">
        <Link href="/" className="esp-logo">Imobi</Link>
        <Link href={"/login?next=/dashboard/proposta-credito" as Route} className="btn-login">
          Já tenho conta
        </Link>
      </header>

      <main className="esp-main">
        <div className="esp-hero">
          <p className="esp-kicker">Originação · Análise de crédito</p>
          <h1>Envie seu projeto</h1>
          <p className="esp-sub">
            Documentação e viabilidade primeiro — a simulação de crédito vem depois da nossa análise técnica e financeira.
          </p>
        </div>

        <div className="esp-steps">
          {["Tipo de crédito", "Seu projeto", "Documentos"].map((label, i) => (
            <div
              key={label}
              className={`esp-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            >
              <span>{i + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {erro && <div className="esp-error">{erro}</div>}

        <div className="esp-card">
          {step === 0 && (
            <>
              <h2>Qual operação você busca?</h2>
              <p className="esp-muted">Selecione o perfil que melhor descreve seu empreendimento.</p>
              <div className="esp-tipo-grid" role="radiogroup" aria-label="Tipo de crédito">
                {TIPOS_CREDITO_OPCOES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t.id}
                    className={`esp-tipo ${tipo === t.id ? "selected" : ""}`}
                    onClick={() => setTipo(t.id)}
                  >
                    <strong>{t.label}</strong>
                    <span>{t.descricao}</span>
                  </button>
                ))}
              </div>
              <div className="esp-actions">
                <button
                  type="button"
                  className="btn-hero-primary"
                  onClick={() => { setErro(null); setStep(1); }}
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Dados do empreendimento</h2>
              <div className="esp-form">
                <label>
                  Nome do empreendimento
                  <input value={nomeEmpreendimento} onChange={(e) => setNomeEmpreendimento(e.target.value)} placeholder="Ex.: Residencial Parque Verde" />
                </label>
                <div className="esp-row">
                  <label>
                    Seu nome
                    <input value={nomeContato} onChange={(e) => setNomeContato(e.target.value)} />
                  </label>
                  <label>
                    Empresa / SPE
                    <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Opcional" />
                  </label>
                </div>
                <div className="esp-row">
                  <label>
                    E-mail
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label>
                    WhatsApp / telefone
                    <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                  </label>
                </div>
                {tipo !== "OBRA_NOVA" && (
                  <label>
                    Percentual físico da obra (%)
                    <input type="number" min={0} max={100} value={percentualFisico} onChange={(e) => setPercentualFisico(e.target.value)} />
                  </label>
                )}
                <label>
                  Data-base dos dados
                  <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} />
                </label>
                <label>
                  Contexto do projeto
                  <textarea rows={4} value={narrativa} onChange={(e) => setNarrativa(e.target.value)} placeholder="Resumo da operação, volume buscado, prazo desejado…" />
                </label>
              </div>
              <div className="esp-actions">
                <button type="button" className="esp-btn-ghost" onClick={() => setStep(0)}>Voltar</button>
                <button
                  type="button"
                  className="btn-hero-primary"
                  onClick={() => { if (validarPasso1()) setStep(2); }}
                >
                  Ir para documentos
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Checklist de documentos</h2>
              <p className="esp-muted">
                Anexe a <strong>Ficha do Empreendimento e Viabilidade</strong> (Excel) e os PDFs de cada item.
                Formatos: PDF, XLS, XLSX — data-base atualizada.
              </p>

              <label className="esp-upload esp-upload-highlight">
                <span>Ficha do Empreendimento e Viabilidade (Excel) *</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setFicha(e.target.files?.[0] ?? null)}
                />
                {ficha && <em>{ficha.name}</em>}
              </label>

              {itensPorBloco.map((bloco) => (
                <div key={bloco.titulo} className="esp-bloco">
                  <h3>{bloco.titulo}</h3>
                  {bloco.itens.map((item) => (
                    <label key={item.itemId} className="esp-upload">
                      <span>
                        {item.titulo}
                        {item.obrigatorio && " *"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploads((prev) => ({ ...prev, [item.itemId]: file }));
                        }}
                      />
                      {uploads[item.itemId] && <em>{uploads[item.itemId].name}</em>}
                    </label>
                  ))}
                </div>
              ))}

              <div className="esp-actions">
                <button type="button" className="esp-btn-ghost" onClick={() => setStep(1)}>Voltar</button>
                <button
                  type="button"
                  className="btn-hero-primary"
                  disabled={submitting || !anexosOk}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? "Enviando…" : "Enviar proposta"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="esp-footnote">
          Prefere falar com alguém?{" "}
          <Link href="/contato">Fale com nosso time</Link>
        </p>
      </main>
    </div>
  );
}
