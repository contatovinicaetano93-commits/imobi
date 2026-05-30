export default function QuemSomosPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Quem Somos</h1>
        <p className="text-slate-400 mb-12 text-lg">
          IMOBI: Estrutura financeira inteligente para construção civil
        </p>

        <div className="grid gap-12">
          <section className="bg-slate-900 rounded-lg border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Missão</h2>
            <p className="text-slate-300">
              Democratizar o acesso a crédito estruturado para construtores, fornecendo
              soluções de financiamento que acompanham o ritmo real das obras com
              geovalidação e liberação por etapas.
            </p>
          </section>

          <section className="bg-slate-900 rounded-lg border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Visão</h2>
            <p className="text-slate-300">
              Ser a plataforma líder em financiamento para construção civil na América
              Latina, conectando construtores, investidores e fornecedores em um
              ecossistema transparente e seguro.
            </p>
          </section>

          <section className="bg-slate-900 rounded-lg border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Nossos Valores</h2>
            <ul className="text-slate-300 space-y-3">
              <li>✓ <strong>Transparência</strong> — Dados e processos 100% visíveis</li>
              <li>✓ <strong>Segurança</strong> — 5 camadas de garantias obrigatórias</li>
              <li>✓ <strong>Inovação</strong> — Tecnologia PostGIS para geovalidação</li>
              <li>✓ <strong>Inclusão</strong> — Acesso a crédito para todos os tamanhos</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
