"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import "./landing.css";

const WA = "5511993455589";

const OPERACOES = [
  { valor: "R$18M",  tipo: "Luxo",        uf: "SC" },
  { valor: "R$8,5M", tipo: "Obra",        uf: "PR" },
  { valor: "R$12M",  tipo: "Aquisição",   uf: "SC" },
  { valor: "R$6,2M", tipo: "MCMV",        uf: "SP" },
  { valor: "R$9,4M", tipo: "Finalização", uf: "SC" },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled,   setScrolled]   = useState(false);
  const [isMobile,   setIsMobile]   = useState(false);
  const [activeTab,  setActiveTab]  = useState("login");
  const [modalOpen,  setModalOpen]  = useState(false);

  const [loginEmail,   setLoginEmail]   = useState("");
  const [loginSenha,   setLoginSenha]   = useState("");
  const [loginErro,    setLoginErro]    = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [cadNome,     setCadNome]     = useState("");
  const [cadCpf,      setCadCpf]      = useState("");
  const [cadEmail,    setCadEmail]    = useState("");
  const [cadTelefone, setCadTelefone] = useState("");
  const [cadSenha,    setCadSenha]    = useState("");
  const [cadTermos,   setCadTermos]   = useState(false);
  const [cadPrivacy,  setCadPrivacy]  = useState(false);
  const [cadKyc,      setCadKyc]      = useState(false);
  const [cadErro,     setCadErro]     = useState<string | null>(null);
  const [cadLoading,  setCadLoading]  = useState(false);

  const railRef        = useRef<HTMLDivElement>(null);
  const [counterVal,      setCounterVal]      = useState(0);
  const [counterStarted,  setCounterStarted]  = useState(false);

  useEffect(() => { setIsMobile(window.innerWidth <= 768); }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !counterStarted) {
        setCounterStarted(true);
        const dur = 1400, t0 = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          const e2 = 1 - (1 - p) * (1 - p);
          setCounterVal(Math.floor(e2 * 170));
          if (p < 1) requestAnimationFrame(tick); else setCounterVal(170);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [counterStarted]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErro(null); setLoginLoading(true);
    try {
      const res  = await fetch("/api/proxy/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginEmail, senha: loginSenha }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Credenciais inválidas.");
      router.push("/dashboard");
    } catch (err) { setLoginErro(err instanceof Error ? err.message : "Erro inesperado."); }
    finally { setLoginLoading(false); }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault(); setCadErro(null);
    if (!cadTermos || !cadPrivacy || !cadKyc) { setCadErro("Aceite todos os termos para continuar."); return; }
    setCadLoading(true);
    try {
      const res  = await fetch("/api/proxy/auth/registrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: cadNome, cpf: cadCpf.replace(/\D/g,""), email: cadEmail, telefone: cadTelefone.replace(/\D/g,""), senha: cadSenha, tipo: "TOMADOR", consentidoTermos: cadTermos, consentidoPrivacy: cadPrivacy, consentidoKyc: cadKyc, consentidoMarketing: false }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Erro ao criar conta.");
      router.push("/dashboard");
    } catch (err) { setCadErro(err instanceof Error ? err.message : "Erro inesperado."); }
    finally { setCadLoading(false); }
  }

  function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

  function submitToWhatsApp() {
    const g = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value?.trim() ?? "";
    const nome = g("f-nome"), cargo = g("f-cargo"), empresa = g("f-empresa"), tel = g("f-tel"), email = g("f-email"), modalidade = g("f-modalidade"), volume = g("f-volume"), obs = g("f-obs");
    if (!nome || !empresa || !tel) { alert("Por favor, preencha nome, empresa e WhatsApp."); return; }
    const msg = `Olá! Vim pelo site da IMOBI e gostaria de solicitar uma análise de crédito.\n\n*Nome:* ${nome}${cargo ? " · "+cargo : ""}\n*Empresa:* ${empresa}\n*WhatsApp:* ${tel}${email ? "\n*E-mail:* "+email : ""}\n*Modalidade:* ${modalidade||"Não informada"}\n*Volume estimado:* ${volume||"Não informado"}${obs ? "\n*Projeto:* "+obs : ""}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <>
      {/* ── NAV ── */}
      <nav className={scrolled ? "scrolled" : ""}>
        <a className="logo" href="#"><LogoIcon /><span className="logo-name">IMOBI</span></a>
        <ul className="nav-links">
          <li><a href="#vantagens">Vantagens</a></li>
          <li><a href="#como">Processo</a></li>
          <li><a href="#modalidades">Modalidades</a></li>
          <li><a href="#analise">Análise gratuita</a></li>
        </ul>
        <div className="nav-actions">
          <button className="btn-login" onClick={() => setModalOpen(true)}>Entrar</button>
          <button className="btn-cta"   onClick={() => scrollTo("analise")}>Solicitar análise</button>
        </div>
        {isMobile && (
          <div className="nav-mobile-auth">
            <button className="btn-login" onClick={() => setModalOpen(true)}>Entrar</button>
          </div>
        )}
      </nav>

      {/* ── WA FLOAT ── */}
      <a className="wa-float" href={`https://wa.me/${WA}?text=Olá!%20Vim%20pelo%20site%20da%20IMOBI.`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp IMOBI"><WaIcon /></a>

      {/* ── MODAL AUTH ── */}
      {modalOpen && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Fechar">✕</button>
            <div className="modal-logo"><LogoIcon size={24} /><span className="modal-logo-name">IMOBI</span></div>
            <div className="modal-tabs">
              <button className={`modal-tab${activeTab==="login"?" active":""}`} onClick={() => setActiveTab("login")}>Entrar</button>
              <button className={`modal-tab${activeTab==="criar"?" active":""}`} onClick={() => setActiveTab("criar")}>Criar conta</button>
            </div>

            {activeTab === "login" && (
              <form className="modal-form active" onSubmit={handleLogin}>
                <div className="form-group"><label className="form-label">E-mail</label><input type="email" className="form-input" placeholder="seu@email.com.br" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Senha</label><input type="password" className="form-input" placeholder="••••••••" value={loginSenha} onChange={e => setLoginSenha(e.target.value)} required /></div>
                {loginErro && <p className="form-error">{loginErro}</p>}
                <div className="modal-forgot"><a href="/esqueceu-senha">Esqueci minha senha</a></div>
                <button type="submit" className="form-submit" disabled={loginLoading}>{loginLoading ? "Entrando…" : "Entrar na plataforma"}</button>
                <div className="modal-or"><span>ou</span></div>
                <button type="button" className="modal-wa" onClick={() => window.open(`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20para%20acessar%20minha%20conta%20IMOBI.`,"_blank")}><WaIcon size={16} color="#128C7E" /> Falar com a equipe IMOBI</button>
              </form>
            )}

            {activeTab === "criar" && (
              <form className="modal-form active" onSubmit={handleCadastro}>
                <div className="form-group"><label className="form-label">Nome completo</label><input type="text" className="form-input" placeholder="Seu nome" value={cadNome} onChange={e => setCadNome(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">CPF</label><input type="text" className="form-input" placeholder="000.000.000-00" value={cadCpf} onChange={e => setCadCpf(e.target.value)} required /></div>
                <div className="modal-form-row">
                  <div className="form-group"><label className="form-label">E-mail</label><input type="email" className="form-input" placeholder="seu@email.com.br" value={cadEmail} onChange={e => setCadEmail(e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">WhatsApp</label><input type="tel" className="form-input" placeholder="(11) 99999-9999" value={cadTelefone} onChange={e => setCadTelefone(e.target.value)} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Senha</label><input type="password" className="form-input" placeholder="Mín. 8 chars, 1 maiúscula, 1 número" value={cadSenha} onChange={e => setCadSenha(e.target.value)} required /></div>
                <div className="modal-consents">
                  <label className="consent-row"><input type="checkbox" checked={cadTermos}  onChange={e => setCadTermos(e.target.checked)} /><span>Aceito os <a href="/termos" target="_blank">Termos de Uso</a></span></label>
                  <label className="consent-row"><input type="checkbox" checked={cadPrivacy} onChange={e => setCadPrivacy(e.target.checked)} /><span>Aceito a <a href="/privacy-policy" target="_blank">Política de Privacidade</a></span></label>
                  <label className="consent-row"><input type="checkbox" checked={cadKyc}     onChange={e => setCadKyc(e.target.checked)} /><span>Autorizo coleta de dados para KYC</span></label>
                </div>
                {cadErro && <p className="form-error">{cadErro}</p>}
                <button type="submit" className="form-submit" disabled={cadLoading}>{cadLoading ? "Criando conta…" : "Criar minha conta"}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg-grid" aria-hidden />
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge"><span className="badge-dot" />Crédito Imobiliário Estruturado</div>
            <h1 className="hero-h1">
              <span className="h1-line">CAPITAL</span>
              <span className="h1-line">PARA SUA</span>
              <span className="h1-line h1-accent">OBRA.</span>
            </h1>
            <p className="hero-sub">Aprovação em 15 a 30 dias. Do pedido ao capital sem travar o cronograma — direto para construtoras e incorporadoras.</p>
            <div className="hero-actions">
              <button className="btn-hero-primary" onClick={() => scrollTo("analise")}>Solicitar análise gratuita</button>
              <button className="btn-hero-ghost"   onClick={() => scrollTo("como")}>Ver o processo →</button>
            </div>
          </div>

          {/* TRACK RECORD RAIL */}
          <div className="rail-wrap" ref={railRef}>
            <p className="rail-label">Track record — SC · PR · SP · Luxo · MCMV</p>
            <div className="rail-track">
              <div className="rail-line-bg"   aria-hidden />
              <div className="rail-line-fill" aria-hidden />
              {OPERACOES.map((op, i) => (
                <div className="rail-node" key={i} style={{ "--d": `${0.85 + i * 0.18}s` } as React.CSSProperties}>
                  <span className="rail-val">{op.valor}</span>
                  <span className="rail-dot" />
                  <span className="rail-tag">{op.tipo} · {op.uf}</span>
                </div>
              ))}
            </div>
            <div className="rail-totals">
              <div className="rail-realized">
                <span className="rail-big">+R${counterVal}M</span>
                <span className="rail-sub">estruturados</span>
              </div>
              <div className="rail-pipeline">
                <span className="rail-pipe-num">R$800M</span>
                <span className="rail-pipe-sub">em pipeline</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NÚMEROS STRIP ── */}
      <div className="numeros-strip">
        {[
          { val: "15–30 dias", label: "Aprovação",         sub: "Bancos levam 90+ dias"       },
          { val: "100%",       label: "Taxa de entrega",   sub: "Histórico de operações"      },
          { val: "R$1M+",      label: "Operação mínima",   sub: "Sem teto máximo definido"    },
        ].map(n => (
          <div className="num-item" key={n.label}>
            <div className="num-val">{n.val}</div>
            <div className="num-label">{n.label}</div>
            <div className="num-sub">{n.sub}</div>
          </div>
        ))}
      </div>

      {/* ── VANTAGENS ── */}
      <section className="vantagens" id="vantagens">
        <div className="vantagens-inner">
          <p className="eyebrow">Comparativo</p>
          <h2 className="sec-h2">O mercado mudou.<br /><em>O crédito ainda não.</em></h2>
          <div className="vs-grid">
            <div className="vs-col vs-them">
              <div className="vs-head"><span className="vs-tag-them">Bancos tradicionais</span></div>
              {["90+ dias para aprovação", "Taxa entre 3,0% e 4,5% ao mês", "Burocracia documental extensa", "80% das construtoras sem acesso", "Obra parada por falta de capital"].map(t => (
                <div className="vs-item" key={t}><span className="vs-x">✕</span><span>{t}</span></div>
              ))}
            </div>
            <div className="vs-col vs-us">
              <div className="vs-head"><span className="vs-tag-us">IMOBI</span></div>
              {["Aprovação em 15 a 30 dias úteis", "Taxa competitiva, documentada na proposta", "Garantias RI ou receita de vendas", "Atendemos incorporadoras de todos os portes", "Capital liberado no ritmo do cronograma"].map(t => (
                <div className="vs-item" key={t}><span className="vs-ck">✓</span><span>{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="como" id="como">
        <div className="como-inner">
          <div className="como-head">
            <p className="eyebrow como-ey">Processo</p>
            <h2 className="como-h2">Do pedido ao capital<br /><em>em dias, não meses.</em></h2>
          </div>
          <div className="steps">
            {[
              { n:"01", t:"Você nos conta o projeto",    d:"Preencha o formulário. A equipe IMOBI retorna em até 24h para alinhar os próximos passos." },
              { n:"02", t:"Análise e proposta em dias",  d:"Avaliamos viabilidade técnica e financeira. Você recebe proposta com taxa, prazo e condições — sem enrolação." },
              { n:"03", t:"Estruturação sob medida",     d:"Volume, cronograma de liberações e garantias definidas — RI ou receita de vendas. Tudo documentado e transparente." },
              { n:"04", t:"Capital no ritmo da obra",    d:"Liberações conforme avanço físico validado por vistoria técnica. Você recebe quando a obra avança." },
            ].map(s => (
              <div className="step" key={s.n}>
                <span className="step-n">{s.n}</span>
                <div><p className="step-t">{s.t}</p><p className="step-d">{s.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODALIDADES ── */}
      <section className="modalidades" id="modalidades">
        <div className="mod-inner">
          <p className="eyebrow">Modalidades</p>
          <h2 className="sec-h2 mod-h2">Crédito para cada fase<br />da construção.</h2>
          <div className="mod-list">
            {[
              { n:"01", t:"Crédito de Aquisição",    phase:"Fase de aquisição", d:"Capital para comprar o terreno e iniciar o projeto com segurança patrimonial. Estruturado para incorporadoras em expansão de portfólio — sem comprometer o caixa operacional." },
              { n:"02", t:"Crédito de Obra",         phase:"Fase de execução",  d:"Financiamento do ciclo de construção com liberações vinculadas ao avanço físico. Sem descasamento de caixa, sem obra parada por falta de recurso no momento certo." },
              { n:"03", t:"Crédito de Finalização",  phase:"Fase de entrega",   d:"Para empreendimentos na reta final. Solução ágil quando o projeto está quase pronto — evita paralisia da última etapa e garante entrega dentro do prazo contratado." },
            ].map(m => (
              <div className="mod-item" key={m.n}>
                <span className="mod-n">{m.n}</span>
                <div className="mod-body">
                  <h3>{m.t}</h3>
                  <p>{m.d}</p>
                  <span className="mod-phase">{m.phase}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULÁRIO ── */}
      <div className="form-wrap" id="analise">
        <section className="form-section">
          <div className="form-left">
            <p className="eyebrow form-ey">Análise gratuita</p>
            <h2 className="form-h2">Vamos estruturar<br /><em>seu projeto.</em></h2>
            <p className="form-desc">Preencha o formulário. A equipe IMOBI entra em contato em até 24 horas com uma análise preliminar sem compromisso.</p>
            <div className="promises">
              {["Retorno em até 24h","Análise preliminar gratuita","Aprovação em 15 a 30 dias úteis","Processo 100% digital"].map(t => (
                <div className="promise" key={t}><span className="promise-ck">✓</span>{t}</div>
              ))}
            </div>
          </div>
          <div className="form-box">
            <p className="form-box-title">Solicitar análise de crédito</p>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Nome</label><input type="text" className="form-input" placeholder="Seu nome" id="f-nome" /></div>
              <div className="form-group"><label className="form-label">Cargo</label><input type="text" className="form-input" placeholder="Diretor, Sócio…" id="f-cargo" /></div>
            </div>
            <div className="form-group"><label className="form-label">Incorporadora / Construtora</label><input type="text" className="form-input" placeholder="Nome da empresa" id="f-empresa" /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">WhatsApp</label><input type="tel" className="form-input" placeholder="(11) 99999-9999" id="f-tel" /></div>
              <div className="form-group"><label className="form-label">E-mail</label><input type="email" className="form-input" placeholder="seu@email.com.br" id="f-email" /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Modalidade de interesse</label>
              <select className="form-select" id="f-modalidade" defaultValue="">
                <option value="" disabled>Selecione</option>
                <option>Crédito de aquisição de terreno</option>
                <option>Crédito de obra</option>
                <option>Crédito de finalização</option>
                <option>Ainda não sei — quero orientação</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Volume estimado do projeto</label>
              <select className="form-select" id="f-volume" defaultValue="">
                <option value="" disabled>Selecione</option>
                <option>Até R$5M</option>
                <option>R$5M – R$15M</option>
                <option>R$15M – R$50M</option>
                <option>Acima de R$50M</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Sobre o projeto (opcional)</label><textarea className="form-textarea" placeholder="Cidade, fase atual, prazo estimado…" id="f-obs" /></div>
            <button className="form-submit" onClick={submitToWhatsApp}>Solicitar análise gratuita →</button>
            <p className="form-disc">Informações tratadas com total confidencialidade.</p>
          </div>
        </section>
      </div>

      {/* ── DEPOIMENTOS ── */}
      <section className="depoimentos">
        <div className="dep-inner">
          <p className="eyebrow dep-ey">Depoimentos</p>
          <h2 className="sec-h2 dep-h2">Quem já estruturou<br />com a IMOBI.</h2>
          <div className="dep-grid">
            {[
              { nome:"Rafael Moura",   cargo:"Diretor · MR Incorporações", texto:"Em 12 dias tínhamos o capital disponível. Com o banco, havíamos tentado 4 meses antes. A IMOBI entendeu o projeto desde o primeiro contato." },
              { nome:"Fernanda Lima",  cargo:"Sócia · FL Construções",      texto:"O processo é 100% digital e rastreável. Sabemos exatamente em que etapa está cada aprovação. Transparência que o mercado não estava acostumado." },
              { nome:"Bruno Salles",   cargo:"CEO · Salles Projetos",        texto:"Estruturamos nossa segunda operação com a IMOBI. Primeiro projeto foi tão preciso que não fazia sentido ir a outro lugar." },
            ].map(d => (
              <div className="dep-card" key={d.nome}>
                <p className="dep-texto">"{d.texto}"</p>
                <div className="dep-autor">
                  <div className="dep-av">{d.nome.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                  <div><p className="dep-nome">{d.nome}</p><p className="dep-cargo">{d.cargo}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" id="faq">
        <div className="faq-inner">
          <p className="eyebrow faq-ey">Dúvidas</p>
          <h2 className="sec-h2 faq-h2">Perguntas frequentes.</h2>
          <div className="faq-list">
            {[
              { q:"Quais são os pré-requisitos para solicitar crédito?",   a:"CNPJ ativo, projeto de construção documentado e matrícula do imóvel. Utilizamos como garantia RI (Registro de Imóveis) ou receita de vendas do empreendimento — sem exigir garantias bancárias tradicionais." },
              { q:"Em quanto tempo recebo a aprovação?",                    a:"Nosso prazo é de 15 a 30 dias úteis após entrega completa da documentação. Projetos com documentação em ordem costumam ser aprovados na faixa de 15 dias." },
              { q:"Como funciona a liberação das parcelas?",                a:"As liberações são feitas conforme o avanço da obra, validadas por vistorias técnicas com registro fotográfico georeferenciado. Rastreável 100% pela plataforma." },
              { q:"Qual o valor mínimo e máximo de operação?",              a:"Operações a partir de R$1 milhão, sem limite máximo definido. Projetos acima de R$50M passam por análise de comitê diferenciada." },
              { q:"Preciso assinar documentos fisicamente?",                a:"Não. Do protocolo da proposta à assinatura do contrato — tudo digital, com validade jurídica por assinatura eletrônica qualificada." },
            ].map((f, i) => <FAQItem key={i} pergunta={f.q} resposta={f.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section className="cta-strip">
        <div className="cta-inner">
          <div>
            <h2 className="cta-h2">Pronto para estruturar<br /><em>seu projeto?</em></h2>
            <p className="cta-sub">Aprovação em 15 a 30 dias. Análise preliminar gratuita, sem compromisso.</p>
          </div>
          <div className="cta-actions">
            <button className="btn-hero-primary" onClick={() => scrollTo("analise")}>Solicitar análise gratuita</button>
            <a className="cta-wa" href={`https://wa.me/${WA}?text=Olá!%20Gostaria%20de%20estruturar%20um%20projeto%20com%20a%20IMOBI.`} target="_blank" rel="noopener noreferrer">
              <WaIcon size={18} color="rgba(255,255,255,0.75)" /> Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <a className="logo footer-logo" href="#"><LogoIcon /><span className="logo-name">IMOBI</span></a>
            <div className="footer-links">
              <a href="#vantagens">Vantagens</a><a href="#como">Processo</a>
              <a href="#modalidades">Modalidades</a><a href="#faq">Dúvidas</a>
              <a href="#analise">Contato</a><a href="/login">Login</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-note">Crédito imobiliário estruturado · SC · PR · SP · © 2026</span>
            <div className="footer-legal"><a href="/termos">Termos de Uso</a><a href="/privacy-policy">Privacidade</a></div>
          </div>
        </div>
      </footer>
    </>
  );
}

function LogoIcon({ size = 30 }: { size?: number }) {
  return (
    <div className="logo-icon" style={{ width: size, height: size }}>
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

function FAQItem({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{pergunta}</span>
        <span className="faq-icon" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <p className="faq-a">{resposta}</p>}
    </div>
  );
}
