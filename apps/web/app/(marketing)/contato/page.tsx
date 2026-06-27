import type { Metadata } from 'next';
import Link from 'next/link';
import '../landing.css';

export const metadata: Metadata = {
  title: 'Contato — IMOBI',
  description: 'Fale com a equipe comercial IMOBI por WhatsApp ou crie sua conta na plataforma.',
  openGraph: {
    title: 'Contato — IMOBI',
    type: 'website',
  },
};

const WA = '5511993455589';

export default function ContatoPage() {
  const waUrl = `https://wa.me/${WA}?text=${encodeURIComponent('Olá! Gostaria de falar sobre crédito para obra com a IMOBI.')}`;

  return (
    <>
      <nav className="landing-nav scrolled">
        <Link className="logo" href="/">
          <span className="logo-name">IMOBI</span>
        </Link>
      </nav>

      <main className="inst-page">
        <div className="inst-inner">
          <p className="inst-eyebrow">Contato</p>
          <h1>Fale com nossa equipe comercial</h1>
          <p className="inst-lead">
            Dúvidas sobre simulação, documentação ou prazos de aprovação? Estamos prontos para ajudar.
          </p>

          <div className="inst-contact-card">
            <h2>WhatsApp comercial</h2>
            <p>Atendimento em horário comercial (Brasil).</p>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inst-wa">
              Abrir WhatsApp
            </a>
          </div>

          <div className="inst-contact-card">
            <h2>Já decidiu?</h2>
            <p>Crie sua conta e continue de onde parou no envio do projeto.</p>
            <Link href="/cadastro" className="btn-ghost">Criar conta →</Link>
          </div>

          <p className="inst-foot">
            <Link href="/">← Voltar para a landing</Link>
          </p>
        </div>
      </main>
    </>
  );
}
