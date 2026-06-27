import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';
import '../landing.css';

export const metadata: Metadata = {
  title: 'Quem somos — IMOBI',
  description: 'Crédito para obra com análise ágil, documentação simplificada e liberação por etapa.',
  openGraph: {
    title: 'Quem somos — IMOBI',
    description: 'Conheça a IMOBI e nossa missão de desburocratizar o crédito imobiliário.',
    type: 'website',
  },
};

export default function QuemSomosPage() {
  return (
    <>
      <nav className="landing-nav scrolled">
        <Link className="logo" href="/">
          <span className="logo-name">IMOBI</span>
        </Link>
        <div className="nav-actions">
          <Link href={"/envie-seu-projeto" as Route} className="btn-primary">Enviar projeto</Link>
        </div>
      </nav>

      <main className="inst-page">
        <div className="inst-inner">
          <p className="inst-eyebrow">Quem somos</p>
          <h1>Crédito para obra, sem burocracia desnecessária</h1>
          <p className="inst-lead">
            A IMOBI estrutura crédito imobiliário para construtoras, incorporadoras e tomadores que precisam
            de velocidade na aprovação e liberação alinhada ao avanço real da obra.
          </p>

          <section className="inst-block">
            <h2>Nossa missão</h2>
            <p>
              Reduzir o tempo entre a simulação e a liberação de recursos, com validação por GPS, evidências
              fotográficas e comitê digital — transparência para o fundo e previsibilidade para quem constrói.
            </p>
          </section>

          <section className="inst-block">
            <h2>Como atuamos</h2>
            <ul>
              <li>Análise de crédito desburocratizada, com documentação simplificada</li>
              <li>Liberação por etapa conforme execução comprovada na obra</li>
              <li>Modelo versátil — garantias e estruturas adaptadas caso a caso</li>
              <li>Aprovação em tempo recorde quando a documentação está completa</li>
            </ul>
          </section>

          <div className="inst-actions">
            <Link href={"/envie-seu-projeto" as Route} className="btn-primary">Enviar documentação</Link>
            <Link href={"/contato" as Route} className="btn-ghost">Falar com a equipe</Link>
          </div>
        </div>
      </main>
    </>
  );
}
