"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./landing.css";

const WA = "5511993455589";

export default function LandingPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [modalOpen, setModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginErro, setLoginErro] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [cadNome, setCadNome] = useState("");
  const [cadCpf, setCadCpf] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadTelefone, setCadTelefone] = useState("");
  const [cadSenha, setCadSenha] = useState("");
  const [cadTermos, setCadTermos] = useState(false);
  const [cadPrivacy, setCadPrivacy] = useState(false);
  const [cadKyc, setCadKyc] = useState(false);
  const [cadErro, setCadErro] = useState<string | null>(null);
  const [cadLoading, setCadLoading] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErro(null);
    setLoginLoading(true);
    try {
      const res = await fetch("/api/proxy/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, senha: loginSenha }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Credenciais inválidas.");
      router.push("/dashboard");
    } catch (e) {
      setLoginErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setCadErro(null);
    if (!cadTermos || !cadPrivacy || !cadKyc) {
      setCadErro("Aceite todos os termos para continuar.");
      return;
    }
    setCadLoading(true);
    try {
      const res = await fetch("/api/proxy/auth/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: cadNome,
          cpf: cadCpf.replace(/\D/g, ""),
          email: cadEmail,
          telefone: cadTelefone.replace(/\D/g, ""),
          senha: cadSenha,
          tipo: "TOMADOR",
          consentidoTermos: cadTermos,
          consentidoPrivacy: cadPrivacy,
          consentidoKyc: cadKyc,
          consentidoMarketing: false,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Erro ao criar conta.");
      router.push("/dashboard");
    } catch (e) {
      setCadErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCadLoading(false);
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function submitToWhatsApp() {
    const nome = (document.getElementById("f-nome") as HTMLInputElement)?.value.trim();
    const cargo = (document.getElementById("f-cargo") as HTMLInputElement)?.value.trim();
    const empresa = (document.getElementById("f-empresa") as HTMLInputElement)?.value.trim();
    const tel = (document.getElementById("f-tel") as HTMLInputElement)?.value.trim();
    const email = (document.getElementById("f-email") as HTMLInputElement)?.value.trim();
    const modalidade = (document.getElementById("f-modalidade") as HTMLSelectElement)?.value;
    const volume = (document.getElementById("f-volume") as HTMLSelectElement)?.value;
    const obs = (document.getElementById("f-obs") as HTMLTextAreaElement)?.value.trim();

    if (!nome || !empresa || !tel) {
      alert("Por favor, preencha nome, empresa e WhatsApp.");
      return;
    }

    const msg = `Olá! Vim pelo site da IMOBI e gostaria de solicitar uma análise de crédito.

*Nome:* ${nome}${cargo ? " · " + cargo : ""}
*Empresa:* ${empresa}
*WhatsApp:* ${tel}${email ? "\n*E-mail:* " + email : ""}
*Modalidade:* ${modalidade || "Não informada"}
*Volume estimado:* ${volume || "Não informado"}${obs ? "\n*Projeto:* " + obs : ""}`;

    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const CheckIcon = ({ color = "white" }: { color?: string }) => (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M2 5l2.5 2.5 3.5-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const XIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M2 2l6 6M8 2L2 8" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const WaIcon = ({ size = 26, color = "white" }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.51 5.824L.057 23.776c-.07.266.166.502.432.432l5.968-1.453A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.002-1.367l-.359-.213-3.721.905.934-3.62-.233-.372A9.82 9.82 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
    </svg>
  );

  const LogoIcon = ({ size = 30 }: { size?: number }) => (
    <div className="logo-icon" style={{ width: size, height: size }}>
      <b /><b /><b /><b /><b /><b /><b /><b /><b />
    </div>
  );

  return (
    <>
      {/* NAV */}
      <nav>
        <a className="logo" href="#">
          <LogoIcon />
          <span className="logo-name">IMOBI</span>
        </a>
        <ul className="nav-links">
          <li><a href="#vantagens">Vantagens</a></li>
          <li><a href="#como">Como funciona</a></li>
          <li><a href="#modalidades">Modalidades</a></li>
          <li><a href="#analise">Contato</a></li>
        </ul>
        <div className="nav-actions">
          <button className="btn-login" onClick={() => setModalOpen(true)}>Login</button>
        </div>
        {isMobile && (
          <div className="nav-mobile-auth">
            <button className="btn-login" onClick={() => setModalOpen(true)}>Login</button>
          </div>
        )}
      </nav>

      {/* WA FLOAT */}
      <a
        className="wa-float"
        href={`https://wa.me/${WA}?text=Olá!%20Vim%20pelo%20site%20da%20IMOBI%20e%20gostaria%20de%20saber%20mais.`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WaIcon />
      </a>

      {/* MODAL */}
      {modalOpen && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            <div className="modal-logo">
              <LogoIcon size={26} />
              <span className="modal-logo-name">IMOBI</span>
            </div>
            <div className="modal-tabs">
              <button className={`modal-tab${activeTab === "login" ? " active" : ""}`} onClick={() => setActiveTab("login")}>Login</button>
              <button className={`modal-tab${activeTab === "criar" ? " active" : ""}`} onClick={() => setActiveTab("criar")}>Criar conta</button>
            </div>
            {activeTab === "login" && (
              <form className="modal-form active" onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input type="email" className="form-input" placeholder="seu@email.com.br" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} required />
                </div>
                {loginErro && <p style={{ color: "#EF4444", fontSize: "0.78rem", marginBottom: "0.5rem" }}>{loginErro}</p>}
                <div className="modal-forgot"><a href="#">Esqueci minha senha</a></div>
                <button type="submit" className="form-submit" disabled={loginLoading}>
                  {loginLoading ? "Entrando..." : "Login na plataforma"}
                </button>
                <div className="modal-or">ou</div>
                <button type="button" className="modal-wa" onClick={() => window.open(`https://wa.me/${WA}?text=Olá!%20Preciso%20de%20ajuda%20para%20acessar%20minha%20conta%20IMOBI.`, "_blank")}>
                  <WaIcon size={16} color="currentColor" />
                  Falar com a equipe IMOBI
                </button>
                <p className="modal-disc">Acesso protegido com criptografia.</p>
              </form>
            )}
            {activeTab === "criar" && (
              <form className="modal-form active" onSubmit={handleCadastro}>
                <div className="form-group"><label className="form-label">Nome completo</label><input type="text" className="form-input" placeholder="Seu nome" value={cadNome} onChange={(e) => setCadNome(e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">CPF</label><input type="text" className="form-input" placeholder="000.000.000-00" value={cadCpf} onChange={(e) => setCadCpf(e.target.value)} required /></div>
                <div className="modal-form-row">
                  <div className="form-group"><label className="form-label">E-mail</label><input type="email" className="form-input" placeholder="seu@email.com.br" value={cadEmail} onChange={(e) => setCadEmail(e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">WhatsApp</label><input type="tel" className="form-input" placeholder="(11) 99999-9999" value={cadTelefone} onChange={(e) => setCadTelefone(e.target.value)} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Senha</label><input type="password" className="form-input" placeholder="Mín. 8 chars, 1 maiúscula, 1 número" value={cadSenha} onChange={(e) => setCadSenha(e.target.value)} required /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", margin: "0.75rem 0" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.72rem", color: "var(--gray)", cursor: "pointer" }}>
                    <input type="checkbox" checked={cadTermos} onChange={(e) => setCadTermos(e.target.checked)} style={{ marginTop: "2px", flexShrink: 0 }} />
                    Aceito os <a href="/termos" target="_blank" style={{ color: "var(--blue)" }}>Termos de Uso</a>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.72rem", color: "var(--gray)", cursor: "pointer" }}>
                    <input type="checkbox" checked={cadPrivacy} onChange={(e) => setCadPrivacy(e.target.checked)} style={{ marginTop: "2px", flexShrink: 0 }} />
                    Aceito a <a href="/privacy-policy" target="_blank" style={{ color: "var(--blue)" }}>Política de Privacidade</a>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.72rem", color: "var(--gray)", cursor: "pointer" }}>
                    <input type="checkbox" checked={cadKyc} onChange={(e) => setCadKyc(e.target.checked)} style={{ marginTop: "2px", flexShrink: 0 }} />
                    Autorizo a coleta de dados para validação de identidade (KYC)
                  </label>
                </div>
                {cadErro && <p style={{ color: "#EF4444", fontSize: "0.78rem", marginBottom: "0.5rem" }}>{cadErro}</p>}
                <button type="submit" className="form-submit" disabled={cadLoading}>
                  {cadLoading ? "Criando conta..." : "Criar minha conta"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge"><div className="hero-badge-dot" />Crédito imobiliário estruturado</div>
            <h1>Capital para<br />sua obra.<br /><span>Sem burocracia.</span></h1>
            <p className="hero-sub">Aprovação em até 15 dias úteis, taxa competitiva e processo 100% digital. Do pedido ao capital, sem travar sua obra.</p>
            <div className="hero-actions">
              <button className="btn-hero-primary" onClick={() => scrollTo("analise")}>Solicitar análise gratuita</button>
              <button className="btn-hero-ghost" onClick={() => scrollTo("como")}>Como funciona →</button>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-stat-grid">
              <div className="hsg-item hsg-blue">
                <div className="hsg-val">15 dias</div>
                <div className="hsg-label">Aprovação</div>
                <div className="hsg-sub">Bancos levam 90+</div>
              </div>
              <div className="hsg-item hsg-mint">
                <div className="hsg-val">100%</div>
                <div className="hsg-label">Taxa de entrega</div>
                <div className="hsg-sub">Histórico comprovado</div>
              </div>
              <div className="hsg-item hsg-light">
                <div className="hsg-val">+R$40M</div>
                <div className="hsg-label">Já estruturados</div>
                <div className="hsg-sub">Em operações ativas</div>
              </div>
              <div className="hsg-item hsg-outline">
                <div className="hsg-val">3</div>
                <div className="hsg-label">Modalidades</div>
                <div className="hsg-sub">Terreno · Obra · Entrega</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VS */}
      <section id="vantagens">
        <div className="vs">
          <div className="vs-card them">
            <div className="vs-card-header">
              <span className="vs-tag them">Bancos tradicionais</span>
              <div className="vs-card-title">O jeito antigo</div>
            </div>
            <div className="vs-list">
              {["90+ dias para aprovação de crédito", "Taxas de 3,0% a 4,5% ao mês", "Processo burocrático e impessoal", "80% das construtoras sem acesso a crédito profissional", "Obras paradas por falta de capital no momento certo"].map((t) => (
                <div key={t} className="vs-item">
                  <div className="vs-icon-wrap bad"><XIcon /></div>
                  <p>{t}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="vs-card us">
            <div className="vs-card-header">
              <span className="vs-tag us">IMOBI</span>
              <div className="vs-card-title">O jeito novo</div>
            </div>
            <div className="vs-list">
              {["Aprovação em até 15 dias úteis", "Taxa competitiva e justa para o mercado atual", "100% digital com equipe IMOBI dedicada", "Atendemos incorporadoras de todos os portes", "Capital liberado no ritmo da sua obra"].map((t) => (
                <div key={t} className="vs-item">
                  <div className="vs-icon-wrap good"><CheckIcon /></div>
                  <p>{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NÚMEROS */}
      <div className="numeros">
        <div className="numeros-inner">
          {[
            { val: "15 dias", label: "Aprovação", desc: "Enquanto bancos levam 90+" },
            { val: "100%", label: "Taxa de entrega", desc: "Histórico de operações concluídas" },
            { val: "+R$40M", label: "Já estruturados", desc: "Em operações imobiliárias" },
          ].map((n) => (
            <div key={n.label} className="num-item">
              <div className="num-val">{n.val}</div>
              <div className="num-label">{n.label}</div>
              <div className="num-desc">{n.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <div className="como-wrapper">
        <section className="como" id="como">
          <div>
            <div className="section-chip">Processo</div>
            <h2>Do pedido ao capital <span>em dias</span></h2>
            <p className="como-desc">Desenvolvemos um processo enxuto que elimina a burocracia. Você foca na obra — a equipe IMOBI cuida de tudo.</p>
          </div>
          <div className="steps">
            {[
              { n: "01", t: "Você nos conta o projeto", d: "Preencha o formulário com as informações básicas. A equipe IMOBI entra em contato em até 24h." },
              { n: "02", t: "Análise ágil", d: "Avaliamos a viabilidade e apresentamos uma proposta clara em poucos dias. Sem burocracia." },
              { n: "03", t: "Estruturação sob medida", d: "Definimos volume e prazo que fazem sentido para o seu projeto. Tudo transparente e documentado." },
              { n: "04", t: "Capital na obra", d: "Liberações alinhadas ao cronograma da construção. Você recebe quando precisar, sem surpresas." },
            ].map((s) => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <div>
                  <div className="step-title">{s.t}</div>
                  <div className="step-desc">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* MODALIDADES */}
      <section className="modal-section" id="modalidades">
        <div className="modal-inner">
          <div className="section-chip">Modalidades</div>
          <h2>Crédito para <span>cada fase</span></h2>
          <p className="modal-sub">Atuamos nos três estágios principais da construção.</p>
          <div className="modal-grid">
            <div className="modal-card">
              <div className="modal-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M9 21V7l6-4v18M9 11h6" stroke="#1B4FD8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3>Crédito de aquisição</h3>
              <p>Capital para comprar o lote e iniciar o projeto com segurança. Ideal para incorporadoras expandindo portfólio.</p>
              <span className="modal-tag">Fase de aquisição</span>
            </div>
            <div className="modal-card">
              <div className="modal-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="10" width="20" height="11" rx="2" stroke="#1B4FD8" strokeWidth="1.8" /><path d="M6 10V7a6 6 0 0112 0v3" stroke="#1B4FD8" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </div>
              <h3>Crédito de obra</h3>
              <p>Capital para manter o ritmo da construção. Liberações conforme o avanço, sem travar o caixa da empresa.</p>
              <span className="modal-tag">Fase de execução</span>
            </div>
            <div className="modal-card">
              <div className="modal-card-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#1B4FD8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3>Crédito de finalização</h3>
              <p>Para obras na reta final. Solução ágil para não deixar o empreendimento parar quando está quase pronto.</p>
              <span className="modal-tag">Fase de entrega</span>
            </div>
          </div>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <div className="form-wrapper">
        <section className="form-section" id="analise">
          <div className="form-left">
            <div className="section-chip">Análise gratuita</div>
            <h2>Vamos estruturar <span>seu projeto</span></h2>
            <p>Preencha o formulário. A equipe IMOBI entra em contato em até 24 horas com uma análise preliminar sem compromisso.</p>
            <div className="promises">
              {["Resposta em até 24h", "Análise preliminar gratuita", "Aprovação em até 15 dias úteis", "Equipe IMOBI dedicada do início ao fim"].map((t) => (
                <div key={t} className="promise">
                  <div className="promise-icon"><CheckIcon color="#10B981" /></div>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="form-box">
            <div className="form-box-title">Solicitar análise de crédito</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Nome</label><input type="text" className="form-input" placeholder="Seu nome" id="f-nome" /></div>
              <div className="form-group"><label className="form-label">Cargo</label><input type="text" className="form-input" placeholder="Diretor, Sócio..." id="f-cargo" /></div>
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
            <div className="form-group">
              <label className="form-label">Sobre o projeto (opcional)</label>
              <textarea className="form-textarea" placeholder="Cidade, fase atual, prazo estimado..." id="f-obs" />
            </div>
            <button className="form-submit" onClick={submitToWhatsApp}>Solicitar análise gratuita</button>
            <p className="form-disc">Suas informações são tratadas com total confidencialidade.</p>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <a className="logo" href="#">
            <LogoIcon />
            <span className="logo-name">IMOBI</span>
          </a>
          <span className="footer-note">Crédito imobiliário estruturado · São Paulo, Brasil · © 2026</span>
        </div>
      </footer>
    </>
  );
}
