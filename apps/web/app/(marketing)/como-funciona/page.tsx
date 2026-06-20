import type { Metadata } from 'next';
import Link from 'next/link';
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
  { n: 1, title: 'Simule', desc: 'Use o simulador público e veja quanto sua obra pode financiar em minutos.' },
  { n: 2, title: 'Cadastre-se', desc: 'Crie sua conta, envie documentos KYC e vincule a obra com geolocalização.' },
  { n: 3, title: 'Comitê digital', desc: 'Análise de crédito e due diligence com parecer do gestor do fundo.' },
  { n: 4, title: 'Execute e comprove', desc: 'Avance etapas, envie fotos com GPS validado no canteiro.' },
  { n: 5, title: 'Liberação', desc: 'Parcelas liberadas automaticamente após aprovação das evidências.' },
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
          <h1>Do simulador à liberação, em cinco passos</h1>

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
            <Link href="/simulador" className="btn-primary">Começar simulação</Link>
            <Link href="/" className="btn-ghost">← Voltar</Link>
          </div>
        </div>
      </main>
    </>
  );
}
