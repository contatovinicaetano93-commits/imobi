"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { redirectAfterLogin } from "@/lib/post-login-redirect";
import { wakeStagingApi } from "@/lib/wake-staging-api";
import { loginWithRetry } from "@/lib/login-with-retry";
import { registerWithRetry } from "@/lib/register-with-retry";
import "./landing.css";

const WA = "5511993455589";

export const dynamic = "force-dynamic";

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
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showCadPass,   setShowCadPass]   = useState(false);

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

  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => { setIsMobile(window.innerWidth <= 768); }, []);

  useEffect(() => {
    if (isMobile) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = heroRef.current;
    if (!hero) return;

    let raf = 0;
    function handleMove(e: MouseEvent) {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = hero!.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width - 0.5;
        const my = (e.clientY - rect.top) / rect.height - 0.5;
        hero!.style.setProperty("--mx", mx.toFixed(3));
        hero!.style.setProperty("--my", my.toFixed(3));
        hero!.style.setProperty("--rx", (mx * 6).toFixed(2) + "deg");
        hero!.style.setProperty("--ry", (my * -6).toFixed(2) + "deg");
      });
    }
    function handleLeave() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      hero!.style.setProperty("--mx", "0");
      hero!.style.setProperty("--my", "0");
      hero!.style.setProperty("--rx", "0deg");
      hero!.style.setProperty("--ry", "0deg");
    }

    hero.addEventListener("mousemove", handleMove);
    hero.addEventListener("mouseleave", handleLeave);
    return () => {
      hero.removeEventListener("mousemove", handleMove);
      hero.removeEventListener("mouseleave", handleLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    void wakeStagingApi(2);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    );
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .steps-track').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErro(null); setLoginLoading(true);
    try {
      const result = await loginWithRetry(
        { email: loginEmail, senha: loginSenha },
        undefined,
      );
      redirectAfterLogin(result.role ?? "");
    } catch (err) { setLoginErro(err instanceof Error ? err.message : "Erro inesperado."); }
    finally { setLoginLoading(false); }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault(); setCadErro(null);
    if (!cadTermos || !cadPrivacy || !cadKyc) { setCadErro("Aceite todos os termos para continuar."); return; }
    setCadLoading(true);
    try {
      const result = await registerWithRetry({
        nome: cadNome,
        cpf: cadCpf.replace(/\D/g, ""),
        email: cadEmail,
        telefone: cadTelefone.replace(/\D/g, ""),
        senha: cadSenha,
        consentidoTermos: cadTermos,
        consentidoPrivacy: cadPrivacy,
        consentidoKyc: cadKyc,
        consentidoMarketing: false,
      });
      redirectAfterLogin(result.role ?? "TOMADOR");
    } catch (err) { setCadErro(err instanceof Error ? err.message : "Erro inesperado."); }
    finally { setCadLoading(false); }
  }

  function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

  function handleCardTilt(e: React.MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tx", (py * -7).toFixed(2) + "deg");
    el.style.setProperty("--ty", (px * 7).toFixed(2) + "deg");
  }
  function resetCardTilt(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.style.setProperty("--tx", "0deg");
    el.style.setProperty("--ty", "0deg");
  }

  return (
    <>
      {/* ── NAV ── */}
      <nav className={`landing-nav${scrolled ? " scrolled" : ""}`}>
        <a className="logo" href="#"><LogoIcon /><span className="logo-name">IMOBI</span></a>
        <ul className="nav-links">
          <li><a href="/envie-seu-projeto">Envie seu projeto</a></li>
          <li><a href="#vantagens">Vantagens</a></li>
          <li><a href="#como">Processo</a></li>
          <li><a href="#modalidades">Modalidades</a></li>
        </ul>
        <div className="nav-actions">
          <button className="btn-login" onClick={() => setModalOpen(true)}>Entrar</button>
          <button className="btn-cta"   onClick={() => router.push("/envie-seu-projeto" as Route)}>Envie seu projeto</button>
        </div>
        {isMobile && (
          <div className="nav-mobile-auth">
            <button className="btn-login" onClick={() => setModalOpen(true)}>Entrar</button>
            <button className="btn-cta" onClick={() => router.push("/envie-seu-projeto" as Route)}>Envie seu projeto</button>
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
                <div className="form-group" style={{ position: "relative" }}>
                  <label className="form-label">Senha</label>
                  <input type={showLoginPass ? "text" : "password"} className="form-input" placeholder="••••••••" value={loginSenha} onChange={e => setLoginSenha(e.target.value)} required style={{ paddingRight: "2.5rem" }} />
                  <button type="button" onClick={() => setShowLoginPass(v => !v)} tabIndex={-1} style={{ position: "absolute", right: 10, bottom: 10, background: "none", border: "none", cursor: "pointer", color: "rgba(12,26,61,0.45)", lineHeight: 1, padding: 4 }} aria-label={showLoginPass ? "Ocultar senha" : "Mostrar senha"}>
                    {showLoginPass
                      ? <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
                {loginErro && <p className="form-error">{loginErro}</p>}
                <div className="modal-forgot"><a href="/esqueceu-senha">Esqueci minha senha</a></div>
                <button type="submit" className="form-submit" disabled={loginLoading}>{loginLoading ? "Entrando…" : "Entrar na plataforma"}</button>
                <div className="modal-or"><span>ou</span></div>
                <button type="button" className="modal-wa" onClick={() => window.open(`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20para%20acessar%20minha%20conta%20IMOBI.`,"_blank")}><WaIcon size={16} color="#128C7E" /> Falar com a equipe IMOBI</button>
                <p style={{ textAlign: "center", fontSize: "0.78rem", color: "rgba(12,26,61,0.5)", marginTop: 12 }}>
                  Não tem conta?{" "}
                  <button type="button" onClick={() => setActiveTab("criar")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1B4FD8", fontWeight: 600, fontSize: "inherit", padding: 0 }}>Criar conta →</button>
                </p>
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
                <div className="form-group" style={{ position: "relative" }}>
                  <label className="form-label">Senha</label>
                  <input type={showCadPass ? "text" : "password"} className="form-input" placeholder="Mín. 8 chars, 1 maiúscula, 1 número" value={cadSenha} onChange={e => setCadSenha(e.target.value)} required style={{ paddingRight: "2.5rem" }} />
                  <button type="button" onClick={() => setShowCadPass(v => !v)} tabIndex={-1} style={{ position: "absolute", right: 10, bottom: 10, background: "none", border: "none", cursor: "pointer", color: "rgba(12,26,61,0.45)", lineHeight: 1, padding: 4 }} aria-label={showCadPass ? "Ocultar senha" : "Mostrar senha"}>
                    {showCadPass
                      ? <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
                <div className="modal-consents">
                  <label className="consent-row"><input type="checkbox" checked={cadTermos}  onChange={e => setCadTermos(e.target.checked)} /><span>Aceito os <a href="/termos" target="_blank">Termos de Uso</a></span></label>
                  <label className="consent-row"><input type="checkbox" checked={cadPrivacy} onChange={e => setCadPrivacy(e.target.checked)} /><span>Aceito a <a href="/privacy-policy" target="_blank">Política de Privacidade</a></span></label>
                  <label className="consent-row"><input type="checkbox" checked={cadKyc}     onChange={e => setCadKyc(e.target.checked)} /><span>Autorizo coleta de dados para KYC</span></label>
                </div>
                {cadErro && <p className="form-error">{cadErro}</p>}
                <button type="submit" className="form-submit" disabled={cadLoading}>{cadLoading ? "Criando conta…" : "Criar minha conta"}</button>
                <p style={{ textAlign: "center", fontSize: "0.78rem", color: "rgba(12,26,61,0.5)", marginTop: 12 }}>
                  Já tem conta?{" "}
                  <button type="button" onClick={() => setActiveTab("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#1B4FD8", fontWeight: 600, fontSize: "inherit", padding: 0 }}>← Entrar</button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <div className="hero-scene" aria-hidden>
          <div className="hero-bg-grid" />
          <div className="hero-glow hero-glow-1" />
          <div className="hero-glow hero-glow-2" />
          <div className="hero-orb-float"><div className="hero-orb" /></div>
        </div>
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge"><span className="badge-dot" />Crédito desburocratizado · aprovação ágil</div>
            <h1 className="hero-h1">
              <span className="h1-line">CRÉDITO PARA</span>
              <span className="h1-line">SUA OBRA</span>
              <span className="h1-line h1-accent">EM DIAS.</span>
            </h1>
            <p className="hero-sub">Crédito ágil para sua obra. Envie a documentação do empreendimento, nossa equipe analisa a viabilidade e estrutura a operação — com liberação por etapa e transparência total.</p>
            <div className="hero-actions">
              <button className="btn-hero-primary" onClick={() => router.push("/envie-seu-projeto" as Route)}>Envie seu projeto</button>
              <button className="btn-hero-ghost"   onClick={() => scrollTo("como")}>Ver o processo →</button>
            </div>
            <div className="hero-strip">
              {[
                "Análise de crédito desburocratizada",
                "Processo de documentação simplificado",
                "Versatilidade de crédito",
                "Aprovação em tempo recorde",
              ].map((pillar, i) => (
                <Fragment key={pillar}>
                  {i > 0 && <span className="hero-strip-div" aria-hidden="true" />}
                  <div className="hero-strip-item">
                    <span className="hero-strip-pillar">{pillar}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ESTATÍSTICAS ── */}
      <section className="stats">
        <div className="stats-inner">
          <div className="stats-grid">
            <div className="stat-tile reveal">
              <p className="stat-value"><StatCounter value={300} prefix="R$" suffix="M+" /></p>
              <p className="stat-label">em crédito aprovado</p>
            </div>
            <div className="stat-tile reveal d1">
              <p className="stat-value"><StatCounter value={100} suffix="+" /></p>
              <p className="stat-label">projetos recebidos</p>
            </div>
            <div className="stat-tile reveal d2">
              <p className="stat-value"><StatCounter value={24} suffix=" dias" /></p>
              <p className="stat-label">tempo médio de aprovação</p>
            </div>
            <div className="stat-tile reveal d3">
              <p className="stat-value"><StatCounter value={34} prefix="R$" suffix="M" /></p>
              <p className="stat-label">ticket médio por operação</p>
            </div>
          </div>
          <div className="stats-regions">
            <p className="stats-regions-label reveal">Presença nacional</p>
            <div className="stats-regions-list">
              {["São Paulo", "Paraná", "Santa Catarina", "Rio Grande do Sul", "Minas Gerais", "Espírito Santo"].map((praca, i) => (
                <span className="region-chip reveal" style={{ transitionDelay: `${0.05 + i * 0.06}s` }} key={praca}>{praca}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VANTAGENS ── */}
      <section className="vantagens" id="vantagens">
        <div className="vantagens-inner">
          <p className="eyebrow reveal">Comparativo</p>
          <h2 className="sec-h2 reveal d1">O mercado mudou.<br /><em>O crédito ainda não.</em></h2>
          <div className="vs-grid">
            <div className="vs-col vs-them reveal-left">
              <div className="vs-head"><span className="vs-tag-them">Bancos tradicionais</span></div>
              {["90+ dias para aprovação", "Taxa entre 3,0% e 4,5% ao mês", "Burocracia documental extensa", "80% das construtoras sem acesso", "Obra parada por falta de capital"].map((t, i) => (
                <div className={`vs-item reveal d${i + 1}`} key={t}><span className="vs-x">✕</span><span>{t}</span></div>
              ))}
            </div>
            <div className="vs-col vs-us reveal-right">
              <div className="vs-head"><span className="vs-tag-us">IMOBI</span></div>
              {["Aprovação em tempo recorde — dias, não meses", "Taxa competitiva, documentada na proposta", "Modelo próprio de garantias — analisamos caso a caso", "Análise de crédito desburocratizada", "Documentação simplificada e processo 100% digital"].map((t, i) => (
                <div className={`vs-item reveal d${i + 1}`} key={t}><span className="vs-ck">✓</span><span>{t}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="como" id="como">
        <div className="como-inner">
          <div className="como-head reveal">
            <p className="eyebrow como-ey">Processo</p>
            <h2 className="como-h2">Do pedido ao capital<br /><em>em dias, não meses.</em></h2>
          </div>
          <div className="steps">
            <div className="steps-track" aria-hidden />
            {[
              { n:"01", t:"Você nos conta o projeto",           d:"Preencha o formulário. A equipe IMOBI retorna em até 24h para alinhar os próximos passos." },
              { n:"02", t:"Análise desburocratizada em tempo recorde", d:"Avaliamos viabilidade com processo simplificado. Proposta com taxa, prazo e condições em tempo recorde — sem burocracia desnecessária." },
              { n:"03", t:"Garantias e modalidades caso a caso", d:"Volume, cronograma e garantias definidas com nosso modelo próprio — diferente do padrão de mercado. Tudo documentado e transparente." },
              { n:"04", t:"Capital no ritmo da obra",           d:"Liberações conforme avanço físico validado por vistoria técnica. Você recebe quando a obra avança." },
            ].map((s, i) => (
              <div className={`step reveal d${i + 1}`} key={s.n}>
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
          <p className="eyebrow reveal">Modalidades</p>
          <h2 className="sec-h2 mod-h2 reveal d1">Versátil</h2>
          <p className="mod-sub reveal d1">Financiamento com várias modalidades e opções, com diferentes garantias</p>
          <p className="mod-intro reveal d2"><strong>Analisamos CASO A CASO.</strong></p>
          <p className="mod-intro mod-intro-last reveal d2">Temos o nosso próprio modelo de garantias, diferente do padrão do mercado.</p>
          <div className="mod-list">
            {[
              { n:"01", t:"Crédito de Aquisição",    phase:"Fase de aquisição", d:"Capital para comprar o terreno e iniciar o projeto com segurança patrimonial. Estruturado para incorporadoras em expansão de portfólio — sem comprometer o caixa operacional." },
              { n:"02", t:"Crédito de Obra",         phase:"Fase de execução",  d:"Financiamento do ciclo de construção com liberações vinculadas ao avanço físico. Sem descasamento de caixa, sem obra parada por falta de recurso no momento certo." },
              { n:"03", t:"Crédito de Finalização",  phase:"Fase de entrega",   d:"Para empreendimentos na reta final. Solução ágil quando o projeto está quase pronto — evita paralisia da última etapa e garante entrega dentro do prazo contratado." },
            ].map((m, i) => (
              <div className={`mod-item reveal${i ? ` d${i}` : ""}`} key={m.n}>
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

      {/* ── CTA ENVIE PROJETO ── */}
      <div className="form-wrap" id="envie">
        <section className="form-section landing-envie-cta">
          <div className="form-left reveal">
            <p className="eyebrow form-ey">Próximo passo</p>
            <h2 className="form-h2">Envie a documentação<br /><em>do seu empreendimento.</em></h2>
            <p className="form-desc">Checklist guiado na plataforma. Nossa equipe analisa viabilidade e retorna em até 24 horas.</p>
            <div className="promises">
              {["Retorno em até 24h","Análise desburocratizada e gratuita","Aprovação em tempo recorde","Documentação simplificada · 100% digital"].map(t => (
                <div className="promise" key={t}><span className="promise-ck">✓</span>{t}</div>
              ))}
            </div>
            <button className="btn-hero-primary landing-envie-btn" onClick={() => router.push("/envie-seu-projeto" as Route)}>Envie seu projeto</button>
          </div>
        </section>
      </div>

      {/* ── DEPOIMENTOS ── */}
      <section className="depoimentos">
        <div className="dep-inner">
          <p className="eyebrow dep-ey reveal">Depoimentos</p>
          <h2 className="sec-h2 dep-h2 reveal d1">Quem já estruturou<br />com a IMOBI.</h2>
          <div className="dep-grid">
            {[
              { nome:"Rafael Moura",   cargo:"Diretor · MR Incorporações", texto:"Em 12 dias tínhamos o capital disponível. Com o banco, havíamos tentado 4 meses antes. A IMOBI entendeu o projeto desde o primeiro contato." },
              { nome:"Fernanda Lima",  cargo:"Sócia · FL Construções",      texto:"O processo é 100% digital e rastreável. Sabemos exatamente em que etapa está cada aprovação. Transparência que o mercado não estava acostumado." },
              { nome:"Bruno Salles",   cargo:"CEO · Salles Projetos",        texto:"Estruturamos nossa segunda operação com a IMOBI. Primeiro projeto foi tão preciso que não fazia sentido ir a outro lugar." },
            ].map((d, i) => (
              <div
                className={`dep-card reveal d${i + 1}`}
                key={d.nome}
                onMouseMove={handleCardTilt}
                onMouseLeave={resetCardTilt}
              >
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
          <p className="eyebrow faq-ey reveal">Dúvidas</p>
          <h2 className="sec-h2 faq-h2 reveal d1">Perguntas frequentes.</h2>
          <div className="faq-list reveal d2">
            {[
              { q:"Quais são os pré-requisitos para solicitar crédito?",   a:"CNPJ ativo, projeto de construção documentado e matrícula do imóvel. Estruturamos garantias caso a caso, com modelo próprio da IMOBI — diferente do padrão dos bancos." },
              { q:"Em quanto tempo recebo a aprovação?",                    a:"Trabalhamos com aprovação em tempo recorde — muito mais rápido que o mercado tradicional. Com documentação simplificada e em ordem, o processo é ágil do início ao fim." },
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
          <div className="reveal">
            <h2 className="cta-h2">Pronto para estruturar<br /><em>seu projeto?</em></h2>
            <p className="cta-sub">Aprovação em tempo recorde. Análise desburocratizada e gratuita, sem compromisso.</p>
          </div>
          <div className="cta-actions reveal d3">
            <button className="btn-hero-primary" onClick={() => router.push("/envie-seu-projeto" as Route)}>Envie seu projeto</button>
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
              <a href="/envie-seu-projeto">Envie seu projeto</a>
              <a href="/quem-somos">Quem somos</a>
              <a href="/como-funciona">Como funciona</a>
              <a href="/contato">Contato</a>
              <a href="#vantagens">Vantagens</a>
              <a href="#faq">Dúvidas</a>
              <a href="/login">Login</a>
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

function StatCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          obs.disconnect();
          const duration = 1400;
          const start = performance.now();
          function tick(now: number) {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(eased * value));
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -32px 0px' },
    );
    obs.observe(el.closest(".stat-tile") ?? el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref}>{prefix}{display.toLocaleString("pt-BR")}{suffix}</span>;
}

function FAQItem({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{pergunta}</span>
        <span className="faq-icon" aria-hidden>+</span>
      </button>
      <div className="faq-a-wrap">
        <div className="faq-a-inner"><p className="faq-a">{resposta}</p></div>
      </div>
    </div>
  );
}
