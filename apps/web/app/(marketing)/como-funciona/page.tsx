import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import '../landing.css';

export const metadata: Metadata = {
  title: 'Como funciona — IMOBI',
  description: 'Entenda o fluxo IMOBI: simulação, cadastro, KYC, aprovação e liberação por etapa da obra.',
  openGraph: {
    title: 'Como funciona — IMOBI',
    type: 'website',
  },
};

const STEPS = [
  { n: 1, title: 'Envie seu projeto', desc: 'Documentação do empreendimento (obra nova, em andamento ou crédito ponte) + Ficha de Viabilidade.' },
  { n: 2, title: 'Análise IMOBI', desc: 'Due diligence técnica e financeira — simulação e estruturação do crédito após aprovação documental.' },
  { n: 3, title: 'Cadastro e KYC', desc: 'Crie sua conta, formalize a operação e vincule a obra com geolocalização.' },
  { n: 4, title: 'Execute e comprove', desc: 'Avance etapas, envie fotos com GPS validado no canteiro.' },
  { n: 5, title: 'Liberação', desc: 'Parcelas liberadas após aprovação das evidências de cada fase.' },
];

export default function ComoFuncionaPage() {
  return (
    <>
      <nav className="landing-nav scrolled">
        <Link className="logo" href="/">
          <span className="logo-name">IMOBI</span>
        </Link>
        <div className="nav-actions">
          <Link href="/cadastro" className="btn-primary">Criar conta</Link>
        </div>
      </nav>

      <main className="inst-page">
        <div className="inst-inner">
          <p className="inst-eyebrow">Como funciona</p>
          <h1>Da documentação à liberação, em cinco passos</h1>

          <ol className="inst-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="inst-step">
                <span className="inst-step-n">{s.n}</span>
                <div>
                  <h2>{s.title}</h2>
                  <p>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="inst-actions">
            <Link href={"/envie-seu-projeto" as Route} className="btn-primary">Enviar projeto</Link>
            <Link href="/" className="btn-ghost">← Voltar</Link>
          </div>
        </div>
      </main>
    </>
  );
}
